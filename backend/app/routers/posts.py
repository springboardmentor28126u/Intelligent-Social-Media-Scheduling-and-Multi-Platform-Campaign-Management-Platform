from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.postgres import SessionLocal
from fastapi import Depends
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.core.security import get_current_user
from app.services.publisher import publish_to_social_media
from app.models.publishing_log import PublishingLog
from app.core.security import get_current_user

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)


# ============================================================
# INDIAN TIMEZONE
# ============================================================

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


# ============================================================
# DATABASE
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# DATETIME HELPERS
# ============================================================

def normalize_datetime_to_india(
    value: Optional[datetime]
):
    """
    Application uses Indian Standard Time.

    If datetime already contains timezone information,
    convert it to Asia/Kolkata.

    If datetime has no timezone information,
    assume it is already IST.

    PostgreSQL receives a naive datetime representing IST.
    """

    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone(
            INDIA_TIMEZONE
        ).replace(
            tzinfo=None
        )

    return value


def get_current_india_time():
    """
    Get current time in IST.

    Returns a naive datetime so it can be compared
    with the naive PostgreSQL scheduled_at value.
    """

    return datetime.now(
        INDIA_TIMEZONE
    ).replace(
        tzinfo=None
    )


# ============================================================
# CREATE NORMAL POST
# ============================================================

@router.post("/")
def create_post(
    social_account_id: int,
    content: str,
    scheduled_at: Optional[datetime] = None,
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # CONTENT
    # --------------------------------------------------------

    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Post content cannot be empty"
        )

    # --------------------------------------------------------
    # SOCIAL ACCOUNT
    # --------------------------------------------------------

    social_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id ==
            social_account_id,
            SocialAccount.user_id ==
            current_user_id
        )
        .first()
    )

    if not social_account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    # --------------------------------------------------------
    # SCHEDULE
    # --------------------------------------------------------

    normalized_schedule = (
        normalize_datetime_to_india(
            scheduled_at
        )
    )

    status = "draft"

    if normalized_schedule:

        now = get_current_india_time()

        if normalized_schedule <= now:
            raise HTTPException(
                status_code=400,
                detail="Scheduled time must be in the future"
            )

        status = "scheduled"

    # --------------------------------------------------------
    # CREATE POST
    # --------------------------------------------------------

    new_post = Post(
        user_id=current_user_id,
        social_account_id=social_account_id,
        content=content,
        status=status,
        scheduled_at=normalized_schedule,
        is_recurring=False,
        recurrence_type=None,
        recurrence_end=None
    )

    db.add(new_post)

    db.commit()

    db.refresh(new_post)

    return {
        "message": "Post created successfully",
        "id": new_post.id,
        "user_id": new_post.user_id,
        "social_account_id":
            new_post.social_account_id,
        "content": new_post.content,
        "status": new_post.status,
        "scheduled_at":
            new_post.scheduled_at,
        "is_recurring":
            new_post.is_recurring
    }


# ============================================================
# CREATE RECURRING POST
# ============================================================

