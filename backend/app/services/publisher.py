import requests


# ============================================================
# LINKEDIN PUBLISHER
# ============================================================

def publish_to_linkedin(
    content: str,
    access_token: str
):
    """
    Publish a text post to LinkedIn.

    The access token must have permission to create
    LinkedIn member posts.
    """

    # --------------------------------------------------------
    # Get authenticated LinkedIn member information
    # --------------------------------------------------------

    me_url = "https://api.linkedin.com/v2/userinfo"

    me_headers = {
        "Authorization": f"Bearer {access_token}"
    }

    me_response = requests.get(
        me_url,
        headers=me_headers,
        timeout=30
    )

    if not me_response.ok:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn authentication failed: "
                f"{me_response.text}"
            )
        }

    me_data = me_response.json()

    member_id = me_data.get("sub")

    if not member_id:

        return {
            "success": False,
            "platform": "linkedin",
            "message": "Unable to identify LinkedIn member"
        }


    # --------------------------------------------------------
    # Create LinkedIn post
    # --------------------------------------------------------

    url = "https://api.linkedin.com/rest/posts"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",

        # LinkedIn requires this header for the Posts API.
        "X-Restli-Protocol-Version": "2.0.0",

        # Use the current LinkedIn API version.
        "Linkedin-Version": "202606"
    }

    payload = {
        "author": f"urn:li:person:{member_id}",
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }


    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=30
    )


    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    if response.status_code == 201:

        linkedin_post_id = response.headers.get(
            "x-restli-id"
        )

        return {
            "success": True,
            "platform": "linkedin",
            "message": "LinkedIn post published successfully",
            "post_id": linkedin_post_id
        }


    # --------------------------------------------------------
    # FAILURE
    # --------------------------------------------------------

    try:
        error_data = response.json()

    except Exception:
        error_data = response.text


    return {
        "success": False,
        "platform": "linkedin",
        "message": f"LinkedIn API error: {error_data}"
    }


# ============================================================
# MAIN SOCIAL MEDIA PUBLISHER
# ============================================================

def publish_to_social_media(
    platform: str,
    username: str,
    content: str,
    access_token: str | None = None
):
    """
    Publish a post to a social media platform.
    """

    platform = platform.lower().strip()


    # --------------------------------------------------------
    # ACCESS TOKEN CHECK
    # --------------------------------------------------------

    if not access_token:

        return {
            "success": False,
            "platform": platform,
            "username": username,
            "message": f"{platform} account is not connected"
        }


    # ========================================================
    # LINKEDIN
    # ========================================================

    if platform == "linkedin":

        return publish_to_linkedin(
            content=content,
            access_token=access_token
        )


    # ========================================================
    # INSTAGRAM
    # ========================================================

    if platform == "instagram":

        return {
            "success": False,
            "platform": "instagram",
            "username": username,
            "message": (
                "Instagram real API integration is not implemented yet. "
                "Instagram publishing requires media content and "
                "Meta API configuration."
            )
        }


    # ========================================================
    # FACEBOOK
    # ========================================================

    if platform == "facebook":

        return {
            "success": False,
            "platform": "facebook",
            "username": username,
            "message": (
                "Facebook real API integration is not implemented yet."
            )
        }


    # ========================================================
    # TWITTER / X
    # ========================================================

    if platform == "twitter":

        return {
            "success": False,
            "platform": "twitter",
            "username": username,
            "message": (
                "X/Twitter real API integration is not implemented yet."
            )
        }


    # ========================================================
    # UNSUPPORTED PLATFORM
    # ========================================================

    return {
        "success": False,
        "platform": platform,
        "username": username,
        "message": "Unsupported social media platform"
    }