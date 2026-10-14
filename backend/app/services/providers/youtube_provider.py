"""
YouTube Data API v3 Provider for SocialPilot.

Real publishing and OAuth 2.0:
- Google Cloud project with YouTube Data API v3 enabled
- OAuth 2.0 Web Application Credentials
- Scopes: youtube.upload, youtube.readonly, openid, profile, email
- Endpoints:
  - Auth: https://accounts.google.com/o/oauth2/v2/auth
  - Token: https://oauth2.googleapis.com/token
  - Channels & Statistics: https://www.googleapis.com/youtube/v3/channels
  - Video Upload: https://www.googleapis.com/upload/youtube/v3/videos

Environment variables needed:
  YOUTUBE_CLIENT_ID       (Google OAuth 2.0 Client ID)
  YOUTUBE_CLIENT_SECRET   (Google OAuth 2.0 Client Secret)
  YOUTUBE_REDIRECT_URI    (Google OAuth 2.0 Redirect URI)
"""
import uuid
import random
import os
import urllib.parse
from typing import Dict, Any, Optional, List
from app.services.providers.base import SocialProvider, PublishResult
from app.core.config import settings

try:
    import requests as _requests
    _requests_available = True
except ImportError:
    _requests_available = False

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class YouTubeProvider(SocialProvider):
    """Real YouTube Data API v3 provider with Google OAuth 2.0 and video publishing."""

    @property
    def platform_name(self) -> str:
        return "youtube"

    def _is_configured(self) -> bool:
        return bool(settings.YOUTUBE_CLIENT_ID and settings.YOUTUBE_CLIENT_SECRET)

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        if not self._is_configured():
            params = {
                "client_id": "UNCONFIGURED",
                "redirect_uri": redirect_uri,
                "state": state,
                "response_type": "code"
            }
            return f"{GOOGLE_AUTH_BASE}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

        scopes = getattr(
            settings,
            "YOUTUBE_SCOPES",
            "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid profile email"
        )
        params = {
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scopes,
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true"
        }
        return f"{GOOGLE_AUTH_BASE}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not self._is_configured() or not _requests_available or code == "demo_code":
            return {
                "access_token": f"yt_mock_token_{uuid.uuid4().hex[:16]}",
                "refresh_token": f"yt_mock_ref_{uuid.uuid4().hex[:16]}",
                "account_name": "Demo YouTube Channel",
                "account_handle": "@demo_channel",
                "account_id": f"UC_demo_{uuid.uuid4().hex[:8]}",
                "avatar_url": None,
                "followers_count": 8450,
                "following_count": 120,
                "posts_count": 48,
                "is_demo": True
            }

        try:
            resp = _requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": settings.YOUTUBE_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET
                },
                timeout=15
            )
            resp.raise_for_status()
            token_data = resp.json()
            access_token = token_data.get("access_token", "")
            refresh_token = token_data.get("refresh_token", "")
            expires_in = token_data.get("expires_in", 3600)

            # 1. Fetch channel snippet and statistics from YouTube Data API v3
            account_name = "YouTube Channel"
            account_handle = "@youtube"
            account_id = ""
            avatar_url = None
            followers_count = 0
            posts_count = 0

            try:
                channel_resp = _requests.get(
                    f"{YOUTUBE_API_BASE}/channels",
                    params={"part": "snippet,statistics", "mine": "true"},
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=15
                )
                if channel_resp.status_code == 200:
                    channels = channel_resp.json().get("items", [])
                    if channels:
                        channel = channels[0]
                        snippet = channel.get("snippet", {})
                        stats = channel.get("statistics", {})

                        account_id = channel.get("id", "")
                        account_name = snippet.get("title", account_name)
                        account_handle = snippet.get("customUrl") or f"@{snippet.get('title', '').lower().replace(' ', '')}"
                        avatar_url = snippet.get("thumbnails", {}).get("high", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url")
                        followers_count = int(stats.get("subscriberCount", 0)) if not stats.get("hiddenSubscriberCount") else 0
                        posts_count = int(stats.get("videoCount", 0))
            except Exception:
                pass

            # 2. If no channel found on YouTube, fallback to Google Userinfo for identity
            if not account_id:
                try:
                    userinfo_resp = _requests.get(
                        GOOGLE_USERINFO_URL,
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=15
                    )
                    if userinfo_resp.status_code == 200:
                        user_data = userinfo_resp.json()
                        account_id = str(user_data.get("sub", f"yt_{uuid.uuid4().hex[:8]}"))
                        account_name = user_data.get("name", "Google YouTube User")
                        account_handle = f"@{user_data.get('email', '').split('@')[0]}"
                        avatar_url = user_data.get("picture")
                except Exception:
                    account_id = f"yt_user_{uuid.uuid4().hex[:8]}"

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "account_name": account_name,
                "account_handle": account_handle,
                "account_id": account_id,
                "avatar_url": avatar_url,
                "followers_count": followers_count,
                "following_count": 0,
                "posts_count": posts_count,
                "is_demo": False
            }
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, "response") and getattr(e, "response", None) is not None:
                try:
                    err_json = e.response.json()
                    error_msg = err_json.get("error_description") or err_json.get("error") or str(err_json)
                except Exception:
                    error_msg = e.response.text or str(e)
            raise ValueError(f"YouTube OAuth error: {error_msg}")

    def refresh_token(self, refresh_token_str: str) -> Dict[str, Any]:
        if not self._is_configured() or not _requests_available or refresh_token_str.startswith("yt_mock"):
            return {"access_token": f"yt_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 3600}
        try:
            resp = _requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token_str,
                    "client_id": settings.YOUTUBE_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET
                },
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "access_token": data.get("access_token", ""),
                "refresh_token": data.get("refresh_token", refresh_token_str),
                "expires_in": data.get("expires_in", 3600)
            }
        except Exception:
            return {"access_token": f"yt_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 3600}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "video",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        if not _requests_available or access_token.startswith("yt_mock") or access_token.startswith("demo"):
            return self._demo_publish(content, media_urls)

        if not media_urls:
            return PublishResult(
                success=False,
                error_message=(
                    "YouTube: A video file is required for YouTube publishing. "
                    "YouTube does not support text-only posts."
                )
            )

        opts = options or {}
        title = opts.get("title") or content[:100] or "Untitled Video"
        description = opts.get("description") or content
        privacy = opts.get("privacy", "public")
        tags = opts.get("tags", [])

        video_url = media_urls[0]

        try:
            import json as _json
            video_metadata = {
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": tags,
                    "categoryId": "22"
                },
                "status": {
                    "privacyStatus": privacy,
                    "selfDeclaredMadeForKids": False
                }
            }

            if video_url.startswith("/uploads") or os.path.exists(video_url):
                from app.core.config import settings as cfg
                local_path = video_url if os.path.exists(video_url) else os.path.join(cfg.UPLOAD_DIR, os.path.basename(video_url))
                if not os.path.exists(local_path):
                    return PublishResult(
                        success=False,
                        error_message=f"YouTube: Video file not found at {local_path}"
                    )
                with open(local_path, "rb") as video_file:
                    resp = _requests.post(
                        YOUTUBE_UPLOAD_URL,
                        params={"uploadType": "multipart", "part": "snippet,status"},
                        headers={"Authorization": f"Bearer {access_token}"},
                        files={
                            "metadata": (None, _json.dumps(video_metadata), "application/json; charset=UTF-8"),
                            "video": (os.path.basename(local_path), video_file, "video/*")
                        },
                        timeout=300
                    )
            else:
                video_data = _requests.get(video_url, timeout=60).content
                resp = _requests.post(
                    YOUTUBE_UPLOAD_URL,
                    params={"uploadType": "multipart", "part": "snippet,status"},
                    headers={"Authorization": f"Bearer {access_token}"},
                    files={
                        "metadata": (None, _json.dumps(video_metadata), "application/json; charset=UTF-8"),
                        "video": ("video.mp4", video_data, "video/mp4")
                    },
                    timeout=300
                )

            resp.raise_for_status()
            video_id = resp.json().get("id", "")

            return PublishResult(
                success=True,
                external_id=str(video_id),
                url=f"https://youtube.com/watch?v={video_id}",
                response_payload={
                    "id": str(video_id),
                    "platform": "youtube",
                    "privacy": privacy
                }
            )
        except Exception as e:
            error_msg = str(e)
            try:
                if hasattr(e, "response") and getattr(e, "response", None) is not None:
                    err_data = e.response.json()
                    error_msg = err_data.get("error", {}).get("message", error_msg)
            except Exception:
                pass
            return PublishResult(success=False, error_message=f"YouTube API error: {error_msg}")

    def _demo_publish(self, content: str, media_urls: Optional[List[str]]) -> PublishResult:
        external_id = f"yt_vid_{uuid.uuid4().hex[:11]}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://youtube.com/watch?v={external_id}",
            response_payload={
                "id": external_id,
                "platform": "youtube",
                "demo": True,
                "views": random.randint(450, 6800),
                "likes": random.randint(30, 480),
                "comments": random.randint(5, 80)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        if not _requests_available or access_token.startswith("yt_mock") or access_token.startswith("demo"):
            return {
                "followers": random.randint(1000, 50000),
                "subscribers": random.randint(1000, 50000),
                "videos_count": random.randint(10, 200),
                "total_views": random.randint(10000, 500000)
            }
        try:
            resp = _requests.get(
                f"{YOUTUBE_API_BASE}/channels",
                params={"part": "statistics", "mine": "true"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    stats = items[0].get("statistics", {})
                    sub_count = int(stats.get("subscriberCount", 0)) if not stats.get("hiddenSubscriberCount") else 0
                    return {
                        "followers": sub_count,
                        "subscribers": sub_count,
                        "videos_count": int(stats.get("videoCount", 0)),
                        "total_views": int(stats.get("viewCount", 0))
                    }
        except Exception:
            pass
        return {"followers": 0, "subscribers": 0, "videos_count": 0, "total_views": 0}
