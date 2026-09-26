import base64
import hashlib
import secrets

from datetime import datetime, timezone

from app.integrations.twitter import oauth_pkce_verifiers

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from app.core.config import settings
from app.integrations.base import BaseSocialIntegration


class YouTubeIntegration(BaseSocialIntegration):

    AUTHORIZATION_URL = (
        "https://accounts.google.com/o/oauth2/v2/auth"
    )

    TOKEN_URL = (
        "https://oauth2.googleapis.com/token"
    )

    SCOPES = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
    ]

    API_SERVICE_NAME = "youtube"
    API_VERSION = "v3"

    def __init__(self, social_account=None):
        super().__init__(social_account)

        self.client_id = settings.youtube_client_id
        self.client_secret = settings.youtube_client_secret
        self.redirect_uri = settings.youtube_redirect_uri

        if not self.client_id:
            raise ValueError(
                "YouTube client ID is not configured"
            )

        if not self.client_secret:
            raise ValueError(
                "YouTube client secret is not configured"
            )

        if not self.redirect_uri:
            raise ValueError(
                "YouTube redirect URI is not configured"
            )

    # =========================================================
    # OAuth
    # =========================================================

    def _create_flow(self, state=None):
        client_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": self.AUTHORIZATION_URL,
                "token_uri": self.TOKEN_URL,
                "redirect_uris": [
                    self.redirect_uri
                ],
            }
        }

        return Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            state=state,
            redirect_uri=self.redirect_uri,
        )

    def get_authorization_url(self, state: str = ""):
        if not state:
            raise ValueError(
                "Missing OAuth state"
            )

        # -----------------------------------------------------
        # Generate PKCE verifier
        # -----------------------------------------------------

        code_verifier = secrets.token_urlsafe(64)

        # -----------------------------------------------------
        # Generate PKCE challenge
        # -----------------------------------------------------

        digest = hashlib.sha256(
            code_verifier.encode("utf-8")
        ).digest()

        code_challenge = base64.urlsafe_b64encode(
            digest
        ).decode("utf-8").rstrip("=")

        # -----------------------------------------------------
        # Store verifier using the same mechanism as X/Twitter
        # -----------------------------------------------------

        oauth_pkce_verifiers[state] = code_verifier

        # -----------------------------------------------------
        # Create Google OAuth flow
        # -----------------------------------------------------

        flow = self._create_flow(
            state=state
        )

        authorization_url, returned_state = (
            flow.authorization_url(
                state=state,
                access_type="offline",
                prompt="consent",
                include_granted_scopes="true",
                code_challenge=code_challenge,
                code_challenge_method="S256",
            )
        )

        return {
            "platform": "youtube",
            "authorization_url": authorization_url,
            "state": returned_state,
        }

    # =========================================================
    # OAuth Token Exchange
    # =========================================================

    def exchange_code_for_token(
        self,
        code: str,
        state: str | None = None,
    ):

        if not code:
            raise ValueError(
                "Missing YouTube authorization code"
            )

        if not state:
            raise ValueError(
                "Missing YouTube OAuth state"
            )

        # -----------------------------------------------------
        # Retrieve the PKCE verifier using the OAuth state
        # -----------------------------------------------------

        code_verifier = oauth_pkce_verifiers.pop(
            state,
            None,
        )

        if not code_verifier:
            raise ValueError(
                "Invalid or expired YouTube OAuth state"
            )

        # -----------------------------------------------------
        # Recreate the OAuth flow
        # -----------------------------------------------------

        flow = self._create_flow(
            state=state
        )

        try:
            flow.fetch_token(
                code=code,
                code_verifier=code_verifier,
            )
        except Exception as error:
            raise ValueError(
                "YouTube token exchange failed: "
                f"{str(error)}"
            )

        credentials = flow.credentials

        if not credentials.token:
            raise ValueError(
                "YouTube did not return an access token"
            )

        profile = self.get_profile(
            credentials.token
        )

        
        expires_in = None

        if credentials.expiry:  
            expiry = credentials.expiry

            if expiry.tzinfo is None:
                expiry = expiry.replace(
                    tzinfo=timezone.utc
           )

            expires_in = max(
                0,
                int(
                    (
                    expiry
                    - datetime.now(timezone.utc)
            ).total_seconds()
        ),
    )
        
            

        return {
            "platform": "youtube",
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "expires_in": expires_in,
            "scope": " ".join(
                credentials.scopes or self.SCOPES
            ),
            "token_type": "Bearer",
            "profile": profile,
        }

    # =========================================================
    # Profile / Channel
    # =========================================================

    def get_profile(
        self,
        access_token: str,
    ):

        if not access_token:
            raise ValueError(
                "YouTube access token is required"
            )

        credentials = Credentials(
            token=access_token
        )

        youtube = build(
            self.API_SERVICE_NAME,
            self.API_VERSION,
            credentials=credentials,
        )

        response = (
            youtube.channels()
            .list(
                part="snippet,contentDetails,statistics",
                mine=True,
            )
            .execute()
        )

        items = response.get("items", [])

        if not items:
            raise ValueError(
                "No YouTube channel was found "
                "for the connected Google account"
            )

        channel = items[0]

        snippet = channel.get(
            "snippet",
            {}
        )

        return {
            "sub": channel.get("id"),
            "id": channel.get("id"),
            "channel_id": channel.get("id"),
            "name": snippet.get("title"),
            "title": snippet.get("title"),
            "description": snippet.get(
                "description"
            ),
            "profile_image_url": (
                snippet
                .get("thumbnails", {})
                .get("default", {})
                .get("url")
            ),
        }

    # =========================================================
    # Access Token
    # =========================================================

    def _get_credentials(self):

        if not self.social_account:
            raise ValueError(
                "Social account is required"
            )

        access_token = (
            self.social_account.access_token
        )

        if not access_token:
            raise ValueError(
                "No YouTube access token is stored"
            )

        credentials = Credentials(
            token=access_token,
            refresh_token=(
                self.social_account.refresh_token
            ),
            token_uri=self.TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )

        return credentials

    def _get_youtube_service(self):

        credentials = self._get_credentials()

        if credentials.expired:

            if not credentials.refresh_token:
                raise ValueError(
                    "YouTube access token expired "
                    "and no refresh token is available"
                )

            try:
                credentials.refresh(
                    Request()
                )
            except Exception as error:
                raise ValueError(
                    "YouTube token refresh failed: "
                    f"{str(error)}"
                )

        return build(
            self.API_SERVICE_NAME,
            self.API_VERSION,
            credentials=credentials,
        )

    # =========================================================
    # Publish / Upload Video
    # =========================================================

    def publish_post(
        self,
        content: str,
        media=None,
    ):

        if not content or not content.strip():
            raise ValueError(
                "YouTube post content cannot be empty"
            )

        if not media:
            raise ValueError(
                "YouTube requires a video file. "
                "A text-only post cannot be uploaded "
                "as a YouTube video."
            )

        video_media = None

        for item in media:

            mime_type = getattr(
                item,
                "mime_type",
                None,
            )

            if mime_type and mime_type.startswith(
                "video/"
            ):
                video_media = item
                break

        if not video_media:
            raise ValueError(
                "No video file was found for YouTube. "
                "Photo-to-video publishing will be "
                "added separately."
            )

        file_path = self._get_media_path(
            video_media
        )

        if not file_path:
            raise ValueError(
                "YouTube video file path could not "
                "be determined from PostMedia"
            )

        youtube = self._get_youtube_service()

        body = {
            "snippet": {
                "title": content.strip()[:100],
                "description": content.strip(),
                "categoryId": "22",
            },
            "status": {
                "privacyStatus": "private",
            },
        }

        media_body = MediaFileUpload(
            file_path,
            mimetype="video/*",
            resumable=True,
        )

        try:
            request = (
                youtube.videos()
                .insert(
                    part="snippet,status",
                    body=body,
                    media_body=media_body,
                )
            )

            response = None

            while response is None:

                _, response = (
                    request.next_chunk()
                )

        except Exception as error:
            raise ValueError(
                "YouTube video upload failed: "
                f"{str(error)}"
            )

        video_id = response.get("id")

        if not video_id:
            raise ValueError(
                "YouTube did not return a video ID"
            )

        return {
            "platform": "youtube",
            "status": "published",
            "youtube_video_id": video_id,
            "video_id": video_id,
            "post_id": video_id,
            "message": (
                "YouTube video uploaded successfully"
            ),
            "privacy_status": "private",
            "response": response,
        }

    # =========================================================
    # Find Media File Path
    # =========================================================

    @staticmethod
    def _get_media_path(media):

        possible_fields = [
            "file_path",
            "path",
            "local_path",
            "file",
            "file_url",
        ]

        for field in possible_fields:

            value = getattr(
                media,
                field,
                None,
            )

            if value:
                return str(value)

        return None

    # =========================================================
    # Delete YouTube Video
    # =========================================================

    def delete_post(
        self,
        video_id: str,
    ):

        if not video_id:
            raise ValueError(
                "YouTube video ID is required"
            )

        youtube = self._get_youtube_service()

        try:
            youtube.videos().delete(
                id=video_id
            ).execute()

        except Exception as error:
            raise ValueError(
                "YouTube video deletion failed: "
                f"{str(error)}"
            )

        return {
            "platform": "youtube",
            "status": "deleted",
            "youtube_video_id": video_id,
            "video_id": video_id,
            "post_id": video_id,
            "message": (
                "YouTube video deleted successfully"
            ),
        }

    # =========================================================
    # Refresh Access Token
    # =========================================================

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
                "No YouTube refresh token is stored"
            )

        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri=self.TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )

        try:
            credentials.refresh(
                Request()
            )
        except Exception as error:
            raise ValueError(
                "YouTube token refresh failed: "
                f"{str(error)}"
            )

        return {
            "platform": "youtube",
            "access_token": credentials.token,
            "refresh_token": (
                credentials.refresh_token
                or refresh_token
            ),
            "token_type": "Bearer",
            "message": (
                "YouTube access token refreshed "
                "successfully"
            ),
        }