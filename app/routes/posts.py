from datetime import datetime, timezone
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, get_db
from app.dependencies.auth import get_current_user
from app.services.publishing_service import publishing_service
from app.core.config import settings
from app.integrations.buffer import BufferIntegration

from app.models.post import Post, PostStatus
from app.models.post_media import PostMedia
from app.models.user import User
from app.models.social_account import SocialAccount

from app.models.post_social_account import (
    PostSocialAccount,
    PublishStatus,
)

from app.models.publishing_log import (
    PublishingLog,
    PublishingLogStatus,
)

from app.schemas.post_social_account import (
    ConnectSocialAccountsRequest,
)


router = APIRouter(
    prefix="/posts",
    tags=["Posts"],
)


# =====================================
# Pydantic Schemas
# =====================================


class PostCreate(BaseModel):
    content: str
    status: PostStatus = PostStatus.DRAFT
    scheduled_at: datetime | None = None
    is_recurring: bool = False
    recurrence_type: str | None = None
    recurrence_end_at: datetime | None = None


class PostUpdate(BaseModel):
    content: str | None = None
    status: PostStatus | None = None
    scheduled_at: datetime | None = None
    is_recurring: bool | None = None
    recurrence_type: str | None = None
    recurrence_end_at: datetime | None = None


# =====================================
# Create Post
# POST /posts
# =====================================


@router.post("")
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if post_data.recurrence_type is not None:
        allowed_recurrence_types = {
            "daily",
            "weekly",
            "monthly",
    }

        if post_data.recurrence_type not in allowed_recurrence_types:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Recurring posts must use "
                    "daily, weekly, or monthly recurrence."
                ),
            )   
    
    
    new_post = Post(
        user_id=current_user.id,
        content=post_data.content,
        content_type="text",
        status=post_data.status,
        scheduled_at=post_data.scheduled_at,
        is_recurring=post_data.is_recurring,
        recurrence_type=post_data.recurrence_type,
        recurrence_end_at=post_data.recurrence_end_at,
        platforms=[],
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return new_post


# =====================================
# Get All Posts
# GET /posts
# =====================================


@router.get("")
def get_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = (
        db.query(Post)
        .filter(
            Post.user_id == current_user.id
        )
        .order_by(
            Post.created_at.desc()
        )
        .all()
    )

    return posts
# =====================================
# Publishing Queue
# GET /posts/queue
# =====================================

@router.get("/queue")
def get_publishing_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = (
        db.query(Post)
        .filter(
            Post.user_id == current_user.id,
            Post.status.in_(
                [
                    PostStatus.SCHEDULED,
                    PostStatus.PUBLISHING,
                ]
            ),
        )
        .order_by(
            Post.scheduled_at.asc()
        )
        .all()
    )

    return {
        "total": len(posts),
        "queue": posts,
    }




# =====================================
# Get Single Post
# GET /posts/{post_id}
# =====================================


@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    return post


# =====================================
# Update Post
# PUT /posts/{post_id}
# =====================================


@router.put("/{post_id}")
def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )
    if post_data.is_recurring is True:
        allowed_recurrence_types = {
            "daily",
            "weekly",
            "monthly",
        }

    if post_data.recurrence_type is not None:
        if post_data.recurrence_type not in allowed_recurrence_types:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Recurring posts must use "
                    "daily, weekly, or monthly recurrence."
                    ),
                )
    if post_data.content is not None:
        post.content = post_data.content

    if post_data.status is not None:
        post.status = post_data.status

    if post_data.scheduled_at is not None:
        post.scheduled_at = post_data.scheduled_at

    if post_data.is_recurring is not None:
        post.is_recurring = post_data.is_recurring

    if post_data.recurrence_type is not None:
        post.recurrence_type = post_data.recurrence_type

    if post_data.recurrence_end_at is not None:
        post.recurrence_end_at = post_data.recurrence_end_at
    db.commit()
    db.refresh(post)

    return post


