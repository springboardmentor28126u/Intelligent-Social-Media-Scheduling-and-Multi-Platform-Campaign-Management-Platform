import base64
import hashlib
import secrets
from urllib.parse import urlencode

import requests

from app.core.config import settings
from app.integrations.base import BaseSocialIntegration


# Temporary in-memory storage for X PKCE verifiers.
#
# Key:
#     SocialPilot OAuth state
#
# Value:
#     X PKCE code verifier
#
# This is suitable for local development.
# For production/multiple workers, move this to Redis or another
# shared persistent store.
oauth_pkce_verifiers = {}


class TwitterIntegration(BaseSocialIntegration):
    AUTHORIZATION_URL = "https://x.com/i/oauth2/authorize"
    TOKEN_URL = "https://api.x.com/2/oauth2/token"
    API_BASE_URL = "https://api.x.com/2"

    SCOPES = [
        "tweet.read",
        "tweet.write",
        "users.read",
        "offline.access",
    ]

    def __init__(self, social_account=None):
        super().__init__(social_account)

        self.client_id = settings.twitter_client_id
        self.client_secret = settings.twitter_client_secret
        self.redirect_uri = settings.twitter_redirect_uri

        if not self.client_id:
            raise ValueError(
                "Twitter/X client ID is not configured"
            )

        if not self.client_secret:
            raise ValueError(
                "Twitter/X client secret is not configured"
            )

        if not self.redirect_uri:
            raise ValueError(
                "Twitter/X redirect URI is not configured"
            )

    # ---------------------------------------------------------
    # PKCE
    # ---------------------------------------------------------

    def _generate_code_verifier(self):
        return secrets.token_urlsafe(64)

    def _generate_code_challenge(self, code_verifier):
        digest = hashlib.sha256(
            code_verifier.encode("utf-8")
        ).digest()

        return base64.urlsafe_b64encode(
            digest
        ).decode("utf-8").rstrip("=")

    # ---------------------------------------------------------
    # OAuth Authorization
    # ---------------------------------------------------------

    def get_authorization_url(self, state: str = ""):
        if not state:
            raise ValueError(
                "Missing OAuth state"
            )

        # Generate PKCE verifier.
        code_verifier = self._generate_code_verifier()

        # Generate PKCE challenge from verifier.
        code_challenge = self._generate_code_challenge(
            code_verifier
        )

        # IMPORTANT:
        # Keep the SocialPilot OAuth state unchanged.
        #
        # Do NOT do:
        #     state = f"{state}.{code_verifier}"
        #
        # The verifier is stored separately.
        oauth_pkce_verifiers[state] = code_verifier

        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.SCOPES),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }

        authorization_url = (
            f"{self.AUTHORIZATION_URL}?"
            f"{urlencode(params)}"
        )

        return {
            "platform": "twitter",
            "authorization_url": authorization_url,
            "state": state,
        }

    # ---------------------------------------------------------
    # OAuth Token Exchange
    # ---------------------------------------------------------

    def exchange_code_for_token(
        self,
        code: str,
        state: str | None = None,
    ):
        if not code:
            raise ValueError(
                "Missing X authorization code"
            )

        if not state:
            raise ValueError(
                "Missing X OAuth state"
            )

        # Retrieve the PKCE verifier using the original
        # SocialPilot OAuth state.
        #
        # pop() removes it after retrieval so the same
        # authorization flow cannot reuse the verifier.
        code_verifier = oauth_pkce_verifiers.pop(
            state,
            None,
        )

        if not code_verifier:
            raise ValueError(
                "Invalid or expired X OAuth state"
            )

        # X requires HTTP Basic authentication for the
        # confidential client token exchange.
        credentials = (
            f"{self.client_id}:{self.client_secret}"
        )

        basic_token = base64.b64encode(
            credentials.encode("utf-8")
        ).decode("utf-8")

        headers = {
            "Authorization": f"Basic {basic_token}",
            "Content-Type": (
                "application/x-www-form-urlencoded"
            ),
        }

        data = {
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri,
            "code_verifier": code_verifier,
        }

        response = requests.post(
            self.TOKEN_URL,
            headers=headers,
            data=data,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "X token exchange failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        token_data = response.json()

        access_token = token_data.get(
            "access_token"
        )

        if not access_token:
            raise ValueError(
                "X did not return an access token"
            )

        # Get the authenticated X user.
        profile = self.get_profile(
            access_token
        )

        return {
            "platform": "twitter",
            "access_token": access_token,
            "refresh_token": token_data.get(
                "refresh_token"
            ),
            "expires_in": token_data.get(
                "expires_in"
            ),
            "scope": token_data.get("scope"),
            "token_type": token_data.get(
                "token_type"
            ),
            "profile": profile,
        }

    # ---------------------------------------------------------
    # Profile
    # ---------------------------------------------------------

    def get_profile(self, access_token: str):
        headers = {
            "Authorization": (
                f"Bearer {access_token}"
            )
        }

        response = requests.get(
            f"{self.API_BASE_URL}/users/me",
            headers=headers,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "Unable to get X profile: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        profile = data.get("data")

        if not profile:
            raise ValueError(
                "X profile response did not contain user data"
            )

        return {
            "sub": profile.get("id"),
            "id": profile.get("id"),
            "name": profile.get("name"),
            "username": profile.get("username"),
            "profile_image_url": profile.get(
                "profile_image_url"
            ),
        }

    # ---------------------------------------------------------
    # Access Token
    # ---------------------------------------------------------

    def _get_access_token(self):
        if not self.social_account:
            raise ValueError(
                "Social account is required"
            )

        access_token = (
            self.social_account.access_token
        )

        if not access_token:
            raise ValueError(
                "No X access token is stored"
            )

        return access_token

    # ---------------------------------------------------------
    # Publish Post
    # ---------------------------------------------------------

    def publish_post(
        self,
        content: str,
        media=None,
    ):
        if not content or not content.strip():
            raise ValueError(
                "X post content cannot be empty"
            )

        access_token = self._get_access_token()

        headers = {
            "Authorization": (
                f"Bearer {access_token}"
            ),
            "Content-Type": "application/json",
        }

        payload = {
            "text": content.strip()
        }

        response = requests.post(
            f"{self.API_BASE_URL}/tweets",
            headers=headers,
            json=payload,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "X post creation failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        post_data = data.get(
            "data",
            {},
        )

        post_id = post_data.get("id")

        if not post_id:
            raise ValueError(
                "X did not return a post ID"
            )

        return {
            "platform": "twitter",
            "status": "published",
            "twitter_post_id": post_id,
            "post_id": post_id,
            "message": (
                "X post published successfully"
            ),
            "response": data,
        }

    # ---------------------------------------------------------
    # Delete Post
    # ---------------------------------------------------------

    def delete_post(self, post_id: str):
        if not post_id:
            raise ValueError(
                "X post ID is required"
            )

        access_token = self._get_access_token()

        headers = {
            "Authorization": (
                f"Bearer {access_token}"
            )
        }

        response = requests.delete(
            f"{self.API_BASE_URL}/tweets/{post_id}",
            headers=headers,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "X post deletion failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        deleted = (
            data.get(
                "data",
                {},
            ).get("deleted")
        )

        if deleted is not True:
            raise ValueError(
                "X did not confirm post deletion"
            )

        return {
            "platform": "twitter",
            "status": "deleted",
            "twitter_post_id": post_id,
            "post_id": post_id,
            "message": (
                "X post deleted successfully"
            ),
            "response": data,
        }

    # ---------------------------------------------------------
    # Refresh Access Token
    # ---------------------------------------------------------

    def refresh_access_token(self):
        if not self.social_account:
            raise ValueError(
                "Social account is required"
            )

        refresh_token = (
            self.social_account.refresh_token
        )

        if not refresh_token:
            raise ValueError(
                "No X refresh token is stored"
            )

        credentials = (
            f"{self.client_id}:{self.client_secret}"
        )

        basic_token = base64.b64encode(
            credentials.encode("utf-8")
        ).decode("utf-8")

        headers = {
            "Authorization": f"Basic {basic_token}",
            "Content-Type": (
                "application/x-www-form-urlencoded"
            ),
        }

        data = {
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        response = requests.post(
            self.TOKEN_URL,
            headers=headers,
            data=data,
            timeout=30,
        )

        if not response.ok:
            raise ValueError(
                "X token refresh failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        token_data = response.json()

        access_token = token_data.get(
            "access_token"
        )

        if not access_token:
            raise ValueError(
                "X did not return refreshed access token"
            )

        return {
            "platform": "twitter",
            "access_token": access_token,
            "refresh_token": token_data.get(
                "refresh_token",
                refresh_token,
            ),
            "expires_in": token_data.get(
                "expires_in"
            ),
            "scope": token_data.get("scope"),
            "token_type": token_data.get(
                "token_type"
            ),
        }