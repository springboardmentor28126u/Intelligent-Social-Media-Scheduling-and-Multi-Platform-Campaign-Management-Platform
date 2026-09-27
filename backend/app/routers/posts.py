from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo
import secrets
import shutil

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.postgres import SessionLocal
from app.models.post import Post
from app.models.campaign import Campaign
from app.models.social_account import SocialAccount
from app.models.publishing_log import PublishingLog
from app.core.security import get_current_user
from app.services.publisher import publish_to_social_media
from app.schemas.post import PostCreate, PostResponse


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)


# ============================================================
# INDIAN TIMEZONE
# ============================================================

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


# ============================================================
# UPLOAD DIRECTORIES
# ============================================================

UPLOAD_DIR = Path("uploads")

IMAGE_UPLOAD_DIR = UPLOAD_DIR / "images"
VIDEO_UPLOAD_DIR = UPLOAD_DIR / "videos"

IMAGE_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

VIDEO_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


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
    Convert datetime to Indian Standard Time.

    If datetime contains timezone information,
    it is converted to Asia/Kolkata.

    If datetime has no timezone information,
    it is assumed to already be Indian time.

    PostgreSQL receives a naive datetime
    representing Indian Standard Time.
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
    Return current Indian time.

    The returned datetime is naive because
    scheduled_at in PostgreSQL is stored as
    a naive datetime representing IST.
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
    post_data: Optional[PostCreate] = Body(default=None),

    social_account_id: Optional[int] = None,
    content: Optional[str] = None,

    scheduled_at: Optional[datetime] = None,

    media_url: Optional[str] = None,
    media_type: Optional[str] = None,
    media_filename: Optional[str] = None,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    campaign_id = post_data.campaign_id if post_data else None
    if post_data:
        social_account_id = post_data.social_account_id
        content = post_data.content
        scheduled_at = post_data.scheduled_at
        media_url = post_data.media_url

    if social_account_id is None or content is None:
        raise HTTPException(
            status_code=422,
            detail="social_account_id and content are required",
        )

    # --------------------------------------------------------
    # VALIDATE CONTENT
    # --------------------------------------------------------

    if not content.strip():

        raise HTTPException(
            status_code=400,
            detail="Post content cannot be empty"
        )


    # --------------------------------------------------------
    # FIND SOCIAL ACCOUNT
    # --------------------------------------------------------

    social_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == social_account_id,
            SocialAccount.user_id == current_user_id
        )
        .first()
    )


    if not social_account:

        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    campaign = None
    if campaign_id is not None:
        campaign = (
            db.query(Campaign)
            .filter(
                Campaign.id == campaign_id,
                Campaign.user_id == current_user_id,
            )
            .first()
        )
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")


    # --------------------------------------------------------
    # NORMALIZE SCHEDULE TIME
    # --------------------------------------------------------

    normalized_schedule = (
        normalize_datetime_to_india(
            scheduled_at
        )
    )


    # --------------------------------------------------------
    # DEFAULT STATUS
    # --------------------------------------------------------

    status = "draft"
    if post_data and post_data.status:
        status = post_data.status.lower()


    # --------------------------------------------------------
    # VALIDATE SCHEDULE
    # --------------------------------------------------------

    if normalized_schedule:

        now = get_current_india_time()

        if normalized_schedule <= now:

            raise HTTPException(
                status_code=400,
                detail="Scheduled time must be in the future"
            )

        if campaign and campaign.start_date and normalized_schedule.date() < campaign.start_date:
            raise HTTPException(status_code=400, detail="Scheduled time is before the campaign start date")
        if campaign and campaign.end_date and normalized_schedule.date() > campaign.end_date:
            raise HTTPException(status_code=400, detail="Scheduled time is after the campaign end date")

        status = "scheduled"


    # --------------------------------------------------------
    # VALIDATE MEDIA TYPE
    # --------------------------------------------------------

    if media_type:

        media_type = media_type.lower().strip()

        allowed_media_types = {
            "image",
            "video"
        }

        if media_type not in allowed_media_types:

            raise HTTPException(
                status_code=400,
                detail="Media type must be image or video"
            )


    # --------------------------------------------------------
    # CREATE POST
    # --------------------------------------------------------

    new_post = Post(
        user_id=current_user_id,

        campaign_id=campaign_id,

        social_account_id=social_account_id,

        content=content,

        status=status,

        scheduled_at=normalized_schedule,

        is_recurring=False,

        recurrence_type=None,

        recurrence_end=None,

        media_url=media_url,

        media_type=media_type,

        media_filename=media_filename
    )


    db.add(new_post)

    db.commit()

    db.refresh(new_post)


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Post created successfully",

        "id": new_post.id,

        "user_id": new_post.user_id,

        "social_account_id":
            new_post.social_account_id,

        "campaign_id":
            new_post.campaign_id,

        "content":
            new_post.content,

        "status":
            new_post.status,

        "scheduled_at":
            new_post.scheduled_at,

        "published_at":
            new_post.published_at,

        "platform_post_id":
            new_post.platform_post_id,

        "error_message":
            new_post.error_message,

        "created_at":
            new_post.created_at,

        "updated_at":
            new_post.updated_at,

        "is_recurring":
            new_post.is_recurring,

        "recurrence_type":
            new_post.recurrence_type,

        "recurrence_end":
            new_post.recurrence_end,

        "media_url":
            new_post.media_url,

        "media_type":
            new_post.media_type,

        "media_filename":
            new_post.media_filename,

        "platform":
            social_account.platform,

        "username":
            social_account.username
    }