@router.post("/recurring")
def create_recurring_post(
    social_account_id: int,
    content: str,
    scheduled_at: datetime,
    recurrence_type: str,
    recurrence_end: datetime,
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # CONTENT
    # --------------------------------------------------------

    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Post content cannot be empty"
        )

    # --------------------------------------------------------
    # RECURRENCE TYPE
    # --------------------------------------------------------

    recurrence_type = (
        recurrence_type.lower()
    )

    allowed_types = {
        "daily",
        "weekly",
        "monthly"
    }

    if recurrence_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Recurrence type must be "
                "daily, weekly, or monthly"
            )
        )

    # --------------------------------------------------------
    # SOCIAL ACCOUNT
    # --------------------------------------------------------

    social_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id ==
            social_account_id,
            SocialAccount.user_id ==
            current_user_id
        )
        .first()
    )

    if not social_account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    # --------------------------------------------------------
    # NORMALIZE IST
    # --------------------------------------------------------

    normalized_schedule = (
        normalize_datetime_to_india(
            scheduled_at
        )
    )

    normalized_end = (
        normalize_datetime_to_india(
            recurrence_end
        )
    )

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    now = get_current_india_time()

    if normalized_schedule <= now:
        raise HTTPException(
            status_code=400,
            detail=(
                "First scheduled time "
                "must be in the future"
            )
        )

    if normalized_end <= normalized_schedule:
        raise HTTPException(
            status_code=400,
            detail=(
                "Recurrence end must be "
                "after the first scheduled time"
            )
        )

    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    new_post = Post(
        user_id=current_user_id,
        social_account_id=social_account_id,
        content=content,
        status="scheduled",
        scheduled_at=normalized_schedule,
        is_recurring=True,
        recurrence_type=recurrence_type,
        recurrence_end=normalized_end
    )

    db.add(new_post)

    db.commit()

    db.refresh(new_post)

    return {
        "message":
            "Recurring post created successfully",
        "id": new_post.id,
        "status": new_post.status,
        "scheduled_at":
            new_post.scheduled_at,
        "is_recurring":
            new_post.is_recurring,
        "recurrence_type":
            new_post.recurrence_type,
        "recurrence_end":
            new_post.recurrence_end
    }


# ============================================================
# GET ALL POSTS
# ============================================================

@router.get("/")
def get_posts(
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    posts = (
        db.query(Post)
        .filter(
            Post.user_id ==
            current_user_id
        )
        .order_by(
            Post.id.desc()
        )
        .all()
    )

    result = []

    for post in posts:

        result.append({
            "id": post.id,
            "user_id": post.user_id,
            "social_account_id":
                post.social_account_id,
            "content": post.content,
            "status": post.status,
            "scheduled_at":
                post.scheduled_at,
            "is_recurring":
                post.is_recurring,
            "recurrence_type":
                post.recurrence_type,
            "recurrence_end":
                post.recurrence_end,
            "platform":
                (
                    post.social_account.platform
                    if post.social_account
                    else None
                ),
            "username":
                (
                    post.social_account.username
                    if post.social_account
                    else None
                )
        })

    return result


# ============================================================
# GET DRAFTS
# ============================================================

@router.get("/drafts")
def get_drafts(
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    posts = (
        db.query(Post)
        .filter(
            Post.user_id ==
            current_user_id,
            Post.status == "draft"
        )
        .order_by(
            Post.id.desc()
        )
        .all()
    )

    return [
        {
            "id": post.id,
            "user_id": post.user_id,
            "social_account_id":
                post.social_account_id,
            "content": post.content,
            "status": post.status,
            "scheduled_at":
                post.scheduled_at,
            "is_recurring":
                post.is_recurring,
            "recurrence_type":
                post.recurrence_type,
            "recurrence_end":
                post.recurrence_end,
            "platform":
                (
                    post.social_account.platform
                    if post.social_account
                    else None
                ),
            "username":
                (
                    post.social_account.username
                    if post.social_account
                    else None
                )
        }
        for post in posts
    ]


# ============================================================
# GET SCHEDULED POSTS
# ============================================================

@router.get("/scheduled")
def get_scheduled_posts(
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    posts = (
        db.query(Post)
        .filter(
            Post.user_id ==
            current_user_id,
            Post.status == "scheduled",
            Post.scheduled_at.isnot(None)
        )
        .order_by(
            Post.scheduled_at.asc()
        )
        .all()
    )

    return [
        {
            "id": post.id,
            "user_id": post.user_id,
            "social_account_id":
                post.social_account_id,
            "content": post.content,
            "status": post.status,
            "scheduled_at":
                post.scheduled_at,
            "is_recurring":
                post.is_recurring,
            "recurrence_type":
                post.recurrence_type,
            "recurrence_end":
                post.recurrence_end,
            "platform":
                (
                    post.social_account.platform
                    if post.social_account
                    else None
                ),
            "username":
                (
                    post.social_account.username
                    if post.social_account
                    else None
                )
        }
        for post in posts
    ]


# ============================================================
# UPDATE POST
# ============================================================

@router.put("/{post_id}")
def update_post(
    post_id: int,
    content: Optional[str] = None,
    social_account_id: Optional[int] = None,
    scheduled_at: Optional[datetime] = None,
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id ==
                current_user_id
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    # --------------------------------------------------------
    # CONTENT
    # --------------------------------------------------------

    if content is not None:

        if not content.strip():
            raise HTTPException(
                status_code=400,
                detail="Content cannot be empty"
            )

        post.content = content

    # --------------------------------------------------------
    # SOCIAL ACCOUNT
    # --------------------------------------------------------

    if social_account_id is not None:

        account = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.id ==
                    social_account_id,
                SocialAccount.user_id ==
                    current_user_id
            )
            .first()
        )

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Social account not found"
            )

        post.social_account_id = (
            social_account_id
        )

    # --------------------------------------------------------
    # SCHEDULE
    # --------------------------------------------------------

    if scheduled_at is not None:

        normalized_schedule = (
            normalize_datetime_to_india(
                scheduled_at
            )
        )

        now = get_current_india_time()

        if normalized_schedule <= now:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Scheduled time must "
                    "be in the future"
                )
            )

        post.scheduled_at = (
            normalized_schedule
        )

        post.status = "scheduled"

    # --------------------------------------------------------
    # COMMIT
    # --------------------------------------------------------

    db.commit()

    db.refresh(post)

    return {
        "message":
            "Post updated successfully",
        "id": post.id,
        "status": post.status,
        "scheduled_at":
            post.scheduled_at
    }