# =====================================
# Schedule Post
# POST /posts/{post_id}/schedule
# =====================================


@router.post("/{post_id}/schedule")
def schedule_post(
    post_id: int,
    scheduled_at: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    if post.status == PostStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Published posts cannot be scheduled again",
        )

    current_time = datetime.now(timezone.utc)

    
    
    if scheduled_at <= current_time:
        raise HTTPException(
            status_code=400,
            detail="Scheduled time must be in the future",
        )

    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(
            tzinfo=timezone.utc
        )

    if scheduled_at <= current_time:
        raise HTTPException(
            status_code=400,
            detail="Scheduled time must be in the future",
        )

    if post.is_recurring:
        allowed_recurrence_types = {
            "daily",
            "weekly",
            "monthly",
        }

        if post.recurrence_type not in allowed_recurrence_types:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Recurring posts must use "
                    "daily, weekly, or monthly recurrence."
                ),
            )

    post.scheduled_at = scheduled_at
    post.status = PostStatus.SCHEDULED
    db.commit()
    db.refresh(post)

    return {
        "message": "Post scheduled successfully",
        "post": post,
    }

# =====================================
# Publishing Calendar
# GET /posts/calendar
# =====================================


@router.get("/calendar")
def get_publishing_calendar(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Post)
        .filter(
            Post.user_id == current_user.id,
        )
    )

    if start_date is not None:
        if start_date.tzinfo is None:
            start_date = start_date.replace(
                tzinfo=timezone.utc
            )

        query = query.filter(
            Post.scheduled_at >= start_date
        )

    if end_date is not None:
        if end_date.tzinfo is None:
            end_date = end_date.replace(
                tzinfo=timezone.utc
            )

        query = query.filter(
            Post.scheduled_at <= end_date
        )

    posts = (
        query
        .order_by(Post.scheduled_at.asc())
        .all()
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total": len(posts),
        "posts": posts,
    }
# =====================================
# Connect Social Accounts
# POST /posts/{post_id}/social-accounts
# =====================================


@router.post("/{post_id}/social-accounts")
def connect_social_accounts(
    post_id: int,
    data: ConnectSocialAccountsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    connected_accounts = []

    for social_account_id in data.social_account_ids:

        social_account = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.id == social_account_id,
                SocialAccount.user_id == current_user.id,
            )
            .first()
        )

        if not social_account:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Social account "
                    f"{social_account_id} not found"
                ),
            )

        existing_connection = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id == post_id,
                PostSocialAccount.social_account_id
                == social_account_id,
            )
            .first()
        )

        if not existing_connection:

            connection = PostSocialAccount(
                post_id=post_id,
                social_account_id=social_account_id,
            )

            db.add(connection)

        connected_accounts.append(
            social_account_id
        )

    db.commit()

    return {
        "message": (
            "Social accounts connected successfully"
        ),
        "post_id": post_id,
        "social_account_ids": connected_accounts,
    }


# =====================================
# Disconnect Social Account
# DELETE /posts/{post_id}/social-accounts/{social_account_id}
# =====================================