# ============================================================
# UPLOAD MEDIA
# ============================================================

@router.post("/upload-media")
async def upload_media(
    file: UploadFile = File(...),

    current_user_id: int = Depends(
        get_current_user
    )
):

    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if not file:

        raise HTTPException(
            status_code=400,
            detail="No media file provided"
        )


    # --------------------------------------------------------
    # FILE TYPE
    # --------------------------------------------------------

    content_type = (
        file.content_type or ""
    ).lower()


    # --------------------------------------------------------
    # DETERMINE MEDIA TYPE
    # --------------------------------------------------------

    if content_type.startswith("image/"):

        media_type = "image"

        upload_directory = IMAGE_UPLOAD_DIR


    elif content_type.startswith("video/"):

        media_type = "video"

        upload_directory = VIDEO_UPLOAD_DIR


    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only image and video files "
                "are supported"
            )
        )


    # --------------------------------------------------------
    # FILE EXTENSION
    # --------------------------------------------------------

    original_filename = (
        file.filename or "media"
    )

    extension = Path(
        original_filename
    ).suffix.lower()


    # --------------------------------------------------------
    # ALLOWED EXTENSIONS
    # --------------------------------------------------------

    if media_type == "image":

        allowed_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        }

    else:

        allowed_extensions = {
            ".mp4",
            ".mov",
            ".avi",
            ".mkv",
            ".webm"
        }


    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported {media_type} "
                f"file format: {extension}"
            )
        )


    # --------------------------------------------------------
    # GENERATE SAFE FILE NAME
    # --------------------------------------------------------

    generated_filename = (
        secrets.token_hex(16)
        + extension
    )


    file_path = (
        upload_directory
        / generated_filename
    )


    # --------------------------------------------------------
    # SAVE FILE
    # --------------------------------------------------------

    try:

        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to save media file: {str(exc)}"
            )
        )


    # --------------------------------------------------------
    # PUBLIC MEDIA URL
    # --------------------------------------------------------

    media_url = (
        f"/uploads/"
        f"{'images' if media_type == 'image' else 'videos'}"
        f"/{generated_filename}"
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Media uploaded successfully",

        "media_url":
            media_url,

        "media_type":
            media_type,

        "media_filename":
            original_filename,

        "stored_filename":
            generated_filename,

        "content_type":
            content_type
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

    media_url: Optional[str] = None,

    media_type: Optional[str] = None,

    media_filename: Optional[str] = None,

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
        recurrence_type.lower().strip()
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
            SocialAccount.id == social_account_id,
            SocialAccount.user_id == current_user_id
        )
        .first()
    )


    if not social_account:

        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )


    # --------------------------------------------------------
    # NORMALIZE TIME
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
    # VALIDATE TIME
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
    # MEDIA TYPE
    # --------------------------------------------------------

    if media_type:

        media_type = media_type.lower().strip()

        if media_type not in {
            "image",
            "video"
        }:

            raise HTTPException(
                status_code=400,
                detail="Media type must be image or video"
            )


    # --------------------------------------------------------
    # CREATE RECURRING POST
    # --------------------------------------------------------

    new_post = Post(

        user_id=current_user_id,

        social_account_id=social_account_id,

        content=content,

        status="scheduled",

        scheduled_at=normalized_schedule,

        is_recurring=True,

        recurrence_type=recurrence_type,

        recurrence_end=normalized_end,

        media_url=media_url,

        media_type=media_type,

        media_filename=media_filename
    )


    db.add(new_post)

    db.commit()

    db.refresh(new_post)


    return {

        "message":
            "Recurring post created successfully",

        "id":
            new_post.id,

        "status":
            new_post.status,

        "scheduled_at":
            new_post.scheduled_at,

        "is_recurring":
            new_post.is_recurring,

        "recurrence_type":
            new_post.recurrence_type,

        "recurrence_end":
            new_post.recurrence_end,

        "media_url":
            new_post.media_url,

        "media_type":
            new_post.media_type,

        "media_filename":
            new_post.media_filename
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
            Post.user_id == current_user_id
        )
        .order_by(
            Post.id.desc()
        )
        .all()
    )


    result = []


    for post in posts:

        result.append({

            "id":
                post.id,

            "user_id":
                post.user_id,

            "social_account_id":
                post.social_account_id,

            "campaign_id":
                post.campaign_id,

            "content":
                post.content,

            "status":
                post.status,

            "scheduled_at":
                post.scheduled_at,

            "published_at":
                post.published_at,

            "platform_post_id":
                post.platform_post_id,

            "error_message":
                post.error_message,

            "created_at":
                post.created_at,

            "updated_at":
                post.updated_at,

            "is_recurring":
                post.is_recurring,

            "recurrence_type":
                post.recurrence_type,

            "recurrence_end":
                post.recurrence_end,

            "media_url":
                post.media_url,

            "media_type":
                post.media_type,

            "media_filename":
                post.media_filename,

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
            Post.user_id == current_user_id,
            Post.status.in_(["scheduled", "SCHEDULED", "published", "PUBLISHED"]),
            or_(
                Post.scheduled_at.isnot(None),
                Post.published_at.isnot(None)
            )
        )
        .order_by(
            Post.scheduled_at.asc().nullslast(),
            Post.published_at.asc().nullslast(),
        )
        .all()
    )


    return [

        {

            "id":
                post.id,

            "user_id":
                post.user_id,

            "social_account_id":
                post.social_account_id,

            "content":
                post.content,

            "status":
                post.status,

            "scheduled_at":
                post.scheduled_at,

            "published_at":
                post.published_at,

            "is_recurring":
                post.is_recurring,

            "recurrence_type":
                post.recurrence_type,

            "recurrence_end":
                post.recurrence_end,

            "media_url":
                post.media_url,

            "media_type":
                post.media_type,

            "media_filename":
                post.media_filename,

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
# GET PUBLISHING LOGS
# ============================================================

@router.get("/publishing-logs")
def get_publishing_logs(

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)

):

    logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.user_id ==
                current_user_id
        )
        .order_by(
            PublishingLog.published_at.desc()
        )
        .all()
    )


    return [

        {

            "id":
                log.id,

            "post_id":
                log.post_id,

            "social_account_id":
                log.social_account_id,

            "platform":
                log.platform,

            "status":
                log.status,

            "message":
                log.message,

            "published_at":
                log.published_at

        }

        for log in logs

    ]