# ============================================================
# DELETE POST
# ============================================================

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id ==
                current_user_id
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    db.delete(post)

    db.commit()

    return {
        "message":
            "Post deleted successfully"
    }


# ============================================================
# MANUAL PUBLISH
# ============================================================

@router.put("/{post_id}/publish")
def publish_post(
    post_id: int,
    current_user_id: int = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id ==
                current_user_id
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id ==
                post.social_account_id,
            SocialAccount.user_id ==
                current_user_id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    if not account.access_token:
        raise HTTPException(
            status_code=400,
            detail="Social account access token not found"
        )

    result = publish_to_social_media(
        platform=account.platform,
        username=account.username,
        content=post.content,
        access_token=account.access_token
    )

    if result.get("success"):

        post.status = "published"
        post.scheduled_at = None

        db.commit()
        db.refresh(post)

        return {
            "message":
                "Post published successfully",
            "status": "published"
        }

    post.status = "failed"

    db.commit()

    return {
        "message":
            result.get(
                "message",
                "Publishing failed"
            ),
        "status": "failed"
    }
@router.get("/publishing-logs")
def get_publishing_logs(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = (
        db.query(PublishingLog)
        .filter(PublishingLog.user_id == current_user_id)
        .order_by(PublishingLog.published_at.desc())
        .all()
    )

    return [
        {
            "id": log.id,
            "post_id": log.post_id,
            "platform": log.platform,
            "status": log.status,
            "message": log.message,
            "published_at": log.published_at,
        }
        for log in logs
    ]


# ============================================================
# PUBLISHING QUEUE
# ============================================================

@router.get("/publishing-queue")
def get_publishing_queue(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    posts = (
        db.query(Post)
        .filter(
            Post.user_id == current_user_id,
            Post.status == "scheduled",
            Post.scheduled_at.isnot(None)
        )
        .order_by(
            Post.scheduled_at.asc()
        )
        .all()
    )

    queue = []

    for position, post in enumerate(posts, start=1):

        platform = "Unknown"

        if post.social_account_id:

            social_account = (
                db.query(SocialAccount)
                .filter(
                    SocialAccount.id == post.social_account_id,
                    SocialAccount.user_id == current_user_id
                )
                .first()
            )

            if social_account:
                platform = social_account.platform

        queue.append(
            {
                "queue_position": position,
                "id": post.id,
                "content": post.content,
                "platform": platform,
                "scheduled_at": post.scheduled_at,
                "status": post.status,
                "is_recurring": post.is_recurring,
            }
        )

    return queue