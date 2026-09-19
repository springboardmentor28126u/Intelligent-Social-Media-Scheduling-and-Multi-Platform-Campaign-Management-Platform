"""
LinkedIn API Provider for SocialPilot.

Real publishing and OAuth integration:
- OAuth 2.0 Authorization Code flow with LinkedIn OpenID Connect
- Scopes: 'w_member_social', 'openid', 'profile', 'email'
- Profile retrieval: LinkedIn OpenID Connect /v2/userinfo and id_token claims
- Publishing: LinkedIn REST Posts API (/rest/posts) with fallback to UGC Post API (/v2/ugcPosts)

Environment variables required:
  LINKEDIN_CLIENT_ID
  LINKEDIN_CLIENT_SECRET
  LINKEDIN_REDIRECT_URI (default: http://localhost:8000/api/linkedin/callback)
  LINKEDIN_SCOPES (default: w_member_social openid profile email)
"""
import json
import base64
import urllib.parse
from typing import Dict, Any, Optional, List
from app.services.providers.base import SocialProvider, PublishResult
from app.core.config import get_settings

try:
    import requests as _requests
    _requests_available = True
except ImportError:
    _requests_available = False

LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_REST_BASE = "https://api.linkedin.com/rest"
LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2"
LINKEDIN_VERSION = "202601"


def _decode_jwt_payload(jwt_token: str) -> Dict[str, Any]:
    """Safely extract unverified claims from JWT id_token payload without external dependencies."""
    if not jwt_token or not isinstance(jwt_token, str):
        return {}
    try:
        parts = jwt_token.split(".")
        if len(parts) >= 2:
            payload = parts[1]
            rem = len(payload) % 4
            if rem > 0:
                payload += "=" * (4 - rem)
            decoded_bytes = base64.urlsafe_b64decode(payload)
            return json.loads(decoded_bytes.decode("utf-8"))
    except Exception:
        pass
    return {}


