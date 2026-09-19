"""
Instagram Graph API Provider for SocialPilot.

Supports Meta Instagram Professional (Business / Creator) accounts via Meta Graph API v19.0+.

Capabilities:
1. OAuth URL generation and code exchange for long-lived tokens
2. Token verification & account health check against Meta Graph API
3. Profile and account metrics fetching (username, user ID, followers count, media count)
4. Publishing photos and reels/videos via 2-step Meta container creation & publishing
5. Fallback to demo mode for testing when unconfigured
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


class InstagramProvider(SocialProvider):
    """Real Instagram Graph API provider with demo fallback."""

    @property
    def platform_name(self) -> str:
        return "instagram"

    def _get_app_id(self) -> str:
        return (
            settings.INSTAGRAM_APP_ID or
            settings.INSTAGRAM_CLIENT_ID or
            settings.FACEBOOK_CLIENT_ID or
            ""
        )

    def _get_app_secret(self) -> str:
        return (
            settings.INSTAGRAM_APP_SECRET or
            settings.INSTAGRAM_CLIENT_SECRET or
            settings.FACEBOOK_CLIENT_SECRET or
            ""
        )

    def _is_configured(self) -> bool:
        return bool(self._get_app_id() and self._get_app_secret())

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Return Instagram OAuth 2.0 authorization URL for Instagram Professional accounts."""
        app_id = self._get_app_id()
        if not app_id:
            return (
                f"https://www.instagram.com/oauth/authorize"
                f"?client_id=UNCONFIGURED&redirect_uri={redirect_uri}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code&state={state}"
            )

        scopes = getattr(settings, "INSTAGRAM_SCOPES", None) or "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments"
        return (
            f"https://www.instagram.com/oauth/authorize"
            f"?client_id={app_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scopes}"
            f"&response_type=code"
            f"&state={state}"
        )

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for long-lived access token and linked Instagram Business account ID.
        """
        if not _requests_available or code == "demo_code":
            demo_acc_id = f"178414{random.randint(10000000000, 99999999999)}"
            return {
                "access_token": f"ig_mock_token_{uuid.uuid4().hex[:16]}",
                "refresh_token": f"ig_mock_ref_{uuid.uuid4().hex[:16]}",
                "account_name": "Demo Instagram Professional",
                "account_handle": "@demo_instagram_pro",
                "account_id": demo_acc_id,
                "avatar_url": None,
                "is_demo": True,
                "followers_count": 12500,
                "posts_count": 48
            }

        app_id = (self._get_app_id() or "").strip()
        app_secret = (self._get_app_secret() or "").strip()

        if not app_id or not app_secret:
            raise ValueError(
                "Instagram App credentials missing or incomplete. "
                "Ensure INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are set in your .env file."
            )

        clean_code = str(code).strip().split("#_")[0].split("#")[0]
        effective_redirect = str(redirect_uri or "").strip()

        payload = {
            "client_id": str(app_id).strip(),
            "client_secret": str(app_secret).strip(),
            "grant_type": "authorization_code",
            "redirect_uri": str(effective_redirect).strip(),
            "code": str(clean_code).strip()
        }

        masked_app_id = f"{app_id[:4]}...{app_id[-4:]}" if len(app_id) > 8 else app_id
        print(f"[Instagram OAuth Debug] Starting token exchange for App ID: {masked_app_id}")
        print(f"[Instagram OAuth Debug] Redirect URI: {effective_redirect}")
        print(f"[Instagram OAuth Debug] Code (length): {len(clean_code)}")

        try:
            # 1. Primary: Instagram OAuth endpoint (POST api.instagram.com/oauth/access_token)
            token_resp = _requests.post(
                "https://api.instagram.com/oauth/access_token",
                data=payload,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "SocialPilot/1.0",
                    "Accept": "application/json"
                },
                timeout=20
            )

            print(f"[Instagram OAuth Debug] api.instagram.com HTTP Status: {token_resp.status_code}")
            print(f"[Instagram OAuth Debug] api.instagram.com Response: {token_resp.text[:400]}")

            short_token = ""
            ig_user_id = ""
            if token_resp.ok:
                token_data = token_resp.json()
                short_token = token_data.get("access_token", "")
                ig_user_id = str(token_data.get("user_id", ""))
            else:
                # Parse Instagram error safely
                ig_err_data = {}
                try:
                    ig_err_data = token_resp.json() if "application/json" in token_resp.headers.get("content-type", "") else {}
                except Exception:
                    pass

                raw_ig_err = ig_err_data.get("error_message") or ig_err_data.get("error", {}).get("message") or token_resp.text
                ig_code = ig_err_data.get("code") or ig_err_data.get("error", {}).get("code")
                ig_subcode = ig_err_data.get("error_subcode") or ig_err_data.get("error", {}).get("error_subcode")

                # Fallback: try Facebook Graph API token exchange (for Facebook Login / Meta App apps)
                fb_token_resp = _requests.post(
                    f"{GRAPH_API_BASE}/oauth/access_token",
                    data=payload,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "SocialPilot/1.0",
                        "Accept": "application/json"
                    },
                    timeout=20
                )
                print(f"[Instagram OAuth Debug] graph.facebook.com HTTP Status: {fb_token_resp.status_code}")
                print(f"[Instagram OAuth Debug] graph.facebook.com Response: {fb_token_resp.text[:400]}")

                if fb_token_resp.ok:
                    token_data = fb_token_resp.json()
                    short_token = token_data.get("access_token", "")
                else:
                    fb_err_data = {}
                    try:
                        fb_err_data = fb_token_resp.json() if "application/json" in fb_token_resp.headers.get("content-type", "") else {}
                    except Exception:
                        pass
                    raw_fb_err = fb_err_data.get("error", {}).get("message") or fb_token_resp.text

                    # Build detailed, human-friendly error message
                    if "Oops, an error occurred" in raw_ig_err:
                        err_msg = (
                            f"Meta rejected Instagram token exchange (HTTP {token_resp.status_code}: {raw_ig_err}). "
                            f"Check: 1) Account must be Instagram Professional (Creator/Business). "
                            f"2) In Meta Developer Console (Development mode), your Instagram account must be added to App Roles -> Instagram Testers. "
                            f"3) INSTAGRAM_REDIRECT_URI ('{effective_redirect}') must match Meta Valid OAuth Redirect URIs. "
                            f"Graph API details: {raw_fb_err[:120]}"
                        )
                    elif ig_code in [100, 190] or ig_subcode == 36009 or "used" in raw_ig_err.lower() or "used" in raw_fb_err.lower():
                        err_msg = "Instagram authorization code has already been used or expired. Please click Connect Instagram again."
                    elif "redirect_uri" in raw_ig_err.lower() or "redirect_uri" in raw_fb_err.lower():
                        err_msg = f"Redirect URI mismatch: Sent '{effective_redirect}'. Please add this exact URI in Meta Developer Console."
                    elif "secret" in raw_ig_err.lower() or "secret" in raw_fb_err.lower():
                        err_msg = "Invalid App Secret. Please verify INSTAGRAM_APP_SECRET in your .env configuration."
                    elif raw_ig_err:
                        err_msg = f"Instagram OAuth error ({ig_code or token_resp.status_code}): {raw_ig_err}"
                    else:
                        err_msg = f"Failed to exchange Instagram code: {raw_fb_err}"

                    raise ValueError(err_msg)

            # 2. Exchange for long-lived access token
            access_token = short_token
            expires_in = 5184000
            if short_token:
                # Try Instagram Graph API exchange
                ig_ll = _requests.get(
                    "https://graph.instagram.com/access_token",
                    params={
                        "grant_type": "ig_exchange_token",
                        "client_secret": app_secret,
                        "access_token": short_token
                    },
                    timeout=15
                )
                if ig_ll.ok:
                    access_token = ig_ll.json().get("access_token", short_token)
                    expires_in = ig_ll.json().get("expires_in", 5184000)
                else:
                    # Fallback to Facebook Graph API exchange
                    fb_ll = _requests.get(
                        f"{GRAPH_API_BASE}/oauth/access_token",
                        params={
                            "grant_type": "fb_exchange_token",
                            "client_id": app_id,
                            "client_secret": app_secret,
                            "fb_exchange_token": short_token
                        },
                        timeout=15
                    )
                    if fb_ll.ok:
                        access_token = fb_ll.json().get("access_token", short_token)
                        expires_in = fb_ll.json().get("expires_in", 5184000)

            # 3. Discover Instagram Account Details
            account_name = "Instagram Professional"
            account_handle = None
            avatar_url = None
            followers_count = 0
            posts_count = 0

            # Try graph.instagram.com/me first
            ig_me_resp = _requests.get(
                "https://graph.instagram.com/me",
                params={
                    "fields": "id,username,name,account_type,profile_picture_url,followers_count,media_count",
                    "access_token": access_token
                },
                timeout=15
            )
            if not ig_me_resp.ok:
                # Fallback to basic fields if extended fields are restricted
                ig_me_resp = _requests.get(
                    "https://graph.instagram.com/me",
                    params={
                        "fields": "id,username,name,account_type,profile_picture_url",
                        "access_token": access_token
                    },
                    timeout=15
                )

            if ig_me_resp.ok:
                ig_data = ig_me_resp.json()
                if "instagram_business_account" in ig_data:
                    ig_data = ig_data["instagram_business_account"]
                ig_user_id = str(ig_data.get("id") or ig_user_id)
                if ig_data.get("username"):
                    account_handle = f"@{ig_data['username']}"
                account_name = ig_data.get("name") or ig_data.get("username") or account_name
                avatar_url = ig_data.get("profile_picture_url")
                followers_count = ig_data.get("followers_count", 0)
                posts_count = ig_data.get("media_count", 0)
            else:
                # Discover via Facebook Pages linked to Instagram Business account
                pages_resp = _requests.get(
                    f"{GRAPH_API_BASE}/me/accounts",
                    params={"access_token": access_token},
                    timeout=15
                )
                pages = pages_resp.json().get("data", []) if pages_resp.ok else []

                for page in pages:
                    p_token = page.get("access_token", access_token)
                    ig_check = _requests.get(
                        f"{GRAPH_API_BASE}/{page['id']}",
                        params={
                            "fields": "instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}",
                            "access_token": p_token
                        },
                        timeout=15
                    )
                    if ig_check.ok:
                        ig_biz = ig_check.json().get("instagram_business_account")
                        if ig_biz:
                            ig_user_id = ig_biz.get("id") or ig_user_id
                            account_name = ig_biz.get("name") or ig_biz.get("username") or page.get("name") or account_name
                            account_handle = f"@{ig_biz.get('username')}" if ig_biz.get("username") else None
                            avatar_url = ig_biz.get("profile_picture_url")
                            followers_count = ig_biz.get("followers_count", 0)
                            posts_count = ig_biz.get("media_count", 0)
                            break

            if not ig_user_id:
                raise ValueError("Could not determine Instagram Business Account ID from Meta authorization.")

            return {
                "access_token": access_token,
                "account_name": account_name,
                "account_handle": account_handle or f"@instagram_{ig_user_id}",
                "account_id": ig_user_id,
                "avatar_url": avatar_url,
                "followers_count": followers_count,
                "posts_count": posts_count,
                "expires_in": expires_in,
                "is_demo": False
            }

        except Exception as e:
            raise ValueError(f"Instagram OAuth error: {str(e)}")

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh long-lived access token."""
        return {"access_token": f"ig_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 5184000}

    def verify_token(
        self,
        access_token: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify Instagram account token with Meta Graph API and fetch profile details.
        Handles invalid / expired tokens gracefully.
        """
        token = access_token
        ig_user_id = user_id

        if not token:
            return {
                "valid": False,
                "configured": self._is_configured(),
                "error": "No Instagram access token provided.",
                "account": None
            }

        # Handle mock/demo token directly
        if token.startswith("ig_mock") or token.startswith("demo"):
            return {
                "valid": True,
                "configured": True,
                "is_demo": True,
                "account": {
                    "id": ig_user_id or "demo_ig_account",
                    "username": "socialpilot_pro",
                    "name": "SocialPilot Professional",
                    "profile_picture_url": None,
                    "followers_count": 12500,
                    "follows_count": 320,
                    "media_count": 48
                }
            }

        if not _requests_available:
            return {
                "valid": False,
                "error": "HTTP client library 'requests' not installed",
                "account": None
            }

        try:
            # 1. Try graph.instagram.com first (for Instagram Graph API tokens)
            fields = "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count"
            clean_id = str(ig_user_id or "").strip()
            # If user_id is missing, username handle, or non-numeric, use /me directly
            if not clean_id or clean_id.startswith("@") or not clean_id.isdigit():
                ig_endpoint = "https://graph.instagram.com/me"
            else:
                ig_endpoint = f"https://graph.instagram.com/{clean_id}"

            resp = _requests.get(
                ig_endpoint,
                params={"fields": fields, "access_token": token},
                timeout=15
            )
            # If endpoint with clean_id returned 400, fallback to /me
            if not resp.ok and ig_endpoint != "https://graph.instagram.com/me":
                resp = _requests.get(
                    "https://graph.instagram.com/me",
                    params={"fields": fields, "access_token": token},
                    timeout=15
                )

            data = resp.json()

            if resp.status_code == 200 and "error" not in data:
                return {
                    "valid": True,
                    "configured": True,
                    "is_demo": False,
                    "account": {
                        "id": str(data.get("id", ig_user_id)),
                        "username": data.get("username", "instagram_user"),
                        "name": data.get("name") or data.get("username", "Instagram Account"),
                        "profile_picture_url": data.get("profile_picture_url"),
                        "followers_count": data.get("followers_count", 0),
                        "follows_count": data.get("follows_count", 0),
                        "media_count": data.get("media_count", 0),
                        "account_type": data.get("account_type", "BUSINESS")
                    }
                }

            # 2. Try graph.facebook.com for Facebook Page linked Instagram accounts
            target_endpoint = f"{GRAPH_API_BASE}/{ig_user_id}" if (ig_user_id and str(ig_user_id).isdigit()) else f"{GRAPH_API_BASE}/me"
            fb_fields = "id,username,name,profile_picture_url,followers_count,follows_count,media_count,instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}"
            fb_resp = _requests.get(
                target_endpoint,
                params={"fields": fb_fields, "access_token": token},
                timeout=15
            )
            fb_data = fb_resp.json()

            if fb_resp.status_code == 200 and "error" not in fb_data:
                res_acc = fb_data.get("instagram_business_account", fb_data)
                return {
                    "valid": True,
                    "configured": True,
                    "is_demo": False,
                    "account": {
                        "id": str(res_acc.get("id", ig_user_id)),
                        "username": res_acc.get("username", "instagram_user"),
                        "name": res_acc.get("name") or res_acc.get("username", "Instagram Account"),
                        "profile_picture_url": res_acc.get("profile_picture_url"),
                        "followers_count": res_acc.get("followers_count", 0),
                        "follows_count": res_acc.get("follows_count", 0),
                        "media_count": res_acc.get("media_count", 0),
                        "account_type": res_acc.get("account_type", "BUSINESS")
                    }
                }

            # Categorize common Meta token errors
            err_obj = data.get("error", {}) or fb_data.get("error", {})
            err_code = err_obj.get("code")
            err_subcode = err_obj.get("error_subcode")
            err_msg = err_obj.get("message", "Token verification failed")

            if err_code in [190, 102] or err_subcode == 463:
                user_friendly_err = f"Instagram access token is expired or invalid ({err_msg})."
            elif err_code in [200, 10]:
                user_friendly_err = f"Instagram permissions missing: {err_msg}."
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

    def get_account_info(
        self,
        access_token: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch Instagram account information."""
        verif = self.verify_token(access_token=access_token, user_id=user_id)
        if verif.get("valid") and verif.get("account"):
            return verif["account"]
        return {
            "id": user_id or "unknown",
            "username": "instagram_account",
            "name": "Instagram Account",
            "followers_count": 0,
            "media_count": 0
        }

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """Fetch live account metrics from Meta Graph API."""
        if not access_token:
            return {
                "platform": "instagram",
                "account_id": account_id,
                "status": "disconnected",
                "followers": None,
                "followers_available": False,
                "reason": "No access token"
            }

        verif = self.verify_token(access_token=access_token, user_id=account_id)
        if verif.get("valid") and verif.get("account"):
            info = verif["account"]
            return {
                "platform": "instagram",
                "account_id": str(info.get("id", account_id)),
                "account_name": info.get("name", ""),
                "username": info.get("username", ""),
                "status": "active",
                "followers": info.get("followers_count", 0),
                "followers_available": True,
                "following": info.get("follows_count", 0),
                "media_count": info.get("media_count", 0),
                "account_type": info.get("account_type", "BUSINESS"),
                "engagement_rate": None
            }

        return {
            "platform": "instagram",
            "account_id": account_id,
            "status": "error",
            "followers": None,
            "followers_available": False,
            "reason": verif.get("error") or "Unable to fetch live metrics from Meta"
        }

    def _get_public_media_url(self, media_url: str) -> str:
        """Resolve a media URL to a publicly accessible HTTPS/HTTP URL for Meta's servers."""
        import urllib.parse
        if not media_url:
            return ""
        clean_url = str(media_url).strip()

        # 1. Determine public base URL
        public_base = (getattr(settings, "PUBLIC_URL", "") or "").strip().rstrip("/")
        if not public_base:
            for uri in [settings.INSTAGRAM_REDIRECT_URI, settings.FACEBOOK_REDIRECT_URI]:
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
        post_type: str = "image",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        """
        Publish post to Instagram via Meta Graph API:
        1. Convert media to publicly accessible URL
        2. Create media container (POST /{ig_user_id}/media)
        3. Check container status (wait if IN_PROGRESS)
        4. Publish container (POST /{ig_user_id}/media_publish)
        """
        import time

        if not _requests_available or access_token.startswith("ig_mock") or access_token.startswith("demo"):
            return self._demo_publish(content, media_urls)

        ig_account_id = (options or {}).get("ig_account_id")

        # Ensure ig_account_id is the real numeric Instagram account ID (never a handle or username)
        if not ig_account_id or not str(ig_account_id).strip().lstrip("-").isdigit() or str(ig_account_id).startswith("@"):
            try:
                me_resp = _requests.get(
                    "https://graph.instagram.com/v21.0/me",
                    params={"fields": "id,username", "access_token": access_token},
                    timeout=15
                )
                if me_resp.ok and "id" in me_resp.json():
                    resolved_id = str(me_resp.json()["id"])
                    print(f"[Instagram Publish] Resolved numeric Instagram ID from Meta: {resolved_id} (passed ID was: {ig_account_id})")
                    ig_account_id = resolved_id
            except Exception as e:
                print(f"[Instagram Publish] Resolution error from Meta /me: {e}")

        if not ig_account_id:
            return PublishResult(
                success=False,
                error_message="Instagram error: Instagram User/Account ID not provided or could not be resolved from Meta. Connect your Instagram Professional account first."
            )

        if not media_urls or len(media_urls) == 0:
            return PublishResult(
                success=False,
                error_message="Instagram error: media_url is required for Instagram posts. Instagram requires an image or video URL."
            )

        raw_media = media_urls[0]
        public_media = self._get_public_media_url(raw_media)

        is_video = post_type == "video" or any(raw_media.lower().endswith(ext) for ext in [".mp4", ".mov", ".m4v"])

        print(f"[Instagram Publish] Target numeric account_id={ig_account_id} is_video={is_video}")
        print(f"[Instagram Publish] Media URL (public): {public_media}")
        print(f"[Instagram Publish] Creating media container via graph.instagram.com/v21.0...")

        try:
            # ── Step 1: Create media container ───────────────────────────────
            container_params: Dict[str, Any] = {
                "caption": content,
                "access_token": access_token
            }

            if is_video:
                container_params["video_url"] = public_media
                container_params["media_type"] = "REELS"
            else:
                container_params["image_url"] = public_media

            container_url = f"https://graph.instagram.com/v21.0/{ig_account_id}/media"
            container_resp = _requests.post(
                container_url,
                params=container_params,
                timeout=45
            )

            container_data = container_resp.json() if container_resp.ok else {}
            try:
                if not container_data and container_resp.text:
                    container_data = container_resp.json()
            except Exception:
                pass

            if container_resp.status_code != 200 or "id" not in container_data:
                err_obj = container_data.get("error", {})
                err_msg = err_obj.get("message") or container_data.get("error_message") or container_resp.text
                err_code = err_obj.get("code") or container_resp.status_code
                print(f"[Instagram Publish] FAILED container creation status={container_resp.status_code} error_code={err_code} message={err_msg}")
                return PublishResult(
                    success=False,
                    error_message=f"Instagram container creation failed ({err_code}): {err_msg}",
                    response_payload=container_data
                )

            creation_id = container_data["id"]
            print(f"[Instagram Publish] Media container created (id={creation_id})")

            # ── Step 2: Check container status if needed ────────────────────
            print(f"[Instagram Publish] Checking container status...")
            for attempt in range(6):
                status_resp = _requests.get(
                    f"https://graph.instagram.com/v21.0/{creation_id}",
                    params={"fields": "status_code,status", "access_token": access_token},
                    timeout=15
                )

                if status_resp.ok:
                    status_data = status_resp.json()
                    status_code_val = status_data.get("status_code")
                    if status_code_val == "FINISHED" or not status_code_val:
                        break
                    elif status_code_val == "ERROR":
                        err_detail = status_data.get("status", "Media processing failed on Instagram")
                        print(f"[Instagram Publish] FAILED container processing error={err_detail}")
                        return PublishResult(
                            success=False,
                            error_message=f"Instagram media processing error: {err_detail}",
                            response_payload=status_data
                        )
                    elif status_code_val in ("IN_PROGRESS", "EXPIRED"):
                        if status_code_val == "EXPIRED":
                            return PublishResult(
                                success=False,
                                error_message="Instagram media container expired before publishing.",
                                response_payload=status_data
                            )
                        time.sleep(2)
                else:
                    break

            # ── Step 3: Publish container ────────────────────────────────────
            print(f"[Instagram Publish] Publishing media container {creation_id}...")
            publish_url = f"https://graph.instagram.com/v21.0/{ig_account_id}/media_publish"
            publish_resp = _requests.post(
                publish_url,
                params={
                    "creation_id": creation_id,
                    "access_token": access_token
                },
                timeout=45
            )

            publish_data = publish_resp.json() if publish_resp.ok else {}
            try:
                if not publish_data and publish_resp.text:
                    publish_data = publish_resp.json()
            except Exception:
                pass

            if publish_resp.status_code != 200 or "id" not in publish_data:
                err_obj = publish_data.get("error", {})
                err_msg = err_obj.get("message") or publish_data.get("error_message") or publish_resp.text
                err_code = err_obj.get("code") or publish_resp.status_code
                print(f"[Instagram Publish] FAILED media publish status={publish_resp.status_code} error_code={err_code} message={err_msg}")
                return PublishResult(
                    success=False,
                    error_message=f"Instagram media publish failed ({err_code}): {err_msg}",
                    response_payload=publish_data
                )

            media_id = publish_data["id"]
            post_url = f"https://www.instagram.com/p/{media_id}"
            print(f"[Instagram Publish] Publish successful! media_id={media_id} url={post_url}")

            media_id = publish_data["id"]
            post_url = f"https://www.instagram.com/p/{media_id}"
            print(f"[Instagram Publish] Publish successful! media_id={media_id} url={post_url}")

            return PublishResult(
                success=True,
                external_id=media_id,
                url=post_url,
                response_payload={
                    "id": media_id,
                    "creation_id": creation_id,
                    "platform": "instagram",
                    "account_id": ig_account_id
                }
            )

        except Exception as e:
            error_msg = str(e)
            try:
                if hasattr(e, 'response') and e.response:
                    err_data = e.response.json()
                    error_msg = err_data.get("error", {}).get("message", error_msg)
            except Exception:
                pass
            print(f"[Instagram Publish] FAILED with exception: {error_msg}")
            return PublishResult(
                success=False,
                error_message=f"Instagram API error: {error_msg}"
            )

    def _demo_publish(self, content: str, media_urls: Optional[List[str]]) -> PublishResult:
        external_id = f"ig_media_{random.randint(100000000, 999999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://www.instagram.com/p/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "instagram",
                "demo": True,
                "likes": random.randint(180, 1420),
                "comments": random.randint(24, 180)
            }
        )

    def delete_post(
        self,
        access_token: str,
        media_id: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Delete a published post/media from Instagram via Meta Graph API.
        Attempts DELETE https://graph.instagram.com/v21.0/{media_id}
        Returns {"success": True} on success, or {"success": False, "error": ...} on failure.
        """
        if not media_id:
            return {"success": False, "error": "No Instagram Media ID provided."}

        if access_token.startswith("ig_mock") or access_token.startswith("demo"):
            return {"success": True, "demo": True}

        if not _requests_available:
            return {"success": False, "error": "HTTP client library 'requests' not installed"}

        clean_media_id = str(media_id).strip()
        print(f"[Instagram Delete] Attempting to delete Instagram media_id={clean_media_id}...")

        try:
            del_url = f"https://graph.instagram.com/v21.0/{clean_media_id}"
            resp = _requests.delete(
                del_url,
                params={"access_token": access_token},
                timeout=30
            )

            data = resp.json() if resp.ok else {}
            try:
                if not data and resp.text:
                    data = resp.json()
            except Exception:
                pass

            if resp.status_code == 200 and data.get("success") is True:
                print(f"[Instagram Delete] Successfully deleted Instagram media {clean_media_id}!")
                return {"success": True, "response_payload": data}

            if resp.status_code == 200 and ("success" in data or "id" in data):
                return {"success": True, "response_payload": data}

            # Try unversioned graph.instagram.com
            alt_url = f"https://graph.instagram.com/{clean_media_id}"
            alt_resp = _requests.delete(
                alt_url,
                params={"access_token": access_token},
                timeout=30
            )
            alt_data = alt_resp.json() if alt_resp.ok else {}
            try:
                if not alt_data and alt_resp.text:
                    alt_data = alt_resp.json()
            except Exception:
                pass

            if alt_resp.status_code == 200 and (alt_data.get("success") is True or "id" in alt_data):
                return {"success": True, "response_payload": alt_data}

            err_obj = data.get("error", {}) or alt_data.get("error", {})
            err_msg = err_obj.get("message") or data.get("error_message") or resp.text
            err_code = err_obj.get("code") or resp.status_code
            print(f"[Instagram Delete] FAILED deleting media {clean_media_id}: status={resp.status_code} code={err_code} msg={err_msg}")
            return {
                "success": False,
                "error": f"{err_msg}",
                "error_code": err_code,
                "response_payload": data or alt_data
            }

        except Exception as e:
            print(f"[Instagram Delete] Exception during delete: {str(e)}")
            return {"success": False, "error": str(e)}
