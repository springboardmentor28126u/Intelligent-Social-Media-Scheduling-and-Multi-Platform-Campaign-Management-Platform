"""Instagram publishing adapter.

The implementation remains in the established publisher module while the
adapter boundary is introduced for future platform-specific extraction.
"""

from app.services.publisher import publish_to_instagram

__all__ = ["publish_to_instagram"]
