
from datetime import datetime, timezone

import requests
from sqlalchemy.orm import Session

from app.models.post import Post
from app.models.social_account import SocialAccount
from app.models.publishing_log import PublishingLog
from app.services.notification_service import create_notification


INSTAGRAM_GRAPH_URL = "https://graph.instagram.com/v24.0"
FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v24.0"

LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"
LINKEDIN_VERSION = "202608"


# ============================================================
# SAFE NOTIFICATION HELPER
# ============================================================

def _create_publishing_notification(
    db: Session,
    post: Post,
    account_name: str,
    platform_name: str,
    status: str,
    error_message: str | None = None,
):
    """
    Create an in-app notification without allowing notification
    errors to interrupt the publishing workflow.

    Publishing logs and publishing results remain the source
    of truth if notification creation fails.
    """

    try:
        if status == "published":
            create_notification(
                db=db,
                user_id=post.user_id,
                post_id=post.id,
                title="Post published ",
                message=(
                    f"Post #{post.id} was published successfully "
                    f"to {account_name} on {platform_name}."
                ),
                notification_type="publishing_success",
                platform=platform_name,
            )

        elif status == "failed":
            reason = (
                error_message
                or "An unknown publishing error occurred."
            )

            create_notification(
                db=db,
                user_id=post.user_id,
                post_id=post.id,
                title="Post failed",
                message=(
                    f"Publishing post #{post.id} to "
                    f"{account_name} on {platform_name} failed. "
                    f"Reason: {reason}"
                ),
                notification_type="publishing_failure",
                platform=platform_name,
            )

    except Exception as notification_error:
        # A notification failure must not change the publishing
        # result or create a false publishing-failure log.
        print(
            "Notification creation failed for "
            f"post #{post.id}: {notification_error}"
        )

        try:
            db.rollback()
        except Exception:
            pass


# ============================================================
# INSTAGRAM PUBLISHING
# ============================================================

def publish_to_instagram(
    db: Session,
    post: Post,
    social_account: SocialAccount,
):
    """
    Publish an image post to one Instagram account.
    """

    if not post.media_url:
        raise ValueError(
            "Instagram publishing requires an image URL."
        )

    if not social_account.access_token:
        raise ValueError(
            "Instagram access token is missing."
        )

    instagram_user_id = social_account.platform_user_id
    access_token = social_account.access_token

    # STEP 1: Create Instagram media container

    create_url = (
        f"{INSTAGRAM_GRAPH_URL}/"
        f"{instagram_user_id}/media"
    )

    create_data = {
        "image_url": post.media_url,
        "caption": post.content,
        "access_token": access_token,
    }

    create_response = requests.post(
        create_url,
        data=create_data,
        timeout=30,
    )

    try:
        create_result = create_response.json()
    except ValueError:
        create_result = {}

    if create_response.status_code != 200:
        error_message = (
            create_result.get("error", {}).get("message")
            if isinstance(create_result.get("error"), dict)
            else None
        )

        raise ValueError(
            error_message
            or "Instagram could not create the media container."
        )

    creation_id = create_result.get("id")

    if not creation_id:
        raise ValueError(
            "Instagram did not return a media container ID."
        )

    # STEP 2: Publish the media container

    publish_url = (
        f"{INSTAGRAM_GRAPH_URL}/"
        f"{instagram_user_id}/media_publish"
    )

    publish_data = {
        "creation_id": creation_id,
        "access_token": access_token,
    }

    publish_response = requests.post(
        publish_url,
        data=publish_data,
        timeout=30,
    )

    try:
        publish_result = publish_response.json()
    except ValueError:
        publish_result = {}

    if publish_response.status_code != 200:
        error_message = (
            publish_result.get("error", {}).get("message")
            if isinstance(publish_result.get("error"), dict)
            else None
        )

        raise ValueError(
            error_message
            or "Instagram could not publish the media."
        )

    instagram_media_id = publish_result.get("id")

    if not instagram_media_id:
        raise ValueError(
            "Instagram did not return the published media ID."
        )

    return instagram_media_id


# ============================================================
# FACEBOOK PUBLISHING
# ============================================================

