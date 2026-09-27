import os
import mimetypes
import time
from pathlib import Path

import requests


def instagram_request(method: str, url: str, **kwargs):
    """Small wrapper around requests.request for the Instagram API calls."""
    return requests.request(
        method=method,
        url=url,
        **kwargs
    )


def create_public_media_url(media_url: str | None):
    """
    Convert a local uploaded media path into a publicly reachable URL.

    Uploaded media is stored under /uploads/... and is exposed through the
    FastAPI app at the same path. For Instagram publishing we must send a
    public URL, not the internal relative path that is used in the app.
    """

    if not media_url:
        return None, "Media URL is missing"

    media_url = str(media_url).strip()

    if media_url.startswith("http://") or media_url.startswith("https://"):
        return media_url, None

    normalized_path = media_url.replace("\\", "/")
    normalized_path = normalized_path.lstrip("./")

    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"

    base_url = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

    return f"{base_url}{normalized_path}", None


def publish_to_linkedin(
    content: str,
    access_token: str,
    media_url: str | None = None,
    media_type: str | None = None
):
    """
    Publish a LinkedIn post.

    Supports:
    - Text-only posts
    - Image posts

    For image posts:
    1. Get LinkedIn member ID
    2. Initialize LinkedIn image upload
    3. Upload image bytes
    4. Get LinkedIn image URN
    5. Create LinkedIn post using image URN
    """

    # ========================================================
    # GET LINKEDIN MEMBER ID
    # ========================================================

    me_url = "https://api.linkedin.com/v2/userinfo"

    me_headers = {
        "Authorization": f"Bearer {access_token}"
    }

    try:
        me_response = requests.get(
            me_url,
            headers=me_headers,
            timeout=30
        )
    except Exception as exc:
        return {
            "success": False,
            "platform": "linkedin",
            "message": f"LinkedIn user information error: {str(exc)}"
        }

    if not me_response.ok:
        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn authentication failed: "
                f"{me_response.text}"
            )
        }

    try:
        me_data = me_response.json()
    except Exception:
        return {
            "success": False,
            "platform": "linkedin",
            "message": "Invalid response from LinkedIn user information API"
        }

    member_id = me_data.get("sub")

    if not member_id:
        return {
            "success": False,
            "platform": "linkedin",
            "message": "Unable to identify LinkedIn member"
        }

    author_urn = f"urn:li:person:{member_id}"

    print("LinkedIn Member ID:", member_id)
    print("LinkedIn Author URN:", author_urn)

    # ========================================================
    # LINKEDIN API VERSION
    # ========================================================

    linkedin_version = "202606"

    common_headers = {
        "Authorization": f"Bearer {access_token}",
        "Linkedin-Version": linkedin_version,
        "X-Restli-Protocol-Version": "2.0.0"
    }

    # ========================================================
    # TEXT-ONLY POST
    # ========================================================

    if not media_url:

        post_url = "https://api.linkedin.com/rest/posts"

        headers = {
            **common_headers,
            "Content-Type": "application/json"
        }

        payload = {
            "author": author_urn,
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

        print("Publishing LinkedIn text-only post...")

        try:
            response = requests.post(
                post_url,
                headers=headers,
                json=payload,
                timeout=30
            )
        except Exception as exc:
            return {
                "success": False,
                "platform": "linkedin",
                "message": (
                    f"LinkedIn publishing error: {str(exc)}"
                )
            }

        if response.status_code == 201:

            linkedin_post_id = response.headers.get(
                "x-restli-id"
            )

            return {
                "success": True,
                "platform": "linkedin",
                "message": "LinkedIn text post published successfully",
                "post_id": linkedin_post_id
            }

        try:
            error_data = response.json()
        except Exception:
            error_data = response.text

        return {
            "success": False,
            "platform": "linkedin",
            "message": f"LinkedIn API error: {error_data}"
        }

    # ========================================================
    # CHECK IMAGE TYPE
    # ========================================================

    normalized_media_type = (
        str(media_type).lower().strip()
        if media_type
        else ""
    )

    image_types = [
        "image",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "jpg",
        "jpeg",
        "png"
    ]

    if normalized_media_type not in image_types:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn image publishing currently supports "
                "JPG/JPEG/PNG images only."
            )
        }

    # ========================================================
    # FIND LOCAL IMAGE FILE
    # ========================================================

    if media_url.startswith("http://") or media_url.startswith("https://"):

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn publisher expected a local uploaded "
                "media file path, but received a public URL."
            )
        }

    # publisher.py is:
    #
    # backend/app/services/publisher.py
    #
    # parents[0] = services
    # parents[1] = app
    # parents[2] = backend

    backend_dir = Path(__file__).resolve().parents[2]

    relative_media_path = str(media_url).lstrip("/\\")

    image_path = backend_dir / relative_media_path

    print("LinkedIn local image path:", image_path)

    if not image_path.exists():

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                f"LinkedIn image file was not found: {image_path}"
            )
        }

    if not image_path.is_file():

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                f"LinkedIn media path is not a file: {image_path}"
            )
        }

    # ========================================================
    # GET MIME TYPE
    # ========================================================

    mime_type, _ = mimetypes.guess_type(
        str(image_path)
    )

    if not mime_type:
        mime_type = "image/jpeg"

    print("LinkedIn image MIME type:", mime_type)

    # ========================================================
    # STEP 1:
    # INITIALIZE LINKEDIN IMAGE UPLOAD
    # ========================================================

    initialize_url = (
        "https://api.linkedin.com/rest/images"
        "?action=initializeUpload"
    )

    initialize_headers = {
        **common_headers,
        "Content-Type": "application/json"
    }

    initialize_payload = {
        "initializeUploadRequest": {
            "owner": author_urn
        }
    }

    print("Initializing LinkedIn image upload...")

    try:

        initialize_response = requests.post(
            initialize_url,
            headers=initialize_headers,
            json=initialize_payload,
            timeout=30
        )

    except Exception as exc:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn image initialization failed: "
                f"{str(exc)}"
            )
        }

    try:
        initialize_result = initialize_response.json()
    except Exception:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "Invalid LinkedIn image initialization response: "
                f"{initialize_response.text}"
            )
        }

    if not initialize_response.ok:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn image initialization failed: "
                f"{initialize_result}"
            )
        }

    value = initialize_result.get("value", {})

    upload_url = value.get("uploadUrl")
    image_urn = value.get("image")

    if not upload_url or not image_urn:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn did not return an upload URL or image URN: "
                f"{initialize_result}"
            )
        }

    print("LinkedIn Image URN:", image_urn)

    # ========================================================
    # STEP 2:
    # UPLOAD IMAGE BYTES TO LINKEDIN
    # ========================================================

    try:

        with open(image_path, "rb") as image_file:
            image_bytes = image_file.read()

    except Exception as exc:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                f"Could not read image file: {str(exc)}"
            )
        }

    print(
        f"Uploading image to LinkedIn "
        f"({len(image_bytes)} bytes)..."
    )

    upload_headers = {
        "Content-Type": mime_type
    }

    try:

        upload_response = requests.put(
            upload_url,
            headers=upload_headers,
            data=image_bytes,
            timeout=120
        )

    except Exception as exc:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                f"LinkedIn image upload failed: {str(exc)}"
            )
        }

    if upload_response.status_code not in [200, 201]:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                "LinkedIn image upload failed: "
                f"HTTP {upload_response.status_code} - "
                f"{upload_response.text}"
            )
        }

    print("LinkedIn image uploaded successfully.")

    # ========================================================
    # STEP 3:
    # CREATE LINKEDIN IMAGE POST
    # ========================================================

    post_url = "https://api.linkedin.com/rest/posts"

    post_headers = {
        **common_headers,
        "Content-Type": "application/json"
    }

    post_payload = {
        "author": author_urn,
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "content": {
            "media": {
                "altText": "Image uploaded through SocialPilot",
                "id": image_urn
            }
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    print("Creating LinkedIn image post...")

    try:

        post_response = requests.post(
            post_url,
            headers=post_headers,
            json=post_payload,
            timeout=30
        )

    except Exception as exc:

        return {
            "success": False,
            "platform": "linkedin",
            "message": (
                f"LinkedIn image post request failed: {str(exc)}"
            )
        }

    try:
        post_result = post_response.json()
    except Exception:
        post_result = post_response.text

    # ========================================================
    # SUCCESS
    # ========================================================

    if post_response.status_code == 201:

        linkedin_post_id = post_response.headers.get(
            "x-restli-id"
        )

        print(
            "LinkedIn image post published successfully."
        )

        print(
            "LinkedIn Post ID:",
            linkedin_post_id
        )

        return {
            "success": True,
            "platform": "linkedin",
            "message": (
                "LinkedIn image post published successfully"
            ),
            "post_id": linkedin_post_id,
            "image_urn": image_urn
        }

    # ========================================================
    # FAILURE
    # ========================================================

    return {
        "success": False,
        "platform": "linkedin",
        "message": (
            "LinkedIn image post creation failed: "
            f"{post_result}"
        )
    }
# ============================================================
# INSTAGRAM PUBLISHER
# ============================================================

def publish_to_instagram(
    content: str,
    access_token: str,
    media_url: str | None = None,
    media_type: str | None = None,
    social_account=None
):
    """
    Publish an Instagram image post.

    Instagram publishing requires:

    1. Instagram access token
    2. Instagram User ID
    3. Publicly accessible image URL
    4. Instagram content publishing permission

    The Instagram User ID is read from:

        social_account.channel_id
    """

    # ========================================================
    # CHECK SOCIAL ACCOUNT
    # ========================================================

    if social_account is None:
        return {
            "success": False,
            "platform": "instagram",
            "message": "Instagram social account information is missing"
        }

    # ========================================================
    # GET INSTAGRAM USER ID
    # ========================================================

    instagram_user_id = social_account.channel_id

    if not instagram_user_id:
        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram User ID is missing. "
                "Please reconnect the Instagram account."
            )
        }

    print(
        f"Instagram User ID: {instagram_user_id}"
    )

    # ========================================================
    # CHECK ACCESS TOKEN
    # ========================================================

    if not access_token:
        return {
            "success": False,
            "platform": "instagram",
            "message": "Instagram access token is missing"
        }

    # ========================================================
    # CHECK MEDIA
    # ========================================================

    if not media_url:
        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram publishing requires an image. "
                "Please upload an image before publishing."
            )
        }

    # ========================================================
    # CREATE PUBLIC MEDIA URL
    # ========================================================

    public_media_url, url_error = create_public_media_url(
        media_url
    )

    if url_error:
        return {
            "success": False,
            "platform": "instagram",
            "message": url_error
        }

    print(
        f"Instagram Media URL: {public_media_url}"
    )

    # ========================================================
    # INSTAGRAM API VERSION
    # ========================================================

    api_version = os.getenv(
        "INSTAGRAM_API_VERSION",
        "v26.0"
    )

    # ========================================================
    # NORMALIZE MEDIA TYPE
    # ========================================================

    normalized_media_type = (
        str(media_type).lower().strip()
        if media_type
        else ""
    )

    print(
        f"Application media type: {normalized_media_type}"
    )

    # ========================================================
    # CURRENTLY SUPPORT IMAGE
    # ========================================================

    if normalized_media_type:

        if normalized_media_type in [
            "image/jpeg",
            "image/jpg",
            "jpg",
            "jpeg"
        ]:
            normalized_media_type = "image"

        elif normalized_media_type in [
            "video/mp4",
            "mp4"
        ]:
            normalized_media_type = "video"

    # ========================================================
    # VIDEO NOT IMPLEMENTED IN THIS VERSION
    # ========================================================

    if normalized_media_type == "video":

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram video publishing is not enabled "
                "in this publisher version. "
                "Please test with a JPG or JPEG image first."
            )
        }

    # ========================================================
    # CREATE INSTAGRAM MEDIA CONTAINER
    # ========================================================

    container_url = (
        f"https://graph.instagram.com/"
        f"{api_version}/"
        f"{instagram_user_id}/media"
    )

    # IMPORTANT:
    #
    # Do NOT send:
    #
    # "media_type": "image"
    #
    # for an IMAGE container.
    #
    # The previous error:
    #
    # "Only photo or video can be accepted as media type"
    #
    # happened because an incorrect media_type value was being
    # passed to Instagram.
    #
    # For an image post we send image_url + caption only.

    container_data = {
        "image_url": public_media_url,
        "caption": content,
        "access_token": access_token
    }

    print(
        "Creating Instagram media container..."
    )

    try:

        container_response = instagram_request(
            "POST",
            container_url,
            data=container_data,
            timeout=30
        )

    except Exception as exc:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram media container request failed: "
                f"{str(exc)}"
            )
        }

    # ========================================================
    # PARSE CONTAINER RESPONSE
    # ========================================================

    try:
        container_result = container_response.json()
    except Exception:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram returned an invalid response: "
                f"{container_response.text}"
            )
        }

    # ========================================================
    # CHECK CONTAINER CREATION
    # ========================================================

    if not container_response.ok:

        if (
            container_result.get("error", {}).get("code")
            == 190
        ):
            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Instagram access token is invalid or expired. "
                    "Reconnect the Instagram account from Social Accounts."
                )
            }

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram media container creation failed: "
                f"{container_result}"
            )
        }

    container_id = container_result.get(
        "id"
    )

    if not container_id:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram did not return a media container ID"
            )
        }

    print(
        f"Instagram container created: {container_id}"
    )

    # ========================================================
    # WAIT FOR CONTAINER TO FINISH PROCESSING
    # ========================================================

    status_url = (
        f"https://graph.instagram.com/"
        f"{api_version}/"
        f"{container_id}"
    )

    max_attempts = 12

    for attempt in range(max_attempts):

        print(
            f"Checking Instagram container status "
            f"({attempt + 1}/{max_attempts})..."
        )

        try:

            status_response = instagram_request(
                "GET",
                status_url,
                params={
                    "fields": "status_code,status",
                    "access_token": access_token
                },
                timeout=30
            )

        except Exception as exc:

            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Could not check Instagram container status: "
                    f"{str(exc)}"
                )
            }

        try:
            status_result = status_response.json()
        except Exception:

            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Invalid Instagram container status response: "
                    f"{status_response.text}"
                )
            }

        if not status_response.ok:

            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Instagram container status check failed: "
                    f"{status_result}"
                )
            }

        status_code = status_result.get(
            "status_code"
        )

        status_text = status_result.get(
            "status"
        )

        print(
            f"Instagram container status: "
            f"{status_code} / {status_text}"
        )

        # ----------------------------------------------------
        # FINISHED
        # ----------------------------------------------------

        if status_code == "FINISHED":

            print(
                "Instagram media container is ready."
            )

            break

        # ----------------------------------------------------
        # ERROR
        # ----------------------------------------------------

        if status_code in [
            "ERROR",
            "EXPIRED"
        ]:

            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Instagram media processing failed: "
                    f"{status_result}"
                )
            }

        # ----------------------------------------------------
        # WAIT
        # ----------------------------------------------------

        time.sleep(5)

    else:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram media container did not finish "
                "processing within the expected time."
            )
        }

    # ========================================================
    # PUBLISH MEDIA CONTAINER
    # ========================================================

    publish_url = (
        f"https://graph.instagram.com/"
        f"{api_version}/"
        f"{instagram_user_id}/media_publish"
    )

    publish_data = {
        "creation_id": container_id,
        "access_token": access_token
    }

    print(
        "Publishing Instagram media container..."
    )

    try:

        publish_response = instagram_request(
            "POST",
            publish_url,
            data=publish_data,
            timeout=30
        )

    except Exception as exc:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram publish request failed: "
                f"{str(exc)}"
            )
        }

    # ========================================================
    # PARSE PUBLISH RESPONSE
    # ========================================================

    try:
        publish_result = publish_response.json()
    except Exception:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram returned an invalid publish response: "
                f"{publish_response.text}"
            )
        }

    # ========================================================
    # PUBLISH FAILURE
    # ========================================================

    if not publish_response.ok:

        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram publishing failed: "
                f"{publish_result}"
            )
        }

    # ========================================================
    # SUCCESS
    # ========================================================

    instagram_media_id = publish_result.get(
        "id"
    )

    print(
        "Instagram post published successfully."
    )

    print(
        f"Instagram Media ID: {instagram_media_id}"
    )

    return {
        "success": True,
        "platform": "instagram",
        "message": "Instagram post published successfully",
        "post_id": instagram_media_id,
        "container_id": container_id
    }


