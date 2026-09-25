import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import models
import test_analytics
import test_roles_api


class CampaignTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request
    published_job = test_analytics.AnalyticsTests.published_job

    def body(self, **overrides):
        today = date.today()
        return {"name": "Diwali Sale", "objective": "sales", "platforms": ["facebook", "instagram"],
                "start_date": (today - timedelta(days=5)).isoformat(),
                "end_date": (today + timedelta(days=5)).isoformat(),
                "budget": 1000, "revenue": 2500, "currency": "inr",
                "target_engagements": 100, "target_posts": 4, **overrides}

    def test_crud_grouping_and_report_metrics(self):
        status, campaign = self.request("POST", "/campaigns", self.user, self.body())
        self.assertEqual(status, 201, campaign)
        self.assertEqual(campaign["currency"], "INR")
        self.assertEqual(campaign["phase"], "running")
        self.assertEqual(campaign["platforms"], ["facebook", "instagram"])
        job = self.published_job()
        failed = models.PublishingJob(post_id=job.post_id, user_id=self.user.id, account_id=job.account_id,
            provider="facebook", content="x", scheduled_at=datetime.now(timezone.utc),
            run_at=datetime.now(timezone.utc), timezone_name="UTC", status="failed")
        self.db.add(failed); self.db.commit()
        status, report = self.request("POST", f"/campaigns/{campaign['id']}/posts", self.user,
                                      {"post_ids": [job.post_id]})
        self.assertEqual(status, 200, report)
        metrics = {"likes": 40, "comments": 5, "shares": 5, "reach": 500, "impressions": 800, "clicks": 0}
        with patch("analytics.provider_metrics", return_value=metrics):
            self.request("POST", "/analytics/refresh", self.user)
        status, report = self.request("GET", f"/campaigns/{campaign['id']}", self.user)
        m = report["metrics"]
        self.assertEqual((m["engagements"], m["published_jobs"], m["failed_jobs"]), (50, 1, 1))
        self.assertEqual(m["roi_pct"], 150.0)
        self.assertEqual(m["cost_per_engagement"], 20.0)
        self.assertEqual(m["engagement_rate"], 10.0)
        self.assertEqual(m["target_progress"], 50.0)
        self.assertEqual(m["success_rate"], 50.0)
        self.assertTrue(any("failed" in a["message"] for a in report["alerts"]))
        self.assertEqual(report["posts"][0]["engagements"], 50)
        status, posts = self.request("GET", "/posts", self.user, query=f"campaign_id={campaign['id']}")
        self.assertEqual([p["id"] for p in posts], [job.post_id])
        status, updated = self.request("PATCH", f"/campaigns/{campaign['id']}", self.user, {"status": "completed"})
        self.assertEqual((updated["status"], updated["phase"]), ("completed", "ended"))
        self.assertEqual(self.request("DELETE", f"/campaigns/{campaign['id']}/posts/{job.post_id}", self.user)[0], 200)
        self.assertEqual(self.request("DELETE", f"/campaigns/{campaign['id']}", self.user)[0], 200)
        self.assertIsNotNone(self.db.get(models.Post, job.post_id))

    def test_validation_and_draft_assignment(self):
        self.assertEqual(self.request("POST", "/campaigns", self.user,
                                      self.body(end_date="2000-01-01"))[0], 422)
        self.assertEqual(self.request("POST", "/campaigns", self.user, self.body(budget=-1))[0], 422)
        _, campaign = self.request("POST", "/campaigns", self.user, self.body())
        status, post = self.request("POST", "/posts", self.user, {"title": "Teaser", "campaign_id": campaign["id"]})
        self.assertEqual((status, post["campaign_id"]), (201, campaign["id"]))
        self.assertEqual(self.request("POST", "/posts", self.user, {"title": "x", "campaign_id": 9999})[0], 404)
        self.assertEqual(self.request("GET", "/campaigns", self.user)[1][0]["metrics"]["posts"], 1)

    def test_owner_isolation_and_permissions(self):
        _, campaign = self.request("POST", "/campaigns", self.admin, self.body())
        self.assertEqual(self.request("GET", f"/campaigns/{campaign['id']}", self.user)[0], 404)
        self.assertEqual(self.request("GET", "/campaigns", self.user)[1], [])
        status, post = self.request("POST", "/posts", self.user, {"title": "Mine"})
        self.assertEqual(self.request("POST", f"/campaigns/{campaign['id']}/posts", self.user,
                                      {"post_ids": [post["id"]]})[0], 404)
        self.assertEqual(self.request("POST", "/campaigns", self.user, self.body(), )[0], 201)
        self.user.role = "business_user"; self.db.commit()
        self.assertEqual(self.request("POST", "/campaigns", self.user, self.body())[0], 403)
        self.assertEqual(self.request("GET", "/campaigns", self.user)[0], 200)
        self.assertEqual(self.request("GET", "/reports/campaigns", self.user)[0], 200)

    def test_reports(self):
        _, first = self.request("POST", "/campaigns", self.user, self.body(name="A", budget=100, revenue=50))
        _, second = self.request("POST", "/campaigns", self.user, self.body(name="B", budget=100, revenue=300))
        status, report = self.request("GET", "/reports/campaigns", self.user, query=f"ids={first['id']},{second['id']}")
        self.assertEqual(status, 200)
        self.assertEqual(report["best"]["roi"], second["id"])
        self.assertEqual(report["totals"]["roi_pct"], 75.0)
        self.assertEqual(self.request("GET", "/reports/campaigns", self.user, query="ids=a")[0], 422)

        job = self.published_job()
        account = self.db.get(models.SocialAccount, job.account_id)
        now = datetime.now(timezone.utc)
        self.db.add_all([
            models.AudienceSnapshot(account_id=account.id, user_id=self.user.id, provider="facebook",
                                    followers=200, collected_at=now - timedelta(days=3)),
            models.AudienceSnapshot(account_id=account.id, user_id=self.user.id, provider="facebook",
                                    followers=250, collected_at=now),
        ]); self.db.commit()
        status, audience = self.request("GET", "/reports/audience", self.user)
        self.assertEqual(status, 200)
        self.assertEqual((audience["totals"]["followers"], audience["totals"]["growth"],
                          audience["totals"]["growth_pct"]), (250, 50, 25.0))
        self.assertEqual(len(audience["timeline"]), 2)

        status, perf = self.request("GET", "/reports/performance", self.user, query="timezone_name=Asia/Kolkata")
        self.assertEqual(status, 200)
        self.assertEqual(perf["totals"]["published"], 1)
        self.assertEqual(len(perf["hours"]), 24)
        self.assertEqual(self.request("GET", "/reports/performance", self.user, query="timezone_name=Mars/Base")[0], 422)

    def test_audience_refresh(self):
        job = self.published_job()
        with patch("analytics.provider_audience", return_value={"followers": 42, "following": 3, "media_count": 9}):
            status, result = self.request("POST", "/analytics/audience/refresh", self.user)
        self.assertEqual((status, result["refreshed"]), (200, 1))
        snap = self.db.query(models.AudienceSnapshot).one()
        self.assertEqual((snap.account_id, snap.followers), (job.account_id, 42))