def publish_to_facebook(
    db: Session,
    post: Post,
    social_account: SocialAccount,
):
    """
    Publish a post to one Facebook Page.

    Supports:
    1. Text-only posts
    2. Image posts with caption
    """

    if not social_account.access_token:
        raise ValueError(
            "Facebook Page access token is missing."
        )

    page_id = social_account.platform_user_id
    access_token = social_account.access_token

    if not page_id:
        raise ValueError(
            "Facebook Page ID is missing."
        )

    # IMAGE POST

    if post.media_url:
        photos_url = (
            f"{FACEBOOK_GRAPH_URL}/"
            f"{page_id}/photos"
        )

        photo_data = {
            "url": post.media_url,
            "caption": post.content,
            "access_token": access_token,
        }

        response = requests.post(
            photos_url,
            data=photo_data,
            timeout=30,
        )

        try:
            result = response.json()
        except ValueError:
            result = {}

        if response.status_code != 200:
            error_message = (
                result.get("error", {}).get("message")
                if isinstance(result.get("error"), dict)
                else None
            )

            raise ValueError(
                error_message
                or "Facebook could not publish the image."
            )

        facebook_post_id = result.get("post_id")

        if not facebook_post_id:
            facebook_post_id = result.get("id")

        if not facebook_post_id:
            raise ValueError(
                "Facebook did not return the published post ID."
            )

        return facebook_post_id

    # TEXT-ONLY POST

    feed_url = (
        f"{FACEBOOK_GRAPH_URL}/"
        f"{page_id}/feed"
    )

    feed_data = {
        "message": post.content,
        "access_token": access_token,
    }

    response = requests.post(
        feed_url,
        data=feed_data,
        timeout=30,
    )

    try:
        result = response.json()
    except ValueError:
        result = {}

    if response.status_code != 200:
        error_message = (
            result.get("error", {}).get("message")
            if isinstance(result.get("error"), dict)
            else None
        )

        raise ValueError(
            error_message
            or "Facebook could not publish the post."
        )

    facebook_post_id = result.get("id")

    if not facebook_post_id:
        raise ValueError(
            "Facebook did not return the published post ID."
        )

    return facebook_post_id


# ============================================================
# LINKEDIN PUBLISHING
# ============================================================