@router.delete(
    "/{post_id}/social-accounts/{social_account_id}"
)
def disconnect_social_account(
    post_id: int,
    social_account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    social_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == social_account_id,
            SocialAccount.user_id == current_user.id,
        )
        .first()
    )

    if not social_account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found",
        )

    connection = (
        db.query(PostSocialAccount)
        .filter(
            PostSocialAccount.post_id == post_id,
            PostSocialAccount.social_account_id
            == social_account_id,
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail=(
                "Social account is not connected "
                "to this post"
            ),
        )

    db.delete(connection)
    db.commit()

    return {
        "message": (
            "Social account disconnected "
            "from post successfully"
        ),
        "post_id": post_id,
        "social_account_id": social_account_id,
        "platform": social_account.platform,
    }


# =====================================
# Publish Post
# POST /posts/{post_id}/publish
# =====================================


@router.post("/{post_id}/publish")
def _publish_post_sync(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Prevent Duplicate Publishing
    # =====================================

    if post.status == PostStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Post is already published",
        )

    # =====================================
    # Get Connected Social Accounts
    # =====================================

    social_accounts = post.social_accounts

    if not social_accounts:
        raise HTTPException(
            status_code=400,
            detail=(
                "No social accounts connected "
                "to this post"
            ),
        )

    # =====================================
    # Get Post Media
    # =====================================

    media_items = (
        db.query(PostMedia)
        .filter(
            PostMedia.post_id == post.id
        )
        .all()
    )

    # =====================================
    # Start Publishing
    # =====================================

    post.status = PostStatus.PUBLISHING
    db.commit()

    publishing_results = []

    try:

        for post_social_account in social_accounts:

            social_account = (
                post_social_account.social_account
            )

            # =====================================
            # Get Platform Integration
            # =====================================

            integration = (
                publishing_service
                .get_platform_integration(
                    social_account.platform,
                    social_account=social_account,
                )
            )

           
            

            # =====================================
            # Publish
            # =====================================

            if social_account.platform.lower() in (
                "twitter",
                "x",
            ):

                if settings.social_dry_run:

                    # =====================================
                    # LOCAL X TEST MODE
                    # =====================================

                    result = {
                        "platform": "twitter",
                        "status": "published",
                        "twitter_post_id": (
                            f"dry-run-twitter-{post.id}"
                        ),
                        "post_id": (
                            f"dry-run-twitter-{post.id}"
                        ),
                        "message": (
                            "X/Twitter publish simulated "
                            "because social_dry_run=true"
                        ),
                        "dry_run": True,
                    }

                else:

                    # =====================================
                    # REAL X PUBLISHING THROUGH BUFFER
                    # =====================================

                    buffer_integration = BufferIntegration(
                        social_account=social_account
                    )

                    result = (
                        buffer_integration.publish_post(
                            content=post.content,
                            media=media_items,
                        )
                    )

            else:

                # =====================================
                # ALL OTHER PLATFORMS
                # =====================================

                result = integration.publish_post(
                    content=post.content,
                    media=media_items,
                )

            # =====================================
            # Update PostSocialAccount
            # =====================================

            post_social_account.status = (
                PublishStatus.PUBLISHED
            )

            post_social_account.published_at = (
                datetime.now(timezone.utc)
            )

            post_social_account.error_message = None

            # =====================================
            # Save Publishing Log
            # =====================================

            publishing_log = PublishingLog(
                post_id=post.id,
                social_account_id=social_account.id,
                status=PublishingLogStatus.SUCCESS,
                message=(
                    "Post published successfully "
                    f"to {social_account.platform}"
                ),
                platform_response=json.dumps(
                    result,
                    default=str,
                ),
            )

            db.add(publishing_log)

            # =====================================
            # Add Result
            # =====================================

            publishing_results.append(
                {
                    "social_account_id": (
                        social_account.id
                    ),
                    "platform": (
                        social_account.platform
                    ),
                    "account_name": (
                        social_account.account_name
                    ),
                    "status": "success",
                    "result": result,
                }
            )

        # =====================================
        # Mark Post Published
        # =====================================

        post.status = PostStatus.PUBLISHED

        db.commit()
        db.refresh(post)

        return {
            "message": (
                "Publishing process completed"
            ),
            "post": post,
            "media_count": len(media_items),
            "publishing_results": publishing_results,
        }

    except Exception as error:

        db.rollback()

        post.status = PostStatus.FAILED
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Publishing failed: {str(error)}"
            ),
        )

# =====================================
# Async Publishing Wrapper
# =====================================


def publish_post_background(
    post_id: int,
    user_id: int,
):
    db = SessionLocal()

    try:
        post = (
            db.query(Post)
            .filter(
                Post.id == post_id,
                Post.user_id == user_id,
            )
            .first()
        )

        if not post:
            print(
                f"Background publishing: "
                f"Post ID {post_id} not found."
            )
            return

        # Reuse the existing synchronous publishing logic
        _publish_post_sync(
            post_id=post_id,
            db=db,
            current_user=db.query(User).filter(
                User.id == user_id
            ).first(),
        )

    except Exception as error:
        print(
            f"Background publishing failed "
            f"for post ID {post_id}: {error}"
        )

    finally:
        db.close()
