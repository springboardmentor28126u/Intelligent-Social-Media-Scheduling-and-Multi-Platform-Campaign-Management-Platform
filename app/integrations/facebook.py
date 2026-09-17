import requests

from app.core.config import settings
from app.integrations.base import BaseSocialIntegration


class FacebookIntegration(BaseSocialIntegration):

    def __init__(self, social_account=None):
        self.social_account = social_account

    # =====================================
    # Facebook Login for Business
    # Authorization URL
    # =====================================

    def get_authorization_url(self, state: str):

        if not state:
            raise ValueError(
                "OAuth state is required"
            )

        if not settings.facebook_client_id:
            raise ValueError(
                "Facebook Client ID is not configured"
            )

        if not settings.facebook_redirect_uri:
            raise ValueError(
                "Facebook redirect URI is not configured"
            )

        if not settings.facebook_config_id:
            raise ValueError(
                "Facebook Configuration ID is not configured"
            )

        authorization_url = (
            "https://www.facebook.com/dialog/oauth"
        )

        params = {
            "client_id": settings.facebook_client_id,
            "redirect_uri": settings.facebook_redirect_uri,
            "response_type": "code",
            "config_id": settings.facebook_config_id,
            "state": state,
        }

        query_string = "&".join(
            f"{key}={requests.utils.quote(str(value))}"
            for key, value in params.items()
        )

        return {
            "platform": "facebook",
            "authorization_url": (
                f"{authorization_url}?{query_string}"
            ),
        }

    # =====================================
    # Exchange OAuth Code For User Token
    # =====================================

    def exchange_code_for_token(
        self,
        code: str,
    ):

        if not code:
            raise ValueError(
                "Facebook authorization code is required"
            )

        if not settings.facebook_client_id:
            raise ValueError(
                "Facebook Client ID is not configured"
            )

        if not settings.facebook_client_secret:
            raise ValueError(
                "Facebook Client Secret is not configured"
            )

        if not settings.facebook_redirect_uri:
            raise ValueError(
                "Facebook redirect URI is not configured"
            )

        # =====================================
        # Exchange code for Facebook user token
        # =====================================

        token_url = (
            "https://graph.facebook.com/oauth/access_token"
        )

        params = {
            "client_id": settings.facebook_client_id,
            "client_secret": settings.facebook_client_secret,
            "redirect_uri": settings.facebook_redirect_uri,
            "code": code,
        }

        response = requests.get(
            token_url,
            params=params,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "Facebook token exchange failed: "
                f"{response.text}"
            )

        data = response.json()

        user_access_token = data.get(
            "access_token"
        )

        if not user_access_token:
            raise ValueError(
                "Facebook did not return an access token"
            )

        # =====================================
        # Get Facebook user profile
        # =====================================

        profile_response = requests.get(
            "https://graph.facebook.com/me",
            params={
                "fields": "id,name",
                "access_token": user_access_token,
            },
            timeout=30,
        )

        if not profile_response.ok:
            raise ValueError(
                "Facebook profile lookup failed: "
                f"{profile_response.text}"
            )

        profile = profile_response.json()

        # =====================================
        # Get Facebook Pages
        # =====================================

        pages_response = requests.get(
            "https://graph.facebook.com/me/accounts",
            params={
                "fields": (
                    "id,name,access_token,"
                    "category,tasks"
                ),
                "access_token": user_access_token,
            },
            timeout=30,
        )

        if not pages_response.ok:
            raise ValueError(
                "Facebook Page lookup failed: "
                f"{pages_response.text}"
            )

        pages_data = pages_response.json()

        pages = pages_data.get("data", [])

        if not pages:
            raise ValueError(
                "No Facebook Pages were found for "
                "this Facebook account."
            )

        # =====================================
        # Select first Facebook Page
        # =====================================

        page = pages[0]

        page_id = page.get("id")
        page_name = page.get("name")
        page_access_token = page.get(
            "access_token"
        )

        if not page_id:
            raise ValueError(
                "Facebook Page ID was not returned"
            )

        if not page_access_token:
            raise ValueError(
                "Facebook Page access token was not returned"
            )

        # =====================================
        # Return Page account information
        # =====================================

        return {
            "platform": "facebook",

            # The generic OAuth callback stores
            # profile["sub"] as platform_user_id.
            #
            # We deliberately use the PAGE ID here.
            "profile": {
                "sub": str(page_id),
                "name": (
                    page_name
                    or "Facebook Page"
                ),
            },

            # IMPORTANT:
            # This is the PAGE access token.
            "access_token": page_access_token,

            "refresh_token": None,
            "expires_in": None,

            # Facebook user information
            "facebook_user_id": profile.get("id"),
            "facebook_user_name": profile.get("name"),

            # Page information
            "page_id": str(page_id),
            "page_name": page_name,
            "page_access_token": page_access_token,

            "pages": pages,
        }

    # =====================================
    # Publish Facebook Page Post
    # =====================================

    def publish_post(
        self,
        content: str,
        media=None,
    ):

        if not self.social_account:
            raise ValueError(
                "Facebook social account is required"
            )

        if not self.social_account.access_token:
            raise ValueError(
                "Facebook Page access token is missing"
            )

        page_id = (
            self.social_account.platform_user_id
        )

        if not page_id:
            raise ValueError(
                "Facebook Page ID is missing"
            )

        if not content or not content.strip():
            raise ValueError(
                "Facebook post content is required"
            )

        # =====================================
        # Publish to Facebook Page
        # =====================================

        url = (
            f"https://graph.facebook.com/"
            f"{page_id}/feed"
        )

        payload = {
            "message": content,
            "access_token": (
                self.social_account.access_token
            ),
        }

        response = requests.post(
            url,
            data=payload,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "Facebook post publishing failed: "
                f"{response.text}"
            )

        data = response.json()

        facebook_post_id = data.get("id")

        if not facebook_post_id:
            raise ValueError(
                "Facebook did not return a post ID"
            )

        return {
            "platform": "facebook",
            "status": "success",
            "post_id": facebook_post_id,
            "facebook_post_id": facebook_post_id,
            "message": (
                "Post published successfully "
                "to Facebook"
            ),
            "response": data,
        }

    # =====================================
    # Delete Facebook Page Post
    # =====================================

    def delete_post(
        self,
        facebook_post_id: str,
    ):

        if not self.social_account:
            raise ValueError(
                "Facebook social account is required"
            )

        if not self.social_account.access_token:
            raise ValueError(
                "Facebook Page access token is missing"
            )

        if not facebook_post_id:
            raise ValueError(
                "Facebook post ID is required"
            )

        # =====================================
        # Delete Facebook Page Post
        # =====================================

        url = (
            f"https://graph.facebook.com/"
            f"{facebook_post_id}"
        )

        response = requests.delete(
            url,
            params={
                "access_token": (
                    self.social_account.access_token
                ),
            },
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "Facebook post deletion failed: "
                f"{response.text}"
            )

        data = response.json()

        return {
            "platform": "facebook",
            "status": "deleted",
            "facebook_post_id": facebook_post_id,
            "message": (
                "Facebook post deleted successfully"
            ),
            "response": data,
        }

    # =====================================
    # Refresh Access Token
    # =====================================

    def refresh_access_token(self):

        return {
            "platform": "facebook",
            "message": (
                "Facebook Page access token refresh "
                "will be implemented after the basic "
                "Facebook integration is working."
            ),
        }