# ============================================================
# FACEBOOK PUBLISHER
# ============================================================

def publish_to_facebook(
    content: str,
    access_token: str,
    media_url: str | None = None,
    media_type: str | None = None,
    social_account=None
):
    """
    Publish a post to a Facebook Page using its Page access token.

    Supports text-only posts and JPG/PNG image posts.
    """

    page_id = getattr(social_account, "page_id", None)

    if not page_id:
        return {
            "success": False,
            "platform": "facebook",
            "message": "Facebook Page ID is missing from the connected account."
        }

    api_version = os.getenv("FACEBOOK_GRAPH_API_VERSION", "v23.0")
    page_url = f"https://graph.facebook.com/{api_version}/{page_id}"

    normalized_media_type = str(media_type or "").lower().strip()

    if media_url and normalized_media_type not in {
        "image",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "jpg",
        "jpeg",
        "png"
    }:
        return {
            "success": False,
            "platform": "facebook",
            "message": "Facebook publishing currently supports JPG/JPEG/PNG images only."
        }

    try:
        if not media_url:
            response = requests.post(
                f"{page_url}/feed",
                data={
                    "message": content,
                    "access_token": access_token
                },
                timeout=30
            )
        else:
            relative_media_path = str(media_url).lstrip("/\\")
            image_path = Path(__file__).resolve().parents[2] / relative_media_path

            if not image_path.is_file():
                return {
                    "success": False,
                    "platform": "facebook",
                    "message": f"Facebook image file was not found: {image_path}"
                }

            mime_type = mimetypes.guess_type(str(image_path))[0] or "image/jpeg"

            with image_path.open("rb") as image_file:
                response = requests.post(
                    f"{page_url}/photos",
                    data={
                        "message": content,
                        "access_token": access_token
                    },
                    files={
                        "source": (
                            image_path.name,
                            image_file,
                            mime_type
                        )
                    },
                    timeout=30
                )
    except requests.RequestException as exc:
        return {
            "success": False,
            "platform": "facebook",
            "message": f"Facebook publishing request failed: {str(exc)}"
        }
    except OSError as exc:
        return {
            "success": False,
            "platform": "facebook",
            "message": f"Facebook media file could not be read: {str(exc)}"
        }

    try:
        result = response.json()
    except ValueError:
        result = response.text

    api_error = isinstance(result, dict) and "error" in result

    if not response.ok or api_error:
        return {
            "success": False,
            "platform": "facebook",
            "message": f"Facebook API error: {result}"
        }

    return {
        "success": True,
        "platform": "facebook",
        "message": "Facebook post published successfully",
        "post_id": result.get("post_id") or result.get("id")
    }


