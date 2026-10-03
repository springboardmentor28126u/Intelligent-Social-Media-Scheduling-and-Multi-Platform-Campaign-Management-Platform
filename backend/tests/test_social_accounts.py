import pytest
from models import SocialAccount


def test_get_social_accounts_empty(client, test_user):
    resp = client.get("/social-accounts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_connect_platform_keys_twitter(client, test_user):
    resp = client.post(
        "/platforms/connect-keys",
        json={
            "platform": "twitter",
            "account_name": "Socialpilot_22",
            "credentials": {
                "bearer_token": "AAAAAAAAAAAAAAAAAAAAA_TEST_BEARER_TOKEN_2026",
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    assert "account" in data
    assert data["account"]["platform"] == "twitter"


def test_connect_platform_keys_instagram(client, test_user):
    resp = client.post(
        "/platforms/connect-keys",
        json={
            "platform": "instagram",
            "account_name": "Socialpilot_22",
            "credentials": {
                "access_token": "EAAG_TEST_INSTAGRAM_PAGE_ACCESS_TOKEN_2026",
                "instagram_account_id": "17841400192837465",
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    assert data["account"]["platform"] == "instagram"


def test_get_platforms_config(client, test_user):
    resp = client.get("/platforms/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "instagram" in data
    assert "twitter" in data
    assert "linkedin" in data
    assert "facebook" in data
    assert "youtube" in data
    assert "pinterest" in data


def test_delete_social_account(client, db_session, test_user):
    acc = SocialAccount(
        user_id=test_user.id,
        platform="pinterest",
        account_name="Socialpilot_22",
        status="connected",
        is_active=True,
    )
    db_session.add(acc)
    db_session.commit()
    db_session.refresh(acc)

    del_resp = client.delete(f"/social-accounts/{acc.id}")
    assert del_resp.status_code == 200
    assert del_resp.json().get("success") is True
