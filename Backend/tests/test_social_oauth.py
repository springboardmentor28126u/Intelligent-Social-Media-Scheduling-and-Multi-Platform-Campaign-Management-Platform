import json
import os
import time
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse, urlencode
from cryptography.fernet import Fernet
import models
import social_oauth
import test_roles_api


class SocialOAuthTests(test_roles_api.RoleApiTests):
    def setUp(self):
        super().setUp()
        config = {"SOCIAL_TOKEN_KEY": Fernet.generate_key().decode(), "META_GRAPH_VERSION": "v25.0"}
        for provider in social_oauth.PROVIDERS:
            config.update({provider.upper() + "_CLIENT_ID": "test-id", provider.upper() + "_CLIENT_SECRET": "test-secret",
                           provider.upper() + "_REDIRECT_URI": f"http://localhost:8000/oauth/{provider}/callback"})
        self.config = patch.dict(os.environ, config)
        self.config.start()

    def tearDown(self):
        self.config.stop()
        super().tearDown()

    def begin(self, provider):
        status, result = self.request("POST", f"/oauth/{provider}/authorize", self.user)
        self.assertEqual(status, 200)
        start = urlparse(result["authorization_url"])
        start_params = parse_qs(start.query)
        status, _ = self.request("GET", start.path, query=start.query)
        self.assertEqual(status, 302)
        cookie = next(value.decode().split(";")[0] for key, value in self.response_headers if key == b"set-cookie")
        location = next(value.decode() for key, value in self.response_headers if key == b"location")
        params = parse_qs(urlparse(location).query)
        self.assertEqual(params["state"], start_params["state"])
        return params, cookie

    def finish(self, provider, params, cookie, **extra):
        return self.request("GET", f"/oauth/{provider}/callback", query=urlencode({"state": params["state"][0], "code": "test-code", **extra}), cookie=cookie)

    def test_all_provider_connections_encrypt_and_reconnect(self):
        for provider in social_oauth.PROVIDERS:
            for repeat in range(2):
                params, cookie = self.begin(provider)
                if provider == "x":
                    self.assertEqual(params["code_challenge_method"], ["S256"])
                    self.assertNotIn("code_verifier", params)
                with patch("social_oauth.exchange", return_value=[("external-1", "Actual Account", {"access_token": "sensitive-token", "expires_in": 3600})]):
                    status, result = self.finish(provider, params, cookie)
                self.assertEqual(status, 200)
                self.assertNotIn("sensitive-token", json.dumps(result))
                self.assertEqual(self.db.query(models.SocialCredential).filter_by(provider=provider).count(), 1)
            credential = self.db.query(models.SocialCredential).filter_by(provider=provider).one()
            self.assertNotIn("sensitive-token", credential.encrypted_token)
            self.assertIn("sensitive-token", social_oauth.cipher().decrypt(credential.encrypted_token.encode()).decode())
            self.assertGreater(credential.expires_at, int(time.time()))
            self.assertEqual(self.request("DELETE", f"/accounts/{credential.account_id}", self.user)[0], 200)
            self.assertEqual(self.db.query(models.SocialCredential).filter_by(provider=provider).count(), 0)

    def test_state_browser_binding_replay_and_expiry(self):
        params, cookie = self.begin("x")
        with patch("social_oauth.exchange") as exchange:
            self.assertEqual(self.finish("x", params, "oauth_x=wrong")[0], 400)
            self.assertEqual(self.finish("linkedin", params, cookie)[0], 400)
            exchange.assert_not_called()
        with patch("social_oauth.exchange", return_value=[("id", "Name", {"access_token": "secret"})]) as exchange:
            self.assertEqual(self.finish("x", params, cookie)[0], 200)
            self.assertEqual(self.finish("x", params, cookie)[0], 400)
            exchange.assert_called_once()
        params, cookie = self.begin("x")
        self.db.query(models.OAuthAttempt).update({"expires_at": 1})
        self.db.commit()
        self.assertEqual(self.finish("x", params, cookie)[0], 400)

    def test_denial_and_permission_change(self):
        params, cookie = self.begin("facebook")
        self.assertEqual(self.finish("facebook", params, cookie, error="access_denied")[0], 400)
        params, cookie = self.begin("facebook")
        self.user.role = "business_user"
        self.db.commit()
        with patch("social_oauth.exchange") as exchange:
            self.assertEqual(self.finish("facebook", params, cookie)[0], 403)
            exchange.assert_not_called()

    def test_missing_config_and_manual_accounts(self):
        with patch.dict(os.environ, {"X_CLIENT_SECRET": ""}):
            status, result = self.request("POST", "/oauth/x/authorize", self.user)
            self.assertEqual(status, 503)
            self.assertNotIn("test-secret", json.dumps(result))
        status, account = self.request("POST", "/accounts", self.user, {"platform": "X", "account_name": "Placeholder"})
        self.assertEqual(status, 201)
        self.assertFalse(account["connected"])

    def test_provider_adapters(self):
        profiles = {
            "facebook": {"data": [{"id": "page", "name": "Page", "access_token": "page-token"}]},
            "instagram": {"user_id": "ig", "username": "creator"},
            "linkedin": {"sub": "member", "name": "Member"},
            "x": {"data": {"id": "x-id", "username": "handle"}},
        }
        for provider, profile in profiles.items():
            responses = [{"access_token": "token"}]
            if provider == "instagram":
                responses.append({"access_token": "long-lived-token", "expires_in": 5_184_000})
            if provider == "facebook":
                responses.append({"access_token": "long-lived-user-token", "expires_in": 5_184_000})
            responses.append(profile)
            with patch("social_oauth.provider_request", side_effect=responses) as request:
                result = social_oauth.exchange(provider, "code", "verifier")
                self.assertEqual(len(result), 1)
                self.assertTrue(result[0][0])
                if provider == "facebook":
                    exchange_call = request.call_args_list[1]
                    self.assertIn("grant_type=fb_exchange_token", exchange_call.args[0])
                    self.assertIn("fb_exchange_token=token", exchange_call.args[0])
                    self.assertEqual(request.call_args_list[2].kwargs["token"], "long-lived-user-token")
                if provider == "x":
                    self.assertEqual(request.call_args_list[0].kwargs["data"]["code_verifier"], "verifier")
                    self.assertEqual(request.call_args_list[0].kwargs["basic"], "test-id:test-secret")
