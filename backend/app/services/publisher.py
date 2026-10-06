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
    Publish an Instagram image post or Reel.

    Supports:
    - JPG/JPEG/PNG image posts
    - MP4/MOV video Reels

    Instagram video publishing uses:
        media_type=REELS
        video_url=<public video URL>

    The container is then polled until FINISHED before publishing.
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

    print(f"Instagram User ID: {instagram_user_id}")

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
                "Instagram publishing requires media. "
                "Please upload an image or video before publishing."
            )
        }

    # ========================================================
    # CREATE PUBLIC MEDIA URL
    # ========================================================

    public_media_url, url_error = create_public_media_url(media_url)

    if url_error:
        return {
            "success": False,
            "platform": "instagram",
            "message": url_error
        }

    print(f"Instagram Media URL: {public_media_url}")

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

    # --------------------------------------------------------
    # IMAGE TYPES
    # --------------------------------------------------------

    image_types = {
        "image",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "jpg",
        "jpeg",
        "png"
    }

    # --------------------------------------------------------
    # VIDEO TYPES
    # --------------------------------------------------------

    video_types = {
        "video",
        "video/mp4",
        "video/quicktime",
        "video/mov",
        "mp4",
        "mov"
    }

    # Normalize MIME types / frontend values

    if normalized_media_type in image_types:
        normalized_media_type = "image"

    elif normalized_media_type in video_types:
        normalized_media_type = "video"

    elif normalized_media_type.startswith("video/"):
        normalized_media_type = "video"

    # --------------------------------------------------------
    # IF MEDIA TYPE IS EMPTY
    # --------------------------------------------------------
    # Try to determine it from the uploaded file extension.

    if not normalized_media_type:

        media_path = str(media_url).lower().split("?")[0]

        if media_path.endswith(
            (".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm")
        ):
            normalized_media_type = "video"

        elif media_path.endswith(
            (".jpg", ".jpeg", ".png", ".webp")
        ):
            normalized_media_type = "image"

    # ========================================================
    # VALIDATE MEDIA TYPE
    # ========================================================

    if normalized_media_type not in {"image", "video"}:
        return {
            "success": False,
            "platform": "instagram",
            "message": (
                "Instagram publishing supports "
                "JPG/JPEG/PNG images and MP4/MOV videos."
            )
        }

    print(
        f"Instagram normalized media type: "
        f"{normalized_media_type}"
    )

    # ========================================================
    # CREATE INSTAGRAM MEDIA CONTAINER
    # ========================================================

    container_url = (
        f"https://graph.instagram.com/"
        f"{api_version}/"
        f"{instagram_user_id}/media"
    )

    # ========================================================
    # IMAGE CONTAINER
    # ========================================================

    if normalized_media_type == "image":

        container_data = {
            "image_url": public_media_url,
            "caption": content or "",
            "access_token": access_token
        }

        print(
            "Creating Instagram IMAGE media container..."
        )

    # ========================================================
    # REEL CONTAINER
    # ========================================================

    else:

        container_data = {
            "media_type": "REELS",
            "video_url": public_media_url,
            "caption": content or "",
            "share_to_feed": "true",
            "access_token": access_token
        }

        print(
            "Creating Instagram REELS media container..."
        )

    # ========================================================
    # SEND CONTAINER REQUEST
    # ========================================================

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

    print(
        "Instagram container response:",
        container_result
    )

    # ========================================================
    # CHECK CONTAINER CREATION
    # ========================================================

    if not container_response.ok:

        error_data = container_result.get(
            "error",
            {}
        )

        if error_data.get("code") == 190:

            return {
                "success": False,
                "platform": "instagram",
                "message": (
                    "Instagram access token is invalid or expired. "
                    "Reconnect the Instagram account from "
                    "Social Accounts."
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

    # ========================================================
    # GET CONTAINER ID
    # ========================================================

    container_id = container_result.get("id")

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
    # WAIT FOR CONTAINER TO FINISH
    # ========================================================

    status_url = (
        f"https://graph.instagram.com/"
        f"{api_version}/"
        f"{container_id}"
    )

    max_attempts = 24

    container_finished = False

    for attempt in range(max_attempts):

        print(
            "Checking Instagram container status "
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

        print(
            "Instagram container status:",
            status_result
        )

        # ----------------------------------------------------
        # STATUS API ERROR
        # ----------------------------------------------------

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

            container_finished = True
            break

        # ----------------------------------------------------
        # ERROR
        # ----------------------------------------------------

        if status_code in {
            "ERROR",
            "EXPIRED"
        }:

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

    # ========================================================
    # CHECK PROCESSING TIMEOUT
    # ========================================================

    if not container_finished:

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

    print(
        "Instagram publish response:",
        publish_result
    )

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
        "message": (
            "Instagram Reel published successfully"
            if normalized_media_type == "video"
            else "Instagram image published successfully"
        ),
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

    Supports text-only, image, and video posts.
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
    image_types = {"image", "image/jpeg", "image/jpg", "image/png", "jpg", "jpeg", "png"}
    video_types = {
        "video",
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
        "video/webm",
        "mp4",
        "mov",
        "avi",
        "mkv",
        "webm",
    }
    is_video = False

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
            media_path = Path(__file__).resolve().parents[2] / relative_media_path

            if not media_path.is_file():
                return {
                    "success": False,
                    "platform": "facebook",
                    "message": f"Facebook media file was not found: {media_path}"
                }

            extension = media_path.suffix.lower()
            guessed_media_type = mimetypes.guess_type(str(media_path))[0] or ""
            is_video = (
                normalized_media_type in video_types
                or (not normalized_media_type and guessed_media_type.startswith("video/"))
            )
            is_image = (
                normalized_media_type in image_types
                or (not normalized_media_type and guessed_media_type.startswith("image/"))
            )

            if is_video and extension not in {".mp4", ".mov", ".avi", ".mkv", ".webm"}:
                return {
                    "success": False,
                    "platform": "facebook",
                    "message": "Facebook video uploads support MP4, MOV, AVI, MKV, and WebM files."
                }

            if not is_video and (not is_image or extension not in {".jpg", ".jpeg", ".png"}):
                return {
                    "success": False,
                    "platform": "facebook",
                    "message": "Facebook publishing supports JPG/JPEG/PNG images and video files."
                }

            mime_type = guessed_media_type or (
                "video/mp4" if is_video else "image/jpeg"
            )
            endpoint = "videos" if is_video else "photos"
            data = {
                "access_token": access_token,
                "description" if is_video else "message": content,
            }

            with media_path.open("rb") as media_file:
                response = requests.post(
                    f"{page_url}/{endpoint}",
                    data=data,
                    files={
                        "source": (
                            media_path.name,
                            media_file,
                            mime_type
                        )
                    },
                    timeout=(15, 300) if is_video else 30
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
        "message": (
            "Facebook video published successfully"
            if media_url and is_video
            else "Facebook post published successfully"
        ),
        "post_id": result.get("post_id") or result.get("id")
    }


# ============================================================
# TWITTER / X PUBLISHER
# ============================================================

def publish_to_twitter(
    content: str,
    access_token: str,
    media_url: str | None = None,
    social_account=None
):
    """
    Publish a text post to X using its v2 API.
    """

    if not content or not content.strip():
        return {
            "success": False,
            "platform": "twitter",
            "message": "X post content cannot be empty."
        }

    if social_account is not None and not access_token:
        access_token = getattr(social_account, "access_token", None)

    if not access_token:
        return {
            "success": False,
            "platform": "twitter",
            "message": "X access token is missing. Reconnect the X account."
        }

    if media_url:
        return {
            "success": False,
            "platform": "twitter",
            "message": "X publishing currently supports text-only posts."
        }

    def send_post(token: str):
        return requests.post(
            "https://api.x.com/2/tweets",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"text": content},
            timeout=30
        )

    try:
        response = send_post(access_token)
    except requests.RequestException as exc:
        return {
            "success": False,
            "platform": "twitter",
            "message": f"X publishing request failed: {exc}"
        }

    if response.status_code == 401 and social_account is not None:
        refresh_token = getattr(social_account, "refresh_token", None)
        client_id = os.getenv("X_CLIENT_ID")
        client_secret = os.getenv("X_CLIENT_SECRET")

        if not refresh_token or not client_id or not client_secret:
            return {
                "success": False,
                "platform": "twitter",
                "message": "X authorization expired. Reconnect the X account."
            }

        try:
            refresh_response = requests.post(
                "https://api.x.com/2/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                auth=(client_id, client_secret),
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=30
            )
        except requests.RequestException as exc:
            return {
                "success": False,
                "platform": "twitter",
                "message": f"Unable to refresh X authorization: {exc}"
            }

        if not refresh_response.ok:
            return {
                "success": False,
                "platform": "twitter",
                "message": "X authorization expired. Reconnect the X account."
            }

        try:
            refreshed_tokens = refresh_response.json()
        except ValueError:
            return {
                "success": False,
                "platform": "twitter",
                "message": "X returned an invalid token refresh response."
            }

        if not isinstance(refreshed_tokens, dict):
            return {
                "success": False,
                "platform": "twitter",
                "message": "X returned an invalid token refresh response."
            }

        refreshed_access_token = refreshed_tokens.get("access_token")
        if not refreshed_access_token:
            return {
                "success": False,
                "platform": "twitter",
                "message": "X token refresh response did not include an access token."
            }

        social_account.access_token = refreshed_access_token
        rotated_refresh_token = refreshed_tokens.get("refresh_token")
        if rotated_refresh_token:
            social_account.refresh_token = rotated_refresh_token

        access_token = refreshed_access_token

        try:
            response = send_post(access_token)
        except requests.RequestException as exc:
            return {
                "success": False,
                "platform": "twitter",
                "message": f"X publishing request failed: {exc}"
            }

    if not response.ok:
        if response.status_code == 401:
            message = "X authorization expired. Reconnect the X account."
        else:
            try:
                error_data = response.json()
            except ValueError:
                error_data = response.text
            message = f"X API error ({response.status_code}): {error_data}"

        return {
            "success": False,
            "platform": "twitter",
            "message": message
        }

    try:
        response_data = response.json()
    except ValueError:
        response_data = {}

    post_data = (
        response_data.get("data", {})
        if isinstance(response_data, dict)
        else {}
    )
    if not isinstance(post_data, dict):
        post_data = {}

    post_id = post_data.get("id")
    if not post_id:
        return {
            "success": False,
            "platform": "twitter",
            "message": "X accepted the request but did not return a post ID."
        }

    username = getattr(social_account, "username", None)
    post_url = (
        f"https://x.com/{str(username).lstrip('@')}/status/{post_id}"
        if username
        else f"https://x.com/i/web/status/{post_id}"
    )

    return {
        "success": True,
        "platform": "twitter",
        "message": "X post published successfully.",
        "post_id": post_id,
        "url": post_url
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
    Publish a video to YouTube using YouTube Data API v3.

    The connected YouTube account should contain:
    - access_token
    - refresh_token (recommended for long-term use)

    The uploaded media must be a local video file.
    """

    # ========================================================
    # CHECK ACCESS TOKEN
    # ========================================================

    if not access_token:
        return {
            "success": False,
            "platform": "youtube",
            "message": "YouTube access token is missing."
        }

    # ========================================================
    # CHECK MEDIA
    # ========================================================

    if not media_url:
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "YouTube publishing requires a video. "
                "Please upload a video before publishing."
            )
        }

    # ========================================================
    # CHECK MEDIA TYPE
    # ========================================================

    normalized_media_type = (
        str(media_type).lower().strip()
        if media_type
        else ""
    )

    video_types = {
        "video",
        "video/mp4",
        "mp4",
        "video/mov",
        "mov",
        "video/quicktime",
    }

    if normalized_media_type and normalized_media_type not in video_types:
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "YouTube publishing currently supports video files "
                "such as MP4."
            )
        }

    # ========================================================
    # FIND LOCAL VIDEO FILE
    # ========================================================

    if media_url.startswith("http://") or media_url.startswith("https://"):
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "YouTube publisher expected a local uploaded "
                "video file path, but received a public URL."
            )
        }

    backend_dir = Path(__file__).resolve().parents[2]
    relative_media_path = str(media_url).lstrip("/\\")
    video_path = backend_dir / relative_media_path

    print("YouTube local video path:", video_path)

    if not video_path.exists():
        return {
            "success": False,
            "platform": "youtube",
            "message": f"YouTube video file was not found: {video_path}"
        }

    if not video_path.is_file():
        return {
            "success": False,
            "platform": "youtube",
            "message": f"YouTube media path is not a file: {video_path}"
        }

    # ========================================================
    # IMPORT GOOGLE LIBRARIES
    # ========================================================

    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError as exc:
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "YouTube Google libraries are not installed. "
                "Run: pip install google-api-python-client "
                "google-auth google-auth-httplib2. "
                f"Error: {str(exc)}"
            )
        }

    # ========================================================
    # CREATE GOOGLE CREDENTIALS
    # ========================================================

    refresh_token = None

    if social_account is not None:
        refresh_token = getattr(social_account, "refresh_token", None)

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id or not client_secret:
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing "
                "from the backend environment."
            )
        }

    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=[
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ],
    )

    # ========================================================
    # REFRESH EXPIRED ACCESS TOKEN
    # ========================================================

    if credentials.expired and credentials.refresh_token:
        try:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())
            print("YouTube access token refreshed successfully.")

            # Keep the new access token in the object for this upload.
            # Persisting it in the database depends on your SocialAccount
            # model and is intentionally not done here.
        except Exception as exc:
            return {
                "success": False,
                "platform": "youtube",
                "message": (
                    "YouTube access token could not be refreshed. "
                    "Please reconnect the YouTube account. "
                    f"Error: {str(exc)}"
                )
            }

    # ========================================================
    # BUILD YOUTUBE SERVICE
    # ========================================================

    try:
        youtube = build(
            "youtube",
            "v3",
            credentials=credentials
        )
    except Exception as exc:
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                f"Could not initialize YouTube API client: {str(exc)}"
            )
        }

    # ========================================================
    # VIDEO TITLE
    # ========================================================

    title = "SocialPilot Video"

    if content:
        first_line = str(content).strip().split("\n")[0].strip()
        if first_line:
            title = first_line[:100]

    # ========================================================
    # VIDEO DESCRIPTION
    # ========================================================

    description = str(content or "").strip()

    # ========================================================
    # VIDEO METADATA
    # ========================================================

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": "private"
        }
    }

    # ========================================================
    # UPLOAD VIDEO
    # ========================================================

    print("==========================================")
    print("YouTube video upload started")
    print("Video:", video_path)
    print("Title:", title)
    print("Privacy: private")
    print("==========================================")

    try:
        mime_type = mimetypes.guess_type(str(video_path))[0] or "video/mp4"

        media = MediaFileUpload(
            str(video_path),
            mimetype=mime_type,
            resumable=True
        )

        insert_request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = None

        while response is None:
            status, response = insert_request.next_chunk()

            if status:
                progress = int(status.progress() * 100)
                print(f"YouTube upload progress: {progress}%")

    except Exception as exc:
        print("YouTube upload failed:", str(exc))

        return {
            "success": False,
            "platform": "youtube",
            "message": f"YouTube video upload failed: {str(exc)}"
        }

    # ========================================================
    # CHECK RESPONSE
    # ========================================================

    if not response or not response.get("id"):
        return {
            "success": False,
            "platform": "youtube",
            "message": (
                "YouTube upload completed without returning a video ID."
            )
        }

    youtube_video_id = response["id"]
    youtube_video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"

    print("==========================================")
    print("YouTube video published successfully")
    print("YouTube Video ID:", youtube_video_id)
    print("YouTube URL:", youtube_video_url)
    print("==========================================")

    return {
        "success": True,
        "platform": "youtube",
        "message": "YouTube video published successfully",
        "post_id": youtube_video_id,
        "video_id": youtube_video_id,
        "url": youtube_video_url
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
            media_url=media_url,
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