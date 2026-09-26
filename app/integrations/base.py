from abc import ABC, abstractmethod


class BaseSocialIntegration(ABC):

    def __init__(self, social_account=None):
        self.social_account = social_account

    @abstractmethod
    def get_authorization_url(self, state: str):
        """
        Generate the OAuth authorization URL.
        """
        pass

    @abstractmethod
    def exchange_code_for_token(self, code: str):
        """
        Exchange OAuth authorization code for access token data.
        """
        pass

    @abstractmethod
    def publish_post(
        self,
        content: str,
        media=None,
    ):
        """
        Publish content and optional media.
        """
        pass

    def refresh_access_token(self):
        """
        Refresh the access token if supported.
        """
        raise NotImplementedError(
            "Token refresh is not supported for this platform"
        )