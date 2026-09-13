"""
Social Media Providers Registry.

Automatically selects real providers when API credentials are configured,
or falls back to demo providers for development/testing.

Platform support summary:
  facebook  — Real: Facebook Graph API OAuth + page post publishing
  instagram — Real: Instagram Graph API (via Facebook OAuth) + media publish
  linkedin  — Real: LinkedIn OAuth + UGC posts
  twitter   — Real: Twitter/X API v2 OAuth PKCE + tweet creation
  youtube   — Real: Google OAuth + YouTube Data API v3 video upload
  pinterest — Real: Pinterest API v5 OAuth + pin creation
"""
from typing import Dict
from app.services.providers.base import SocialProvider, PublishResult
from app.services.providers.demo_providers import (
    DemoFacebookProvider,
    DemoInstagramProvider,
    DemoLinkedInProvider,
    DemoTwitterProvider,
    DemoYouTubeProvider,
    DemoPinterestProvider
)
from app.services.providers.facebook_provider import FacebookProvider
from app.services.providers.instagram_provider import InstagramProvider
from app.services.providers.linkedin_provider import LinkedInProvider
from app.services.providers.twitter_provider import TwitterProvider
from app.services.providers.youtube_provider import YouTubeProvider
from app.services.providers.pinterest_provider import PinterestProvider
from app.core.config import settings


# Demo providers (always available, no credentials needed)
DEMO_PROVIDERS: Dict[str, SocialProvider] = {
    "facebook": DemoFacebookProvider(),
    "instagram": DemoInstagramProvider(),
    "linkedin": DemoLinkedInProvider(),
    "twitter": DemoTwitterProvider(),
    "youtube": DemoYouTubeProvider(),
    "pinterest": DemoPinterestProvider()
}

# Real providers (used when credentials are configured in .env)
REAL_PROVIDERS: Dict[str, SocialProvider] = {
    "facebook": FacebookProvider(),
    "instagram": InstagramProvider(),
    "linkedin": LinkedInProvider(),
    "twitter": TwitterProvider(),
    "youtube": YouTubeProvider(),
    "pinterest": PinterestProvider()
}


def _has_real_credentials(platform: str) -> bool:
    """Check whether real API credentials are configured for a platform."""
    from app.core.config import get_settings
    cfg = get_settings()
    platform = platform.lower()
    if platform == "facebook":
        return bool(
            (getattr(cfg, "FACEBOOK_APP_ID", "") and getattr(cfg, "FACEBOOK_APP_SECRET", "")) or
            (cfg.FACEBOOK_CLIENT_ID and cfg.FACEBOOK_CLIENT_SECRET) or
            (getattr(cfg, "META_APP_ID", "") and getattr(cfg, "META_APP_SECRET", "")) or
            (cfg.INSTAGRAM_APP_ID and cfg.INSTAGRAM_APP_SECRET) or
            (cfg.INSTAGRAM_CLIENT_ID and cfg.INSTAGRAM_CLIENT_SECRET)
        )

    if platform == "instagram":
        return bool(
            cfg.INSTAGRAM_APP_ID or
            cfg.INSTAGRAM_CLIENT_ID or
            cfg.INSTAGRAM_ACCESS_TOKEN or
            cfg.FACEBOOK_CLIENT_ID
        )


    if platform == "linkedin":
        return bool(cfg.LINKEDIN_CLIENT_ID and cfg.LINKEDIN_CLIENT_SECRET)
    if platform == "twitter":
        return bool(cfg.TWITTER_CLIENT_ID and cfg.TWITTER_CLIENT_SECRET)
    if platform == "youtube":
        return bool(cfg.YOUTUBE_CLIENT_ID and cfg.YOUTUBE_CLIENT_SECRET)
    if platform == "pinterest":
        return bool(cfg.PINTEREST_CLIENT_ID and cfg.PINTEREST_CLIENT_SECRET)
    return False


def get_social_provider(platform: str, is_demo: bool = False) -> SocialProvider:
    """
    Return the appropriate social provider for a platform.

    - When is_demo=True → always return demo provider
    - When real credentials are configured → return real provider
    - Otherwise → return demo provider (graceful fallback)
    """
    platform_key = platform.lower().strip()

    if not is_demo and _has_real_credentials(platform_key) and platform_key in REAL_PROVIDERS:
        return REAL_PROVIDERS[platform_key]

    if platform_key in DEMO_PROVIDERS:
        return DEMO_PROVIDERS[platform_key]

    # Fallback to demo facebook for unrecognized platform
    return DEMO_PROVIDERS["facebook"]


def get_oauth_provider(platform: str) -> SocialProvider:
    """
    Always return the real provider for OAuth URL generation.
    Real providers generate proper OAuth URLs even without credentials (show error state).
    """
    platform_key = platform.lower().strip()
    if platform_key in REAL_PROVIDERS:
        return REAL_PROVIDERS[platform_key]
    if platform_key in DEMO_PROVIDERS:
        return DEMO_PROVIDERS[platform_key]
    return DEMO_PROVIDERS["facebook"]


def list_configured_platforms() -> list:
    """Return list of platforms that have real API credentials configured."""
    platforms = []
    for p in ["facebook", "instagram", "linkedin", "twitter", "youtube", "pinterest"]:
        if _has_real_credentials(p):
            platforms.append(p)
    return platforms


__all__ = [
    "SocialProvider",
    "PublishResult",
    "get_social_provider",
    "get_oauth_provider",
    "list_configured_platforms",
    "DEMO_PROVIDERS",
    "REAL_PROVIDERS"
]