class LinkedInProvider(SocialProvider):
    """
    Real LinkedIn API Provider.
    Implements standard LinkedIn OAuth 2.0, OpenID Connect user info, and REST/UGC publishing.
    """

    @property
    def platform_name(self) -> str:
        return "linkedin"

    def _is_configured(self) -> bool:
        cfg = get_settings()
        return bool(cfg.LINKEDIN_CLIENT_ID and cfg.LINKEDIN_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: Optional[str] = None) -> str:
        """
        Generate the LinkedIn OAuth 2.0 authorization URL.
        Properly encodes parameters using urllib.parse.quote so spaces in scopes become %20 (required by LinkedIn OAuth 2.0).
        """
        cfg = get_settings()
        if not cfg.LINKEDIN_CLIENT_ID:
            raise ValueError("LINKEDIN_CLIENT_ID is not configured in environment variables.")

        effective_redirect = (
            redirect_uri
            or cfg.LINKEDIN_REDIRECT_URI
            or "http://localhost:8000/api/linkedin/callback"
        )
        raw_scopes = getattr(cfg, "LINKEDIN_SCOPES", "") or "w_member_social openid profile email r_member_profileAnalytics"
        # Normalize whitespace in scopes
        scopes = " ".join(raw_scopes.split())

        params = {
            "response_type": "code",
            "client_id": cfg.LINKEDIN_CLIENT_ID,
            "redirect_uri": effective_redirect,
            "scope": scopes,
            "state": state
        }
        auth_url = f"{LINKEDIN_AUTH_BASE}/authorization?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

        # Safe debug logging (no secrets printed)
        masked_id = f"{cfg.LINKEDIN_CLIENT_ID[:3]}...{cfg.LINKEDIN_CLIENT_ID[-3:]}" if len(cfg.LINKEDIN_CLIENT_ID) > 6 else "***"
        print(f"[LinkedIn OAuth Debug] client_id (masked): {masked_id}")
        print(f"[LinkedIn OAuth Debug] redirect_uri: {effective_redirect}")
        print(f"[LinkedIn OAuth Debug] scopes: {scopes}")
        print(f"[LinkedIn OAuth Debug] generated authorization URL: {auth_url}")

        return auth_url

    def exchange_code_for_token(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange an OAuth authorization code for real LinkedIn access/refresh tokens
        and fetch the authenticated member's profile via OpenID Connect /userinfo.
        """
        cfg = get_settings()
        if not self._is_configured():
            raise ValueError("LinkedIn API credentials (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET) are not configured.")

        if not _requests_available:
            raise RuntimeError("Python 'requests' package is required for LinkedIn API communication.")

        effective_redirect = (
            redirect_uri
            or cfg.LINKEDIN_REDIRECT_URI
            or "http://localhost:8000/api/linkedin/callback"
        )

        try:
            # 1. Exchange authorization code for access token
            token_resp = _requests.post(
                f"{LINKEDIN_AUTH_BASE}/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": effective_redirect,
                    "client_id": cfg.LINKEDIN_CLIENT_ID,
                    "client_secret": cfg.LINKEDIN_CLIENT_SECRET
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=20
            )

            if not token_resp.ok:
                error_body = token_resp.text
                try:
                    err_json = token_resp.json()
                    error_body = (
                        err_json.get("error_description")
                        or err_json.get("message")
                        or err_json.get("error")
                        or error_body
                    )
                except Exception:
                    pass
                raise ValueError(f"LinkedIn token exchange failed ({token_resp.status_code}): {error_body}")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError("LinkedIn did not return an access token in the response.")

            expires_in = token_data.get("expires_in", 5184000)
            refresh_token = token_data.get("refresh_token")
            id_token = token_data.get("id_token")

            # 2. Retrieve authenticated member information via OpenID Connect /userinfo
            member_sub = ""
            account_name = "LinkedIn Member"
            email = None
            avatar_url = None

            try:
                userinfo_resp = _requests.get(
                    f"{LINKEDIN_API_BASE}/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=15
                )
                if userinfo_resp.ok:
                    profile = userinfo_resp.json()
                    member_sub = profile.get("sub", "")
                    name = profile.get("name")
                    if not name:
                        first = profile.get("given_name", "")
                        last = profile.get("family_name", "")
                        name = f"{first} {last}".strip()
                    if name:
                        account_name = name
                    email = profile.get("email")
                    avatar_url = profile.get("picture")
            except Exception:
                pass

            # 3. Fallback: parse claims from id_token if userinfo didn't resolve member sub
            if not member_sub and id_token:
                claims = _decode_jwt_payload(id_token)
                if claims.get("sub"):
                    member_sub = claims["sub"]
                    account_name = claims.get("name", account_name)
                    avatar_url = claims.get("picture", avatar_url)
                    email = claims.get("email", email)

            # 4. Fallback: legacy /v2/me endpoint if OpenID was not requested
            if not member_sub:
                try:
                    me_resp = _requests.get(
                        f"{LINKEDIN_API_BASE}/me",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=10
                    )
                    if me_resp.ok:
                        me_data = me_resp.json()
                        member_sub = me_data.get("id", "")
                        first = me_data.get("localizedFirstName", "")
                        last = me_data.get("localizedLastName", "")
                        if first or last:
                            account_name = f"{first} {last}".strip()
                except Exception:
                    pass

            # 5. Safe fallback if neither OpenID nor /me was permitted (e.g., only w_member_social enabled)
            if not member_sub:
                import hashlib
                token_hash = hashlib.sha256(access_token.encode("utf-8")).hexdigest()[:12]
                member_sub = f"member_{token_hash}"

            author_urn = f"urn:li:person:{member_sub}" if not member_sub.startswith("urn:li:") else member_sub

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "account_name": account_name,
                "account_handle": email or account_name,
                "account_id": author_urn,
                "avatar_url": avatar_url,
                "email": email,
                "is_demo": False
            }

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"LinkedIn OAuth error: {str(e)}")

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh an expired LinkedIn access token using the refresh_token."""
        cfg = get_settings()
        if not self._is_configured() or not _requests_available or not refresh_token:
            raise ValueError("LinkedIn refresh credentials or refresh token missing.")

        try:
            resp = _requests.post(
                f"{LINKEDIN_AUTH_BASE}/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": cfg.LINKEDIN_CLIENT_ID,
                    "client_secret": cfg.LINKEDIN_CLIENT_SECRET
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15
            )
            if not resp.ok:
                raise ValueError(f"LinkedIn token refresh failed ({resp.status_code}): {resp.text}")

            data = resp.json()
            return {
                "access_token": data.get("access_token", ""),
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in": data.get("expires_in", 5184000)
            }
        except Exception as e:
            raise ValueError(f"LinkedIn token refresh error: {str(e)}")

    def _resolve_author_urn(self, access_token: str, options: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Resolves the author URN string e.g. urn:li:person:abcdef or urn:li:organization:123456.
        Validates that the URN is not an email, username, or dummy fallback, resolving from /v2/userinfo if needed.
        """
        raw_author = (options or {}).get("author_urn", "")
        if isinstance(raw_author, str) and raw_author.strip():
            cleaned = raw_author.strip()
            # If it's a valid organization URN
            if cleaned.startswith("urn:li:organization:") and len(cleaned) > len("urn:li:organization:"):
                return cleaned
            # If it's a valid person URN (not containing @ email and not dummy member_ prefix)
            if cleaned.startswith("urn:li:person:") and "@" not in cleaned and not cleaned.startswith("urn:li:person:member_"):
                val = cleaned[len("urn:li:person:"):]
                if val:
                    return cleaned

        # Fetch from OpenID Connect /v2/userinfo using existing LinkedIn access token
        if _requests_available and access_token:
            try:
                profile_resp = _requests.get(
                    f"{LINKEDIN_API_BASE}/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10
                )
                if profile_resp.ok:
                    sub = profile_resp.json().get("sub")
                    if sub:
                        return f"urn:li:person:{sub}"
            except Exception:
                pass

        return None

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        """
        Publish post to LinkedIn using the REST Posts API (/rest/posts) with fallback to /v2/ugcPosts.
        Requires 'w_member_social' scope and real member author URN.
        """
        if not access_token:
            return PublishResult(
                success=False,
                error_message="LinkedIn: No valid access token provided. Please connect your LinkedIn account."
            )

        if not _requests_available:
            return PublishResult(
                success=False,
                error_message="LinkedIn: 'requests' package not available on server."
            )

        author_urn = self._resolve_author_urn(access_token, options)
        if not author_urn:
            return PublishResult(
                success=False,
                error_message="LinkedIn: Could not determine authenticated member URN. Please re-connect your LinkedIn account."
            )

        # 1. Attempt publishing via LinkedIn REST Posts API (/rest/posts)
        try:
            rest_body = {
                "author": author_urn,
                "commentary": content,
                "visibility": "PUBLIC",
                "distribution": {
                    "feedDistribution": "MAIN_FEED",
                    "targetEntities": [],
                    "thirdPartyDistributionChannels": []
                },
                "lifecycleState": "PUBLISHED",
                "isReshareDisabledByAuthor": False
            }

            resp = _requests.post(
                f"{LINKEDIN_REST_BASE}/posts",
                json=rest_body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "LinkedIn-Version": LINKEDIN_VERSION,
                    "X-Restli-Protocol-Version": "2.0.0"
                },
                timeout=30
            )

            if resp.status_code in (200, 201):
                post_id = resp.headers.get("x-restli-id") or resp.headers.get("x-linkedin-id") or ""
                if not post_id and resp.text:
                    try:
                        post_id = resp.json().get("id", "")
                    except Exception:
                        pass
                clean_post_id = post_id.replace("urn:li:ugcPost:", "").replace("urn:li:share:", "").replace("urn:li:post:", "")
                return PublishResult(
                    success=True,
                    external_id=post_id or f"urn:li:post:{clean_post_id}",
                    url=f"https://www.linkedin.com/feed/update/{post_id}" if post_id else "https://www.linkedin.com/feed/",
                    response_payload={"id": post_id, "clean_id": clean_post_id, "platform": "linkedin"}
                )

            # If REST posts returned 404 or unsupported, fallback to /v2/ugcPosts
            if resp.status_code in (400, 404):
                ugc_body = {
                    "author": author_urn,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": content},
                            "shareMediaCategory": "NONE"
                        }
                    },
                    "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                }
                ugc_resp = _requests.post(
                    f"{LINKEDIN_API_BASE}/ugcPosts",
                    json=ugc_body,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    timeout=30
                )
                if ugc_resp.status_code in (200, 201):
                    post_id = ugc_resp.headers.get("x-restli-id") or (ugc_resp.json().get("id") if ugc_resp.text else "")
                    clean_post_id = post_id.replace("urn:li:ugcPost:", "").replace("urn:li:share:", "")
                    return PublishResult(
                        success=True,
                        external_id=post_id,
                        url=f"https://www.linkedin.com/feed/update/{post_id}" if post_id else "https://www.linkedin.com/feed/",
                        response_payload={"id": post_id, "clean_id": clean_post_id, "platform": "linkedin"}
                    )

            # Extract detailed error message
            err_msg = f"HTTP {resp.status_code}"
            try:
                err_data = resp.json()
                err_msg = err_data.get("message") or err_data.get("description") or err_msg
            except Exception:
                err_msg = resp.text[:200]

            return PublishResult(
                success=False,
                error_message=f"LinkedIn API error ({resp.status_code}): {err_msg}"
            )

        except Exception as e:
            return PublishResult(
                success=False,
                error_message=f"LinkedIn connection error: {str(e)}"
            )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """
        Fetch live account metrics for LinkedIn account.
        1. Queries OpenID Connect /v2/userinfo for member identity.
        2. Queries LinkedIn Member Follower Statistics API (GET /rest/memberFollowersCount?q=me)
           with LinkedIn-Version 202601 and X-Restli-Protocol-Version 2.0.0.
        3. Returns real follower count when permitted, or clear reauthorization reason on 401/403.
        """
        if not access_token:
            return {
                "platform": "linkedin",
                "account_id": account_id,
                "status": "disconnected",
                "followers": None,
                "followers_available": False,
                "reason": "No access token"
            }

        member_name = "LinkedIn Member"
        sub = account_id

        # 1. Fetch identity from OpenID Connect /v2/userinfo
        if _requests_available:
            try:
                profile_resp = _requests.get(
                    f"{LINKEDIN_API_BASE}/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=5
                )
                if profile_resp.ok:
                    data = profile_resp.json()
                    member_name = data.get("name", member_name)
                    sub = data.get("sub", sub)
            except Exception:
                pass

        # 2. Query member follower count via /rest/memberFollowersCount?q=me
        if _requests_available:
            try:
                foll_resp = _requests.get(
                    f"{LINKEDIN_REST_BASE}/memberFollowersCount?q=me",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "LinkedIn-Version": LINKEDIN_VERSION,
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    timeout=5
                )
                if foll_resp.ok:
                    foll_data = foll_resp.json()
                    followers_count = None
                    if "count" in foll_data:
                        followers_count = int(foll_data["count"])
                    elif "elements" in foll_data and isinstance(foll_data["elements"], list) and len(foll_data["elements"]) > 0:
                        first_el = foll_data["elements"][0]
                        followers_count = int(first_el.get("followerCounts", {}).get("organicFollowerCount", first_el.get("count", 0)))
                    elif "followerCount" in foll_data:
                        followers_count = int(foll_data["followerCount"])
                    elif "firstDegreeSize" in foll_data:
                        followers_count = int(foll_data["firstDegreeSize"])

                    if followers_count is not None:
                        return {
                            "platform": "linkedin",
                            "account_id": sub,
                            "account_name": member_name,
                            "status": "active",
                            "followers": followers_count,
                            "followers_available": True,
                            "source": "linkedin_memberFollowersCount"
                        }
                elif foll_resp.status_code in (401, 403):
                    return {
                        "platform": "linkedin",
                        "account_id": sub,
                        "account_name": member_name,
                        "status": "active",
                        "followers": None,
                        "followers_available": False,
                        "reason": "LinkedIn member profile analytics permission required. Please reconnect LinkedIn."
                    }
            except Exception:
                pass

        return {
            "platform": "linkedin",
            "account_id": sub,
            "account_name": member_name,
            "status": "active",
            "followers": None,
            "followers_available": False,
            "reason": "LinkedIn member profile analytics permission required. Please reconnect LinkedIn."
        }

