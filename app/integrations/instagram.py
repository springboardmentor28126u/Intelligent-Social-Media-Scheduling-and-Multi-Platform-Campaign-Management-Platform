from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import time
import httpx

from app.core.config import settings
from app.integrations.base import BaseSocialIntegration


class InstagramIntegration(BaseSocialIntegration):

    AUTHORIZATION_URL = (
        "https://www.instagram.com/oauth/authorize"
    )

    def __init__(self, social_account=None):
        super().__init__(social_account)

    # =====================================
    # OAuth Authorization URL
    # =====================================

    def get_authorization_url(self, state: str):

        params = {
            "force_reauth": "true",
            "client_id": settings.instagram_client_id,
            "redirect_uri": settings.instagram_redirect_uri,
            "response_type": "code",
            "scope": (
                "instagram_business_basic,"
                "instagram_business_manage_messages,"
                "instagram_business_manage_comments,"
                "instagram_business_content_publish,"
                "instagram_business_manage_insights"
            ),
            "state": state,
        }

        authorization_url = (
            f"{self.AUTHORIZATION_URL}?"
            f"{urlencode(params)}"
        )

        return {
            "platform": "instagram",
            "authorization_url": authorization_url,
        }

    # =====================================
    # Exchange Authorization Code
    # =====================================

    def exchange_code_for_token(self, code: str):

        token_url = (
            "https://api.instagram.com/oauth/access_token"
        )

        token_data = {
            "client_id": settings.instagram_client_id,
            "client_secret": settings.instagram_client_secret,
            "grant_type": "authorization_code",
            "redirect_uri": settings.instagram_redirect_uri,
            "code": code,
        }

        response = httpx.post(
            token_url,
            data=token_data,
            timeout=30.0,
        )

        response.raise_for_status()

        short_token_data = response.json()

        short_access_token = (
            short_token_data.get("access_token")
        )

        if not short_access_token:
            raise ValueError(
                "Instagram did not return an access token."
            )

        # =====================================
        # Exchange for Long-Lived Token
        # =====================================

        long_token_response = httpx.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": settings.instagram_client_secret,
                "access_token": short_access_token,
            },
            timeout=30.0,
        )

        long_token_response.raise_for_status()

        long_token_data = (
            long_token_response.json()
        )

        access_token = long_token_data.get(
            "access_token",
            short_access_token,
        )

        expires_in = long_token_data.get(
            "expires_in",
            short_token_data.get("expires_in"),
        )

        # =====================================
        # Get Instagram Profile
        # =====================================

        profile_response = httpx.get(
            "https://graph.instagram.com/me",
            params={
                "fields": "id,username,name",
                "access_token": access_token,
            },
            timeout=30.0,
        )

        profile_response.raise_for_status()

        profile_data = profile_response.json()

        return {
            "access_token": access_token,
            "refresh_token": None,
            "expires_in": expires_in,
            "profile": {
                "sub": profile_data.get("id"),
                "name": (
                    profile_data.get("username")
                    or profile_data.get("name")
                    or "Instagram Account"
                ),
                "username": profile_data.get(
                    "username"
                ),
            },
        }

    # =====================================
    # Check Token Status
    # =====================================

    def check_token_status(self):

        if not self.social_account:

            raise ValueError(
                "Instagram social account is required"
            )

        access_token = (
            self.social_account.access_token
        )

        if not access_token:

            self.social_account.status = (
                "reconnect_required"
            )

            self.social_account.is_active = False

            raise ValueError(
                "Instagram access token is missing. "
                "Please reconnect your account."
            )

        token_expires_at = (
            self.social_account.token_expires_at
        )

        if token_expires_at:

            if token_expires_at.tzinfo is None:

                token_expires_at = (
                    token_expires_at.replace(
                        tzinfo=timezone.utc
                    )
                )

            current_time = datetime.now(
                timezone.utc
            )

            if token_expires_at <= current_time:

                self.social_account.status = (
                    "reconnect_required"
                )

                self.social_account.is_active = False

                raise ValueError(
                    "Instagram access token has expired. "
                    "Please reconnect your account."
                )

        return True

    # =====================================
    # Resolve File Path
    # =====================================

    def resolve_file_path(
        self,
        file_path: str,
    ):

        path = Path(file_path)

        if path.is_absolute() and path.exists():
            return path

        backend_path = Path.cwd() / path

        if backend_path.exists():
            return backend_path

        raise ValueError(
            f"Media file not found: {file_path}"
        )

    # =====================================
    # Build Public Media URL
    # =====================================

    def build_public_media_url(
        self,
        file_path: str,
    ):

        path = Path(file_path)

        relative_path = path.as_posix()

        public_url = (
            settings.public_backend_url.rstrip("/")
            + "/"
            + relative_path.lstrip("/")
        )

        return public_url

    # =====================================
    # Publish Instagram Photo
    # =====================================

    def publish_post(
        self,
        content: str,
        media=None,
    ):

        if not self.social_account:

            raise ValueError(
                "Instagram social account is required"
            )

        self.check_token_status()

        instagram_user_id = (
            self.social_account.platform_user_id
        )

        if not instagram_user_id:

            raise ValueError(
                "Instagram platform user ID is missing"
            )

        # Instagram feed publishing requires
        # at least one image.
        if not media:

            raise ValueError(
                "Instagram requires a photo. "
                "Please upload a photo before publishing."
            )

        # =====================================
        # Use First Image
        # =====================================

        image_media = None

        for media_item in media:

            media_type = getattr(
                media_item,
                "media_type",
                None,
            )

            media_type_value = getattr(
                media_type,
                "value",
                media_type,
            )

            if str(media_type_value).upper() == "IMAGE":

                image_media = media_item

                break

        if not image_media:

            raise ValueError(
                "Instagram currently supports "
                "photo publishing only."
            )

        file_path = getattr(
            image_media,
            "file_path",
            None,
        )

        if not file_path:

            raise ValueError(
                "Instagram media file path is missing."
            )

        # Make sure the local file actually exists.
        self.resolve_file_path(file_path)

        # =====================================
        # Build Public URL
        # =====================================

        image_url = self.build_public_media_url(
            file_path
        )

        print("=" * 50)
        print("INSTAGRAM PUBLISH DEBUG")
        print("Instagram User ID:", instagram_user_id)
        print("Image URL:", image_url)
        print("Caption:", content)
        print("=" * 50)

        access_token = (
            self.social_account.access_token
        )

        # =====================================
        # Create Instagram Media Container
        # =====================================

        container_response = httpx.post(
            f"https://graph.instagram.com/"
            f"{instagram_user_id}/media",
            data={
                "image_url": image_url,
                "caption": content or "",
                "access_token": access_token,
            },
            timeout=30.0,
        )

        print(
            "INSTAGRAM CONTAINER STATUS:",
            container_response.status_code,
        )

        print(
            "INSTAGRAM CONTAINER RESPONSE:",
            container_response.text,
        )

        container_response.raise_for_status()

        container_data = container_response.json()

        creation_id = container_data.get("id")

        if not creation_id:

            raise ValueError(
                "Instagram did not return a media "
                "container ID."
            )

        # =====================================
        # Wait for Media Processing
        # =====================================

        status_url = (
            f"https://graph.instagram.com/"
            f"{creation_id}"
        )

        max_attempts = 12

        for attempt in range(max_attempts):

            status_response = httpx.get(
                status_url,
                params={
                    "fields": "status_code,status",
                    "access_token": access_token,
                },
                timeout=30.0,
            )

            print(
                "INSTAGRAM MEDIA STATUS:",
                status_response.status_code,
                status_response.text,
            )

            status_response.raise_for_status()

            status_data = status_response.json()

            status_code = status_data.get(
                "status_code"
            )

            if status_code == "FINISHED":
                break

            if status_code in (
                "ERROR",
                "EXPIRED",
            ):

                raise ValueError(
                    "Instagram media processing failed: "
                    f"{status_data}"
                )

            time.sleep(5)

        else:

            raise ValueError(
                "Instagram media processing timed out."
            )

        # =====================================
        # Publish Media Container
        # =====================================

        publish_response = httpx.post(
            f"https://graph.instagram.com/"
            f"{instagram_user_id}/media_publish",
            data={
                "creation_id": creation_id,
                "access_token": access_token,
            },
            timeout=30.0,
        )

        print(
            "INSTAGRAM PUBLISH STATUS:",
            publish_response.status_code,
        )

        print(
            "INSTAGRAM PUBLISH RESPONSE:",
            publish_response.text,
        )

        publish_response.raise_for_status()

        publish_data = publish_response.json()

        instagram_media_id = publish_data.get(
            "id"
        )

        if not instagram_media_id:

            raise ValueError(
                "Instagram did not return the "
                "published media ID."
            )

        return {
            "platform": "instagram",
            "status": "published",
            "instagram_post_id": instagram_media_id,
            "instagram_media_id": instagram_media_id,
            "creation_id": creation_id,
            "image_url": image_url,
            "caption": content or "",
            "instagram_response": publish_data,
        }
# =====================================
# Delete Published Instagram Post
# =====================================

    def delete_post(
       self,
       instagram_post_id: str,
   ):
        if not self.social_account:
            raise ValueError(
                 "Instagram social account is required"
            )

        self.check_token_status()

        if not instagram_post_id:
            raise ValueError(
                "Instagram post ID is required"
         )

        raise ValueError(
            "Instagram post deletion is not supported "
            "by the current Instagram API integration. "
            "The post must be deleted directly from Instagram."
       )

    # =====================================
    # Refresh Access Token
    # =====================================

    def refresh_access_token(self):

        return {
            "platform": "instagram",
            "message": (
                "Instagram token refresh is not "
                "implemented yet"
            ),
        }