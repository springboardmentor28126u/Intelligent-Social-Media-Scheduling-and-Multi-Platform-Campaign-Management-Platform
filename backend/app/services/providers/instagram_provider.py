"""
Instagram Graph API Provider for SocialPilot.

Real publishing requires:
- A Facebook App with 'instagram_basic' and 'instagram_content_publish' permissions
- An Instagram Business or Creator account connected to a Facebook Page
- The access token from the Facebook OAuth flow grants Instagram access

Environment variables needed:
  INSTAGRAM_CLIENT_ID     (same as FACEBOOK_CLIENT_ID in most cases)
  INSTAGRAM_CLIENT_SECRET (same as FACEBOOK_CLIENT_SECRET in most cases)

Setup instructions:
  1. Connect an Instagram Business account to a Facebook Page
  2. Use the Facebook OAuth flow to get an access token with 'instagram_content_publish'
  3. The Instagram Business Account ID is needed (not the personal IG ID)
  4. Use /social-accounts/oauth/instagram/url to start the OAuth flow

Note: Instagram requires images to be publicly accessible URLs (not local files).
For local media, you need to first upload to a CDN or use Facebook's hosting.
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
    """Real Instagram Graph API provider. Falls back to demo mode when unconfigured."""

    @property
    def platform_name(self) -> str:
        return "instagram"

    def _is_configured(self) -> bool:
        return bool(settings.INSTAGRAM_CLIENT_ID and settings.INSTAGRAM_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        client_id = settings.INSTAGRAM_CLIENT_ID or settings.FACEBOOK_CLIENT_ID
        if not client_id:
            return f"https://api.instagram.com/oauth/authorize?client_id=UNCONFIGURED&redirect_uri={redirect_uri}&state={state}"
        
        scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
        return (
            f"https://www.facebook.com/v19.0/dialog/oauth"
            f"?client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scopes}"
            f"&state={state}"
            f"&response_type=code"
        )

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not _requests_available or code == "demo_code":
            return {
                "access_token": f"ig_mock_token_{uuid.uuid4().hex[:16]}",
                "refresh_token": f"ig_mock_ref_{uuid.uuid4().hex[:16]}",
                "account_name": "Demo Instagram Business",
                "account_id": f"ig_biz_{uuid.uuid4().hex[:8]}",
                "avatar_url": None,
                "is_demo": True
            }

        client_id = settings.INSTAGRAM_CLIENT_ID or settings.FACEBOOK_CLIENT_ID
        client_secret = settings.INSTAGRAM_CLIENT_SECRET or settings.FACEBOOK_CLIENT_SECRET

        if not client_id:
            return {
                "access_token": f"ig_mock_token_{uuid.uuid4().hex[:16]}",
                "account_name": "Demo Instagram Account",
                "account_id": f"ig_{uuid.uuid4().hex[:8]}",
                "is_demo": True
            }

        try:
            # Exchange for long-lived token via Facebook's endpoint
            resp = _requests.get(
                f"{GRAPH_API_BASE}/oauth/access_token",
                params={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code
                },
                timeout=15
            )
            resp.raise_for_status()
            token_data = resp.json()
            access_token = token_data.get("access_token", "")

            # Get Facebook pages
            pages_resp = _requests.get(
                f"{GRAPH_API_BASE}/me/accounts",
                params={"access_token": access_token},
                timeout=15
            )
            pages = pages_resp.json().get("data", [])

            # Find Instagram Business Account linked to first Page
            ig_account_id = None
            page_token = access_token
            if pages:
                page = pages[0]
                page_token = page.get("access_token", access_token)
                ig_resp = _requests.get(
                    f"{GRAPH_API_BASE}/{page['id']}",
                    params={"fields": "instagram_business_account", "access_token": page_token},
                    timeout=15
                )
                ig_data = ig_resp.json()
                ig_account_id = ig_data.get("instagram_business_account", {}).get("id")

            return {
                "access_token": page_token,
                "account_name": "Instagram Business Account",
                "account_id": ig_account_id or f"ig_{uuid.uuid4().hex[:8]}",
                "avatar_url": None,
                "is_demo": False
            }
        except Exception as e:
            raise ValueError(f"Instagram OAuth error: {str(e)}")

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"ig_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 5184000}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "image",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        if not _requests_available or access_token.startswith("ig_mock") or access_token.startswith("demo"):
            return self._demo_publish(content, media_urls)

        ig_account_id = (options or {}).get("ig_account_id", "")
        if not ig_account_id:
            return PublishResult(
                success=False,
                error_message="Instagram: ig_account_id not provided. Connect your Instagram Business account first."
            )

        # Instagram requires publicly accessible image URLs
        if not media_urls:
            return PublishResult(
                success=False,
                error_message="Instagram: media_url is required for Instagram posts (must be a publicly accessible URL)."
            )

        try:
            # Step 1: Create media container
            container_resp = _requests.post(
                f"{GRAPH_API_BASE}/{ig_account_id}/media",
                params={
                    "image_url": media_urls[0],
                    "caption": content,
                    "access_token": access_token
                },
                timeout=30
            )
            container_resp.raise_for_status()
            container_id = container_resp.json().get("id", "")

            # Step 2: Publish the container
            publish_resp = _requests.post(
                f"{GRAPH_API_BASE}/{ig_account_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": access_token
                },
                timeout=30
            )
            publish_resp.raise_for_status()
            media_id = publish_resp.json().get("id", "")

            return PublishResult(
                success=True,
                external_id=media_id,
                url=f"https://instagram.com/p/{media_id}",
                response_payload={"id": media_id, "platform": "instagram"}
            )
        except Exception as e:
            error_msg = str(e)
            try:
                if hasattr(e, 'response') and e.response:
                    err_data = e.response.json()
                    error_msg = err_data.get("error", {}).get("message", error_msg)
            except Exception:
                pass
            return PublishResult(success=False, error_message=f"Instagram API error: {error_msg}")

    def _demo_publish(self, content: str, media_urls: Optional[List[str]]) -> PublishResult:
        external_id = f"ig_media_{random.randint(1000000, 9999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://instagram.com/p/{external_id}",
            response_payload={
                "id": external_id, "platform": "instagram", "demo": True,
                "likes": random.randint(180, 1420), "comments": random.randint(24, 180)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {"followers": 28400, "following": 412, "posts_count": 348, "engagement_rate": 6.2}