# =====================================
# Async Publish
# POST /posts/{post_id}/publish-async
# =====================================


@router.post("/{post_id}/publish-async")
def publish_post_async(
    post_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    if post.status == PostStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Post is already published",
        )

    if not post.social_accounts:
        raise HTTPException(
            status_code=400,
            detail=(
                "No social accounts connected "
                "to this post"
            ),
        )

    post.status = PostStatus.PUBLISHING
    db.commit()

    background_tasks.add_task(
        publish_post_background,
        post_id,
        current_user.id,
    )

    return {
        "message": (
            "Publishing started in background"
        ),
        "post_id": post_id,
        "status": "PUBLISHING",
    }
# =====================================
# Delete Published LinkedIn Post
# DELETE /posts/{post_id}/linkedin
# =====================================


@router.delete(
    "/{post_id}/linkedin",
    summary="Delete Published LinkedIn Post",
)
def delete_linkedin_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Find Successful LinkedIn Log
    # =====================================

    publishing_logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    linkedin_post_id = None
    linkedin_social_account_id = None
    linkedin_log = None
    platform_response = {}

    for log in publishing_logs:

        if not log.platform_response:
            continue

        try:
            response_data = json.loads(
                log.platform_response
            )
        except (
            json.JSONDecodeError,
            TypeError,
        ):
            continue

        if (
            isinstance(response_data, dict)
            and response_data.get("platform")
            == "linkedin"
            and response_data.get(
                "linkedin_post_id"
            )
        ):
            linkedin_post_id = (
                response_data.get(
                    "linkedin_post_id"
                )
            )

            linkedin_social_account_id = (
                log.social_account_id
            )

            linkedin_log = log
            platform_response = response_data

            break

    if not linkedin_post_id:
        raise HTTPException(
            status_code=404,
            detail=(
                "No successful LinkedIn "
                "publishing record found"
            ),
        )

    # =====================================
    # Get Correct LinkedIn Account
    # =====================================

    linkedin_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id
            == linkedin_social_account_id,
            SocialAccount.user_id
            == current_user.id,
            SocialAccount.platform
            == "linkedin",
        )
        .first()
    )

    if not linkedin_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "LinkedIn social account not found"
            ),
        )

    # =====================================
    # Delete From LinkedIn
    # =====================================

    try:

        integration = (
            publishing_service
            .get_platform_integration(
                "linkedin",
                social_account=linkedin_account,
            )
        )

        result = integration.delete_post(
            linkedin_post_id
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "LinkedIn deletion failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Update Database
    # ONLY AFTER DELETE SUCCEEDS
    # =====================================

    try:

        platform_response["linkedin_deleted"] = True

        platform_response[
            "linkedin_deleted_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        platform_response[
            "linkedin_delete_result"
        ] = result

        linkedin_log.platform_response = (
            json.dumps(
                platform_response,
                default=str,
            )
        )

        linkedin_log.status = (
            PublishingLogStatus.DELETED
        )

        linkedin_log.message = (
            "LinkedIn post deleted successfully"
        )

        # =====================================
        # Update PostSocialAccount
        # =====================================

        post_social_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.social_account_id
                == linkedin_social_account_id,
            )
            .first()
        )

        if post_social_account:

            post_social_account.status = (
                PublishStatus.DELETED
            )

            post_social_account.error_message = None

        # =====================================
        # Check Other Published Accounts
        # =====================================

        remaining_published_accounts = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.status
                == PublishStatus.PUBLISHED,
            )
            .count()
        )

        if remaining_published_accounts == 0:

            post.status = PostStatus.DRAFT

        else:

            post.status = PostStatus.PUBLISHED

        # =====================================
        # Commit
        # =====================================

        db.commit()
        db.refresh(post)

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "LinkedIn post was deleted, "
                "but database update failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Success Response
    # =====================================

    return {
        "message": (
            "LinkedIn post deleted successfully "
            "and database updated"
        ),
        "post_id": post_id,
        "linkedin_post_id": linkedin_post_id,
        "post_status": post.status,
        "result": result,
    }


