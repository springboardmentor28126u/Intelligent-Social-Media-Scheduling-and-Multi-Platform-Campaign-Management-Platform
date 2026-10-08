from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from config import MEDIA_DIR
from video_utils import validate_youtube_short
import models, schemas

router = APIRouter(prefix="/posts", tags=["posts"])

VALID_PATTERNS = {"daily", "weekly", "monthly"}

def _validate_accounts(db, current_user, social_account_ids):
    accounts = db.query(models.SocialAccount).filter(
        models.SocialAccount.id.in_(social_account_ids),
        models.SocialAccount.user_id == current_user.id,
    ).all()
    if len(accounts) != len(social_account_ids):
        raise HTTPException(status_code=400, detail="One or more social accounts not found or not yours")
    return accounts


def _check_short_eligibility(post_as_short, media_urls, accounts):
    if not post_as_short:
        return
    targets_youtube = any(a.platform.lower() == "youtube" for a in accounts)
    if not targets_youtube:
        return
    if not media_urls:
        raise HTTPException(status_code=400, detail="A video is required to post as a YouTube Short")
    is_eligible, reason = validate_youtube_short(media_urls[0], MEDIA_DIR)
    if not is_eligible:
        raise HTTPException(status_code=400, detail=f"Video not eligible for YouTube Shorts: {reason}")


@router.post("/", response_model=schemas.PostOut)
def create_post(
    post_data: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    action = post_data.action

    if post_data.is_recurring:
        if action != "schedule":
            raise HTTPException(status_code=400, detail="Recurring posts must use action='schedule'")
        if post_data.recurrence_pattern not in VALID_PATTERNS:
            raise HTTPException(status_code=400, detail=f"recurrence_pattern must be one of {VALID_PATTERNS}")

    if action == "draft":
        status = "draft"
        accounts = []
    elif action == "schedule":
        if not post_data.scheduled_time:
            raise HTTPException(status_code=400, detail="scheduled_time is required when action is 'schedule'")
        if not post_data.social_account_ids:
            raise HTTPException(status_code=400, detail="At least one social account is required to schedule a post")
        accounts = _validate_accounts(db, current_user, post_data.social_account_ids)
        status = "scheduled"
    elif action == "publish_now":
        if not post_data.social_account_ids:
            raise HTTPException(status_code=400, detail="At least one social account is required to publish")
        accounts = _validate_accounts(db, current_user, post_data.social_account_ids)
        status = "scheduled"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'. Must be draft, schedule, or publish_now")

    if action != "draft":
        _check_short_eligibility(post_data.post_as_short, post_data.media_urls, accounts)

    post = models.Post(
        user_id=current_user.id,
        title=post_data.title,
        content=post_data.content,
        media_urls=post_data.media_urls,
        scheduled_time=post_data.scheduled_time if action == "schedule" else None,
        status=status,
        is_recurring=post_data.is_recurring,
        recurrence_pattern=post_data.recurrence_pattern if post_data.is_recurring else None,
        recurrence_end_date=post_data.recurrence_end_date if post_data.is_recurring else None,
        post_as_short=post_data.post_as_short,
        campaign_id=post_data.campaign_id,
    )
    db.add(post)
    db.flush()

    for account in accounts:
        db.add(models.PostPlatform(
            post_id=post.id,
            social_account_id=account.id,
            platform=account.platform,
            status="pending",
        ))

    db.commit()
    db.refresh(post)

    if action == "publish_now":
        from tasks import publish_post
        publish_post.delay(post.id)

    return post


@router.get("/", response_model=List[schemas.PostOut])
def list_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Post).filter(
        models.Post.user_id == current_user.id
    ).order_by(models.Post.scheduled_time.asc().nullslast()).all()


@router.get("/{post_id}", response_model=schemas.PostOut)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/{post_id}/logs", response_model=List[schemas.PublishLogOut])
def get_post_logs(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return db.query(models.PublishLog).filter(
        models.PublishLog.post_id == post_id
    ).order_by(models.PublishLog.created_at.asc()).all()


@router.put("/{post_id}", response_model=schemas.PostOut)
def update_post(
    post_id: int,
    post_data: schemas.PostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit a post with status '{post.status}' ? only draft or scheduled posts can be edited"
        )

    if post_data.title is not None:
        post.title = post_data.title
    if post_data.content is not None:
        post.content = post_data.content
    if post_data.media_urls is not None:
        post.media_urls = post_data.media_urls
    if post_data.scheduled_time is not None:
        post.scheduled_time = post_data.scheduled_time
    if post_data.is_recurring is not None:
        post.is_recurring = post_data.is_recurring
    if post_data.recurrence_pattern is not None:
        post.recurrence_pattern = post_data.recurrence_pattern
    if post_data.recurrence_end_date is not None:
        post.recurrence_end_date = post_data.recurrence_end_date
    if post_data.post_as_short is not None:
        post.post_as_short = post_data.post_as_short
    if post_data.campaign_id is not None:
        post.campaign_id = post_data.campaign_id

    if post.is_recurring and post.recurrence_pattern not in VALID_PATTERNS:
        raise HTTPException(status_code=400, detail=f"recurrence_pattern must be one of {VALID_PATTERNS}")

    if post_data.social_account_ids is not None:
        accounts = _validate_accounts(db, current_user, post_data.social_account_ids)

        existing_account_ids = {pp.social_account_id for pp in post.platform_posts}
        new_account_ids = {a.id for a in accounts}

        for pp in list(post.platform_posts):
            if pp.social_account_id not in new_account_ids:
                db.delete(pp)

        accounts_by_id = {a.id: a for a in accounts}
        for acc_id in new_account_ids - existing_account_ids:
            account = accounts_by_id[acc_id]
            db.add(models.PostPlatform(
                post_id=post.id,
                social_account_id=account.id,
                platform=account.platform,
                status="pending",
            ))

    action = post_data.action
    trigger_now = False

    if action == "schedule":
        if not post.scheduled_time:
            raise HTTPException(status_code=400, detail="scheduled_time is required to schedule this post")
        if not post.platform_posts:
            raise HTTPException(status_code=400, detail="At least one social account is required to schedule a post")
        post.status = "scheduled"
    elif action == "publish_now":
        if not post.platform_posts:
            raise HTTPException(status_code=400, detail="At least one social account is required to publish")
        post.scheduled_time = None
        post.status = "scheduled"
        trigger_now = True
    elif action == "draft":
        post.status = "draft"

    if action != "draft" and post.status != "draft":
        current_accounts = [pp.social_account for pp in post.platform_posts]
        _check_short_eligibility(post.post_as_short, post.media_urls, current_accounts)

    db.commit()
    db.refresh(post)

    if trigger_now:
        from tasks import publish_post
        publish_post.delay(post.id)

    return post


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Cannot delete a published post")
    db.query(models.Notification).filter(models.Notification.related_post_id == post_id).delete(synchronize_session=False)
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}
