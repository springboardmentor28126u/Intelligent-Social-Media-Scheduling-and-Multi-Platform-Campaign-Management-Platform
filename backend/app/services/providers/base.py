from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class PublishResult:
    def __init__(
        self,
        success: bool,
        external_id: Optional[str] = None,
        url: Optional[str] = None,
        error_message: Optional[str] = None,
        response_payload: Optional[Dict[str, Any]] = None
    ):
        self.success = success
        self.external_id = external_id
        self.url = url
        self.error_message = error_message
        self.response_payload = response_payload or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "external_id": self.external_id,
            "url": self.url,
            "error_message": self.error_message,
            "response_payload": self.response_payload
        }


class SocialProvider(ABC):
    @property
    @abstractmethod
    def platform_name(self) -> str:
        pass

    @abstractmethod
    def get_auth_url(self, state: str, redirect_uri: str) -> str:
        """Returns the OAuth authorization URL for the platform."""
        pass

    @abstractmethod
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchanges OAuth code for access and refresh tokens."""
        pass

    @abstractmethod
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refreshes an expired access token."""
        pass

    @abstractmethod
    def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        post_type: str = "text",
        options: Optional[Dict[str, Any]] = None
    ) -> PublishResult:
        """Publishes a post to the social media network."""
        pass

    @abstractmethod
    def get_account_metrics(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """Fetches account stats (followers, impressions, reach)."""
        pass