# =====================================
# Delete Published Instagram Post
# DELETE /posts/{post_id}/instagram
# =====================================


@router.delete(
    "/{post_id}/instagram",
    summary="Delete Published Instagram Post",
)
def delete_instagram_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Find Successful Instagram Log
    # =====================================

    publishing_logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    instagram_post_id = None
    instagram_social_account_id = None

    for log in publishing_logs:

        if not log.platform_response:
            continue

        try:

            platform_response = json.loads(
                log.platform_response
            )

        except (
            json.JSONDecodeError,
            TypeError,
        ):
            continue

        if (
            isinstance(platform_response, dict)
            and platform_response.get("platform")
            == "instagram"
        ):

            instagram_post_id = (
                platform_response.get(
                    "instagram_post_id"
                )
                or platform_response.get(
                    "instagram_media_id"
                )
            )

            if instagram_post_id:

                instagram_social_account_id = (
                    log.social_account_id
                )

                break

    # =====================================
    # Instagram Record Not Found
    # =====================================

    if not instagram_post_id:
        raise HTTPException(
            status_code=404,
            detail=(
                "No successful Instagram "
                "publishing record found"
            ),
        )

    # =====================================
    # Get Instagram Account
    # =====================================

    instagram_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id
            == instagram_social_account_id,
            SocialAccount.user_id
            == current_user.id,
            SocialAccount.platform
            == "instagram",
        )
        .first()
    )

    if not instagram_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "Instagram social account not found"
            ),
        )

    # =====================================
    # Instagram API Deletion
    # =====================================

    try:

        integration = (
            publishing_service
            .get_platform_integration(
                "instagram",
                social_account=instagram_account,
            )
        )

        result = integration.delete_post(
            instagram_post_id
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Instagram deletion failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # DATABASE UPDATE
    # =====================================

    instagram_log = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.social_account_id
            == instagram_social_account_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .first()
    )

    if not instagram_log:
        raise HTTPException(
            status_code=404,
            detail=(
                "Instagram publishing log "
                "could not be found"
            ),
        )

    try:

        try:
            platform_response = json.loads(
                instagram_log.platform_response
            )
        except (
            json.JSONDecodeError,
            TypeError,
        ):
            platform_response = {}

        platform_response[
            "instagram_deleted"
        ] = True

        platform_response[
            "instagram_deleted_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        platform_response[
            "instagram_delete_result"
        ] = result

        instagram_log.platform_response = (
            json.dumps(
                platform_response,
                default=str,
            )
        )

        instagram_log.status = (
            PublishingLogStatus.DELETED
        )

        instagram_log.message = (
            "Instagram post deleted successfully"
        )

        # =====================================
        # Update PostSocialAccount
        # =====================================

        post_social_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.social_account_id
                == instagram_social_account_id,
            )
            .first()
        )

        if post_social_account:

            post_social_account.status = (
                PublishStatus.DELETED
            )

            post_social_account.error_message = None

        # =====================================
        # Check Remaining Published Accounts
        # =====================================

        remaining_published = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.status
                == PublishStatus.PUBLISHED,
            )
            .count()
        )

        if remaining_published == 0:

            post.status = PostStatus.DRAFT

        else:

            post.status = PostStatus.PUBLISHED

        # =====================================
        # Commit
        # =====================================

        db.commit()
        db.refresh(post)

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Instagram post was deleted, "
                "but database update failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Success Response
    # =====================================

    return {
        "message": (
            "Instagram post deleted successfully "
            "and database updated"
        ),
        "post_id": post_id,
        "instagram_post_id": instagram_post_id,
        "post_status": post.status,
        "result": result,
    }


