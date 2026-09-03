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


def test_linkedin_connect_url(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/linkedin/connect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "linkedin"
    assert "auth_url" in data
    assert "state" in data
    assert "redirect_uri" in data
    assert "response_type=code" in data["auth_url"]
    assert "w_member_social" in data["auth_url"]


def test_linkedin_callback_error(client):
    resp = client.get(
        "/api/linkedin/callback?error=user_cancelled_login&error_description=User%20denied%20access",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=" in resp.headers["location"]
    assert "platform=linkedin" in resp.headers["location"]


def test_linkedin_callback_invalid_state(client):
    resp = client.get(
        "/api/linkedin/callback?code=some_auth_code&state=invalid_tampered_state",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=Invalid" in resp.headers["location"] or "error=invalid" in resp.headers["location"]


def test_linkedin_callback_success(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    state = create_oauth_state(user_id=user_id)

    # Mock token exchange response and userinfo response
    mock_token_resp = MagicMock()
    mock_token_resp.ok = True
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {
        "access_token": "real_li_access_token_sample",
        "refresh_token": "real_li_refresh_token_sample",
        "expires_in": 5184000,
        "scope": "w_member_social openid profile email"
    }

    mock_userinfo_resp = MagicMock()
    mock_userinfo_resp.ok = True
    mock_userinfo_resp.status_code = 200
    mock_userinfo_resp.json.return_value = {
        "sub": "linkedin_member_sub_12345",
        "name": "Jane Doe",
        "given_name": "Jane",
        "family_name": "Doe",
        "email": "jane.doe@example.com",
        "picture": "https://media.licdn.com/dms/image/v2/test.jpg"
    }

    def mock_requests_post(*args, **kwargs):
        return mock_token_resp

    def mock_requests_get(*args, **kwargs):
        return mock_userinfo_resp

    with patch("requests.post", side_effect=mock_requests_post), \
         patch("requests.get", side_effect=mock_requests_get):
        resp = client.get(
            f"/api/linkedin/callback?code=real_auth_code_from_linkedin&state={state}",
            follow_redirects=False
        )
        assert resp.status_code == 302
        assert "connected=linkedin" in resp.headers["location"]

    # Verify social account created in DB with real OpenID claims
    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "linkedin"
    ).first()
    assert account is not None
    assert account.is_active is True
    assert account.is_demo is False
    assert account.account_name == "Jane Doe"
    assert account.account_id == "urn:li:person:linkedin_member_sub_12345"
    assert account.avatar_url == "https://media.licdn.com/dms/image/v2/test.jpg"
    assert account.access_token == "real_li_access_token_sample"


def test_linkedin_status(client, db_session):
    headers = get_auth_headers(client)
    resp = client.get("/api/linkedin/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "linkedin"
    assert data["connected"] is True
    assert data["account"]["account_name"] == "Jane Doe"


def test_linkedin_publish_endpoint(client, db_session):
    headers = get_auth_headers(client)
    publish_payload = {
        "content": "Exciting news! We are launching SocialPilot 2.0 with native LinkedIn publishing! #LinkedIn #SaaS",
        "title": "SocialPilot 2.0 LinkedIn Launch",
        "post_type": "text"
    }

    mock_rest_resp = MagicMock()
    mock_rest_resp.ok = True
    mock_rest_resp.status_code = 201
    mock_rest_resp.headers = {"x-restli-id": "urn:li:share:7123456789"}
    mock_rest_resp.text = '{"id":"urn:li:share:7123456789"}'
    mock_rest_resp.json.return_value = {"id": "urn:li:share:7123456789"}

    with patch("requests.post", return_value=mock_rest_resp):
        resp = client.post("/api/linkedin/publish", json=publish_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["platform"] == "linkedin"
        assert "external_id" in data
        assert "post_id" in data

    # Verify post in DB
    post = db_session.query(Post).filter(Post.id == data["post_id"]).first()
    assert post is not None
    assert post.status == "published"
    assert post.platform == "linkedin"


def test_linkedin_scheduler_publishing(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "linkedin"
    ).first()
    assert account is not None

    # Create scheduled post and platform target
    post = Post(
        user_id=user_id,
        title="Scheduled LinkedIn Post",
        content="Automated scheduled post published to LinkedIn via SocialPilot scheduler! 🚀",
        platform="linkedin",
        post_type="text",
        status="scheduled"
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    target = PostPlatformTarget(
        post_id=post.id,
        platform="linkedin",
        social_account_id=account.id,
        status="pending"
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    mock_rest_resp = MagicMock()
    mock_rest_resp.ok = True
    mock_rest_resp.status_code = 201
    mock_rest_resp.headers = {"x-restli-id": "urn:li:share:7999888111"}
    mock_rest_resp.text = '{"id":"urn:li:share:7999888111"}'
    mock_rest_resp.json.return_value = {"id": "urn:li:share:7999888111"}

    with patch("requests.post", return_value=mock_rest_resp):
        # Trigger scheduler platform target publishing
        result = _publish_to_platform_target(target=target, post=post, db=db_session)
        assert result["status"] == "published"
        assert target.status == "published"
        assert target.external_post_id is not None


def test_linkedin_disconnect(client, db_session):
    headers = get_auth_headers(client)
    resp = client.post("/api/linkedin/disconnect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    # Status should now report disconnected
    status_resp = client.get("/api/linkedin/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["connected"] is False

