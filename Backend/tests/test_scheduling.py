import unittest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from sqlalchemy.orm import sessionmaker

import models
import scheduling
import publishing_worker
from publishers import PublishError
import test_roles_api


class SchedulingTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def account(self, provider="facebook", owner=None):
        owner = owner or self.user
        account = models.SocialAccount(user_id=owner.id, platform=provider.title(), account_name="Test", connected=True)
        self.db.add(account)
        self.db.flush()
        self.db.add(models.SocialCredential(account_id=account.id, user_id=owner.id, provider=provider,
                                            external_id=str(account.id), encrypted_token="test-only"))
        self.db.commit()
        return account

    def draft(self, **extra):
        status, data = self.request("POST", "/posts", self.user, {"title": "Publish test", "content": "Hello", **extra})
        self.assertEqual(status, 201)
        return data["id"]

    def schedule(self, post_id, account_ids, **extra):
        body = {"scheduled_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                "account_ids": account_ids, **extra}
        return self.request("POST", f"/posts/{post_id}/schedule", self.user, body)

    def make_due(self, job_id):
        job = self.db.get(models.PublishingJob, job_id)
        job.run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()

    def worker(self, publisher):
        self.db.commit()
        count = publishing_worker.run_due(session_factory=sessionmaker(bind=self.engine), publisher=publisher)
        self.db.expire_all()
        return count

    def test_multi_platform_recurrence_calendar_and_isolation(self):
        accounts = [self.account(), self.account("x")]
        post_id = self.draft()
        status, jobs = self.schedule(post_id, [a.id for a in accounts], recurrence="weekly", occurrences=3)
        self.assertEqual(status, 201)
        self.assertEqual(len(jobs), 6)
        self.assertTrue(all(job["status"] == "scheduled" for job in jobs))
        log_status, entries = self.request("GET", f'/queue/{jobs[0]["id"]}/logs', self.user)
        self.assertEqual(log_status, 200)
        self.assertEqual(entries[0]["event"], "scheduled")
        logged_at = datetime.fromisoformat(entries[0]["created_at"].replace("Z", "+00:00"))
        self.assertEqual(logged_at.utcoffset(), timedelta(0))
        self.assertLess(abs((datetime.now(timezone.utc) - logged_at).total_seconds()), 60)
        self.assertEqual(self.request("GET", "/queue", self.admin)[1], [])
        query = urlencode({"start": datetime.now(timezone.utc).isoformat(), "end": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()})
        self.assertEqual(len(self.request("GET", "/calendar", self.user, query=query)[1]), 6)
        self.assertEqual(self.request("GET", f'/queue/{jobs[0]["id"]}/logs', self.admin)[0], 404)
        self.assertEqual(self.request("POST", f"/posts/{post_id}/cancel", self.admin)[0], 403)

    def test_invalid_schedule_and_unverified_account(self):
        account = self.account()
        post_id = self.draft()
        for extra in [{"scheduled_at": "2020-01-01T00:00:00Z"}, {"scheduled_at": "2030-01-01T00:00:00"},
                      {"timezone_name": "Not/AZone"}, {"occurrences": 2}, {"account_ids": [account.id, account.id]}]:
            body = {"scheduled_at": "2030-01-01T00:00:00Z", "account_ids": [account.id], **extra}
            self.assertEqual(self.request("POST", f"/posts/{post_id}/schedule", self.user, body)[0], 422)
        account.connected = False
        self.db.commit()
        self.assertEqual(self.schedule(post_id, [account.id])[0], 422)
        other = self.account(owner=self.admin)
        self.assertEqual(self.schedule(post_id, [other.id])[0], 404)

    def test_media_validation(self):
        instagram = self.account("instagram")
        post_id = self.draft()
        self.assertEqual(self.schedule(post_id, [instagram.id])[0], 422)
        for url in ["http://example.com/a.jpg", "https://127.0.0.1/a.jpg", "https://localhost/a.jpg"]:
            self.assertEqual(self.request("PATCH", f"/posts/{post_id}", self.user, {"image_url": url})[0], 422)
        self.assertEqual(self.request("PATCH", f"/posts/{post_id}", self.user, {"image_url": "https://example.com/image.jpg"})[0], 200)
        self.assertEqual(self.schedule(post_id, [instagram.id])[0], 201)

    def test_reschedule_cancel_restore_and_disconnect(self):
        account = self.account()
        post_id = self.draft()
        _, old = self.schedule(post_id, [account.id])
        _, new = self.schedule(post_id, [account.id])
        self.assertNotEqual(old[0]["id"], new[0]["id"])
        self.assertEqual(self.db.get(models.PublishingJob, old[0]["id"]).status, "cancelled")
        self.assertEqual(self.request("POST", f"/posts/{post_id}/cancel", self.user)[1]["cancelled_jobs"], 1)
        self.assertEqual(self.request("POST", f"/posts/{post_id}/restore-draft", self.user)[0], 200)
        self.assertEqual(self.request("PATCH", f"/posts/{post_id}", self.user, {"content": "Updated"})[0], 200)
        _, jobs = self.schedule(post_id, [account.id])
        self.assertEqual(self.request("DELETE", f"/accounts/{account.id}", self.user)[0], 200)
        self.assertEqual(self.db.get(models.PublishingJob, jobs[0]["id"]).status, "cancelled")

    def test_worker_success_logs_and_no_republish(self):
        account = self.account()
        post_id = self.draft()
        _, jobs = self.schedule(post_id, [account.id])
        self.make_due(jobs[0]["id"])
        calls = []
        def publish(db, job, credential):
            calls.append(job.id)
            return "remote-123"
        self.assertEqual(self.worker(publish), 1)
        self.assertEqual(self.worker(publish), 0)
        self.assertEqual(len(calls), 1)
        job = self.db.get(models.PublishingJob, jobs[0]["id"])
        self.assertEqual(job.status, "published")
        self.assertEqual(job.provider_post_id, "remote-123")
        self.assertEqual(self.db.get(models.Post, post_id).status, "published")
        events = self.request("GET", f"/queue/{job.id}/logs", self.user)[1]
        self.assertEqual([entry["event"] for entry in events], ["scheduled", "processing", "published"])

    def test_transient_retry_then_success(self):
        account = self.account()
        _, jobs = self.schedule(self.draft(), [account.id])
        job_id = jobs[0]["id"]
        self.make_due(job_id)
        def limited(*args):
            raise PublishError("Rate limited", retryable=True)
        self.worker(limited)
        job = self.db.get(models.PublishingJob, job_id)
        self.assertEqual(job.status, "retry")
        self.assertEqual(job.attempts, 1)
        self.make_due(job_id)
        self.worker(lambda *args: "remote")
        self.assertEqual(self.db.get(models.PublishingJob, job_id).status, "published")

    def test_uncertain_outcome_not_retried(self):
        account = self.account()
        _, jobs = self.schedule(self.draft(), [account.id])
        job_id = jobs[0]["id"]
        self.make_due(job_id)
        def ambiguous(*args):
            raise PublishError("Network outcome unknown", uncertain=True)
        self.worker(ambiguous)
        self.assertEqual(self.db.get(models.PublishingJob, job_id).status, "uncertain")
        self.assertEqual(self.request("POST", f"/queue/{job_id}/retry", self.user)[0], 409)
        self.assertEqual(self.worker(ambiguous), 0)

    def test_revoked_role_prevents_publication(self):
        account = self.account()
        _, jobs = self.schedule(self.draft(), [account.id])
        self.make_due(jobs[0]["id"])
        self.user.role = "business_user"
        self.db.commit()
        def no_publish(*args):
            self.fail("Publishing must not happen")
        self.worker(no_publish)
        self.assertEqual(self.db.get(models.PublishingJob, jobs[0]["id"]).status, "failed")

    def test_background_endpoint_is_owner_scoped(self):
        with patch("publishing_worker.run_due") as run:
            self.assertEqual(self.request("POST", "/queue/run", self.user)[0], 202)
            run.assert_called_once_with(user_id=self.user.id)

    def test_abandoned_claim_requires_review_without_republishing(self):
        account = self.account()
        post_id = self.draft()
        _, jobs = self.schedule(post_id, [account.id])
        job = self.db.get(models.PublishingJob, jobs[0]["id"])
        job.status = "processing"
        job.claimed_at = datetime.now(timezone.utc) - timedelta(minutes=11)
        self.db.commit()
        self.assertEqual(self.worker(lambda *args: self.fail("Must not republish an abandoned claim")), 0)
        self.assertEqual(self.db.get(models.PublishingJob, job.id).status, "uncertain")
        self.assertEqual(self.db.get(models.Post, post_id).status, "needs_review")

    def test_retry_limit_and_manual_retry(self):
        account = self.account()
        _, jobs = self.schedule(self.draft(), [account.id])
        job_id = jobs[0]["id"]
        def limited(*args):
            raise PublishError("Rate limited", retryable=True)
        for attempt in range(1, 6):
            self.make_due(job_id)
            self.worker(limited)
            job = self.db.get(models.PublishingJob, job_id)
            self.assertEqual(job.attempts, attempt)
            self.assertEqual(job.status, "failed" if attempt == 5 else "retry")
        self.assertEqual(self.worker(limited), 0)
        self.assertEqual(self.request("POST", f"/queue/{job_id}/retry", self.user)[0], 200)
        self.worker(lambda *args: "recovered")
        self.assertEqual(self.db.get(models.PublishingJob, job_id).status, "published")

    def test_mixed_results_and_cancel_preserve_publication_history(self):
        accounts = [self.account(), self.account("x")]
        post_id = self.draft()
        _, jobs = self.schedule(post_id, [account.id for account in accounts])
        for job in jobs:
            self.make_due(job["id"])
        def publish(db, job, credential):
            if job.provider == "x":
                raise PublishError("Authorization rejected")
            return "published-facebook"
        self.worker(publish)
        self.assertEqual(self.db.get(models.Post, post_id).status, "partially_published")
        self.assertEqual(self.request("POST", f"/posts/{post_id}/cancel", self.user)[1]["cancelled_jobs"], 0)
        self.assertEqual(self.request("POST", f"/posts/{post_id}/restore-draft", self.user)[0], 409)
        self.assertEqual(self.schedule(post_id, [accounts[0].id])[0], 409)

    def test_dst_recurrence_keeps_local_time_and_rejects_gap(self):
        request = scheduling.ScheduleRequest(scheduled_at="2030-03-09T09:00:00-05:00", timezone_name="America/New_York",
                                             account_ids=[1], recurrence="daily", occurrences=3)
        times = scheduling.times_for(request, datetime(2029, 1, 1, tzinfo=timezone.utc))
        self.assertEqual((times[1] - times[0]).total_seconds(), 23 * 3600)
        request = scheduling.ScheduleRequest(scheduled_at="2030-03-09T02:30:00-05:00", timezone_name="America/New_York",
                                             account_ids=[1], recurrence="daily", occurrences=3)
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            scheduling.times_for(request, datetime(2029, 1, 1, tzinfo=timezone.utc))