# ============================================================
# TWITTER / X PUBLISHER
# ============================================================

def publish_to_twitter(
    content: str,
    access_token: str,
    social_account=None
):
    """
    X/Twitter publishing placeholder.
    """

    return {
        "success": False,
        "platform": "twitter",
        "message": (
            "X/Twitter real API publishing is not implemented yet."
        )
    }


# ============================================================
# YOUTUBE PUBLISHER
# ============================================================

def publish_to_youtube(
    content: str,
    access_token: str,
    media_url: str | None = None,
    media_type: str | None = None,
    social_account=None
):
    """
    YouTube publishing placeholder.

    YouTube requires a video upload workflow using the
    YouTube Data API.
    """

    return {
        "success": False,
        "platform": "youtube",
        "message": (
            "YouTube video publishing is not implemented "
            "in this publisher version."
        )
    }


# ============================================================
# MAIN SOCIAL MEDIA PUBLISHER
# ============================================================

def publish_to_social_media(
    platform: str,
    username: str,
    content: str,
    access_token: str | None = None,
    media_url: str | None = None,
    media_type: str | None = None,
    social_account=None
):
    """
    Main publishing dispatcher.

    The scheduler/manual publishing code calls this function
    and the function selects the correct platform publisher.
    """

    platform = (
        platform.lower().strip()
        if platform
        else ""
    )

    # ========================================================
    # ACCESS TOKEN CHECK
    # ========================================================

    if not access_token:

        return {
            "success": False,
            "platform": platform,
            "username": username,
            "message": (
                f"{platform} account is not connected"
            )
        }

    # ========================================================
    # LINKEDIN
    # ========================================================

    if platform == "linkedin":

        from app.services.linkedin_publisher import publish_to_linkedin

        return publish_to_linkedin(
            content=content,
            access_token=access_token,
            media_url=media_url,
            media_type=media_type
    )

    # ========================================================
    # INSTAGRAM
    # ========================================================

    if platform == "instagram":

        from app.services.instagram_publisher import publish_to_instagram

        return publish_to_instagram(
            content=content,
            access_token=access_token,
            media_url=media_url,
            media_type=media_type,
            social_account=social_account
        )

    # ========================================================
    # FACEBOOK
    # ========================================================

    if platform == "facebook":

        from app.services.facebook_publisher import publish_to_facebook

        return publish_to_facebook(
            content=content,
            access_token=access_token,
            media_url=media_url,
            media_type=media_type,
            social_account=social_account
        )

    # ========================================================
    # TWITTER / X
    # ========================================================

    if platform in [
        "twitter",
        "x"
    ]:

        return publish_to_twitter(
            content=content,
            access_token=access_token,
            social_account=social_account
        )

    # ========================================================
    # YOUTUBE
    # ========================================================

    if platform == "youtube":

        return publish_to_youtube(
            content=content,
            access_token=access_token,
            media_url=media_url,
            media_type=media_type,
            social_account=social_account
        )

    # ========================================================
    # UNSUPPORTED PLATFORM
    # ========================================================

    return {
        "success": False,
        "platform": platform,
        "username": username,
        "message": "Unsupported social media platform"
    }