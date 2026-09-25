import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import models
import test_roles_api


class AnalyticsTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def published_job(self, owner=None, provider="facebook"):
        owner = owner or self.user
        account = models.SocialAccount(user_id=owner.id, platform=provider.title(), account_name="Brand", connected=True)
        self.db.add(account); self.db.flush()
        self.db.add(models.SocialCredential(account_id=account.id, user_id=owner.id, provider=provider,
            external_id="external", encrypted_token="encrypted"))
        post = models.Post(user_id=owner.id, title="Launch", content="Hello", platform=provider,
                           account_id=account.id, status="published")
        self.db.add(post); self.db.flush()
        job = models.PublishingJob(post_id=post.id, user_id=owner.id, account_id=account.id,
            provider=provider, content=post.content, image_url=None, scheduled_at=datetime.now(timezone.utc),
            run_at=datetime.now(timezone.utc), timezone_name="UTC", recurrence="none", status="published",
            provider_post_id="remote-post")
        self.db.add(job); self.db.commit()
        return job

    def test_refresh_summary_and_workflow(self):
        job = self.published_job()
        metrics = {"likes": 7, "comments": 2, "shares": 1, "reach": 0, "impressions": 0, "clicks": 0}
        with patch("analytics.provider_metrics", return_value=metrics):
            status, result = self.request("POST", "/analytics/refresh", self.user)
        self.assertEqual(status, 200)
        self.assertEqual(result["refreshed"], 1)
        status, summary = self.request("GET", "/analytics/summary", self.user)
        self.assertEqual(status, 200)
        self.assertEqual(summary["totals"]["engagements"], 10)
        self.assertEqual(summary["totals"]["published"], 1)
        status, items = self.request("GET", "/engagement", self.user)
        self.assertEqual(status, 200)
        self.assertEqual(items[0]["metrics"]["comments"], 2)
        status, updated = self.request("PATCH", f"/engagement/{job.id}", self.user,
                                       {"status": "reviewed", "note": "Handled"})
        self.assertEqual(status, 200)
        self.assertEqual(updated["status"], "reviewed")
        with patch("analytics.provider_metrics", return_value={**metrics, "comments": 3}):
            self.request("POST", "/analytics/refresh", self.user)
        self.assertEqual(self.request("GET", "/engagement", self.user)[1][0]["status"], "needs_attention")

    def test_permissions_and_owner_isolation(self):
        self.published_job(owner=self.admin)
        self.assertEqual(self.request("GET", "/analytics/summary")[0], 401)
        self.user.role = "business_user"; self.db.commit()
        self.assertEqual(self.request("GET", "/analytics/summary", self.user)[0], 200)
        self.assertEqual(self.request("POST", "/analytics/refresh", self.user)[0], 403)
        self.assertEqual(self.request("GET", "/engagement", self.user)[1], [])

    def test_refresh_failure_is_sanitized_and_recorded(self):
        job = self.published_job()
        from publishers import PublishError
        with patch("analytics.provider_metrics", side_effect=PublishError("Reconnect account")):
            status, result = self.request("POST", "/analytics/refresh", self.user)
        self.assertEqual(status, 200)
        self.assertEqual(result["refreshed"], 0)
        self.assertEqual(result["failed"][0]["job_id"], job.id)
        item = self.request("GET", "/engagement", self.user)[1][0]
        self.assertEqual(item["last_error"], "Reconnect account")


if __name__ == "__main__":
    unittest.main()
