"""Facebook publishing adapter.

The access token is supplied by the backend SocialAccount record only.
"""

from app.services.publisher import publish_to_facebook

__all__ = ["publish_to_facebook"]
