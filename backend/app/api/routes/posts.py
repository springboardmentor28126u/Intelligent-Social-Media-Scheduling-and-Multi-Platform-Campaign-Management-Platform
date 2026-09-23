import os
import uuid
import shutil
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.database import get_db
from app.db.models.post import Post, PostMedia, PostPlatformTarget, PublishingLog
from app.db.models.campaign import Campaign
from app.db.models.social_account import SocialAccount
from app.db.models.user import User
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostMediaResponse,
    PostPlatformTargetResponse,
    PostScheduleRequest,
    PostRescheduleRequest,
    PostApprovalAction,
    PostCalendarEvent,
    PublishingLogResponse
)
from app.core.security import get_current_user, require_permission
from app.db.models.approval import ApprovalRequest
from app.services.scheduler import publish_post_now
from app.services.audit import log_audit_event
from app.services.notifications import (
    create_notification,
    notify_admins_of_creator_activity,
    notify_admins_post_created,
    notify_admins_post_scheduled,
    notify_admins_post_published,
    notify_admins_post_updated,
    notify_admins_post_deleted
)
from app.services.approvals import create_approval_request_for_post
from starlette.concurrency import run_in_threadpool


router = APIRouter(
    prefix="/posts",
    tags=["Posts & Publishing"]
)


def _format_post_response(post: Post) -> PostResponse:
    media_list = [
        PostMediaResponse(
            id=m.id,
            post_id=m.post_id,
            file_name=m.file_name,
            file_type=m.file_type,
            file_size=m.file_size,
            file_url=m.file_url,
            thumbnail_url=m.thumbnail_url,
            media_order=m.media_order,
            created_at=m.created_at
        ) for m in (post.media or [])
    ]
    
    targets_list = [
        PostPlatformTargetResponse(
            id=t.id,
            post_id=t.post_id,
            platform=t.platform,
            social_account_id=t.social_account_id,
            status=t.status,
            external_post_id=t.external_post_id,
            external_url=t.external_url,
            error_message=t.error_message,
            attempt_count=t.attempt_count,
            max_attempts=t.max_attempts,
            published_at=t.published_at,
            created_at=t.created_at,
            updated_at=t.updated_at
        ) for t in (post.platform_targets or [])
    ]
    
    author_name = post.user.name if post.user else None
    campaign_name = post.campaign.name if post.campaign else None
    account_name = post.social_account.account_name if post.social_account else None

    # Derive media_url & media_type
    media_url = post.media_url or (media_list[0].file_url if media_list else None)
    media_type = post.media_type
    if not media_type and media_url:
        ext = os.path.splitext(media_url)[1].lower()
        if ext in [".mp4", ".mov", ".webm", ".avi"]:
            media_type = "video"
        else:
            media_type = "image"

    return PostResponse(
        id=post.id,
        uuid=post.uuid,
        user_id=post.user_id,
        team_id=post.team_id,
        campaign_id=post.campaign_id,
        social_account_id=post.social_account_id,
        title=post.title,
        content=post.content,
        platform=post.platform,
        post_type=post.post_type,
        media_url=media_url,
        media_type=media_type,
        status=post.status,
        approval_status=getattr(post, "approval_status", "approved") or "approved",
        scheduled_at=post.scheduled_at,
        published_at=post.published_at,
        retry_count=post.retry_count,
        max_retries=post.max_retries,
        failure_reason=post.failure_reason,
        external_post_id=post.external_post_id,
        is_recurring=post.is_recurring,
        recurrence_rule=post.recurrence_rule,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        shares_count=post.shares_count,
        clicks_count=post.clicks_count,
        reach_count=post.reach_count,
        impressions_count=post.impressions_count,
        tags=post.tags,
        created_at=post.created_at,
        updated_at=post.updated_at,
        media=media_list,
        platform_targets=targets_list,
        author_name=author_name,
        campaign_name=campaign_name,
        account_name=account_name
    )


def _check_post_ownership(post: Post, current_user: dict):
    """Raise 403 if a non-admin user tries to access another user's post."""
    if current_user["role"] == "content_creator" and post.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied: you can only modify your own posts")


