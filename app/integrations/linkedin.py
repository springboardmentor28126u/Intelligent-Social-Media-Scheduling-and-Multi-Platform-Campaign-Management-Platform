from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, quote

import httpx

from app.core.config import settings
from app.integrations.base import BaseSocialIntegration


class LinkedInIntegration(BaseSocialIntegration):

    AUTHORIZATION_URL = (
        "https://www.linkedin.com/oauth/v2/authorization"
    )

    TOKEN_URL = (
        "https://www.linkedin.com/oauth/v2/accessToken"
    )

    USERINFO_URL = (
        "https://api.linkedin.com/v2/userinfo"
    )

    POSTS_URL = (
        "https://api.linkedin.com/rest/posts"
    )

    IMAGES_URL = (
        "https://api.linkedin.com/rest/images"
    )

    LINKEDIN_VERSION = "202509"

    def __init__(self, social_account=None):
        super().__init__(social_account)

    # =====================================
    # OAuth Authorization URL
    # =====================================

    def get_authorization_url(self, state: str):

        params = {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": settings.linkedin_redirect_uri,
            "state": state,
            "scope": "openid profile email w_member_social",
        }

        authorization_url = (
            f"{self.AUTHORIZATION_URL}?{urlencode(params)}"
        )

        return {
            "platform": "linkedin",
            "authorization_url": authorization_url,
        }

    # =====================================
    # Exchange Authorization Code
    # =====================================

    def exchange_code_for_token(self, code: str):

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.linkedin_redirect_uri,
            "client_id": settings.linkedin_client_id,
            "client_secret": settings.linkedin_client_secret,
        }

        response = httpx.post(
            self.TOKEN_URL,
            data=data,
            timeout=30.0,
        )

        response.raise_for_status()

        token_data = response.json()

        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")

        if not access_token:
            raise ValueError(
                "LinkedIn did not return an access token"
            )

        profile_response = httpx.get(
            self.USERINFO_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            timeout=30.0,
        )

        print(
            "LinkedIn Profile Response Status:",
            profile_response.status_code,
        )

        print(
            "LinkedIn Profile Response Body:",
            profile_response.text,
        )

        profile_response.raise_for_status()

        profile_data = profile_response.json()

        return {
            "platform": "linkedin",
            "access_token": access_token,
            "refresh_token": token_data.get(
                "refresh_token"
            ),
            "expires_in": expires_in,
            "scope": token_data.get("scope"),
            "profile": {
                "sub": profile_data.get("sub"),
                "name": profile_data.get("name"),
                "email": profile_data.get("email"),
                "picture": profile_data.get("picture"),
            },
        }

    # =====================================
    # Check Token Status
    # =====================================

    def check_token_status(self):

        if not self.social_account:
            raise ValueError(
                "LinkedIn social account is required"
            )

        access_token = self.social_account.access_token

        if not access_token:

            self.social_account.status = (
                "reconnect_required"
            )

            self.social_account.is_active = False

            raise ValueError(
                "LinkedIn access token is missing. "
                "Please reconnect your LinkedIn account."
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
                    "LinkedIn access token has expired. "
                    "Please reconnect your LinkedIn account."
                )

        return True

    # =====================================
    # LinkedIn Headers
    # =====================================

    def get_linkedin_headers(self):

        return {
            "Authorization": (
                f"Bearer {self.social_account.access_token}"
            ),
            "Linkedin-Version": self.LINKEDIN_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
        }

    # =====================================
    # Resolve Local File Path
    # =====================================

    def resolve_file_path(self, file_path: str):

        path = Path(file_path)

        if path.is_absolute() and path.exists():
            return path

        backend_path = Path.cwd() / path

        if backend_path.exists():
            return backend_path

        raise ValueError(
            f"Image file not found: {file_path}"
        )

    # =====================================
    # Upload Image
    # =====================================

    def upload_image(self, image_path: str):

        self.check_token_status()

        person_id = (
            self.social_account.platform_user_id
        )

        if not person_id:
            raise ValueError(
                "LinkedIn platform user ID is missing"
            )

        author = f"urn:li:person:{person_id}"

        headers = self.get_linkedin_headers()

        initialize_payload = {
            "initializeUploadRequest": {
                "owner": author,
            }
        }

        initialize_headers = {
            **headers,
            "Content-Type": "application/json",
        }

        initialize_response = httpx.post(
            f"{self.IMAGES_URL}?action=initializeUpload",
            headers=initialize_headers,
            json=initialize_payload,
            timeout=30.0,
        )

        if initialize_response.status_code >= 400:

            raise ValueError(
                "LinkedIn image initialization failed: "
                f"{initialize_response.status_code} - "
                f"{initialize_response.text}"
            )

        initialize_data = initialize_response.json()

        value = initialize_data.get("value", {})

        upload_url = value.get("uploadUrl")
        image_urn = value.get("image")

        if not upload_url:
            raise ValueError(
                "LinkedIn did not return an image upload URL"
            )

        if not image_urn:
            raise ValueError(
                "LinkedIn did not return an image URN"
            )

        image_file = self.resolve_file_path(
            image_path
        )

        image_bytes = image_file.read_bytes()

        upload_response = httpx.put(
            upload_url,
            headers={
                "Authorization": (
                    f"Bearer "
                    f"{self.social_account.access_token}"
                ),
                "Content-Type": (
                    "application/octet-stream"
                ),
            },
            content=image_bytes,
            timeout=60.0,
        )

        if upload_response.status_code >= 400:

            raise ValueError(
                "LinkedIn image upload failed: "
                f"{upload_response.status_code} - "
                f"{upload_response.text}"
            )

        return image_urn

    # =====================================
    # Publish Post
    # =====================================

    def publish_post(
        self,
        content: str,
        media=None,
    ):

        if not self.social_account:
            raise ValueError(
                "LinkedIn social account is required"
            )

        self.check_token_status()

        person_id = (
            self.social_account.platform_user_id
        )

        if not person_id:
            raise ValueError(
                "LinkedIn platform user ID is missing"
            )

        author = f"urn:li:person:{person_id}"

        image_urns = []

        # Upload images
        if media:

            for media_item in media:

                media_type = getattr(
                    media_item,
                    "media_type",
                    None,
                )

                if str(media_type) not in (
                    "MediaType.IMAGE",
                    "IMAGE",
                    "image",
                ):
                    continue

                image_urn = self.upload_image(
                    media_item.file_path
                )

                image_urns.append(image_urn)

        # Base payload
        payload = {
            "author": author,
            "commentary": content,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }

        # Add media
        if len(image_urns) == 1:

            payload["content"] = {
                "media": image_urns[0]
            }

        elif len(image_urns) > 1:

            payload["content"] = {
                "multiImage": {
                    "images": [
                        {
                            "id": image_urn
                        }
                        for image_urn in image_urns
                    ]
                }
            }

        headers = self.get_linkedin_headers()

        headers["Content-Type"] = (
            "application/json"
        )

        print("================================")
        print("LINKEDIN POST DEBUG")
        print("Author:", author)
        print("Images:", len(image_urns))
        print("Payload:", payload)
        print("================================")

        response = httpx.post(
            self.POSTS_URL,
            headers=headers,
            json=payload,
            timeout=60.0,
        )

        print(
            "LINKEDIN RESPONSE STATUS:",
            response.status_code,
        )

        print(
            "LINKEDIN RESPONSE:",
            response.text,
        )

        if response.status_code == 401:

            self.social_account.status = (
                "reconnect_required"
            )

            self.social_account.is_active = False

            raise ValueError(
                "LinkedIn access token is invalid "
                "or expired. Please reconnect."
            )

        if response.status_code >= 400:

            raise ValueError(
                "LinkedIn publishing failed "
                f"({response.status_code}): "
                f"{response.text}"
            )

        linkedin_post_id = response.headers.get(
            "x-restli-id"
        )

        if not linkedin_post_id:
            raise ValueError(
                "LinkedIn published the post, but "
                "did not return a post ID."
            )

        return {
            "platform": "linkedin",
            "status": "published",
            "images_uploaded": len(image_urns),
            "linkedin_post_id": linkedin_post_id,
            "linkedin_response": (
                response.json()
                if response.content
                else {}
            ),
        }

    # =====================================
    # Delete Published LinkedIn Post
    # =====================================

    def delete_post(
        self,
        linkedin_post_id: str,
    ):

        if not self.social_account:
            raise ValueError(
                "LinkedIn social account is required"
            )

        self.check_token_status()

        if not linkedin_post_id:
            raise ValueError(
                "LinkedIn post ID is required"
            )

        encoded_post_id = quote(
            linkedin_post_id,
            safe="",
        )

        delete_url = (
            f"{self.POSTS_URL}/{encoded_post_id}"
        )

        headers = self.get_linkedin_headers()

        print("================================")
        print("LINKEDIN DELETE DEBUG")
        print("Post ID:", linkedin_post_id)
        print("Delete URL:", delete_url)
        print("================================")

        response = httpx.delete(
            delete_url,
            headers=headers,
            timeout=30.0,
        )

        print(
            "LINKEDIN DELETE STATUS:",
            response.status_code,
        )

        print(
            "LINKEDIN DELETE RESPONSE:",
            response.text,
        )

        if response.status_code == 401:

            self.social_account.status = (
                "reconnect_required"
            )

            self.social_account.is_active = False

            raise ValueError(
                "LinkedIn access token is invalid "
                "or expired. Please reconnect."
            )

        if response.status_code in (200, 204):

            return {
                "platform": "linkedin",
                "status": "deleted",
                "linkedin_post_id": linkedin_post_id,
                "message": (
                    "LinkedIn post deleted successfully"
                ),
            }

        raise ValueError(
            "LinkedIn post deletion failed "
            f"({response.status_code}): "
            f"{response.text}"
        )

    # =====================================
    # Refresh Access Token
    # =====================================

    def refresh_access_token(self):

        return {
            "platform": "linkedin",
            "message": (
                "LinkedIn requires re-authorization "
                "when the access token expires"
            ),
        }