# ============================================================
# PUBLISHING QUEUE
# ============================================================

@router.get("/publishing-queue")
def get_publishing_queue(

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

            Post.status ==
                "scheduled",

            Post.scheduled_at.isnot(None)

        )
        .order_by(
            Post.scheduled_at.asc()
        )
        .all()
    )


    queue = []


    for position, post in enumerate(
        posts,
        start=1
    ):

        platform = "Unknown"

        username = None


        # ----------------------------------------------------
        # SOCIAL ACCOUNT
        # ----------------------------------------------------

        if post.social_account_id:

            social_account = (
                db.query(SocialAccount)
                .filter(

                    SocialAccount.id ==
                        post.social_account_id,

                    SocialAccount.user_id ==
                        current_user_id

                )
                .first()
            )


            if social_account:

                platform = (
                    social_account.platform
                )

                username = (
                    social_account.username
                )


        # ----------------------------------------------------
        # ADD TO QUEUE
        # ----------------------------------------------------

        queue.append({

            "queue_position":
                position,

            "id":
                post.id,

            "content":
                post.content,

            "platform":
                platform,

            "username":
                username,

            "scheduled_at":
                post.scheduled_at,

            "status":
                post.status,

            "is_recurring":
                post.is_recurring,

            "recurrence_type":
                post.recurrence_type,

            "media_url":
                post.media_url,

            "media_type":
                post.media_type

        })


    return queue


