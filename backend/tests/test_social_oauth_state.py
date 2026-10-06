from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException

from app.routers.social_accounts import (
    facebook_callback,
    facebook_login,
    validate_frontend_origin,
    verify_oauth_state,
)


def test_facebook_callback_returns_to_origin_used_to_start_oauth(monkeypatch):
    monkeypatch.setenv("FACEBOOK_APP_ID", "test-app-id")
    monkeypatch.setenv("FACEBOOK_APP_SECRET", "test-app-secret")
    monkeypatch.setenv("FACEBOOK_CONFIG_ID", "test-config-id")
    monkeypatch.setenv(
        "FACEBOOK_REDIRECT_URI",
        "https://api.example.test/social-accounts/facebook/callback",
    )
    monkeypatch.setenv("FRONTEND_URLS", "http://localhost:5173")

    login_response = facebook_login(
        current_user_id=7,
        frontend_origin="http://localhost:5173",
    )
    authorization_params = parse_qs(
        urlparse(login_response["authorization_url"]).query
    )
    state = authorization_params["state"][0]

    assert verify_oauth_state(state, "test-app-secret")[0] == 7
    assert verify_oauth_state(state, "test-app-secret")[2] == (
        "http://localhost:5173"
    )

    callback_response = facebook_callback(
        state=state,
        error="access_denied",
        db=None,
    )

    assert urlparse(callback_response.headers["location"]).netloc == (
        "localhost:5173"
    )


def test_frontend_origin_validation_rejects_unlisted_origin(monkeypatch):
    monkeypatch.setenv("FRONTEND_URLS", "https://socialpilot.example")

    with pytest.raises(HTTPException) as error:
        validate_frontend_origin("https://untrusted.example")

    assert error.value.status_code == 400