if __name__ == "__main__":
    unittest.main()


class InsightParsingTests(unittest.TestCase):
    def test_insight_values(self):
        from analytics import insight_values
        result = {"data": [{"name": "reach", "values": [{"value": 12}]},
                           {"name": "views", "total_value": {"value": 30}}]}
        self.assertEqual(insight_values(result), {"reach": 12, "views": 30})
        self.assertEqual(insight_values({"data": "bad"}), {})


class PostCampaignLinkTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request
    published_job = test_analytics.AnalyticsTests.published_job
    body = CampaignTests.body

    def test_link_published_post(self):
        job = self.published_job()
        _, campaign = self.request("POST", "/campaigns", self.user, self.body())
        status, post = self.request("PATCH", f"/posts/{job.post_id}/campaign", self.user, {"campaign_id": campaign["id"]})
        self.assertEqual((status, post["campaign_id"]), (200, campaign["id"]))
        status, post = self.request("PATCH", f"/posts/{job.post_id}/campaign", self.user, {"campaign_id": None})
        self.assertEqual((status, post["campaign_id"]), (200, None))
        self.assertEqual(self.request("PATCH", f"/posts/{job.post_id}/campaign", self.user, {"campaign_id": 999})[0], 404)
        self.assertEqual(self.request("PATCH", f"/posts/{job.post_id}/campaign", self.admin, {"campaign_id": None})[0], 404)


class AccountFixTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def test_email_case_insensitive_register_and_login(self):
        status, user = self.request("POST", "/register", body={"name": "Mixed", "email": "Mixed.Case@Example.com", "password": "secret-123"})
        self.assertEqual((status, user["email"]), (201, "mixed.case@example.com"))
        self.assertEqual(self.request("POST", "/register", body={"name": "Dup", "email": "MIXED.case@example.com", "password": "secret-123"})[0], 400)
        self.assertEqual(self.request("POST", "/login", body={"email": "MIXED.CASE@example.com", "password": "secret-123"})[0], 200)

    def test_profile_and_password_change(self):
        from main import password_hash
        self.user.password_hash = password_hash.hash("old-secret"); self.db.commit()
        status, me = self.request("PATCH", "/me", self.user, {"name": "  New Name "})
        self.assertEqual((status, me["name"]), (200, "New Name"))
        self.assertEqual(self.request("POST", "/me/password", self.user, {"current_password": "wrong", "new_password": "new-secret"})[0], 400)
        self.assertEqual(self.request("POST", "/me/password", self.user, {"current_password": "old-secret", "new_password": "new-secret"})[0], 200)
        self.assertEqual(self.request("POST", "/login", body={"email": "creator@example.com", "password": "new-secret"})[0], 200)
        self.assertEqual(self.request("PATCH", "/me", None, {"name": "x"})[0], 401)

    def test_instagram_token_refreshed_before_expiry(self):
        import json, time
        from unittest.mock import patch
        from publishers import access_token
        from social_oauth import cipher
        account = models.SocialAccount(user_id=self.user.id, platform="Instagram", account_name="ig", connected=True)
        self.db.add(account); self.db.flush()
        cred = models.SocialCredential(account_id=account.id, user_id=self.user.id, provider="instagram", external_id="1",
            encrypted_token=cipher().encrypt(json.dumps({"access_token": "old"}).encode()).decode(), expires_at=int(time.time()) + 3 * 86400)
        self.db.add(cred); self.db.commit()
        with patch("publishers.provider_request", return_value={"access_token": "new", "expires_in": 5184000}):
            self.assertEqual(access_token(self.db, cred), "new")
        self.assertGreater(cred.expires_at, time.time() + 50 * 86400)
        with patch("publishers.provider_request", side_effect=ValueError()):
            cred.expires_at = int(time.time()) + 86400
            self.assertEqual(access_token(self.db, cred), "new")


class DemoAndLiveTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def test_demo_load_reports_and_clear(self):
        self.assertEqual(self.request("GET", "/demo", self.user)[1], {"loaded": False})
        self.assertEqual(self.request("POST", "/demo", self.user)[0], 201)
        self.assertEqual(self.request("POST", "/demo", self.user)[0], 409)
        status, summary = self.request("GET", "/analytics/summary", self.user, query="days=30")
        self.assertGreater(summary["totals"]["engagements"], 0)
        self.assertIn("previous", summary)
        self.assertEqual(len(summary["timeline"]), 30)
        self.assertTrue(summary["top_campaigns"][0]["image_url"])
        status, perf = self.request("GET", "/reports/performance", self.user, query="days=60&timezone_name=Asia/Kolkata")
        self.assertEqual(len(perf["heatmap"]), 168)
        self.assertIsNotNone(perf["best_slot"])
        audience = self.request("GET", "/reports/audience", self.user, query="days=30")[1]
        self.assertGreater(audience["totals"]["growth"], 0)
        campaigns = self.request("GET", "/campaigns", self.user)[1]
        self.assertEqual(len(campaigns), 3)
        # Demo jobs never publish or hit providers.
        import publishing_worker
        from datetime import datetime, timedelta, timezone
        from sqlalchemy.orm import sessionmaker
        for job in self.db.query(models.PublishingJob).filter_by(status="scheduled").all():
            job.run_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.db.commit()
        calls = []
        self.assertEqual(publishing_worker.run_due(session_factory=sessionmaker(bind=self.engine), publisher=lambda *a: calls.append(a)), 0)
        self.assertEqual(calls, [])
        with patch("analytics.provider_metrics") as metrics:
            self.request("POST", "/analytics/refresh", self.user)
            metrics.assert_not_called()
        # Other users' data untouched, then clean removal.
        self.assertEqual(self.request("GET", "/campaigns", self.admin)[1], [])
        status, removed = self.request("DELETE", "/demo", self.user)
        self.assertEqual((status, removed["removed"]["campaigns"]), (200, 3))
        self.assertEqual(self.db.query(models.Post).count(), 0)
        self.assertEqual(self.db.query(models.AudienceSnapshot).count(), 0)
        self.assertEqual(self.db.query(models.SocialAccount).count(), 0)
        self.user.role = "business_user"; self.db.commit()
        self.assertEqual(self.request("POST", "/demo", self.user)[0], 403)

    def test_worker_engagement_sync(self):
        import publishing_worker
        from sqlalchemy.orm import sessionmaker
        job = test_analytics.AnalyticsTests.published_job(self)
        with patch("analytics.provider_metrics", return_value={"likes": 5, "comments": 1, "shares": 0, "reach": 0, "impressions": 0, "clicks": 0}):
            self.assertEqual(publishing_worker.sync_all_engagement(sessionmaker(bind=self.engine)), 1)
        self.db.expire_all()
        self.assertEqual(self.db.query(models.EngagementSnapshot).filter_by(job_id=job.id).one().likes, 5)
