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


def test_instagram_connect_url(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/instagram/connect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "instagram"
    assert "auth_url" in data
    assert "state" in data
    assert "redirect_uri" in data
    assert "instagram_business_basic" in data["auth_url"] or "instagram_basic" in data["auth_url"] or "oauth/authorize" in data["auth_url"]


def test_instagram_callback_error(client):
    resp = client.get(
        "/api/instagram/callback?error=access_denied&error_description=User%20denied%20permissions",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=" in resp.headers["location"]
    assert "platform=instagram" in resp.headers["location"]


def test_instagram_callback_invalid_state(client):
    resp = client.get(
        "/api/instagram/callback?code=some_auth_code&state=invalid_tampered_state",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=Invalid" in resp.headers["location"] or "error=invalid" in resp.headers["location"]


def test_instagram_callback_success(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    state = create_oauth_state(user_id=user_id)

    # 1. Mock token response
    mock_token_resp = MagicMock()
    mock_token_resp.ok = True
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {
        "access_token": "real_ig_access_token_sample",
        "expires_in": 5184000
    }

    # 2. Mock /me/accounts response (Facebook Pages)
    mock_pages_resp = MagicMock()
    mock_pages_resp.ok = True
    mock_pages_resp.status_code = 200
    mock_pages_resp.json.return_value = {
        "data": [
            {
                "id": "page_123456",
                "name": "SocialPilot Brand Page",
                "access_token": "page_access_token_123"
            }
        ]
    }

    # 3. Mock /{page_id} checking for instagram_business_account
    mock_ig_account_resp = MagicMock()
    mock_ig_account_resp.ok = True
    mock_ig_account_resp.status_code = 200
    mock_ig_account_resp.json.return_value = {
        "instagram_business_account": {
            "id": "17841424031142611",
            "name": "SocialPilot IG Pro",
            "username": "socialpilot_ig",
            "profile_picture_url": "https://graph.facebook.com/v19.0/photo.jpg",
            "followers_count": 48200,
            "media_count": 120
        }
    }

    def mock_requests_get(url, *args, **kwargs):
        if "oauth/access_token" in url:
            return mock_token_resp
        elif "me/accounts" in url:
            return mock_pages_resp
        elif "page_123456" in url:
            return mock_ig_account_resp
        return mock_ig_account_resp

    with patch("requests.get", side_effect=mock_requests_get), patch("requests.post", return_value=mock_token_resp):
        resp = client.get(
            f"/api/instagram/callback?code=real_meta_auth_code&state={state}",
            follow_redirects=False
        )
        assert resp.status_code == 302
        assert "connected=instagram" in resp.headers["location"]

    # Verify social account created in DB with real Instagram details
    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "instagram"
    ).first()
    assert account is not None
    assert account.is_active is True
    assert account.account_name == "SocialPilot IG Pro"
    assert account.account_handle == "@socialpilot_ig"
    assert account.account_id == "17841424031142611"
    assert account.followers_count == 48200


def test_instagram_verify_endpoint(client):
    headers = get_auth_headers(client)

    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "17841424031142611",
        "username": "socialpilot_ig",
        "name": "SocialPilot Official",
        "profile_picture_url": "https://example.com/avatar.jpg",
        "followers_count": 52000,
        "follows_count": 150,
        "media_count": 310
    }

    with patch("requests.get", return_value=mock_resp):
        resp = client.post(
            "/api/instagram/verify",
            json={"access_token": "test_token", "user_id": "17841424031142611"},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["account"]["username"] == "socialpilot_ig"
        assert data["account"]["followers_count"] == 52000


def test_instagram_verify_expired_token(client):
    headers = get_auth_headers(client)

    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 400
    mock_resp.json.return_value = {
        "error": {
            "message": "Error validating access token: Session has expired",
            "type": "OAuthException",
            "code": 190,
            "error_subcode": 463
        }
    }

    with patch("requests.get", return_value=mock_resp):
        resp = client.post(
            "/api/instagram/verify",
            json={"access_token": "expired_token_123", "user_id": "17841424031142611"},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False
        assert "expired or invalid" in data["error"].lower()


def test_instagram_connect_token_endpoint(client, db_session):
    headers = get_auth_headers(client)

    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "17841424031142611",
        "username": "brand_pro_ig",
        "name": "Brand Professional",
        "profile_picture_url": "https://example.com/brand.jpg",
        "followers_count": 18400,
        "media_count": 55
    }

    with patch("requests.get", return_value=mock_resp):
        resp = client.post(
            "/api/instagram/connect-token",
            json={
                "access_token": "valid_meta_token_abc",
                "user_id": "17841424031142611",
                "account_name": "Brand Professional"
            },
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["account"]["account_handle"] == "@brand_pro_ig"
        assert data["account"]["followers_count"] == 18400


def test_instagram_status(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/instagram/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "instagram"
    assert data["connected"] is True
    assert data["account"]["account_handle"] == "@brand_pro_ig"


def test_instagram_publish_endpoint(client, db_session):
    headers = get_auth_headers(client)
    publish_payload = {
        "content": "Exciting visual update live on Instagram via SocialPilot! 📸✨ #SaaS #Design",
        "title": "Instagram Visual Showcase",
        "post_type": "image",
        "media_urls": ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"]
    }

    # Step 1: container creation response
    mock_container_resp = MagicMock()
    mock_container_resp.ok = True
    mock_container_resp.status_code = 200
    mock_container_resp.json.return_value = {"id": "17998877665544332"}

    # Step 2: publish container response
    mock_publish_resp = MagicMock()
    mock_publish_resp.ok = True
    mock_publish_resp.status_code = 200
    mock_publish_resp.json.return_value = {"id": "18011223344556677"}

    def mock_requests_post(url, *args, **kwargs):
        if "media_publish" in url:
            return mock_publish_resp
        return mock_container_resp

    with patch("requests.post", side_effect=mock_requests_post):
        resp = client.post("/api/instagram/publish", json=publish_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["platform"] == "instagram"
        assert data["external_id"] == "18011223344556677"
        assert "post_id" in data

    # Verify post in DB
    post = db_session.query(Post).filter(Post.id == data["post_id"]).first()
    assert post is not None
    assert post.status == "published"
    assert post.platform == "instagram"
    assert post.external_post_id == "18011223344556677"


def test_instagram_scheduler_publishing(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "instagram"
    ).first()
    assert account is not None

    post = Post(
        user_id=user_id,
        title="Scheduled IG Post",
        content="Automated scheduled post published to Instagram via SocialPilot scheduler! 📱",
        platform="instagram",
        post_type="image",
        media_url="https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
        status="scheduled"
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    target = PostPlatformTarget(
        post_id=post.id,
        platform="instagram",
        social_account_id=account.id,
        status="pending"
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    mock_container_resp = MagicMock()
    mock_container_resp.ok = True
    mock_container_resp.status_code = 200
    mock_container_resp.json.return_value = {"id": "1799999999999"}

    mock_publish_resp = MagicMock()
    mock_publish_resp.ok = True
    mock_publish_resp.status_code = 200
    mock_publish_resp.json.return_value = {"id": "1800000000000"}

    def mock_requests_post(url, *args, **kwargs):
        if "media_publish" in url:
            return mock_publish_resp
        return mock_container_resp

    with patch("requests.post", side_effect=mock_requests_post):
        result = _publish_to_platform_target(target=target, post=post, db=db_session)
        assert result["status"] == "published"
        assert target.status == "published"
        assert target.external_post_id == "1800000000000"


def test_instagram_disconnect(client, db_session):
    headers = get_auth_headers(client)
    resp = client.post("/api/instagram/disconnect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    # Status should report disconnected
    status_resp = client.get("/api/instagram/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["connected"] is False