# =====================================
# Delete Published Facebook Post
# DELETE /posts/{post_id}/facebook
# =====================================


@router.delete(
    "/{post_id}/facebook",
    summary="Delete Published Facebook Post",
)
def delete_facebook_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Find Successful Facebook Log
    # =====================================

    publishing_logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    facebook_post_id = None
    facebook_social_account_id = None
    facebook_log = None
    platform_response = {}

    for log in publishing_logs:

        if not log.platform_response:
            continue

        try:
            response_data = json.loads(
                log.platform_response
            )

        except (
            json.JSONDecodeError,
            TypeError,
        ):
            continue

        if (
            isinstance(response_data, dict)
            and response_data.get("platform")
            == "facebook"
        ):

            facebook_post_id = (
                response_data.get(
                    "facebook_post_id"
                )
                or response_data.get(
                    "post_id"
                )
            )

            if facebook_post_id:

                facebook_social_account_id = (
                    log.social_account_id
                )

                facebook_log = log
                platform_response = response_data

                break

    # =====================================
    # Facebook Record Not Found
    # =====================================

    if not facebook_post_id:
        raise HTTPException(
            status_code=404,
            detail=(
                "No successful Facebook "
                "publishing record found"
            ),
        )

    # =====================================
    # Get Correct Facebook Account
    # =====================================

    facebook_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id
            == facebook_social_account_id,
            SocialAccount.user_id
            == current_user.id,
            SocialAccount.platform
            == "facebook",
        )
        .first()
    )

    if not facebook_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "Facebook social account not found"
            ),
        )

    # =====================================
    # Delete From Facebook
    # =====================================

    try:

        integration = (
            publishing_service
            .get_platform_integration(
                "facebook",
                social_account=facebook_account,
            )
        )

        result = integration.delete_post(
            facebook_post_id
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Facebook deletion failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Database Update
    # =====================================

    try:

        platform_response[
            "facebook_deleted"
        ] = True

        platform_response[
            "facebook_deleted_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        platform_response[
            "facebook_delete_result"
        ] = result

        facebook_log.platform_response = (
            json.dumps(
                platform_response,
                default=str,
            )
        )

        facebook_log.status = (
            PublishingLogStatus.DELETED
        )

        facebook_log.message = (
            "Facebook post deleted successfully"
        )

        # =====================================
        # Update PostSocialAccount
        # =====================================

        post_social_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.social_account_id
                == facebook_social_account_id,
            )
            .first()
        )

        if post_social_account:

            post_social_account.status = (
                PublishStatus.DELETED
            )

            post_social_account.error_message = None

        # =====================================
        # Check Remaining Published Accounts
        # =====================================

        remaining_published_accounts = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.status
                == PublishStatus.PUBLISHED,
            )
            .count()
        )

        if remaining_published_accounts == 0:

            post.status = PostStatus.DRAFT

        else:

            post.status = PostStatus.PUBLISHED

        # =====================================
        # Commit
        # =====================================

        db.commit()
        db.refresh(post)

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Facebook post was deleted, "
                "but database update failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Success Response
    # =====================================

    return {
        "message": (
            "Facebook post deleted successfully "
            "and database updated"
        ),
        "post_id": post_id,
        "facebook_post_id": facebook_post_id,
        "post_status": post.status,
        "result": result,
    }
# =====================================
# Delete Published YouTube Post
# DELETE /posts/{post_id}/youtube
# =====================================


