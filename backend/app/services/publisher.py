def publish_to_social_media(
    platform: str,
    username: str,
    content: str,
    access_token: str | None = None
):
    """
    Publish a post to a social media platform.

    Currently this is a simulated publisher.
    Real platform API integration can be added later.
    """

    if not access_token:
        return {
            "success": False,
            "platform": platform,
            "message": f"{platform} account is not connected"
        }

    if platform == "instagram":
        print(
            f"[INSTAGRAM] Publishing for @{username}: {content}"
        )

        return {
            "success": True,
            "platform": "instagram",
            "username": username,
            "message": "Instagram post published successfully"
        }

    elif platform == "facebook":
        print(
            f"[FACEBOOK] Publishing for {username}: {content}"
        )

        return {
            "success": True,
            "platform": "facebook",
            "username": username,
            "message": "Facebook post published successfully"
        }

    elif platform == "linkedin":
        print(
            f"[LINKEDIN] Publishing for {username}: {content}"
        )

        return {
            "success": True,
            "platform": "linkedin",
            "username": username,
            "message": "LinkedIn post published successfully"
        }

    elif platform == "twitter":
        print(
            f"[TWITTER] Publishing for @{username}: {content}"
        )

        return {
            "success": True,
            "platform": "twitter",
            "username": username,
            "message": "Twitter post published successfully"
        }

    return {
        "success": False,
        "platform": platform,
        "message": "Unsupported social media platform"
    }