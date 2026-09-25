"""LinkedIn, X and YouTube: OAuth, publishing, token refresh and analytics (all HTTP mocked)."""
import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

from cryptography.fernet import Fernet

import analytics
import models
import publishers
import social_oauth
import test_roles_api
import test_social_oauth


def temp_media(data=b"media-bytes"):
    handle = tempfile.NamedTemporaryFile(delete=False)
    handle.write(data)
    handle.close()
    return handle.name


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.config = patch.dict(os.environ, {"SOCIAL_TOKEN_KEY": Fernet.generate_key().decode(), "LINKEDIN_VERSION": "202607",
                                              "YOUTUBE_CLIENT_ID": "gid", "YOUTUBE_CLIENT_SECRET": "gsecret"})
        self.config.start()
        self.db = Mock()
        self.db.get.return_value = SimpleNamespace(title="Launch video")
        self.credential = SimpleNamespace(provider="x", external_id="member1", expires_at=None,
            encrypted_token=publishers.cipher().encrypt(json.dumps({"access_token": "tok"}).encode()).decode())

    def tearDown(self):
        self.config.stop()

    def job(self, provider, **extra):
        return SimpleNamespace(provider=provider, content="Hello world", post_id=1, container_id=None,
                               image_url=extra.get("image_url"), video_url=extra.get("video_url"))

    def test_linkedin_text_uses_rest_posts_with_version(self):
        with patch("publishers.request", return_value=({}, {"x-restli-id": "urn:li:share:1"})) as request:
            self.assertEqual(publishers.publish(self.db, self.job("linkedin"), self.credential), "urn:li:share:1")
        url, _, body = request.call_args.args
        self.assertEqual(url, "https://api.linkedin.com/rest/posts")
        self.assertEqual(body["author"], "urn:li:person:member1")
        self.assertEqual(body["commentary"], "Hello world")
        self.assertEqual(request.call_args.kwargs["headers"]["LinkedIn-Version"], "202607")
        self.assertTrue(request.call_args.kwargs["publishing"])

    def test_linkedin_image_uploads_then_posts(self):
        path = temp_media()
        init = ({"value": {"uploadUrl": "https://www.linkedin.com/dms-uploads/x", "image": "urn:li:image:9"}}, {})
        with patch("publishers.request", side_effect=[init, ({}, {"x-restli-id": "urn:li:share:2"})]) as request, \
                patch("publishers.fetch_media", return_value=(path, 11, "image/png")), \
                patch("publishers.send", return_value=({}, {})) as send:
            result = publishers.publish(self.db, self.job("linkedin", image_url="https://cdn.example.com/a.png"), self.credential)
        self.assertEqual(result, "urn:li:share:2")
        self.assertEqual(send.call_args.kwargs["method"], "PUT")
        self.assertEqual(request.call_args.args[2]["content"]["media"]["id"], "urn:li:image:9")
        self.assertFalse(os.path.exists(path), "temporary media file must be deleted")

    def test_x_image_upload_attaches_media(self):
        path = temp_media(b"\x89PNG")
        with patch("publishers.fetch_media", return_value=(path, 4, "image/png")), \
                patch("publishers.send", return_value=({"data": {"id": "m123"}}, {})) as send, \
                patch("publishers.request", return_value=({"data": {"id": "t1"}}, {})) as request:
            self.assertEqual(publishers.publish(self.db, self.job("x", image_url="https://cdn.example.com/a.png"), self.credential), "t1")
        body, ctype = send.call_args.args[2], send.call_args.args[3]
        self.assertIn(b'name="media_category"', body)
        self.assertIn(b"tweet_image", body)
        self.assertTrue(ctype.startswith("multipart/form-data; boundary="))
        self.assertEqual(request.call_args.args[2]["media"], {"media_ids": ["m123"]})

    @patch.dict(os.environ, {"YOUTUBE_PRIVACY_STATUS": "public"})
    def test_youtube_resumable_upload(self):
        path = temp_media(b"video")
        session = "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc"
        with patch("publishers.fetch_media", return_value=(path, 5, "video/mp4")), \
                patch("publishers.send", side_effect=[({}, {"Location": session}), ({"id": "vid42"}, {})]) as send:
            result = publishers.publish(self.db, self.job("youtube", video_url="https://cdn.example.com/v.mp4"), self.credential)
        self.assertEqual(result, "vid42")
        metadata = json.loads(send.call_args_list[0].args[2])
        self.assertEqual(metadata["snippet"]["title"], "Launch video")
        self.assertEqual(metadata["status"]["privacyStatus"], "public")
        self.assertEqual(send.call_args_list[0].kwargs["headers"]["X-Upload-Content-Length"], "5")
        self.assertEqual(send.call_args_list[1].args[0], session)
        self.assertTrue(send.call_args_list[1].kwargs["publishing"])
        self.assertFalse(os.path.exists(path))

    def test_youtube_rejects_foreign_upload_session(self):
        path = temp_media()
        with patch("publishers.fetch_media", return_value=(path, 5, "video/mp4")), \
                patch("publishers.send", return_value=({}, {"Location": "https://evil.example.com/"})):
            with self.assertRaises(publishers.PublishError):
                publishers.publish(self.db, self.job("youtube", video_url="https://cdn.example.com/v.mp4"), self.credential)

    def test_media_url_ssrf_guard(self):
        for url in ["http://cdn.example.com/a.png", "https://user:pw@cdn.example.com/a.png"]:
            with self.assertRaises(publishers.PublishError):
                publishers._public_host(url)
        with patch("socket.getaddrinfo", return_value=[(2, 1, 6, "", ("127.0.0.1", 443))]):
            with self.assertRaises(publishers.PublishError):
                publishers._public_host("https://looks-public.example.com/a.png")
        with patch("socket.getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 443))]):
            publishers._public_host("https://example.com/a.png")

    def test_fetch_media_rejects_wrong_type_and_size(self):
        response = Mock()
        response.headers = {"Content-Type": "text/html"}
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        opener = Mock()
        opener.open.return_value = response
        with patch("publishers._public_host"), patch("publishers.build_opener", return_value=opener):
            with self.assertRaises(publishers.PublishError) as error:
                publishers.fetch_media("https://example.com/v", 100, "video")
            self.assertIn("did not return", str(error.exception))
            response.headers = {"Content-Type": "video/mp4"}
            response.read = Mock(side_effect=[b"x" * 80, b"x" * 80, b""])
            with self.assertRaises(publishers.PublishError) as error:
                publishers.fetch_media("https://example.com/v", 100, "video")
            self.assertIn("larger than", str(error.exception))

    def test_youtube_token_refresh(self):
        credential = SimpleNamespace(provider="youtube", external_id="UC1", expires_at=int(time.time()) - 5,
            encrypted_token=publishers.cipher().encrypt(json.dumps({"access_token": "old", "refresh_token": "r1"}).encode()).decode())
        with patch("publishers.provider_request", return_value={"access_token": "new", "expires_in": 3599}) as refresh:
            self.assertEqual(publishers.access_token(self.db, credential), "new")
        data = refresh.call_args.kwargs["data"]
        self.assertEqual((data["grant_type"], data["client_secret"], data["refresh_token"]), ("refresh_token", "gsecret", "r1"))
        stored = json.loads(publishers.cipher().decrypt(credential.encrypted_token.encode()))
        self.assertEqual(stored["refresh_token"], "r1")  # Google does not resend it
        self.assertGreater(credential.expires_at, time.time() + 3000)

    def test_expired_linkedin_without_refresh_asks_to_reconnect(self):
        credential = SimpleNamespace(provider="linkedin", external_id="m", expires_at=int(time.time()) - 5,
            encrypted_token=publishers.cipher().encrypt(json.dumps({"access_token": "old"}).encode()).decode())
        with self.assertRaises(publishers.PublishError) as error:
            publishers.access_token(self.db, credential)
        self.assertIn("reconnect", str(error.exception))


class MetricsTests(unittest.TestCase):
    job = SimpleNamespace(provider_post_id="123")

    def test_x_metrics_and_audience(self):
        with patch("analytics.request", return_value=({"data": {"public_metrics": {"like_count": 5, "reply_count": 2, "retweet_count": 1, "quote_count": 1, "impression_count": 400}}}, {})):
            self.assertEqual(analytics.x_metrics(self.job, "t"), {"likes": 5, "comments": 2, "shares": 2, "impressions": 400, "reach": 400})
        with patch("analytics.request", return_value=({"data": {"public_metrics": {"followers_count": 90, "following_count": 10, "tweet_count": 7}}}, {})):
            self.assertEqual(analytics.x_audience(None, "t"), {"followers": 90, "following": 10, "media_count": 7})

    def test_youtube_metrics_and_audience(self):
        with patch("analytics.request", return_value=({"items": [{"statistics": {"viewCount": "1000", "likeCount": "40", "commentCount": "6"}}]}, {})):
            self.assertEqual(analytics.youtube_metrics(self.job, "t"), {"likes": 40, "comments": 6, "impressions": 1000, "reach": 1000})
        with patch("analytics.request", return_value=({"items": []}, {})):
            with self.assertRaises(analytics.PublishError):
                analytics.youtube_metrics(self.job, "t")
        with patch("analytics.request", return_value=({"items": [{"statistics": {"subscriberCount": "321", "videoCount": "12"}}]}, {})):
            self.assertEqual(analytics.youtube_audience(SimpleNamespace(external_id="UC1"), "t"), {"followers": 321, "media_count": 12})

    def test_linkedin_metrics_and_permission_message(self):
        job = SimpleNamespace(provider_post_id="urn:li:share:77")
        with patch.dict(os.environ, {"LINKEDIN_VERSION": "202607"}), \
                patch("analytics.request", return_value=({"elements": [{"count": 3}]}, {})) as request:
            values = analytics.linkedin_metrics(job, "t")
        self.assertEqual(values["likes"], 3)
        self.assertIn("(share:urn%3Ali%3Ashare%3A77)", request.call_args_list[0].args[0])
        with patch.dict(os.environ, {"LINKEDIN_VERSION": "202607"}), \
                patch("analytics.request", side_effect=analytics.PublishError("403")):
            with self.assertRaises(analytics.PublishError) as error:
                analytics.linkedin_metrics(job, "t")
        self.assertIn("r_member_postAnalytics", str(error.exception))


class ApiTests(unittest.TestCase):
    setUp = test_roles_api.RoleApiTests.setUp
    tearDown = test_roles_api.RoleApiTests.tearDown
    request = test_roles_api.RoleApiTests.request

    def account(self, provider):
        account = models.SocialAccount(user_id=self.user.id, platform={"x": "X", "youtube": "YouTube", "linkedin": "LinkedIn"}[provider],
                                       account_name=provider, connected=True)
        self.db.add(account); self.db.flush()
        self.db.add(models.SocialCredential(account_id=account.id, user_id=self.user.id, provider=provider,
                                            external_id="e-" + provider, encrypted_token="x"))
        self.db.commit()
        return account.id

    def schedule(self, post_id, account_id):
        when = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        return self.request("POST", f"/posts/{post_id}/schedule", self.user, {"scheduled_at": when, "timezone_name": "UTC", "account_ids": [account_id]})

    def test_youtube_requires_video_and_copies_it(self):
        yt = self.account("youtube")
        _, post = self.request("POST", "/posts", self.user, {"title": "My video", "content": "Description"})
        status, error = self.schedule(post["id"], yt)
        self.assertEqual(status, 422)
        self.assertIn("video", error["detail"])
        self.assertEqual(self.request("PATCH", f"/posts/{post['id']}", self.user, {"video_url": "http://x.com/v.mp4"})[0], 422)
        status, post = self.request("PATCH", f"/posts/{post['id']}", self.user, {"video_url": "https://cdn.example.com/v.mp4", "platform": "youtube"})
        self.assertEqual((status, post["video_url"], post["platform"]), (200, "https://cdn.example.com/v.mp4", "youtube"))
        status, jobs = self.schedule(post["id"], yt)
        self.assertEqual(status, 201, jobs)
        self.assertEqual(jobs[0]["video_url"], "https://cdn.example.com/v.mp4")
        _, long_title = self.request("POST", "/posts", self.user, {"title": "x" * 150, "content": "d", "video_url": "https://cdn.example.com/v.mp4"})
        self.assertEqual(self.schedule(long_title["id"], yt)[0], 422)

    def test_x_and_linkedin_accept_images_now(self):
        for provider in ("x", "linkedin"):
            account_id = self.account(provider)
            _, post = self.request("POST", "/posts", self.user, {"title": provider, "content": "Hi", "image_url": "https://cdn.example.com/a.png"})
            self.assertEqual(self.schedule(post["id"], account_id)[0], 201)

    def test_x_metrics_are_rate_limited(self):
        account_id = self.account("x")
        post = models.Post(user_id=self.user.id, title="t", content="c", status="published", platform="x", account_id=account_id)
        self.db.add(post); self.db.flush()
        job = models.PublishingJob(post_id=post.id, user_id=self.user.id, account_id=account_id, provider="x", content="c",
                                   scheduled_at=datetime.now(timezone.utc), run_at=datetime.now(timezone.utc), timezone_name="UTC",
                                   status="published", provider_post_id="tw1")
        self.db.add(job); self.db.commit()
        metrics = {"likes": 1, "comments": 0, "shares": 0, "reach": 0, "impressions": 0, "clicks": 0}
        with patch("analytics.provider_metrics", return_value=metrics) as fetch:
            self.assertEqual(self.request("POST", "/analytics/refresh", self.user)[1]["refreshed"], 1)
            status, result = self.request("POST", "/analytics/refresh", self.user)
        self.assertEqual((result["refreshed"], result["skipped"]), (0, 1))
        self.assertEqual(fetch.call_count, 1)


class YouTubeOAuthTests(test_social_oauth.SocialOAuthTests):
    def test_youtube_authorize_url_requests_offline_pkce(self):
        params, _ = self.begin("youtube")
        self.assertEqual(params["access_type"], ["offline"])
        self.assertEqual(params["prompt"], ["consent"])
        self.assertEqual(params["code_challenge_method"], ["S256"])
        self.assertIn("https://www.googleapis.com/auth/youtube.upload", params["scope"][0])

    def test_extra_scopes_from_env(self):
        with patch.dict(os.environ, {"LINKEDIN_EXTRA_SCOPES": "r_member_postAnalytics,r_member_profileAnalytics"}):
            params, _ = self.begin("linkedin")
        self.assertEqual(params["scope"][0].split(), ["openid", "profile", "w_member_social", "r_member_postAnalytics", "r_member_profileAnalytics"])
        params, _ = self.begin("x")
        self.assertIn("media.write", params["scope"][0])

    def test_youtube_exchange_reads_channel(self):
        responses = [{"access_token": "a", "refresh_token": "r", "expires_in": 3599},
                     {"items": [{"id": "UC123", "snippet": {"title": "My Channel"}}]}]
        with patch("social_oauth.provider_request", side_effect=responses) as provider:
            profiles = social_oauth.exchange("youtube", "code", "verifier")
        self.assertEqual(profiles[0][:2], ("UC123", "My Channel"))
        self.assertEqual(provider.call_args_list[0].kwargs["data"]["code_verifier"], "verifier")
        with patch("social_oauth.provider_request", return_value={"access_token": "a", "expires_in": 3599}):
            with self.assertRaises(social_oauth.HTTPException):
                social_oauth.exchange("youtube", "code", "verifier")
        with patch("social_oauth.provider_request", side_effect=[responses[0], {"items": []}]):
            with self.assertRaises(social_oauth.HTTPException) as error:
                social_oauth.exchange("youtube", "code", "verifier")
        self.assertIn("channel", error.exception.detail)


if __name__ == "__main__":
    unittest.main()


# Reuse SocialOAuthTests fixtures without re-running its own test methods here.
for _name in dir(test_social_oauth.SocialOAuthTests):
    if _name.startswith("test_") and _name not in YouTubeOAuthTests.__dict__:
        setattr(YouTubeOAuthTests, _name, None)
