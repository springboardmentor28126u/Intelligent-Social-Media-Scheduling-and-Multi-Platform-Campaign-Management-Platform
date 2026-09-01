import random
import uuid
from typing import Dict, Any, Optional, List
from app.services.providers.base import SocialProvider, PublishResult


class DemoFacebookProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "facebook"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://www.facebook.com/v19.0/dialog/oauth?client_id=demo_fb&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"fb_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"fb_mock_ref_{uuid.uuid4().hex[:16]}",
            "expires_in": 5184000,
            "account_name": "Acme Brand Global",
            "account_id": "fb_page_99182312",
            "avatar_url": None
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"fb_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 5184000}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        external_id = f"fb_post_{random.randint(100000, 999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://facebook.com/posts/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "facebook",
                "media_count": len(media_urls) if media_urls else 0,
                "reach": random.randint(1200, 4800),
                "likes": random.randint(45, 320)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "followers": 14200,
            "following": 320,
            "page_views": 3800,
            "engagement_rate": 4.8
        }


class DemoInstagramProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "instagram"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://api.instagram.com/oauth/authorize?client_id=demo_ig&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"ig_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"ig_mock_ref_{uuid.uuid4().hex[:16]}",
            "account_name": "Acme Official HQ",
            "account_id": "ig_biz_8829104",
            "avatar_url": None
        }

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
        external_id = f"ig_media_{random.randint(1000000, 9999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://instagram.com/p/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "instagram",
                "post_type": post_type,
                "likes": random.randint(180, 1420),
                "comments": random.randint(24, 180)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "followers": 28400,
            "following": 412,
            "posts_count": 348,
            "engagement_rate": 6.2
        }


class DemoLinkedInProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "linkedin"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://www.linkedin.com/oauth/v2/authorization?client_id=demo_li&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"li_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"li_mock_ref_{uuid.uuid4().hex[:16]}",
            "account_name": "Acme Enterprise",
            "account_id": "urn:li:organization:771829",
            "avatar_url": None
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"li_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 5184000}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        external_id = f"urn:li:share:{random.randint(10000000, 99999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://linkedin.com/feed/update/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "linkedin",
                "clicks": random.randint(85, 620),
                "impressions": random.randint(1800, 9500),
                "reactions": random.randint(40, 290)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "followers": 18900,
            "connections": 5000,
            "engagement_rate": 5.1
        }


class DemoTwitterProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "twitter"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://twitter.com/i/oauth2/authorize?client_id=demo_tw&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"tw_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"tw_mock_ref_{uuid.uuid4().hex[:16]}",
            "account_name": "Acme Updates",
            "account_id": "tw_usr_11928374",
            "avatar_url": None
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"tw_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 7200}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        external_id = f"1768{random.randint(10000000, 99999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://x.com/AcmeHQ/status/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "twitter",
                "retweets": random.randint(15, 140),
                "likes": random.randint(80, 540),
                "impressions": random.randint(3200, 18000)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "followers": 36700,
            "following": 890,
            "tweet_count": 4120,
            "engagement_rate": 3.9
        }


class DemoYouTubeProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "youtube"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?client_id=demo_yt&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"yt_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"yt_mock_ref_{uuid.uuid4().hex[:16]}",
            "account_name": "Acme Channel",
            "account_id": "UC_mock_channel_7719",
            "avatar_url": None
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"yt_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 3600}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "video",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        external_id = f"yt_vid_{uuid.uuid4().hex[:11]}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://youtube.com/watch?v={external_id}",
            response_payload={
                "id": external_id,
                "platform": "youtube",
                "views": random.randint(450, 6800),
                "likes": random.randint(30, 480)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "subscribers": 9500,
            "videos_count": 64,
            "total_views": 184000
        }


class DemoPinterestProvider(SocialProvider):
    @property
    def platform_name(self) -> str:
        return "pinterest"

    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        return f"https://www.pinterest.com/oauth/?client_id=demo_pin&redirect_uri={redirect_uri}&state={state}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "access_token": f"pin_mock_token_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"pin_mock_ref_{uuid.uuid4().hex[:16]}",
            "account_name": "Acme Design",
            "account_id": "pin_usr_991823",
            "avatar_url": None
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        return {"access_token": f"pin_refreshed_{uuid.uuid4().hex[:16]}", "expires_in": 2592000}

    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "image",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        external_id = f"pin_{random.randint(10000000000, 99999999999)}"
        return PublishResult(
            success=True,
            external_id=external_id,
            url=f"https://pinterest.com/pin/{external_id}",
            response_payload={
                "id": external_id,
                "platform": "pinterest",
                "saves": random.randint(12, 140),
                "impressions": random.randint(800, 4200)
            }
        )

    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        return {
            "monthly_views": 42000,
            "followers": 6100,
            "boards_count": 18
        }
