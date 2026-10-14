import pytest
from unittest.mock import patch, MagicMock
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post, PostPlatformTarget
from app.core.security import create_access_token, create_oauth_state
from app.services.scheduler import _publish_to_platform_target


def get_auth_headers(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "admin@socialpilot.io", "password": "password123"}
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_youtube_connect_url(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/youtube/connect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "youtube"
    assert "auth_url" in data
    assert "state" in data
    assert "redirect_uri" in data
    assert "accounts.google.com/o/oauth2/v2/auth" in data["auth_url"]
    assert "response_type=code" in data["auth_url"]
    assert "access_type=offline" in data["auth_url"]
    assert "prompt=consent" in data["auth_url"]
    assert "youtube.upload" in data["auth_url"]
    assert "youtube.readonly" in data["auth_url"]


def test_youtube_callback_error(client):
    resp = client.get(
        "/api/youtube/callback?error=access_denied&error_description=User%20denied%20access",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=" in resp.headers["location"]
    assert "platform=youtube" in resp.headers["location"]


def test_youtube_callback_invalid_state(client):
    resp = client.get(
        "/api/youtube/callback?code=some_auth_code&state=invalid_tampered_state",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=Invalid" in resp.headers["location"] or "error=invalid" in resp.headers["location"]


def test_youtube_callback_success(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    state = create_oauth_state(user_id=user_id)

    # Mock Google token exchange response and YouTube channel response
    mock_token_resp = MagicMock()
    mock_token_resp.ok = True
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {
        "access_token": "ya29.mock_youtube_access_token_12345",
        "refresh_token": "1//mock_youtube_refresh_token_67890",
        "expires_in": 3600,
        "token_type": "Bearer",
        "scope": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
    }

    mock_channel_resp = MagicMock()
    mock_channel_resp.ok = True
    mock_channel_resp.status_code = 200
    mock_channel_resp.json.return_value = {
        "items": [
            {
                "id": "UC_real_channel_id_1001",
                "snippet": {
                    "title": "SocialPilot Official Channel",
                    "customUrl": "@socialpilot_official",
                    "thumbnails": {
                        "high": {"url": "https://yt3.ggpht.com/channel_avatar.jpg"}
                    }
                },
                "statistics": {
                    "subscriberCount": "14500",
                    "videoCount": "82",
                    "viewCount": "450000",
                    "hiddenSubscriberCount": False
                }
            }
        ]
    }

    def mock_requests_post(*args, **kwargs):
        return mock_token_resp

    def mock_requests_get(*args, **kwargs):
        return mock_channel_resp

    with patch("requests.post", side_effect=mock_requests_post), \
         patch("requests.get", side_effect=mock_requests_get):
        resp = client.get(
            f"/social-auth/youtube/callback?code=real_google_auth_code_999&state={state}",
            follow_redirects=False
        )
        assert resp.status_code == 302
        assert "connected=youtube" in resp.headers["location"]

    # Verify social account created in DB
    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "youtube"
    ).first()
    assert account is not None
    assert account.is_active is True
    assert account.is_demo is False
    assert account.account_name == "SocialPilot Official Channel"
    assert account.account_handle == "@socialpilot_official"
    assert account.account_id == "UC_real_channel_id_1001"
    assert account.followers_count == 14500
    assert account.avatar_url == "https://yt3.ggpht.com/channel_avatar.jpg"
    assert account.access_token == "ya29.mock_youtube_access_token_12345"


def test_youtube_status(client, db_session):
    headers = get_auth_headers(client)
    resp = client.get("/api/youtube/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "youtube"
    assert data["connected"] is True
    assert data["account"]["account_name"] == "SocialPilot Official Channel"
    assert data["account"]["account_handle"] == "@socialpilot_official"
    assert data["account"]["followers_count"] == 14500


def test_youtube_sync(client, db_session):
    headers = get_auth_headers(client)

    mock_metrics_resp = MagicMock()
    mock_metrics_resp.ok = True
    mock_metrics_resp.status_code = 200
    mock_metrics_resp.json.return_value = {
        "items": [
            {
                "id": "UC_real_channel_id_1001",
                "statistics": {
                    "subscriberCount": "15200",
                    "videoCount": "85",
                    "viewCount": "465000",
                    "hiddenSubscriberCount": False
                }
            }
        ]
    }

    with patch("requests.get", return_value=mock_metrics_resp):
        resp = client.post("/api/youtube/sync", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["account"]["followers_count"] == 15200


def test_youtube_publish_validation_error(client, db_session):
    headers = get_auth_headers(client)
    # YouTube requires a video file, text-only is rejected
    resp = client.post(
        "/api/youtube/publish",
        json={"content": "Text only post without video", "media_urls": []},
        headers=headers
    )
    assert resp.status_code == 400
    assert "video" in resp.json()["detail"].lower()


def test_youtube_publish_endpoint(client, db_session):
    headers = get_auth_headers(client)
    publish_payload = {
        "title": "Introducing SocialPilot Video Scheduling",
        "content": "Check out our latest product walkthrough and scheduling demo on YouTube!",
        "media_urls": ["https://example.com/sample_video.mp4"],
        "post_type": "video",
        "privacy": "public"
    }

    mock_upload_resp = MagicMock()
    mock_upload_resp.ok = True
    mock_upload_resp.status_code = 200
    mock_upload_resp.json.return_value = {
        "id": "dQw4w9WgXcQ",
        "snippet": {"title": publish_payload["title"]},
        "status": {"privacyStatus": "public"}
    }

    mock_video_bytes_resp = MagicMock()
    mock_video_bytes_resp.ok = True
    mock_video_bytes_resp.content = b"fake_mp4_video_data_bytes"

    def mock_requests_get(url, *args, **kwargs):
        if "example.com" in url:
            return mock_video_bytes_resp
        return MagicMock(status_code=200, json=lambda: {})

    with patch("requests.post", return_value=mock_upload_resp), \
         patch("requests.get", side_effect=mock_requests_get):
        resp = client.post("/api/youtube/publish", json=publish_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["platform"] == "youtube"
        assert data["external_id"] == "dQw4w9WgXcQ"
        assert "youtube.com/watch?v=dQw4w9WgXcQ" in data["url"]

    # Verify post in DB
    post = db_session.query(Post).filter(Post.id == data["post_id"]).first()
    assert post is not None
    assert post.status == "published"
    assert post.platform == "youtube"
    assert post.external_post_id == "dQw4w9WgXcQ"


def test_youtube_scheduler_publishing(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "youtube"
    ).first()
    assert account is not None

    post = Post(
        user_id=user_id,
        title="Scheduled YouTube Video",
        content="Automated scheduled video post published to YouTube via SocialPilot scheduler! 🎬",
        platform="youtube",
        post_type="video",
        media_url="https://example.com/scheduled_video.mp4",
        status="scheduled"
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    target = PostPlatformTarget(
        post_id=post.id,
        platform="youtube",
        social_account_id=account.id,
        status="pending"
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    mock_upload_resp = MagicMock()
    mock_upload_resp.ok = True
    mock_upload_resp.status_code = 200
    mock_upload_resp.json.return_value = {
        "id": "yt_video_sched_999",
        "snippet": {"title": post.title}
    }

    mock_video_bytes_resp = MagicMock()
    mock_video_bytes_resp.ok = True
    mock_video_bytes_resp.content = b"fake_mp4_video_bytes"

    def mock_requests_get(url, *args, **kwargs):
        if "example.com" in url:
            return mock_video_bytes_resp
        return MagicMock(status_code=200, json=lambda: {})

    with patch("requests.post", return_value=mock_upload_resp), \
         patch("requests.get", side_effect=mock_requests_get):
        result = _publish_to_platform_target(target=target, post=post, db=db_session)
        assert result["status"] == "published"
        assert target.status == "published"
        assert target.external_post_id == "yt_video_sched_999"


def test_youtube_disconnect(client, db_session):
    headers = get_auth_headers(client)
    resp = client.post("/api/youtube/disconnect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    # Status should now report disconnected
    status_resp = client.get("/api/youtube/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["connected"] is False