@router.delete(
    "/{post_id}/youtube",
    summary="Delete Published YouTube Post",
)
def delete_youtube_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Find Successful YouTube Log
    # =====================================

    publishing_logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    youtube_video_id = None
    youtube_social_account_id = None
    youtube_log = None
    platform_response = {}

    for log in publishing_logs:

        if not log.platform_response:
            continue

        try:
            response_data = json.loads(
                log.platform_response
            )

        except (
            json.JSONDecodeError,
            TypeError,
        ):
            continue

        if (
            isinstance(response_data, dict)
            and response_data.get("platform")
            == "youtube"
        ):

            youtube_video_id = (
                response_data.get(
                    "youtube_video_id"
                )
                or response_data.get(
                    "video_id"
                )
                or response_data.get(
                    "post_id"
                )
            )

            if youtube_video_id:

                youtube_social_account_id = (
                    log.social_account_id
                )

                youtube_log = log
                platform_response = response_data

                break

    # =====================================
    # YouTube Record Not Found
    # =====================================

    if not youtube_video_id:
        raise HTTPException(
            status_code=404,
            detail=(
                "No successful YouTube "
                "publishing record found"
            ),
        )

    # =====================================
    # Get Correct YouTube Account
    # =====================================

    youtube_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id
            == youtube_social_account_id,
            SocialAccount.user_id
            == current_user.id,
            SocialAccount.platform
            == "youtube",
        )
        .first()
    )

    if not youtube_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "YouTube social account "
                "not found"
            ),
        )

    # =====================================
    # Delete From YouTube
    # =====================================

    try:

        integration = (
            publishing_service
            .get_platform_integration(
                "youtube",
                social_account=youtube_account,
            )
        )

        result = integration.delete_post(
            youtube_video_id
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube deletion failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Database Update
    # ONLY AFTER DELETE SUCCEEDS
    # =====================================

    try:

        platform_response[
            "youtube_deleted"
        ] = True

        platform_response[
            "youtube_deleted_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        platform_response[
            "youtube_delete_result"
        ] = result

        youtube_log.platform_response = (
            json.dumps(
                platform_response,
                default=str,
            )
        )

        youtube_log.status = (
            PublishingLogStatus.DELETED
        )

        youtube_log.message = (
            "YouTube post deleted successfully"
        )

        # =====================================
        # Update PostSocialAccount
        # =====================================

        post_social_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.social_account_id
                == youtube_social_account_id,
            )
            .first()
        )

        if post_social_account:

            post_social_account.status = (
                PublishStatus.DELETED
            )

            post_social_account.error_message = None

                # =====================================
        # Check Remaining Published Accounts
        # =====================================

        remaining_published = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id == post_id,
                PostSocialAccount.status
                == PublishStatus.PUBLISHED,
            )
            .count()
        )

        # =====================================
        # Update Overall Post Status
        # =====================================

        if remaining_published == 0:
            post.status = PostStatus.DRAFT
        else:
            post.status = PostStatus.PUBLISHED

        # =====================================
        # Commit
        # =====================================

        db.commit()
        db.refresh(post)
        


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube post was deleted, "
                "but database update failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Success Response
    # =====================================

    return {
        "message": (
            "YouTube post deleted successfully "
            "and database updated"
        ),
        "post_id": post_id,
        "youtube_video_id": youtube_video_id,
        "post_status": post.status,
        "result": result,
    }



# =====================================
# Delete Published X / Twitter Post
# DELETE /posts/{post_id}/twitter
# =====================================


