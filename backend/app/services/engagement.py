"""
Engagement generator (placeholder until platforms go real).
Replace generate_mock_engagement with real API calls, keeping the same dict keys.
Numbers are kept small, like a new account's.
"""
import random

# (low, high) impressions per platform: small, beginner-account range
PLATFORM_BASE_IMPRESSIONS = {
    "facebook": (110, 190),
    "instagram": (120, 200),
    "linkedin": (100, 170),
    "twitter": (100, 180),
    "youtube": (130, 200),
    "pinterest": (100, 170),
}


def generate_mock_engagement(platform: str) -> dict:
    low, high = PLATFORM_BASE_IMPRESSIONS.get(platform, (100, 180))
    impressions = random.randint(low, high)
    reach = int(impressions * random.uniform(0.7, 0.9))  # reach < impressions
    return {
        "impressions": impressions,
        "reach": reach,
        "likes": max(1, int(impressions * random.uniform(0.03, 0.09))),  # ~3-18
        "comments": int(impressions * random.uniform(0.005, 0.03)),      # ~0-6
        "shares": int(impressions * random.uniform(0.005, 0.025)),       # ~0-5
        "clicks": max(1, int(impressions * random.uniform(0.01, 0.05))), # ~1-10
    }