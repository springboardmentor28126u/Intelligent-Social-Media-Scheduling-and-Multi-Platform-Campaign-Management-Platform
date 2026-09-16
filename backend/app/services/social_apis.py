# app/services/social_apis.py
#
# This file's ONE job: pretend to call each social platform's real API.
# Later, when actual API keys/OAuth are wired up, only the inside of
# each function changes — publisher.py won't need to change at all.

import asyncio
import random

SUPPORTED_PLATFORMS = [
    "facebook", "instagram", "linkedin", "twitter", "youtube", "pinterest"
]

# Per-platform simulated network delay and failure chance — gives each
# platform a slightly different "personality" instead of identical mocks.
PLATFORM_PROFILES = {
    "facebook":  {"delay": (0.5, 1.5), "failure_chance": 0.1},
    "instagram": {"delay": (0.5, 1.5), "failure_chance": 0.15},
    "linkedin":  {"delay": (0.5, 1.0), "failure_chance": 0.1},
    "twitter":   {"delay": (0.3, 1.0), "failure_chance": 0.2},
    "youtube":   {"delay": (1.0, 2.5), "failure_chance": 0.15},
    "pinterest": {"delay": (0.5, 1.5), "failure_chance": 0.1},
}
DEFAULT_PROFILE = {"delay": (0.5, 1.5), "failure_chance": 0.15}


async def mock_publish_to_platform(platform: str, content: str) -> tuple[bool, str]:
    """
    Simulates calling platform's real posting API.
    Returns (success: bool, message: str).
    """
    profile = PLATFORM_PROFILES.get(platform, DEFAULT_PROFILE)

    # Simulate network/API latency.
    await asyncio.sleep(random.uniform(*profile["delay"]))

    if random.random() < profile["failure_chance"]:
        return False, f"[Mock] Failed to post to {platform} (simulated API error)."

    return True, f"[Mock] Posted to {platform}."