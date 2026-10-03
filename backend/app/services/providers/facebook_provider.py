"""
Facebook Graph API Provider for SocialPilot.

Supports Meta Facebook Page integration via Meta Graph API v19.0+.

Capabilities:
1. OAuth URL generation with Page management scopes:
   - pages_show_list
   - pages_read_engagement
   - pages_manage_posts
2. Code exchange for long-lived user token and Page Access Token discovery
3. Fetching user's managed Facebook Pages (Page ID, Page Name, Page Access Token)
4. Publishing text posts (POST /{page_id}/feed) and image posts (POST /{page_id}/photos)
5. Token verification & page health check against Meta Graph API
6. Live page follower/fan metrics fetching
7. Demo mode fallback when unconfigured
"""
import uuid
import random
from typing import Dict, Any, Optional, List
from app.services.providers.base import SocialProvider, PublishResult
from app.core.config import settings

try:
    import requests as _requests
    _requests_available = True
except ImportError:
    _requests_available = False

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"


class FacebookProvider(SocialProvider):
    """Facebook Graph API Provider for SocialPilot."""

    @property
    def platform_name(self) -> str:
        return "facebook"

    def _get_app_id(self) -> str:
        raw_id = (
            getattr(settings, "FACEBOOK_CLIENT_ID", "") or
            getattr(settings, "FACEBOOK_APP_ID", "") or
            getattr(settings, "META_APP_ID", "") or
            ""
        )
        return str(raw_id).strip().strip("'").strip('"')

    def _get_app_secret(self) -> str:
        raw_secret = (
            getattr(settings, "FACEBOOK_CLIENT_SECRET", "") or
            getattr(settings, "FACEBOOK_APP_SECRET", "") or
            getattr(settings, "META_APP_SECRET", "") or
            ""
        )
        return str(raw_secret).strip().strip("'").strip('"')

    def _get_config_id(self) -> str:
        raw_config = getattr(settings, "FACEBOOK_CONFIG_ID", "") or ""
        return str(raw_config).strip().strip("'").strip('"')

    def _get_redirect_uri(self) -> str:
        return (
            getattr(settings, "FACEBOOK_REDIRECT_URI", "") or
            f"{settings.BACKEND_URL}/social-auth/facebook/call"
        )

    def _is_configured(self) -> bool:
        return bool(self._get_app_id() and self._get_app_secret())

    def get_auth_url(self, state: str, redirect_uri: Optional[str] = None) -> str:
        """
        Generate Meta OAuth 2.0 authorization URL for Facebook Page management.
        Supports Meta Login for Business (config_id) and granular scope fallback.
        """
        app_id = self._get_app_id()
        effective_redirect = redirect_uri or self._get_redirect_uri()

        if not app_id:
            return (
                f"https://www.facebook.com/v19.0/dialog/oauth"
                f"?client_id=UNCONFIGURED&redirect_uri={effective_redirect}&state={state}"
            )

        config_id = self._get_config_id()
        if config_id:
            return (
                f"https://www.facebook.com/v19.0/dialog/oauth"
                f"?client_id={app_id}"
                f"&redirect_uri={effective_redirect}"
                f"&config_id={config_id}"
                f"&state={state}"
                f"&response_type=code"
            )

        scopes = (
            getattr(settings, "FACEBOOK_SCOPES", None) or
            "pages_show_list,pages_read_engagement,pages_manage_posts"
        )

        return (
            f"https://www.facebook.com/v19.0/dialog/oauth"
            f"?client_id={app_id}"
            f"&redirect_uri={effective_redirect}"
            f"&scope={scopes}"
            f"&state={state}"
            f"&response_type=code"
        )

    def exchange_code_for_token(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange authorization code for a long-lived User Access Token and retrieve managed Facebook Pages.
        Returns the primary connected page or list of available pages.
        """
        effective_redirect = redirect_uri or self._get_redirect_uri()

        if not _requests_available or code == "demo_code":
            return self._get_demo_token_data()

        app_id = self._get_app_id()
        app_secret = self._get_app_secret()

        if not app_id or not app_secret:
            return self._get_demo_token_data()

        clean_code = code.split("#_")[0]

        try:
            # 1. Exchange auth code for short-lived User Access Token
            token_resp = _requests.get(
                f"{GRAPH_API_BASE}/oauth/access_token",
                params={
                    "client_id": app_id,
                    "client_secret": app_secret,
                    "redirect_uri": effective_redirect,
                    "code": clean_code
                },
                timeout=15
            )

            if not token_resp.ok:
                err_data = token_resp.json() if "application/json" in token_resp.headers.get("content-type", "") else {}
                err_obj = err_data.get("error", {})
                err_msg = err_obj.get("message") or token_resp.text
                err_code = err_obj.get("code")
                err_subcode = err_obj.get("error_subcode")

                if err_code == 100 and "redirect_uri" in err_msg.lower():
                    raise ValueError(f"Facebook Redirect URI Mismatch: {err_msg}")
                elif err_code in [100, 190] and ("code has expired" in err_msg.lower() or "code has already been used" in err_msg.lower()):
                    raise ValueError("Facebook authorization code expired or already used. Please initiate connection again.")
                else:
                    raise ValueError(f"Facebook token exchange failed ({err_code or token_resp.status_code}): {err_msg}")

            token_data = token_resp.json()
            short_token = token_data.get("access_token", "")

            # 2. Exchange for long-lived User Access Token (60 days)
            ll_resp = _requests.get(
                f"{GRAPH_API_BASE}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": app_id,
                    "client_secret": app_secret,
                    "fb_exchange_token": short_token
                },
                timeout=15
            )

            long_user_token = short_token
            expires_in = 5184000
            if ll_resp.ok:
                ll_data = ll_resp.json()
                long_user_token = ll_data.get("access_token", short_token)
                expires_in = ll_data.get("expires_in", 5184000)

            # 3. Retrieve Facebook Pages managed by this user
            pages = self.get_user_pages(long_user_token)

            if not pages:
                # If user has no Facebook pages, fetch user profile info
                me_resp = _requests.get(
                    f"{GRAPH_API_BASE}/me",
                    params={
                        "fields": "id,name,picture.type(large)",
                        "access_token": long_user_token
                    },
                    timeout=15
                )
                me_data = me_resp.json() if me_resp.ok else {}
                user_name = me_data.get("name", "Facebook User")
                avatar_url = None
                if isinstance(me_data.get("picture"), dict):
                    avatar_url = me_data.get("picture", {}).get("data", {}).get("url")

                return {
                    "access_token": long_user_token,
                    "user_access_token": long_user_token,
                    "expires_in": expires_in,
                    "account_name": user_name,
                    "account_handle": f"@{user_name.lower().replace(' ', '_')}",
                    "account_id": str(me_data.get("id", "")),
                    "avatar_url": avatar_url,
                    "followers_count": 0,
                    "available_pages": [],
                    "has_pages": False,
                    "is_demo": False
                }

            # Select the first page by default (or user can select via UI)
            primary_page = pages[0]

            return {
                "access_token": primary_page["access_token"],
                "user_access_token": long_user_token,
                "expires_in": expires_in,
                "account_name": primary_page["name"],
                "account_handle": f"@{primary_page['name'].lower().replace(' ', '_')}",
                "account_id": primary_page["id"],
                "avatar_url": primary_page.get("avatar_url"),
                "followers_count": primary_page.get("followers_count", 0),
                "available_pages": pages,
                "has_pages": True,
                "is_demo": False
            }

        except Exception as e:
            raise ValueError(f"Facebook OAuth error: {str(e)}")

    def get_user_pages(self, user_access_token: str) -> List[Dict[str, Any]]:
        """
        Retrieve all Facebook Pages managed by the authenticated user with page access tokens.
        """
        if not _requests_available or user_access_token.startswith("fb_mock") or user_access_token.startswith("demo"):
            return [
                {
                    "id": f"fb_page_{random.randint(100000, 999999)}",
                    "name": "SocialPilot Demo Page",
                    "category": "Brand / Software",
                    "access_token": f"fb_mock_page_token_{uuid.uuid4().hex[:16]}",
                    "avatar_url": None,
                    "followers_count": 5200,
                    "tasks": ["MANAGE", "CREATE_CONTENT", "MODERATE"]
                }
            ]

        try:
            resp = _requests.get(
                f"{GRAPH_API_BASE}/me/accounts",
                params={
                    "fields": "id,name,access_token,category,picture.type(large),tasks,fan_count,followers_count",
                    "access_token": user_access_token
                },
                timeout=15
            )

            if not resp.ok:
                return []

            data = resp.json()
            raw_pages = data.get("data", [])
            pages = []

            for p in raw_pages:
                avatar_url = None
                pic_data = p.get("picture")
                if isinstance(pic_data, dict):
                    avatar_url = pic_data.get("data", {}).get("url")

                followers = p.get("followers_count") or p.get("fan_count") or 0

                pages.append({
                    "id": str(p.get("id")),
                    "name": p.get("name", "Facebook Page"),
                    "category": p.get("category", ""),
                    "access_token": p.get("access_token", user_access_token),
                    "avatar_url": avatar_url,
                    "followers_count": followers,
                    "tasks": p.get("tasks", [])
                })

            return pages
        except Exception:
            return []

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Facebook long-lived tokens / Page tokens remain valid until revoked."""
        return {"access_token": refresh_token, "expires_in": 5184000}

    def verify_token(
        self,
        access_token: Optional[str] = None,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify Facebook Page token with Meta Graph API.
        Returns token health, page details, and follower count.
        """
        token = access_token
        if not token:
            return {
                "valid": False,
                "configured": False,
                "error": "No Facebook access token provided",
                "account": None
            }

        if token.startswith("fb_mock") or token.startswith("demo"):
            return {
                "valid": True,
                "configured": True,
                "is_demo": True,
                "account": {
                    "id": page_id or "fb_page_demo",
                    "name": "SocialPilot Demo Page",
                    "username": "socialpilot_page",
                    "profile_picture_url": None,
                    "followers_count": 5200,
                    "fan_count": 5200
                }
            }

        if not _requests_available:
            return {
                "valid": False,
                "error": "HTTP client library 'requests' not installed",
                "account": None
            }

        try:
            target_id = page_id or "me"
            resp = _requests.get(
                f"{GRAPH_API_BASE}/{target_id}",
                params={
                    "fields": "id,name,fan_count,followers_count,picture.type(large),link",
                    "access_token": token
                },
                timeout=15
            )
            data = resp.json()

            if resp.status_code == 200 and "error" not in data:
                avatar_url = None
                pic_data = data.get("picture")
                if isinstance(pic_data, dict):
                    avatar_url = pic_data.get("data", {}).get("url")

                followers = data.get("followers_count") or data.get("fan_count") or 0

                return {
                    "valid": True,
                    "configured": True,
                    "is_demo": False,
                    "account": {
                        "id": str(data.get("id", target_id)),
                        "name": data.get("name", "Facebook Page"),
                        "username": str(data.get("id")),
                        "profile_picture_url": avatar_url,
                        "followers_count": followers,
                        "fan_count": data.get("fan_count", 0),
                        "link": data.get("link")
                    }
                }

            err_obj = data.get("error", {})
            err_code = err_obj.get("code")
            err_subcode = err_obj.get("error_subcode")
            err_msg = err_obj.get("message", "Token verification failed")

            if err_code in [190, 102] or err_subcode == 463:
                user_friendly_err = f"Facebook Page access token is expired or revoked ({err_msg})."
            elif err_code in [200, 10]:
                user_friendly_err = f"Facebook Page permissions missing: {err_msg}."
            else:
                user_friendly_err = f"Meta Graph API error ({err_code}): {err_msg}"

            return {
                "valid": False,
                "configured": True,
                "error": user_friendly_err,
                "error_code": err_code,
                "account": None
            }

        except Exception as e:
            return {
                "valid": False,
                "configured": True,
                "error": f"Failed to connect to Meta Graph API: {str(e)}",
                "account": None
            }

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """Fetch live Page follower metrics from Meta Graph API."""
        if not _requests_available or access_token.startswith("fb_mock") or access_token.startswith("demo"):
            return {"followers": 5200, "following": 0, "engagement_rate": 4.2}

        try:
            target = account_id or "me"
            resp = _requests.get(
                f"{GRAPH_API_BASE}/{target}",
                params={"fields": "fan_count,followers_count", "access_token": access_token},
                timeout=15
            )
            data = resp.json()
            followers = data.get("followers_count") or data.get("fan_count") or 0
            return {
                "followers": followers,
                "following": 0,
                "engagement_rate": 4.2
            }
        except Exception:
            return {"followers": 0, "following": 0, "engagement_rate": 0.0}

    def _get_public_media_url(self, media_url: str) -> str:
        """Resolve a media URL to a publicly accessible HTTPS/HTTP URL for Meta's servers."""
        import urllib.parse
        if not media_url:
            return ""
        clean_url = str(media_url).strip()

        # 1. Determine public base URL
        public_base = (getattr(settings, "PUBLIC_URL", "") or "").strip().rstrip("/")
        if not public_base:
            for uri in [settings.FACEBOOK_REDIRECT_URI, settings.INSTAGRAM_REDIRECT_URI]:
                if uri and "://" in uri:
                    parsed = urllib.parse.urlparse(uri)
                    if parsed.hostname and parsed.hostname not in ("localhost", "127.0.0.1"):
                        public_base = f"{parsed.scheme}://{parsed.netloc}"
                        break
        if not public_base:
            public_base = settings.BACKEND_URL.rstrip("/")

        # 2. Convert relative path
        if clean_url.startswith("/"):
            return f"{public_base}{clean_url}"

        # 3. Rewrite localhost URLs to public base URL
        parsed_media = urllib.parse.urlparse(clean_url)
        if parsed_media.hostname in ("localhost", "127.0.0.1"):
            query_str = f"?{parsed_media.query}" if parsed_media.query else ""
            return f"{public_base}{parsed_media.path}{query_str}"

        return clean_url

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        """
        Publish post to Facebook Page:
        - Image post: POST /{page_id}/photos (url=media_url, caption=content)
        - Video post: POST /{page_id}/videos (file_url=media_url, description=content)
        - Text post: POST /{page_id}/feed (message=content)
        """
        if not _requests_available or access_token.startswith("fb_mock") or access_token.startswith("demo"):
            return self._demo_publish(content, media_urls)

        page_id = (options or {}).get("page_id") or "me"

        # Check if media is attached
        has_media = bool(media_urls and len(media_urls) > 0)
        raw_media = media_urls[0] if has_media else None
        primary_media = self._get_public_media_url(raw_media) if raw_media else None

        is_video = (
            post_type == "video" or
            (primary_media and any(primary_media.lower().endswith(ext) for ext in [".mp4", ".mov", ".m4v", ".webm"]))
        )


        try:
            if is_video and primary_media:
                # ── Facebook Video Publishing ────────────────────────────────
                video_url = f"{GRAPH_API_BASE}/{page_id}/videos"
                resp = _requests.post(
                    video_url,
                    data={
                        "description": content,
                        "file_url": primary_media,
                        "access_token": access_token
                    },
                    timeout=45
                )
            elif primary_media:
                # ── Facebook Photo Publishing ────────────────────────────────
                photo_url = f"{GRAPH_API_BASE}/{page_id}/photos"
                resp = _requests.post(
                    photo_url,
                    data={
                        "caption": content,
                        "url": primary_media,
                        "access_token": access_token
                    },
                    timeout=30
                )
            else:
                # ── Facebook Text Post Publishing ────────────────────────────
                feed_url = f"{GRAPH_API_BASE}/{page_id}/feed"
                resp = _requests.post(
                    feed_url,
                    data={
                        "message": content,
                        "access_token": access_token
                    },
                    timeout=30
                )

            data = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}

            if resp.status_code == 200 and ("id" in data or "post_id" in data):
                post_id = data.get("post_id") or data.get("id")
                return PublishResult(
                    success=True,
                    external_id=str(post_id),
                    url=f"https://facebook.com/{post_id}",
                    response_payload={
                        "id": post_id,
                        "platform": "facebook",
                        "page_id": page_id,
                        "raw": data
                    }
                )

            # Error handling from Graph API response
            err_obj = data.get("error", {})
            err_msg = err_obj.get("message") or resp.text or "Unknown Facebook API error"
            err_code = err_obj.get("code")

            if err_code in [190, 102]:
                err_msg = f"Facebook Page token expired or invalid: {err_msg}"
            elif err_code == 200:
                err_msg = f"Missing permission to publish on Facebook Page: {err_msg}"

            return PublishResult(
                success=False,
                error_message=f"Facebook API error ({err_code or resp.status_code}): {err_msg}",
                response_payload=data
            )

        except Exception as e:
            error_msg = str(e)
            try:
                if hasattr(e, 'response') and e.response is not None:
                    err_data = e.response.json()
                    error_msg = err_data.get("error", {}).get("message", error_msg)
            except Exception:
                pass
            return PublishResult(
                success=False,
                error_message=f"Facebook API request failed: {error_msg}"
            )

    def _demo_publish(self, content: str, media_urls: Optional[List[str]]) -> PublishResult:
        external_id = f"fb_post_{random.randint(100000000, 999999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://facebook.com/posts/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "facebook",
                "demo": True,
                "reach": random.randint(1200, 4800),
                "likes": random.randint(45, 320),
                "comments": random.randint(5, 42)
            }
        )

    def _get_demo_token_data(self) -> Dict[str, Any]:
        demo_page_id = f"fb_page_{random.randint(100000, 999999)}"
        return {
            "access_token": f"fb_mock_page_token_{uuid.uuid4().hex[:16]}",
            "user_access_token": f"fb_mock_user_token_{uuid.uuid4().hex[:16]}",
            "expires_in": 5184000,
            "account_name": "SocialPilot Facebook Page",
            "account_handle": "@socialpilot_page",
            "account_id": demo_page_id,
            "avatar_url": None,
            "followers_count": 5200,
            "available_pages": [
                {
                    "id": demo_page_id,
                    "name": "SocialPilot Facebook Page",
                    "category": "Software Company",
                    "access_token": f"fb_mock_page_token_{uuid.uuid4().hex[:16]}",
                    "avatar_url": None,
                    "followers_count": 5200,
                    "tasks": ["MANAGE", "CREATE_CONTENT"]
                }
            ],
            "has_pages": True,
            "is_demo": True
        }
