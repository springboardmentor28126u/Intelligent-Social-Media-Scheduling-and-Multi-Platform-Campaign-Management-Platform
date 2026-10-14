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


def test_twitter_connect_url(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/twitter/connect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "twitter"
    assert "auth_url" in data
    assert "state" in data
    assert "redirect_uri" in data
    assert "response_type=code" in data["auth_url"]
    assert "code_challenge=" in data["auth_url"]
    assert "tweet.read" in data["auth_url"]
    assert "tweet.write" in data["auth_url"]


def test_twitter_callback_error(client):
    resp = client.get(
        "/api/twitter/callback?error=access_denied&error_description=The%20user%20denied%20access",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=" in resp.headers["location"]
    assert "platform=twitter" in resp.headers["location"]


def test_twitter_callback_invalid_state(client):
    resp = client.get(
        "/api/twitter/callback?code=some_auth_code&state=invalid_tampered_state",
        follow_redirects=False
    )
    assert resp.status_code == 302
    assert "error=Invalid" in resp.headers["location"] or "error=invalid" in resp.headers["location"]


def test_twitter_callback_success(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    state = create_oauth_state(user_id=user_id, extra_data={"code_verifier": "test_verifier_12345"})

    # Mock token exchange response and user info response
    mock_token_resp = MagicMock()
    mock_token_resp.ok = True
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {
        "access_token": "tw_real_access_token_abc123",
        "refresh_token": "tw_real_refresh_token_xyz789",
        "expires_in": 7200,
        "token_type": "bearer",
        "scope": "tweet.read tweet.write users.read offline.access"
    }

    mock_me_resp = MagicMock()
    mock_me_resp.ok = True
    mock_me_resp.status_code = 200
    mock_me_resp.json.return_value = {
        "data": {
            "id": "14567890123456789",
            "name": "SocialPilot Brand",
            "username": "socialpilot_brand",
            "profile_image_url": "https://pbs.twimg.com/profile_images/sample.jpg",
            "public_metrics": {
                "followers_count": 5420,
                "following_count": 312,
                "tweet_count": 890,
                "listed_count": 14
            }
        }
    }

    def mock_requests_post(*args, **kwargs):
        return mock_token_resp

    def mock_requests_get(*args, **kwargs):
        return mock_me_resp

    with patch("requests.post", side_effect=mock_requests_post), \
         patch("requests.get", side_effect=mock_requests_get):
        resp = client.get(
            f"/social-auth/twitter/callback?code=real_tw_auth_code_999&state={state}",
            follow_redirects=False
        )
        assert resp.status_code == 302
        assert "connected=twitter" in resp.headers["location"]

    # Verify social account created in DB
    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "twitter"
    ).first()
    assert account is not None
    assert account.is_active is True
    assert account.is_demo is False
    assert account.account_name == "SocialPilot Brand"
    assert account.account_handle == "@socialpilot_brand"
    assert account.account_id == "14567890123456789"
    assert account.followers_count == 5420
    assert account.following_count == 312
    assert account.avatar_url == "https://pbs.twimg.com/profile_images/sample.jpg"
    assert account.access_token == "tw_real_access_token_abc123"


def test_twitter_status(client, db_session):
    headers = get_auth_headers(client)
    resp = client.get("/api/twitter/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "twitter"
    assert data["connected"] is True
    assert data["account"]["account_name"] == "SocialPilot Brand"
    assert data["account"]["account_handle"] == "@socialpilot_brand"
    assert data["account"]["followers_count"] == 5420


def test_twitter_sync(client, db_session):
    headers = get_auth_headers(client)

    mock_metrics_resp = MagicMock()
    mock_metrics_resp.ok = True
    mock_metrics_resp.status_code = 200
    mock_metrics_resp.json.return_value = {
        "data": {
            "public_metrics": {
                "followers_count": 5890,
                "following_count": 320,
                "tweet_count": 915
            }
        }
    }

    with patch("requests.get", return_value=mock_metrics_resp):
        resp = client.post("/api/twitter/sync", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["account"]["followers_count"] == 5890


def test_twitter_publish_endpoint(client, db_session):
    headers = get_auth_headers(client)
    publish_payload = {
        "content": "Excited to announce native Twitter / X scheduling and campaign publishing in SocialPilot! 🚀 #SocialPilot #TwitterAPI",
        "title": "SocialPilot Twitter Launch",
        "post_type": "text"
    }

    mock_tweet_resp = MagicMock()
    mock_tweet_resp.ok = True
    mock_tweet_resp.status_code = 201
    mock_tweet_resp.json.return_value = {
        "data": {
            "id": "184000000000000001",
            "text": publish_payload["content"]
        }
    }

    with patch("requests.post", return_value=mock_tweet_resp):
        resp = client.post("/api/twitter/publish", json=publish_payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["platform"] == "twitter"
        assert data["external_id"] == "184000000000000001"
        assert "x.com" in data["url"]

    # Verify post in DB
    post = db_session.query(Post).filter(Post.id == data["post_id"]).first()
    assert post is not None
    assert post.status == "published"
    assert post.platform == "twitter"
    assert post.external_post_id == "184000000000000001"


def test_twitter_scheduler_publishing(client, db_session):
    headers = get_auth_headers(client)
    me_resp = client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    account = db_session.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "twitter"
    ).first()
    assert account is not None

    post = Post(
        user_id=user_id,
        title="Scheduled Tweet Post",
        content="Automated scheduled tweet delivered via SocialPilot scheduler! 🎯",
        platform="twitter",
        post_type="text",
        status="scheduled"
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    target = PostPlatformTarget(
        post_id=post.id,
        platform="twitter",
        social_account_id=account.id,
        status="pending"
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    mock_tweet_resp = MagicMock()
    mock_tweet_resp.ok = True
    mock_tweet_resp.status_code = 201
    mock_tweet_resp.json.return_value = {
        "data": {
            "id": "184000000000000002",
            "text": post.content
        }
    }

    with patch("requests.post", return_value=mock_tweet_resp):
        result = _publish_to_platform_target(target=target, post=post, db=db_session)
        assert result["status"] == "published"
        assert target.status == "published"
        assert target.external_post_id == "184000000000000002"


def test_twitter_disconnect(client, db_session):
    headers = get_auth_headers(client)
    resp = client.post("/api/twitter/disconnect", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    # Status should now report disconnected
    status_resp = client.get("/api/twitter/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["connected"] is False
