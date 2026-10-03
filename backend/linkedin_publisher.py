import httpx

LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"

LINKEDIN_VERSION = "202608"
LINKEDIN_PROTOCOL_VERSION = "2.0.0"


async def publish_linkedin_text_post(
    access_token: str,
    linkedin_user_id: str,
    content: str,
) -> dict:

    if not access_token:
        raise ValueError("LinkedIn access token is missing")

    if not linkedin_user_id:
        raise ValueError("LinkedIn member ID is missing")

    if not content or not content.strip():
        raise ValueError("LinkedIn post content cannot be empty")

    cleaned_content = content.strip()

    author_urn = f"urn:li:person:{linkedin_user_id}"

    payload = {
        "author": author_urn,
        "commentary": cleaned_content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Linkedin-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": LINKEDIN_PROTOCOL_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                LINKEDIN_POSTS_URL,
                json=payload,
                headers=headers,
            )

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "LinkedIn API request timed out"
        ) from exc

    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Could not connect to LinkedIn API: {exc}"
        ) from exc

    if response.status_code in (200, 201):

        linkedin_post_id = response.headers.get("x-restli-id")

        try:
            response_data = (
                response.json()
                if response.content
                else {}
            )
        except ValueError:
            response_data = {}

        return {
            "success": True,
            "status_code": response.status_code,
            "post_id": linkedin_post_id,
            "data": response_data,
        }

    try:
        error_data = (
            response.json()
            if response.content
            else {}
        )
    except ValueError:
        error_data = {
            "raw_response": response.text
        }

    error_message = (
        error_data.get("message")
        or error_data.get("error_description")
        or error_data.get("error")
        or response.text
        or "Unknown LinkedIn API error"
    )

    if response.status_code == 401:
        raise RuntimeError(
            "LinkedIn authentication failed. "
            "The access token may be expired, revoked, or invalid."
        )

    if response.status_code == 403:
        raise RuntimeError(
            "LinkedIn rejected the publishing request. "
            "Check that the LinkedIn account has the required posting permission."
        )

    if response.status_code == 429:
        raise RuntimeError(
            "LinkedIn rate limit reached. Please try again later."
        )

    raise RuntimeError(
        f"LinkedIn API returned "
        f"{response.status_code}: "
        f"{error_message}"
    )


async def test_linkedin_token(
    access_token: str,
) -> dict:

    if not access_token:
        raise ValueError(
            "LinkedIn access token is missing"
        )

    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers=headers,
            )

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "LinkedIn token check timed out"
        ) from exc

    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Could not connect to LinkedIn: {exc}"
        ) from exc

    if response.status_code != 200:

        try:
            data = response.json()
        except ValueError:
            data = {}

        message = (
            data.get("message")
            or data.get("error_description")
            or response.text
            or "Invalid LinkedIn token"
        )

        raise RuntimeError(
            f"LinkedIn token validation failed "
            f"({response.status_code}): {message}"
        )

    try:
        data = response.json()
    except ValueError:
        data = {}

    return {
        "success": True,
        "status_code": response.status_code,
        "data": data,
    }


async def publish_linkedin_image_post(
    access_token: str,
    linkedin_user_id: str,
    content: str,
    image_bytes: bytes,
    title: str = "Image",
) -> dict:
    """
    Publish a post with an image to LinkedIn using the LinkedIn REST Images API.
    Gracefully falls back to text post if media registration is rejected.
    """
    if not access_token:
        raise ValueError("LinkedIn access token is missing")
    if not linkedin_user_id:
        raise ValueError("LinkedIn member ID is missing")

    author_urn = f"urn:li:person:{linkedin_user_id}"
    cleaned_content = content.strip() if content else ""

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Linkedin-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": LINKEDIN_PROTOCOL_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            # Step 1: Initialize image upload
            init_url = "https://api.linkedin.com/rest/images?action=initializeUpload"
            init_payload = {
                "initializeUploadRequest": {
                    "owner": author_urn
                }
            }
            init_res = await client.post(init_url, json=init_payload, headers=headers)
            if init_res.status_code not in (200, 201):
                return await publish_linkedin_text_post(access_token, linkedin_user_id, content)

            init_data = init_res.json().get("value", {})
            upload_url = init_data.get("uploadUrl")
            image_urn = init_data.get("image")

            if not upload_url or not image_urn:
                return await publish_linkedin_text_post(access_token, linkedin_user_id, content)

            # Step 2: Upload binary image bytes
            put_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/octet-stream",
            }
            upload_res = await client.put(upload_url, content=image_bytes, headers=put_headers)
            if upload_res.status_code not in (200, 201):
                return await publish_linkedin_text_post(access_token, linkedin_user_id, content)

            # Step 3: Create post with media attached
            post_payload = {
                "author": author_urn,
                "commentary": cleaned_content,
                "visibility": "PUBLIC",
                "distribution": {
                    "feedDistribution": "MAIN_FEED",
                    "targetEntities": [],
                    "thirdPartyDistributionChannels": [],
                },
                "content": {
                    "media": {
                        "id": image_urn,
                        "title": title
                    }
                },
                "lifecycleState": "PUBLISHED",
                "isReshareDisabledByAuthor": False,
            }
            response = await client.post(LINKEDIN_POSTS_URL, json=post_payload, headers=headers)
            if response.status_code in (200, 201):
                linkedin_post_id = response.headers.get("x-restli-id")
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "post_id": linkedin_post_id,
                    "image_urn": image_urn,
                    "data": response.json() if response.content else {},
                }
            return await publish_linkedin_text_post(access_token, linkedin_user_id, content)

    except Exception:
        return await publish_linkedin_text_post(access_token, linkedin_user_id, content)