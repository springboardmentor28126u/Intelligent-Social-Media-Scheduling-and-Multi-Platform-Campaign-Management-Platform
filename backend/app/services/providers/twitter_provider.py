"""
Twitter/X API v2 Provider for SocialPilot.

Real publishing and OAuth 2.0 PKCE:
- A Twitter Developer App with 'Read and Write' permissions
- OAuth 2.0 User Context (PKCE)
- Endpoints:
  - Auth: https://twitter.com/i/oauth2/authorize
  - Token exchange & refresh: https://api.twitter.com/2/oauth2/token
  - User profile & metrics: https://api.twitter.com/2/users/me
  - Tweet publishing: https://api.twitter.com/2/tweets

Environment variables needed:
  TWITTER_CLIENT_ID           (OAuth 2.0 Client ID)
  TWITTER_CLIENT_SECRET       (OAuth 2.0 Client Secret)
  TWITTER_REDIRECT_URI        (OAuth 2.0 Callback URL)
"""
import uuid
import random
import hashlib
import base64
from typing import Dict, Any, Optional, List
from app.services.providers.base import SocialProvider, PublishResult
from app.core.config import settings

try:
    import requests as _requests
    _requests_available = True
except ImportError:
    _requests_available = False

TWITTER_API_BASE = "https://api.twitter.com/2"


class TwitterProvider(SocialProvider):
    """Real Twitter/X API v2 provider with OAuth 2.0 PKCE and API v2 Tweet Publishing."""

    @property
    def platform_name(self) -> str:
        return "twitter"

    def _is_configured(self) -> bool:
        return bool(settings.TWITTER_CLIENT_ID and settings.TWITTER_CLIENT_SECRET)

    def get_auth_url(
        self,
        state: str,
        redirect_uri: str,
        code_challenge: Optional[str] = None,
        code_challenge_method: str = "S256"
    ) -> str:
        import urllib.parse
        if not self._is_configured():
            params = {"client_id": "UNCONFIGURED", "redirect_uri": redirect_uri, "state": state}
            return f"https://x.com/i/oauth2/authorize?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

        scopes = getattr(settings, "TWITTER_SCOPES", "tweet.read tweet.write users.read offline.access")
        challenge = code_challenge or "challenge"
        method = code_challenge_method or "S256"

        params = {
            "response_type": "code",
            "client_id": settings.TWITTER_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": method
        }
        return f"https://x.com/i/oauth2/authorize?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

    def exchange_code_for_token(
        self,
        code: str,
        redirect_uri: str,
        code_verifier: str = "challenge"
    ) -> Dict[str, Any]:
        if not self._is_configured() or not _requests_available or code == "demo_code":
            return {
                "access_token": f"tw_mock_token_{uuid.uuid4().hex[:16]}",
                "refresh_token": f"tw_mock_ref_{uuid.uuid4().hex[:16]}",
                "account_name": "Demo Twitter Account",
                "account_handle": "@demotwitter",
                "account_id": f"tw_usr_{uuid.uuid4().hex[:8]}",
                "avatar_url": None,
                "followers_count": 1250,
                "following_count": 340,
                "posts_count": 85,
                "is_demo": True
            }

        try:
            credentials = base64.b64encode(
                f"{settings.TWITTER_CLIENT_ID}:{settings.TWITTER_CLIENT_SECRET}".encode()
            ).decode()

            resp = _requests.post(
                "https://api.twitter.com/2/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "code_verifier": code_verifier,
                    "client_id": settings.TWITTER_CLIENT_ID
                },
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=15
            )
            resp.raise_for_status()
            token_data = resp.json()
            access_token = token_data.get("access_token", "")

            # Get user info and metrics
            me_resp = _requests.get(
                f"{TWITTER_API_BASE}/users/me",
                params={"user.fields": "name,username,profile_image_url,public_metrics,verified,description"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15
            )
            me_resp.raise_for_status()
            me_json = me_resp.json()
            me_data = me_json.get("data", {})

            public_metrics = me_data.get("public_metrics", {})
            followers_count = public_metrics.get("followers_count", 0)
            following_count = public_metrics.get("following_count", 0)
            tweet_count = public_metrics.get("tweet_count", 0)

            return {
                "access_token": access_token,
                "refresh_token": token_data.get("refresh_token", ""),
                "expires_in": token_data.get("expires_in", 7200),
                "account_name": me_data.get("name", "Twitter User"),
                "account_handle": f"@{me_data.get('username', '')}" if me_data.get("username") else "@twitter_user",
                "account_id": str(me_data.get("id", "")),
                "avatar_url": me_data.get("profile_image_url"),
                "followers_count": followers_count,
                "following_count": following_count,
                "posts_count": tweet_count,
                "is_demo": False
            }
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, "response") and getattr(e, "response", None) is not None:
                try:
                    err_json = e.response.json()
                    error_msg = err_json.get("error_description") or err_json.get("detail") or err_json.get("error") or str(err_json)
                except Exception:
                    error_msg = e.response.text or str(e)
            raise ValueError(f"Twitter OAuth error: {error_msg}")

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if not self._is_configured() or not _requests_available or refresh_token.startswith("tw_mock"):
            return {"access_token": f"tw_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 7200}
        try:
            credentials = base64.b64encode(
                f"{settings.TWITTER_CLIENT_ID}:{settings.TWITTER_CLIENT_SECRET}".encode()
            ).decode()
            resp = _requests.post(
                "https://api.twitter.com/2/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.TWITTER_CLIENT_ID
                },
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "access_token": data.get("access_token", ""),
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in": data.get("expires_in", 7200)
            }
        except Exception:
            return {"access_token": f"tw_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 7200}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        if not _requests_available or access_token.startswith("tw_mock") or access_token.startswith("demo"):
            return self._demo_publish(content, media_urls)

        try:
            # Enforce Twitter's 280-character limit
            tweet_text = content[:280]
            payload: Dict[str, Any] = {"text": tweet_text}

            resp = _requests.post(
                f"{TWITTER_API_BASE}/tweets",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            tweet_id = data.get("id", "")

            return PublishResult(
                success=True,
                external_id=str(tweet_id),
                url=f"https://x.com/i/web/status/{tweet_id}",
                response_payload={"id": str(tweet_id), "platform": "twitter", "text": data.get("text", tweet_text)}
            )
        except Exception as e:
            error_msg = str(e)
            try:
                if hasattr(e, "response") and getattr(e, "response", None) is not None:
                    err_data = e.response.json()
                    error_msg = err_data.get("detail", err_data.get("title", err_data.get("error", error_msg)))
            except Exception:
                pass
            return PublishResult(success=False, error_message=f"Twitter API error: {error_msg}")

    def _demo_publish(self, content: str, media_urls: Optional[List[str]]) -> PublishResult:
        external_id = f"1768{random.randint(10000000, 99999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://x.com/i/web/status/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "twitter",
                "demo": True,
                "retweets": random.randint(15, 140),
                "likes": random.randint(80, 540)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        if not self._is_configured() or not _requests_available or access_token.startswith("tw_mock") or access_token.startswith("demo"):
            return {"followers": random.randint(5000, 50000), "following": 890, "tweet_count": 4120}

        try:
            resp = _requests.get(
                f"{TWITTER_API_BASE}/users/me",
                params={"user.fields": "public_metrics"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            metrics = data.get("public_metrics", {})
            return {
                "followers": metrics.get("followers_count", 0),
                "following": metrics.get("following_count", 0),
                "tweet_count": metrics.get("tweet_count", 0)
            }
        except Exception:
            return {"followers": 0, "following": 0, "tweet_count": 0}