@router.delete(
    "/{post_id}/twitter",
    summary="Delete Published X/Twitter Post",
)
def delete_twitter_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================
    # Find Post
    # =====================================

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    # =====================================
    # Find Successful Twitter/X Log
    # =====================================

    publishing_logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id,
            PublishingLog.status
            == PublishingLogStatus.SUCCESS,
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    twitter_post_id = None
    twitter_social_account_id = None
    twitter_log = None
    platform_response = {}

    for log in publishing_logs:

        if not log.platform_response:
            continue

        try:
            response_data = json.loads(
                log.platform_response
            )

        except (
            json.JSONDecodeError,
            TypeError,
        ):
            continue

        if not isinstance(
            response_data,
            dict,
        ):
            continue

        platform = response_data.get(
            "platform"
        )

        if platform not in (
            "twitter",
            "x",
        ):
            continue

        twitter_post_id = (
            response_data.get(
                "twitter_post_id"
            )
            or response_data.get(
                "post_id"
            )
        )

        if twitter_post_id:

            twitter_social_account_id = (
                log.social_account_id
            )

            twitter_log = log
            platform_response = response_data

            break

    # =====================================
    # X Record Not Found
    # =====================================

    if not twitter_post_id:
        raise HTTPException(
            status_code=404,
            detail=(
                "No successful X/Twitter "
                "publishing record found"
            ),
        )

    # =====================================
    # Get Correct X/Twitter Account
    # =====================================

    twitter_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id
            == twitter_social_account_id,
            SocialAccount.user_id
            == current_user.id,
            SocialAccount.platform.in_(
                ["twitter", "x"]
            ),
        )
        .first()
    )

    if not twitter_account:
        raise HTTPException(
            status_code=404,
            detail=(
                "X/Twitter social account "
                "not found"
            ),
        )

   

    # =====================================
    # Delete From X Through Buffer
    # =====================================
        
    try:

        if settings.social_dry_run:

            # =====================================
            # LOCAL X TEST MODE
            # =====================================

            result = {
                "platform": "twitter",
                "status": "deleted",
                "twitter_post_id": twitter_post_id,
                "post_id": twitter_post_id,
                "message": (
                    "X/Twitter deletion simulated "
                    "because social_dry_run=true"
                ),
                "dry_run": True,
            }

        else:

            # =====================================
            # REAL X DELETION THROUGH BUFFER
            # =====================================

            buffer_integration = BufferIntegration(
                social_account=twitter_account
            )

            result = buffer_integration.delete_post(
                twitter_post_id
            )

    except ValueError as error:

        error_message = str(error)

        if (
            "not allowed to perform this action"
            in error_message.lower()
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "This X/Twitter post has already been "
                    "published, and Buffer does not allow "
                    "this post to be deleted through the "
                    "current Buffer connection."
                ),
            )

        raise HTTPException(
            status_code=400,
            detail=error_message,
        )

    except Exception as error:

        error_message = str(error)

        if (
            "not allowed to perform this action"
            in error_message.lower()
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "This X/Twitter post cannot be deleted "
                    "through Buffer because Buffer does not "
                    "allow deletion of this post."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "X/Twitter deletion through Buffer failed: "
                f"{error_message}"
            ),
        )
    
    

        #=====================================
        # Database Update
        # Only reached after X confirms deletion
        # or dry-run succeeds
        # =====================================

    try:

        platform_response[
            "twitter_deleted"
        ] = True

        platform_response[
            "twitter_deleted_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        platform_response[
            "twitter_delete_result"
        ] = result

        twitter_log.platform_response = (
            json.dumps(
                platform_response,
                default=str,
            )
        )

        twitter_log.status = (
            PublishingLogStatus.DELETED
        )

        twitter_log.message = (
            "X/Twitter post deleted successfully"
        )

        # =====================================
        # Update PostSocialAccount
        # =====================================

        post_social_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.social_account_id
                == twitter_social_account_id,
            )
            .first()
        )

        if post_social_account:

            post_social_account.status = (
                PublishStatus.DELETED
            )

            post_social_account.error_message = None

        # =====================================
        # Check Remaining Published Accounts
        # =====================================

        remaining_published_accounts = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id
                == post_id,
                PostSocialAccount.status
                == PublishStatus.PUBLISHED,
            )
            .count()
        )

        if remaining_published_accounts == 0:

            post.status = PostStatus.DRAFT

        else:

            post.status = PostStatus.PUBLISHED

        # =====================================
        # Commit
        # =====================================

        db.commit()
        db.refresh(post)

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "X/Twitter post was deleted, "
                "but database update failed: "
                f"{str(error)}"
            ),
        )

    # =====================================
    # Success Response
    # =====================================

    return {
        "message": (
            "X/Twitter post deleted successfully "
            "and database updated"
        ),
        "post_id": post_id,
        "twitter_post_id": twitter_post_id,
        "post_status": post.status,
        "result": result,
    }