def publish_to_linkedin(
    db: Session,
    post: Post,
    social_account: SocialAccount,
):
    """
    Publish a text post to the connected LinkedIn member account.

    This version supports text-only LinkedIn posts.
    """

    if not social_account.access_token:
        raise ValueError(
            "LinkedIn access token is missing."
        )

    linkedin_user_id = social_account.platform_user_id
    access_token = social_account.access_token

    if not linkedin_user_id:
        raise ValueError(
            "LinkedIn member ID is missing."
        )

    author_urn = f"urn:li:person:{linkedin_user_id}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "Content-Type": "application/json",
    }

    post_data = {
        "author": author_urn,
        "commentary": post.content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    response = requests.post(
        LINKEDIN_POSTS_URL,
        headers=headers,
        json=post_data,
        timeout=30,
    )

    # Retain the existing LinkedIn debugging output.
    print("========== LINKEDIN DEBUG ==========")
    print("HTTP STATUS:", response.status_code)
    print("RESPONSE HEADERS:", dict(response.headers))
    print("RESPONSE BODY:", response.text)
    print("====================================")

    try:
        result = response.json()
    except ValueError:
        result = {}

    # LinkedIn may return 200 or 201 for a successful post.
    if response.status_code not in (200, 201):
        error_message = None

        if isinstance(result, dict):
            error_message = result.get("message")

            if not error_message:
                error_message = result.get(
                    "error_description"
                )

            if not error_message:
                error_details = result.get("error")

                if isinstance(error_details, dict):
                    error_message = error_details.get(
                        "message"
                    )

        if not error_message:
            error_message = response.text

        raise ValueError(
            error_message
            or "LinkedIn could not publish the post."
        )

    linkedin_post_id = response.headers.get(
        "x-restli-id"
    )

    if not linkedin_post_id:
        linkedin_post_id = response.headers.get(
            "X-RestLi-Id"
        )

    if not linkedin_post_id and isinstance(result, dict):
        linkedin_post_id = result.get("id")

    if not linkedin_post_id:
        raise ValueError(
            "LinkedIn did not return the published post ID."
        )

    return linkedin_post_id


# ============================================================
# MAIN PUBLISH FUNCTION
# ============================================================

def publish_post(
    db: Session,
    post_id: int,
    platform: str | None = None,
):
    """
    Publish a post to all selected connected social accounts.

    Each selected account is processed independently.
    If one account fails, the other selected accounts
    will still be attempted.

    In-app notifications are created for successful and failed
    publishing attempts. Notification errors do not interrupt
    publishing.
    """

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        return {
            "success": False,
            "message": "Post not found.",
        }

    # Get all selected connected accounts.
    # Preserve the existing behavior of processing every
    # connected account associated with this post.

    selected_accounts = [
        account
        for account in post.social_accounts
        if account.status == "connected"
    ]

    if not selected_accounts:
        return {
            "success": False,
            "message": (
                "No connected social accounts were "
                "selected for this post."
            ),
            "post_id": post.id,
        }

    results = []
    successful_count = 0
    failed_count = 0

    # Publish to every selected account.

    for social_account in selected_accounts:
        account_name = (
            social_account.display_name
            or social_account.platform_username
            or social_account.platform_user_id
        )

        platform_name = (
            social_account.platform.lower()
        )

        try:
            # INSTAGRAM

            if platform_name == "instagram":
                instagram_media_id = publish_to_instagram(
                    db=db,
                    post=post,
                    social_account=social_account,
                )

                log = PublishingLog(
                    post_id=post.id,
                    social_account_id=social_account.id,
                    platform="instagram",
                    platform_media_id=instagram_media_id,
                    status="published",
                    published_at=datetime.now(timezone.utc),
                )

                db.add(log)
                db.commit()
                db.refresh(log)

                successful_count += 1

                results.append(
                    {
                        "social_account_id": social_account.id,
                        "account_name": account_name,
                        "platform": "instagram",
                        "status": "published",
                        "log_id": log.id,
                        "instagram_media_id": instagram_media_id,
                    }
                )

                _create_publishing_notification(
                    db=db,
                    post=post,
                    account_name=account_name,
                    platform_name="instagram",
                    status="published",
                )

            # FACEBOOK

            elif platform_name == "facebook":
                facebook_post_id = publish_to_facebook(
                    db=db,
                    post=post,
                    social_account=social_account,
                )

                log = PublishingLog(
                    post_id=post.id,
                    social_account_id=social_account.id,
                    platform="facebook",
                    platform_media_id=facebook_post_id,
                    status="published",
                    published_at=datetime.now(timezone.utc),
                )

                db.add(log)
                db.commit()
                db.refresh(log)

                successful_count += 1

                results.append(
                    {
                        "social_account_id": social_account.id,
                        "account_name": account_name,
                        "platform": "facebook",
                        "status": "published",
                        "log_id": log.id,
                        "facebook_post_id": facebook_post_id,
                    }
                )

                _create_publishing_notification(
                    db=db,
                    post=post,
                    account_name=account_name,
                    platform_name="facebook",
                    status="published",
                )

            # LINKEDIN

            elif platform_name == "linkedin":
                linkedin_post_id = publish_to_linkedin(
                    db=db,
                    post=post,
                    social_account=social_account,
                )

                log = PublishingLog(
                    post_id=post.id,
                    social_account_id=social_account.id,
                    platform="linkedin",
                    platform_media_id=linkedin_post_id,
                    status="published",
                    published_at=datetime.now(timezone.utc),
                )

                db.add(log)
                db.commit()
                db.refresh(log)

                successful_count += 1

                results.append(
                    {
                        "social_account_id": social_account.id,
                        "account_name": account_name,
                        "platform": "linkedin",
                        "status": "published",
                        "log_id": log.id,
                        "linkedin_post_id": linkedin_post_id,
                    }
                )

                _create_publishing_notification(
                    db=db,
                    post=post,
                    account_name=account_name,
                    platform_name="linkedin",
                    status="published",
                )

            # OTHER / UNSUPPORTED PLATFORMS

            else:
                raise ValueError(
                    f"Publishing for platform "
                    f"'{social_account.platform}' "
                    "is not implemented yet."
                )

        except Exception as error:
            db.rollback()

            error_text = str(error)

            failed_log = PublishingLog(
                post_id=post.id,
                social_account_id=social_account.id,
                platform=social_account.platform,
                status="failed",
                error_message=(
                    f"Account {account_name}: {error_text}"
                ),
            )

            db.add(failed_log)
            db.commit()
            db.refresh(failed_log)

            failed_count += 1

            results.append(
                {
                    "social_account_id": social_account.id,
                    "account_name": account_name,
                    "platform": social_account.platform,
                    "status": "failed",
                    "log_id": failed_log.id,
                    "error": error_text,
                }
            )

            _create_publishing_notification(
                db=db,
                post=post,
                account_name=account_name,
                platform_name=platform_name,
                status="failed",
                error_message=error_text,
            )

    # Update overall post status.
    # Preserve the existing behavior: if at least one account
    # succeeds, the overall post status is "published".

    if successful_count > 0:
        post.status = "published"
    else:
        post.status = "failed"

    db.commit()
    db.refresh(post)

    # Final response

    if failed_count == 0:
        return {
            "success": True,
            "message": (
                f"Post published successfully to "
                f"{successful_count} selected "
                f"social account"
                f"{'s' if successful_count != 1 else ''}."
            ),
            "post_id": post.id,
            "successful_count": successful_count,
            "failed_count": failed_count,
            "results": results,
        }

    if successful_count > 0:
        return {
            "success": True,
            "message": (
                f"Post published to "
                f"{successful_count} account"
                f"{'s' if successful_count != 1 else ''}, "
                f"but "
                f"{failed_count} account"
                f"{'s' if failed_count != 1 else ''} "
                f"failed."
            ),
            "post_id": post.id,
            "successful_count": successful_count,
            "failed_count": failed_count,
            "results": results,
        }

    return {
        "success": False,
        "message": (
            "Publishing failed for all selected accounts."
        ),
        "post_id": post.id,
        "successful_count": 0,
        "failed_count": failed_count,
        "results": results,
    }