# ─────────────────────────────────────────────────────────────────────────────
# LIST / GET
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PostResponse])
def get_posts(
    status: Optional[str] = Query(None, description="draft, scheduled, published, failed, pending_approval, cancelled"),
    platform: Optional[str] = Query(None),
    campaign_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List posts visible to the current user with optional filters."""
    query = db.query(Post)
    
    # Non-admins only see own posts (or if role is marketing/business, all team posts)
    if current_user["role"] == "content_creator":
        query = query.filter(Post.user_id == current_user["user_id"])
    elif current_user["role"] in ["marketing_team", "business_user"]:
        # Show all posts for the workspace
        pass

    if status:
        query = query.filter(Post.status == status)
    if platform:
        query = query.filter(Post.platform == platform.lower())
    if campaign_id:
        camp_post_ids = [cp.post_id for cp in db.query(CampaignPost).filter(CampaignPost.campaign_id == campaign_id).all()]
        if camp_post_ids:
            query = query.filter(or_(Post.campaign_id == campaign_id, Post.id.in_(camp_post_ids)))
        else:
            query = query.filter(Post.campaign_id == campaign_id)

    posts = query.options(
        selectinload(Post.user),
        selectinload(Post.media),
        selectinload(Post.platform_targets)
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [_format_post_response(p) for p in posts]


@router.get("/calendar", response_model=List[PostCalendarEvent])
def get_calendar_posts(
    start: Optional[str] = Query(None, description="ISO datetime start of range"),
    end: Optional[str] = Query(None, description="ISO datetime end of range"),
    status: Optional[str] = Query(None, description="Filter by status (comma-separated supported)"),
    platform: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return posts for the publishing calendar within a date range.
    Falls back to the current month if no range is provided.
    Posts are matched by scheduled_at, published_at, or created_at.
    """
    now = datetime.now(timezone.utc)
    
    # Parse start/end or default to current month
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        except ValueError:
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except ValueError:
            # Default: end of month
            next_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1)
            end_dt = next_month - timedelta(seconds=1)
    else:
        next_month = (start_dt.replace(day=28) + timedelta(days=4)).replace(day=1)
        end_dt = next_month - timedelta(seconds=1)

    query = db.query(Post)

    # Ownership filter
    if current_user["role"] == "content_creator":
        query = query.filter(Post.user_id == current_user["user_id"])

    # Status filter (supports comma-separated: "scheduled,published")
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Post.status.in_(statuses))

    if platform:
        query = query.filter(Post.platform == platform.lower())

    all_posts = query.all()

    # Filter to posts whose relevant date falls in the range
    result = []
    for p in all_posts:
        relevant_date = p.scheduled_at or p.published_at or p.created_at
        if relevant_date is None:
            continue
        # Normalize timezone
        if relevant_date.tzinfo is None:
            relevant_date = relevant_date.replace(tzinfo=timezone.utc)
        # Normalize start/end
        s = start_dt if start_dt.tzinfo else start_dt.replace(tzinfo=timezone.utc)
        e = end_dt if end_dt.tzinfo else end_dt.replace(tzinfo=timezone.utc)
        if s <= relevant_date <= e:
            campaign_name = p.campaign.name if p.campaign else None
            account_name = p.social_account.account_name if p.social_account else None
            media_url = p.media_url or (p.media[0].file_url if p.media else None)
            result.append(PostCalendarEvent(
                id=p.id,
                uuid=p.uuid,
                title=p.title,
                content=p.content,
                platform=p.platform,
                post_type=p.post_type,
                media_url=media_url,
                media_type=p.media_type,
                status=p.status,
                scheduled_at=p.scheduled_at,
                published_at=p.published_at,
                is_recurring=p.is_recurring,
                recurrence_rule=p.recurrence_rule,
                campaign_name=campaign_name,
                account_name=account_name,
                failure_reason=p.failure_reason,
                retry_count=p.retry_count,
                max_retries=p.max_retries
            ))

    return result


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _format_post_response(post)


