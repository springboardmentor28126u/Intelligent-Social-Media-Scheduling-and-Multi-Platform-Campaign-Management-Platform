from app.integrations.buffer import BufferIntegration
from app.integrations.facebook import FacebookIntegration
from app.integrations.instagram import InstagramIntegration
from app.integrations.linkedin import LinkedInIntegration
from app.integrations.twitter import TwitterIntegration
from app.integrations.youtube import YouTubeIntegration
from app.integrations.pinterest import PinterestIntegration


class PublishingService:

    def get_platform_integration(
        self,
        platform: str,
        social_account=None,
    ):

        platform = platform.lower().strip()

        integrations = {
            "facebook": FacebookIntegration,
            "instagram": InstagramIntegration,
            "linkedin": LinkedInIntegration,

            # Keep Twitter/X integration available for OAuth.
            "twitter": TwitterIntegration,
            "x": TwitterIntegration,

            "youtube": YouTubeIntegration,
            "pinterest": PinterestIntegration,

            # Buffer is used by the publishing route
            # for X/Twitter publishing.
            "buffer": BufferIntegration,
        }

        integration_class = integrations.get(platform)

        if not integration_class:
            raise ValueError(
                f"Unsupported platform: {platform}"
            )

        return integration_class(
            social_account=social_account
        )


publishing_service = PublishingService()