# ============================================================
# GET ONE POST
# ============================================================

@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user_id,
        )
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


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
            Post.user_id == current_user_id,
            Post.status == "draft"
        )
        .order_by(
            Post.id.desc()
        )
        .all()
    )


    return [

        {

            "id":
                post.id,

            "user_id":
                post.user_id,

            "social_account_id":
                post.social_account_id,

            "content":
                post.content,

            "status":
                post.status,

            "scheduled_at":
                post.scheduled_at,

            "is_recurring":
                post.is_recurring,

            "recurrence_type":
                post.recurrence_type,

            "recurrence_end":
                post.recurrence_end,

            "media_url":
                post.media_url,

            "media_type":
                post.media_type,

            "media_filename":
                post.media_filename,

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

    media_url: Optional[str] = None,

    media_type: Optional[str] = None,

    media_filename: Optional[str] = None,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # FIND POST
    # --------------------------------------------------------

    post = (
        db.query(Post)
        .filter(

            Post.id == post_id,

            Post.user_id == current_user_id

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
    # MEDIA
    # --------------------------------------------------------

    if media_url is not None:

        post.media_url = media_url


    if media_type is not None:

        media_type = media_type.lower().strip()

        if media_type not in {
            "image",
            "video"
        }:

            raise HTTPException(
                status_code=400,
                detail="Media type must be image or video"
            )

        post.media_type = media_type


    if media_filename is not None:

        post.media_filename = media_filename


    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(post)


    return {

        "message":
            "Post updated successfully",

        "id":
            post.id,

        "status":
            post.status,

        "scheduled_at":
            post.scheduled_at,

        "media_url":
            post.media_url,

        "media_type":
            post.media_type,

        "media_filename":
            post.media_filename
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

            Post.user_id == current_user_id

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
#
# IMPORTANT:
# This is POST, not PUT.
#
# Frontend calls:
#
# POST /posts/{post_id}/publish
#
# This fixes:
#
# 405 Method Not Allowed
#
# ============================================================

@router.post("/{post_id}/retry")
def retry_post(
    post_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = (
        db.query(Post)
        .filter(Post.id == post_id, Post.user_id == current_user_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status.lower() != "failed":
        raise HTTPException(status_code=400, detail="Only failed posts can be retried")

    post.status = "scheduled"
    post.scheduled_at = get_current_india_time()
    post.error_message = None
    db.commit()
    db.refresh(post)
    return {
        "message": "Post queued for retry",
        "id": post.id,
        "status": post.status,
        "scheduled_at": post.scheduled_at,
    }


@router.post("/{post_id}/cancel")
def cancel_scheduled_post(
    post_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = (
        db.query(Post)
        .filter(Post.id == post_id, Post.user_id == current_user_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status.lower() != "scheduled":
        raise HTTPException(status_code=400, detail="Only scheduled posts can be cancelled")

    post.status = "cancelled"
    post.scheduled_at = None
    db.commit()
    db.refresh(post)
    return {
        "message": "Scheduled post cancelled",
        "id": post.id,
        "status": post.status,
    }



@router.post("/{post_id}/publish")
def publish_post(

    post_id: int,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # FIND POST
    # --------------------------------------------------------

    post = (
        db.query(Post)
        .filter(

            Post.id == post_id,

            Post.user_id == current_user_id

        )
        .first()
    )


    if not post:

        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )


    # --------------------------------------------------------
    # CHECK ALREADY PUBLISHED
    # --------------------------------------------------------

    if post.status == "published":

        raise HTTPException(
            status_code=400,
            detail="Post is already published"
        )


    # --------------------------------------------------------
    # FIND SOCIAL ACCOUNT
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # ACCESS TOKEN
    # --------------------------------------------------------

    if not account.access_token:

        raise HTTPException(
            status_code=400,
            detail=(
                "Social account access token "
                "not found"
            )
        )


    # --------------------------------------------------------
    # PUBLISH
    # --------------------------------------------------------
    #
    # We pass:
    #
    # media_url
    # media_type
    # social_account
    #
    # because Instagram publishing needs
    # the uploaded media and Instagram account ID.
    # --------------------------------------------------------

    try:

        post.status = "publishing"
        db.commit()

        result = publish_to_social_media(

            platform=account.platform,

            username=account.username,

            content=post.content,

            access_token=account.access_token,

            media_url=post.media_url,

            media_type=post.media_type,

            social_account=account

        )


    except Exception as exc:

        post.status = "failed"
        post.error_message = str(exc)

        log = PublishingLog(

            post_id=post.id,

            user_id=post.user_id,

            social_account_id=account.id,

            platform=account.platform,

            status="failed",

            message=str(exc),

            published_at=
                get_current_india_time()

        )

        db.add(log)

        db.commit()


        return {

            "success": False,

            "message":
                f"Publishing error: {str(exc)}",

            "status":
                "failed",

            "post_id":
                post.id

        }


    # --------------------------------------------------------
    # PUBLISH SUCCESS
    # --------------------------------------------------------

    if result.get("success"):

        post.status = "published"
        post.published_at = get_current_india_time()
        post.platform_post_id = result.get("post_id")
        post.error_message = None

        post.scheduled_at = None


        success_message = (
            result.get(
                "message",
                "Post published successfully"
            )
        )


        log = PublishingLog(

            post_id=post.id,

            user_id=post.user_id,

            social_account_id=account.id,

            platform=account.platform,

            status="published",

            message=success_message,

            published_at=
                get_current_india_time()

        )


        db.add(log)

        db.commit()

        db.refresh(post)


        return {

            "success": True,

            "message":
                success_message,

            "status":
                "published",

            "post_id":
                post.id,

            "platform":
                account.platform,

            "username":
                account.username,

            "result":
                result

        }


    # --------------------------------------------------------
    # PUBLISH FAILED
    # --------------------------------------------------------

    error_message = (
        result.get(
            "message",
            "Publishing failed"
        )
    )


    post.status = "failed"
    post.error_message = error_message


    log = PublishingLog(

        post_id=post.id,

        user_id=post.user_id,

        social_account_id=account.id,

        platform=account.platform,

        status="failed",

        message=error_message,

        published_at=
            get_current_india_time()

    )


    db.add(log)

    db.commit()


    return {

        "success": False,

        "message":
            error_message,

        "status":
            "failed",

        "post_id":
            post.id,

        "platform":
            account.platform,

        "username":
            account.username,

        "result":
            result

    }
