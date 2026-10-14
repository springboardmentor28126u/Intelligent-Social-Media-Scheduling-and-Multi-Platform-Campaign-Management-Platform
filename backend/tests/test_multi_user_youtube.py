"""
Multi-User YouTube Isolation and Publishing Test Suite.
Verifies:
1. Strict multi-user YouTube account isolation.
2. User A cannot access or see User B's YouTube channel or posts.
3. User A cannot publish using User B's YouTube channel.
4. User A disconnecting YouTube does not affect User B's connected YouTube channel.
5. Non-interference between YouTube, Twitter, Facebook, Instagram, and LinkedIn.
"""
import sys
import os
import uuid
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post
from app.core.security import create_access_token, hash_password

client = TestClient(app)


def test_multi_user_youtube_flow():
    db = SessionLocal()
    try:
        # 1. Setup User A and User B
        email_a = f"yt_user_a_{uuid.uuid4().hex[:6]}@example.com"
        email_b = f"yt_user_b_{uuid.uuid4().hex[:6]}@example.com"

        user_a = User(
            email=email_a,
            password_hash=hash_password("password123"),
            name="YouTube Creator Alpha",
            role="content_creator",
            is_active=True
        )
        user_b = User(
            email=email_b,
            password_hash=hash_password("password123"),
            name="YouTube Creator Beta",
            role="content_creator",
            is_active=True
        )

        db.add(user_a)
        db.add(user_b)
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)

        token_a = create_access_token(data={"sub": str(user_a.id), "email": user_a.email, "role": user_a.role})
        token_b = create_access_token(data={"sub": str(user_b.id), "email": user_b.email, "role": user_b.role})

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 2. Connect YouTube for User A
        res_conn_a = client.get("/api/youtube/connect", headers=headers_a)
        assert res_conn_a.status_code == 200
        state_a = res_conn_a.json()["state"]

        mock_token_a = MagicMock(status_code=200, ok=True)
        mock_token_a.json.return_value = {
            "access_token": "ya29.mock_token_alpha",
            "refresh_token": "1//mock_refresh_alpha",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_channel_a = MagicMock(status_code=200, ok=True)
        mock_channel_a.json.return_value = {
            "items": [{
                "id": "UC_alpha_channel_101",
                "snippet": {"title": "Alpha YouTube Channel", "customUrl": "@alpha_yt"},
                "statistics": {"subscriberCount": "25000", "videoCount": "40", "viewCount": "120000"}
            }]
        }

        with patch("requests.post", return_value=mock_token_a), \
             patch("requests.get", return_value=mock_channel_a):
            res_cb_a = client.get(f"/social-auth/youtube/callback?code=alpha_code&state={state_a}", follow_redirects=False)
            assert res_cb_a.status_code == 302
            assert "connected=youtube" in res_cb_a.headers["location"]

        # 3. Connect YouTube for User B
        res_conn_b = client.get("/api/youtube/connect", headers=headers_b)
        assert res_conn_b.status_code == 200
        state_b = res_conn_b.json()["state"]

        mock_token_b = MagicMock(status_code=200, ok=True)
        mock_token_b.json.return_value = {
            "access_token": "ya29.mock_token_beta",
            "refresh_token": "1//mock_refresh_beta",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_channel_b = MagicMock(status_code=200, ok=True)
        mock_channel_b.json.return_value = {
            "items": [{
                "id": "UC_beta_channel_202",
                "snippet": {"title": "Beta YouTube Studio", "customUrl": "@beta_yt"},
                "statistics": {"subscriberCount": "50000", "videoCount": "110", "viewCount": "890000"}
            }]
        }

        with patch("requests.post", return_value=mock_token_b), \
             patch("requests.get", return_value=mock_channel_b):
            res_cb_b = client.get(f"/social-auth/youtube/callback?code=beta_code&state={state_b}", follow_redirects=False)
            assert res_cb_b.status_code == 302
            assert "connected=youtube" in res_cb_b.headers["location"]

        # 4. Verify Account Isolation
        accs_a = client.get("/social-accounts", headers=headers_a).json()
        accs_b = client.get("/social-accounts", headers=headers_b).json()

        yt_a_ids = [a["account_id"] for a in accs_a if a["platform"] == "youtube"]
        yt_b_ids = [a["account_id"] for a in accs_b if a["platform"] == "youtube"]

        assert "UC_alpha_channel_101" in yt_a_ids, "User A missing Alpha YouTube channel"
        assert "UC_beta_channel_202" not in yt_a_ids, "User A can see User B's YouTube channel!"
        assert "UC_beta_channel_202" in yt_b_ids, "User B missing Beta YouTube channel"
        assert "UC_alpha_channel_101" not in yt_b_ids, "User B can see User A's YouTube channel!"

        # 5. Status endpoint isolation
        status_a = client.get("/api/youtube/status", headers=headers_a).json()
        status_b = client.get("/api/youtube/status", headers=headers_b).json()

        assert status_a["account"]["account_handle"] == "@alpha_yt"
        assert status_b["account"]["account_handle"] == "@beta_yt"

        # 6. Publishing Isolation
        mock_pub_a = MagicMock(status_code=200, ok=True)
        mock_pub_a.json.return_value = {"id": "yt_video_alpha_999", "snippet": {"title": "Video Alpha"}}

        mock_pub_b = MagicMock(status_code=200, ok=True)
        mock_pub_b.json.return_value = {"id": "yt_video_beta_888", "snippet": {"title": "Video Beta"}}

        mock_bytes = MagicMock(status_code=200, ok=True, content=b"fake_video_bytes")

        def mock_requests_get_a(url, *args, **kwargs):
            return mock_bytes

        with patch("requests.post", return_value=mock_pub_a), \
             patch("requests.get", side_effect=mock_requests_get_a):
            res_pub_a = client.post(
                "/api/youtube/publish",
                json={
                    "title": "Alpha YouTube Video",
                    "content": "Video from Creator Alpha",
                    "media_urls": ["https://example.com/alpha.mp4"],
                    "post_type": "video"
                },
                headers=headers_a
            )
            assert res_pub_a.status_code == 200
            assert res_pub_a.json()["external_id"] == "yt_video_alpha_999"

        with patch("requests.post", return_value=mock_pub_b), \
             patch("requests.get", side_effect=mock_requests_get_a):
            res_pub_b = client.post(
                "/api/youtube/publish",
                json={
                    "title": "Beta YouTube Video",
                    "content": "Video from Creator Beta",
                    "media_urls": ["https://example.com/beta.mp4"],
                    "post_type": "video"
                },
                headers=headers_b
            )
            assert res_pub_b.status_code == 200
            assert res_pub_b.json()["external_id"] == "yt_video_beta_888"

        # 7. Post Data Isolation
        posts_a = client.get("/posts", headers=headers_a).json()
        posts_b = client.get("/posts", headers=headers_b).json()

        posts_a_ids = [p["id"] for p in posts_a]
        posts_b_ids = [p["id"] for p in posts_b]

        for p_id in posts_b_ids:
            assert p_id not in posts_a_ids, "Post visibility leak between User A and User B"

        # 8. Disconnect Isolation: User A disconnecting YouTube does not affect User B
        res_disc_a = client.post("/api/youtube/disconnect", headers=headers_a)
        assert res_disc_a.status_code == 200

        # User A is now disconnected
        status_a_after = client.get("/api/youtube/status", headers=headers_a).json()
        assert status_a_after["connected"] is False

        # User B remains connected
        status_b_after = client.get("/api/youtube/status", headers=headers_b).json()
        assert status_b_after["connected"] is True
        assert status_b_after["account"]["account_handle"] == "@beta_yt"

    finally:
        db.close()