# ─────────────────────────────────────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a post (draft or scheduled). Accepts both multipart/form-data (with file)
    and application/json bodies.
    """
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type or "form" in content_type:
        form = await request.form()
        content = str(form.get("content") or form.get("caption") or "")
        title = form.get("title") or form.get("campaign_title") or None
        if title:
            title = str(title)
        platform = str(form.get("platform") or "instagram").lower()
        status_val = str(form.get("status") or "draft")
        post_type = str(form.get("post_type") or "text")
        scheduled_at_str = form.get("scheduled_at")
        campaign_id_str = form.get("campaign_id")
        social_account_id_str = form.get("social_account_id")
        tags = str(form.get("tags")) if form.get("tags") else None
        is_recurring = form.get("is_recurring") in [True, "true", "True", "1"]
        recurrence_rule = str(form.get("recurrence_rule")) if form.get("recurrence_rule") else None
        recurrence_end_str = form.get("recurrence_end_date")
        media_url = str(form.get("media_url")) if form.get("media_url") else None
        media_type = str(form.get("media_type")) if form.get("media_type") else None

        uploaded_file = form.get("media_file") or form.get("file") or form.get("media")
        saved_file_name = None
        saved_file_size = 0
        file_mime = None

        if uploaded_file and hasattr(uploaded_file, "filename") and uploaded_file.filename:
            saved_file_name = uploaded_file.filename
            ext = os.path.splitext(saved_file_name)[1].lower() or ".jpg"
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            target_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(uploaded_file.file, buffer)

            saved_file_size = os.path.getsize(target_path)
            media_url = f"/uploads/{unique_filename}"
            file_mime = uploaded_file.content_type or (
                "video/mp4" if ext in [".mp4", ".mov"] else "image/jpeg"
            )

            if ext in [".mp4", ".mov", ".webm", ".avi", ".mkv"] or (
                uploaded_file.content_type and "video" in uploaded_file.content_type
            ):
                media_type = "video"
                post_type = "video"
            else:
                media_type = "image"
                post_type = "image"

        scheduled_at = None
        if scheduled_at_str:
            try:
                scheduled_at = datetime.fromisoformat(str(scheduled_at_str).replace("Z", "+00:00"))
            except Exception:
                pass

        recurrence_end_date = None
        if recurrence_end_str:
            try:
                recurrence_end_date = datetime.fromisoformat(str(recurrence_end_str).replace("Z", "+00:00"))
            except Exception:
                pass

        campaign_id = int(campaign_id_str) if campaign_id_str and str(campaign_id_str).isdigit() else None
        social_account_id = int(social_account_id_str) if social_account_id_str and str(social_account_id_str).isdigit() else None

        initial_status = status_val or ("scheduled" if scheduled_at else "draft")
        initial_approval_status = "approved"

        post = Post(
            user_id=current_user["user_id"],
            campaign_id=campaign_id,
            social_account_id=social_account_id,
            title=title,
            content=content,
            platform=platform,
            post_type=post_type,
            content_type=post_type or "text",
            platforms=[platform],
            media_url=media_url,
            media_type=media_type,
            status=initial_status,
            approval_status=initial_approval_status,
            scheduled_at=scheduled_at,
            is_recurring=is_recurring,
            recurrence_rule=recurrence_rule,
            tags=tags
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        if media_url:
            ext_str = os.path.splitext(media_url)[1].lower()
            post_media = PostMedia(
                post_id=post.id,
                file_name=saved_file_name or os.path.basename(media_url),
                file_type=file_mime or (
                    f"video/{ext_str.lstrip('.')}" if media_type == "video" else f"image/{ext_str.lstrip('.')}"
                ),
                file_size=saved_file_size,
                file_url=media_url,
                thumbnail_url=media_url,
                media_order=0
            )
            db.add(post_media)
            db.commit()
            db.refresh(post)

        # Create target platform record
        target_acc_id = social_account_id
        if not target_acc_id:
            acc = db.query(SocialAccount).filter(
                SocialAccount.user_id == current_user["user_id"],
                SocialAccount.platform == post.platform,
                SocialAccount.is_active == True
            ).first()
            if acc:
                target_acc_id = acc.id

        plat_target = PostPlatformTarget(
            post_id=post.id,
            platform=post.platform,
            social_account_id=target_acc_id,
            status="pending" if initial_status in ["scheduled", "queued", "published"] else "draft",
            max_attempts=3
        )
        db.add(plat_target)

        if post.campaign_id:
            from app.db.models.campaign import CampaignPost
            link = db.query(CampaignPost).filter(
                CampaignPost.campaign_id == post.campaign_id,
                CampaignPost.post_id == post.id
            ).first()
            if not link:
                db.add(CampaignPost(campaign_id=post.campaign_id, post_id=post.id))

        db.commit()
        db.refresh(post)

        creator_user = db.query(User).filter(User.id == current_user["user_id"]).first()

        if initial_status == "published":
            await run_in_threadpool(publish_post_now, post.id, db)
            db.refresh(post)
            if creator_user:
                notify_admins_post_published(db=db, post=post, actor_user=creator_user)
        elif initial_status == "scheduled":
            if creator_user:
                notify_admins_post_scheduled(db=db, post=post, actor_user=creator_user)
        else:
            if creator_user:
                notify_admins_post_created(db=db, post=post, actor_user=creator_user)

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.create",
            module="posts",
            description=f"Created post #{post.id} ({post.platform}, status: {post.status}, media: {media_type or 'none'})"
        )
        return _format_post_response(post)

    else:
        body = await request.json()
        post_data = PostCreate.model_validate(body)

        initial_status = post_data.status or ("scheduled" if post_data.scheduled_at else "draft")
        initial_approval_status = "approved"

        media_url = post_data.media_url
        media_type = post_data.media_type
        post_type = post_data.post_type or "text"

        if post_data.media and len(post_data.media) > 0:
            if not media_url:
                media_url = post_data.media[0].file_url
            if not media_type:
                media_type = "video" if "video" in post_data.media[0].file_type else "image"
                post_type = media_type

        post = Post(
            user_id=current_user["user_id"],
            campaign_id=post_data.campaign_id,
            social_account_id=post_data.social_account_id,
            title=post_data.title,
            content=post_data.content,
            platform=post_data.platform.lower(),
            post_type=post_type,
            content_type=post_type or "text",
            platforms=[post_data.platform.lower()],
            media_url=media_url,
            media_type=media_type,
            status=initial_status,
            approval_status=initial_approval_status,
            scheduled_at=post_data.scheduled_at,
            is_recurring=post_data.is_recurring or False,
            recurrence_rule=post_data.recurrence_rule,
            tags=post_data.tags
        )

        db.add(post)
        db.commit()
        db.refresh(post)

        if post_data.media:
            for idx, m in enumerate(post_data.media):
                media_item = PostMedia(
                    post_id=post.id,
                    file_name=m.file_name,
                    file_type=m.file_type,
                    file_size=m.file_size,
                    file_url=m.file_url,
                    thumbnail_url=m.thumbnail_url,
                    media_order=idx
                )
                db.add(media_item)
            db.commit()
            db.refresh(post)

        # Create target platform record
        target_acc_id = post_data.social_account_id
        if not target_acc_id:
            acc = db.query(SocialAccount).filter(
                SocialAccount.user_id == current_user["user_id"],
                SocialAccount.platform == post.platform,
                SocialAccount.is_active == True
            ).first()
            if acc:
                target_acc_id = acc.id

        plat_target = PostPlatformTarget(
            post_id=post.id,
            platform=post.platform,
            social_account_id=target_acc_id,
            status="pending" if initial_status in ["scheduled", "queued", "published"] else "draft",
            max_attempts=3
        )
        db.add(plat_target)

        if post.campaign_id:
            from app.db.models.campaign import CampaignPost
            link = db.query(CampaignPost).filter(
                CampaignPost.campaign_id == post.campaign_id,
                CampaignPost.post_id == post.id
            ).first()
            if not link:
                db.add(CampaignPost(campaign_id=post.campaign_id, post_id=post.id))

        db.commit()
        db.refresh(post)

        creator_user = db.query(User).filter(User.id == current_user["user_id"]).first()

        if initial_status == "published":
            await run_in_threadpool(publish_post_now, post.id, db)
            db.refresh(post)
            if creator_user:
                notify_admins_post_published(db=db, post=post, actor_user=creator_user)
        elif initial_status == "scheduled":
            if creator_user:
                notify_admins_post_scheduled(db=db, post=post, actor_user=creator_user)
        else:
            if creator_user:
                notify_admins_post_created(db=db, post=post, actor_user=creator_user)

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.create",
            module="posts",
            description=f"Created post #{post.id} ({post.platform}, status: {post.status})"
        )

        return _format_post_response(post)


# ─────────────────────────────────────────────────────────────────────────────
# UPDATE / DELETE
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a post. Only the post owner (or admin) can edit."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    if post_data.title is not None:
        post.title = post_data.title
    if post_data.content is not None:
        post.content = post_data.content
    if post_data.platform is not None:
        post.platform = post_data.platform.lower()
    if post_data.post_type is not None:
        post.post_type = post_data.post_type
    if post_data.media_url is not None:
        post.media_url = post_data.media_url
    if post_data.media_type is not None:
        post.media_type = post_data.media_type
    if post_data.status is not None:
        post.status = post_data.status
    if post_data.approval_status is not None:
        post.approval_status = post_data.approval_status
    if post_data.scheduled_at is not None:
        post.scheduled_at = post_data.scheduled_at
    if post_data.campaign_id is not None:
        post.campaign_id = post_data.campaign_id
    if post_data.social_account_id is not None:
        post.social_account_id = post_data.social_account_id
    if post_data.tags is not None:
        post.tags = post_data.tags
    if post_data.is_recurring is not None:
        post.is_recurring = post_data.is_recurring
    if post_data.recurrence_rule is not None:
        post.recurrence_rule = post_data.recurrence_rule

    # Media updates if provided
    if post_data.media is not None:
        db.query(PostMedia).filter(PostMedia.post_id == post.id).delete()
        for idx, m in enumerate(post_data.media):
            media_item = PostMedia(
                post_id=post.id,
                file_name=m.file_name,
                file_type=m.file_type,
                file_size=m.file_size,
                file_url=m.file_url,
                thumbnail_url=m.thumbnail_url,
                media_order=idx
            )
            db.add(media_item)

    db.commit()
    db.refresh(post)

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_post_updated(db=db, post=post, actor_user=user)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.update",
        module="posts",
        description=f"Updated post #{post.id}"
    )
    return _format_post_response(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a post. If published to Instagram, deletes from Instagram first."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    # Check if this post was published to Instagram
    ig_target = None
    if post.platform_targets:
        for t in post.platform_targets:
            if t.platform == "instagram" and t.status == "published" and t.external_post_id:
                ig_target = t
                break

    is_ig_published = (
        (ig_target is not None) or
        (post.platform == "instagram" and post.status == "published" and bool(post.external_post_id))
    )

    if is_ig_published:
        media_id = ig_target.external_post_id if ig_target else post.external_post_id
        acc_id = ig_target.social_account_id if (ig_target and ig_target.social_account_id) else post.social_account_id

        # Resolve social account & access token
        account = None
        if acc_id:
            account = db.query(SocialAccount).filter(SocialAccount.id == acc_id).first()
        if not account:
            account = db.query(SocialAccount).filter(
                SocialAccount.user_id == post.user_id,
                SocialAccount.platform == "instagram",
                SocialAccount.is_active == True
            ).first()

        if account and account.access_token and media_id:
            from app.services.providers import get_social_provider
            provider = get_social_provider("instagram", is_demo=getattr(account, "is_demo", False))
            if hasattr(provider, "delete_post"):
                del_res = await run_in_threadpool(
                    provider.delete_post,
                    access_token=account.access_token,
                    media_id=media_id
                )
                if not del_res.get("success"):
                    err_msg = del_res.get("error", "Instagram API rejection")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to delete the post from Instagram: {err_msg}"
                    )

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_post_deleted(
            db=db,
            post_id=post.id,
            platform=post.platform or "social",
            title_or_snippet=post.title or post.content[:30] or "",
            actor_user=user
        )

    db.delete(post)
    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.delete",
        module="posts",
        description=f"Deleted post #{post_id}"
    )
    return None


# ─────────────────────────────────────────────────────────────────────────────
# SCHEDULE / CANCEL / RESCHEDULE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{post_id}/schedule", response_model=PostResponse)
def schedule_post(
    post_id: int,
    data: PostScheduleRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule a post for a specific date/time."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    # Cannot schedule an already-published or cancelled post
    if post.status in ["published", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule a post with status '{post.status}'"
        )

    # Validate that scheduled time is in the future
    now = datetime.now(timezone.utc)
    scheduled = data.scheduled_at
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)
    if scheduled <= now:
        raise HTTPException(
            status_code=400,
            detail="Scheduled time must be in the future"
        )

    post.status = "scheduled"
    post.approval_status = "approved"
    post.scheduled_at = scheduled
    if data.is_recurring is not None:
        post.is_recurring = data.is_recurring
    if data.recurrence_rule is not None:
        post.recurrence_rule = data.recurrence_rule
    post.failure_reason = None

    for target in (post.platform_targets or []):
        target.status = "pending"

    db.commit()
    db.refresh(post)

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_post_scheduled(db=db, post=post, actor_user=user)

    create_notification(
        db=db,
        user_id=post.user_id,
        title="Post Scheduled ⏰",
        message=f"Post scheduled for {post.scheduled_at.strftime('%b %d, %Y at %H:%M UTC')}",
        type="reminder",
        link="/calendar"
    )

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.scheduled",
        module="posts",
        description=f"Scheduled post #{post.id} for {post.scheduled_at}"
    )

    return _format_post_response(post)


@router.post("/{post_id}/reschedule", response_model=PostResponse)
def reschedule_post(
    post_id: int,
    data: PostRescheduleRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reschedule a scheduled or failed post to a new date/time."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    if post.status == "published":
        raise HTTPException(status_code=400, detail="Cannot reschedule an already published post")

    # Validate future time
    now = datetime.now(timezone.utc)
    new_time = data.scheduled_at
    if new_time.tzinfo is None:
        new_time = new_time.replace(tzinfo=timezone.utc)
    if new_time <= now:
        raise HTTPException(status_code=400, detail="Rescheduled time must be in the future")

    old_time = post.scheduled_at
    post.scheduled_at = new_time
    post.status = "scheduled"
    post.approval_status = "approved"
    post.failure_reason = None
    post.retry_count = 0

    for target in (post.platform_targets or []):
        target.status = "pending"

    db.commit()
    db.refresh(post)

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_post_scheduled(db=db, post=post, actor_user=user)

    create_notification(
        db=db,
        user_id=post.user_id,
        title="Post Rescheduled 📅",
        message=f"Post rescheduled to {post.scheduled_at.strftime('%b %d, %Y at %H:%M UTC')}",
        type="reminder",
        link="/calendar"
    )

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.rescheduled",
        module="posts",
        description=f"Rescheduled post #{post.id} from {old_time} to {new_time}. Reason: {data.reason or 'N/A'}"
    )

    return _format_post_response(post)


@router.post("/{post_id}/cancel", response_model=PostResponse)
def cancel_post(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a scheduled or draft post. Cannot cancel already-published posts."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    if post.status == "published":
        raise HTTPException(status_code=400, detail="Cannot cancel an already published post")
    if post.status == "cancelled":
        raise HTTPException(status_code=400, detail="Post is already cancelled")

    post.status = "cancelled"
    db.commit()
    db.refresh(post)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.cancelled",
        module="posts",
        description=f"Cancelled post #{post.id}"
    )

    return _format_post_response(post)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLISH / RETRY
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{post_id}/publish", response_model=PostResponse)
async def publish_immediate(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Immediately publish a post (bypasses scheduler)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    # Re-link active account for non-published targets
    for target in (post.platform_targets or []):
        if target.status != "published":
            active_acc = db.query(SocialAccount).filter(
                SocialAccount.user_id == post.user_id,
                SocialAccount.platform == target.platform,
                SocialAccount.is_active == True
            ).first()
            if active_acc:
                target.social_account_id = active_acc.id
            target.status = "pending"
            target.error_message = None
    db.commit()

    await run_in_threadpool(publish_post_now, post.id, db)
    db.refresh(post)

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user and post.status == "published":
        notify_admins_post_published(db=db, post=post, actor_user=user)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.publish_immediate",
        module="posts",
        description=f"Immediate publish for post #{post.id} (status: {post.status})"
    )

    return _format_post_response(post)


@router.post("/{post_id}/retry", response_model=PostResponse)
async def retry_failed_post(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retry a post. Resets retry counter and triggers immediate publish attempt."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    post.retry_count = 0
    post.failure_reason = None
    post.status = "scheduled"
    db.commit()

    # Reset non-published targets and ensure active social account is linked
    for target in (post.platform_targets or []):
        if target.status != "published":
            active_acc = db.query(SocialAccount).filter(
                SocialAccount.user_id == post.user_id,
                SocialAccount.platform == target.platform,
                SocialAccount.is_active == True
            ).first()
            if active_acc:
                target.social_account_id = active_acc.id
            target.status = "pending"
            target.attempt_count = 0
            target.error_message = None
    db.commit()

    await run_in_threadpool(publish_post_now, post.id, db)
    db.refresh(post)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.retried",
        module="posts",
        description=f"Retried publishing post #{post.id}"
    )

    return _format_post_response(post)


# ─────────────────────────────────────────────────────────────────────────────
# DUPLICATE / APPROVAL / LOGS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{post_id}/duplicate", response_model=PostResponse)
def duplicate_post(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate an existing post into a new draft."""
    orig = db.query(Post).filter(Post.id == post_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Post not found")

    new_post = Post(
        user_id=current_user["user_id"],
        campaign_id=orig.campaign_id,
        social_account_id=orig.social_account_id,
        title=f"Copy of {orig.title}" if orig.title else "Untitled Post (Copy)",
        content=orig.content,
        platform=orig.platform,
        post_type=orig.post_type,
        media_url=orig.media_url,
        media_type=orig.media_type,
        status="draft",
        approval_status="approved",
        is_recurring=False,
        tags=orig.tags
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # Copy media
    for m in (orig.media or []):
        new_media = PostMedia(
            post_id=new_post.id,
            file_name=m.file_name,
            file_type=m.file_type,
            file_size=m.file_size,
            file_url=m.file_url,
            thumbnail_url=m.thumbnail_url,
            media_order=m.media_order
        )
        db.add(new_media)
    db.commit()

    # Create target
    plat_target = PostPlatformTarget(
        post_id=new_post.id,
        platform=new_post.platform,
        social_account_id=new_post.social_account_id,
        status="draft",
        max_attempts=3
    )
    db.add(plat_target)
    db.commit()
    db.refresh(new_post)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.duplicate",
        module="posts",
        description=f"Duplicated post #{post_id} → new draft #{new_post.id}"
    )
    return _format_post_response(new_post)


@router.post("/{post_id}/submit-approval", response_model=PostResponse)
def submit_for_approval(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.status = "pending_approval"
    post.approval_status = "pending"
    for target in (post.platform_targets or []):
        target.status = "pending"
    db.commit()
    db.refresh(post)

    creator_user = db.query(User).filter(User.id == post.user_id).first()
    if creator_user:
        create_approval_request_for_post(db, post, creator_user)

    # Confirmation to creator
    create_notification(
        db=db,
        user_id=post.user_id,
        title="Submitted for Approval 📩",
        message=f"Your {post.platform.title()} post has been submitted for administrator approval.",
        type="campaign_alert",
        link="/posts?status=pending_approval"
    )

    return _format_post_response(post)


@router.post("/{post_id}/approve", response_model=PostResponse)
def handle_approval(
    post_id: int,
    data: PostApprovalAction,
    current_user: dict = Depends(require_permission("posts.approve")),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Creator cannot approve their own post!
    if current_user["user_id"] == post.user_id and current_user.get("role") == "content_creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Content creators cannot approve their own posts. An administrator must approve it."
        )

    # Update or create ApprovalRequest record
    approval_req = (
        db.query(ApprovalRequest)
        .filter(ApprovalRequest.post_id == post.id, ApprovalRequest.status == "pending")
        .first()
    )
    if not approval_req:
        approval_req = ApprovalRequest(
            post_id=post.id,
            requested_by=post.user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(approval_req)

    approval_req.reviewed_by = current_user["user_id"]
    approval_req.reviewed_at = datetime.now(timezone.utc)
    approval_req.status = "approved" if data.action == "approve" else "rejected"
    approval_req.rejection_reason = data.rejection_reason if data.action == "reject" else None

    reviewer_user = db.query(User).filter(User.id == current_user["user_id"]).first()
    creator_user = db.query(User).filter(User.id == post.user_id).first()
    creator_name = creator_user.name if creator_user else "Creator"
    reviewer_name = reviewer_user.name if reviewer_user else "Admin"
    platform_title = (post.platform or "social").title()

    if data.action == "approve":
        # Keep scheduled_at unchanged; if scheduled_at exists, status becomes "scheduled"
        post.approval_status = "approved"
        post.status = "scheduled" if post.scheduled_at else "draft"
        post.failure_reason = None
        for target in (post.platform_targets or []):
            target.status = "pending"
            target.error_message = None

        audit_desc = f"{reviewer_name} approved {creator_name}'s {platform_title} post."
        notif_msg = f"Your {platform_title} post has been APPROVED by {reviewer_name}! 👍 It is scheduled for publishing."
        notif_type = "publish_success"
    else:
        post.approval_status = "rejected"
        post.status = "draft"
        post.failure_reason = f"Rejected: {data.rejection_reason or 'Needs revision'}"
        for target in (post.platform_targets or []):
            target.status = "draft"

        audit_desc = f"{reviewer_name} rejected {creator_name}'s {platform_title} post."
        notif_msg = f"Your {platform_title} post was rejected by {reviewer_name}. Reason: {data.rejection_reason or 'Needs revision'}"
        notif_type = "publish_failed"

    db.commit()
    db.refresh(post)

    # Send real-time notification to the creator
    create_notification(
        db=db,
        user_id=post.user_id,
        title=f"Post {'Approved 👍' if data.action == 'approve' else 'Rejected ❌'}",
        message=notif_msg,
        type=notif_type,
        link="/posts"
    )

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action=f"post.{data.action}d",
        module="approvals",
        description=audit_desc
    )

    return _format_post_response(post)


@router.get("/{post_id}/logs", response_model=List[PublishingLogResponse])
def get_post_publishing_logs(
    post_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the publishing history/audit logs for a specific post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    logs = (
        db.query(PublishingLog)
        .filter(PublishingLog.post_id == post_id)
        .order_by(PublishingLog.created_at.desc())
        .all()
    )
    return logs


@router.post("/{post_id}/targets/{target_id}/retry", response_model=PostResponse)
def retry_single_platform_target(
    post_id: int,
    target_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Selective retry for only a single failed platform target.
    Does not re-publish platforms that already succeeded.
    """
    from app.services.scheduler import publish_target_now

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    _check_post_ownership(post, current_user)

    target = db.query(PostPlatformTarget).filter(
        PostPlatformTarget.id == target_id,
        PostPlatformTarget.post_id == post_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Platform target not found")

    result = publish_target_now(target.id, db=db)
    db.refresh(post)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="post.target_retry",
        module="posts",
        description=f"Selective retry for post #{post.id} target {target.platform} (#{target.id})"
    )

    return _format_post_response(post)


@router.get("/logs/all", response_model=List[PublishingLogResponse])
def get_all_publishing_logs(
    post_id: Optional[int] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List publishing execution logs with optional filtering."""
    query = db.query(PublishingLog)
    if post_id:
        query = query.filter(PublishingLog.post_id == post_id)
    if level:
        query = query.filter(PublishingLog.level == level)

    if current_user["role"] == "content_creator":
        query = query.join(Post).filter(Post.user_id == current_user["user_id"])

    logs = query.order_by(PublishingLog.created_at.desc()).limit(limit).all()
    return logs