from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.database import get_db
from app.db.models.post import Post, PublishingLog, PostMedia
from app.db.models.social_account import SocialAccount
from app.db.models.audit import AuditLog
from app.core.security import get_current_user
from app.schemas.post import PostResponse, PostMediaResponse, PublishingLogResponse


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def _format_post(p: Post) -> dict:
    media_url = p.media_url or (p.media[0].file_url if p.media else None)
    return {
        "id": p.id,
        "uuid": p.uuid,
        "title": p.title or "Untitled Post",
        "content": p.content,
        "platform": p.platform,
        "post_type": p.post_type,
        "media_url": media_url,
        "media_type": p.media_type,
        "status": p.status,
        "approval_status": getattr(p, "approval_status", "approved") or "approved",
        "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "retry_count": p.retry_count,
        "max_retries": p.max_retries,
        "failure_reason": p.failure_reason,
        "external_post_id": p.external_post_id,
        "is_recurring": p.is_recurring,
        "recurrence_rule": p.recurrence_rule,
        "likes_count": p.likes_count,
        "comments_count": p.comments_count,
        "shares_count": p.shares_count,
        "clicks_count": p.clicks_count,
        "reach_count": p.reach_count,
        "impressions_count": p.impressions_count,
        "author_name": p.user.name if p.user else None,
        "campaign_name": p.campaign.name if p.campaign else None,
        "account_name": p.social_account.account_name if p.social_account else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/stats")
def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch live statistics from the database for the current user's workspace:
    - Total Posts
    - Scheduled Posts
    - Published Posts
    - Failed Posts
    - Draft Posts
    - Pending Approval Posts
    - Connected Social Accounts
    - Engagement aggregates (reach, likes, comments, shares, clicks)
    """
    user_id = current_user["user_id"]
    role = current_user["role"]

    # Base query for posts
    posts_q = db.query(Post)
    if role == "content_creator":
        posts_q = posts_q.filter(Post.user_id == user_id)

    total_posts = posts_q.count()
    scheduled_posts = posts_q.filter(Post.status.in_(["scheduled", "queued", "publishing"])).count()
    published_posts = posts_q.filter(Post.status == "published").count()
    failed_posts = posts_q.filter(Post.status == "failed").count()
    draft_posts = posts_q.filter(Post.status == "draft").count()
    pending_approval_posts = posts_q.filter((Post.status == "pending_approval") | (Post.approval_status == "pending")).count()

    # Connected accounts
    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    connected_accounts = accounts_q.count()

    # Engagement aggregates from published posts
    published_list = posts_q.filter(Post.status == "published").all()
    total_likes = sum(p.likes_count or 0 for p in published_list)
    total_comments = sum(p.comments_count or 0 for p in published_list)
    total_shares = sum(p.shares_count or 0 for p in published_list)
    total_clicks = sum(p.clicks_count or 0 for p in published_list)
    total_reach = sum(p.reach_count or 0 for p in published_list)
    total_impressions = sum(p.impressions_count or 0 for p in published_list)
    total_engagement = total_likes + total_comments + total_shares

    # Followers count
    all_accounts = accounts_q.all()
    total_followers = sum(a.followers_count or 0 for a in all_accounts)

    return {
        "total_posts": total_posts,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts,
        "failed_posts": failed_posts,
        "draft_posts": draft_posts,
        "pending_approval_posts": pending_approval_posts,
        "connected_accounts": connected_accounts,
        "total_followers": total_followers,
        "total_reach": total_reach,
        "total_impressions": total_impressions,
        "total_engagement": total_engagement,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "total_clicks": total_clicks,
    }


@router.get("/summary")
def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get standardized dashboard summary metrics computed from live database records.
    """
    user_id = current_user["user_id"]
    role = current_user.get("role", "content_creator")

    # Base query for posts
    posts_q = db.query(Post)
    if role == "content_creator":
        posts_q = posts_q.filter(Post.user_id == user_id)

    total_posts = posts_q.count()
    scheduled = posts_q.filter(Post.status.in_(["scheduled", "queued", "publishing"])).count()
    published = posts_q.filter(Post.status == "published").count()
    failed = posts_q.filter(Post.status == "failed").count()
    drafts = posts_q.filter(Post.status == "draft").count()
    pending_approval = posts_q.filter((Post.status == "pending_approval") | (Post.approval_status == "pending")).count()

    # Active connected accounts
    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    connected_accounts = accounts_q.count()

    # Followers count
    all_accounts = accounts_q.all()
    has_followers = any(a.followers_count is not None and a.followers_count > 0 for a in all_accounts)
    total_followers = sum(a.followers_count or 0 for a in all_accounts) if has_followers else None

    return {
        "total_posts": total_posts,
        "scheduled": scheduled,
        "published": published,
        "failed": failed,
        "drafts": drafts,
        "pending_approval": pending_approval,
        "published_content": published,
        "connected_accounts": connected_accounts,
        "followers": total_followers,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.get("/recent-posts")
def get_dashboard_recent_posts(
    limit: int = Query(6, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the most recently created or published posts.
    """
    user_id = current_user["user_id"]
    role = current_user["role"]

    query = db.query(Post)
    if role == "content_creator":
        query = query.filter(Post.user_id == user_id)

    posts = query.order_by(desc(Post.created_at)).limit(limit).all()
    return [_format_post(p) for p in posts]


@router.get("/upcoming-posts")
def get_dashboard_upcoming_posts(
    limit: int = Query(6, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get upcoming scheduled posts ordered by scheduled_at ASC.
    """
    user_id = current_user["user_id"]
    role = current_user["role"]
    now = datetime.now(timezone.utc)

    query = db.query(Post).filter(
        Post.status.in_(["scheduled", "queued", "pending_approval"]),
        Post.scheduled_at >= now
    )
    if role == "content_creator":
        query = query.filter(Post.user_id == user_id)

    posts = query.order_by(Post.scheduled_at.asc()).limit(limit).all()
    return [_format_post(p) for p in posts]


@router.get("/activity")
def get_dashboard_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent publishing logs and audit events stream.
    """
    user_id = current_user["user_id"]
    role = current_user["role"]

    # Fetch publishing logs
    logs_q = db.query(PublishingLog).join(Post)
    if role == "content_creator":
        logs_q = logs_q.filter(Post.user_id == user_id)
    recent_pub_logs = logs_q.order_by(desc(PublishingLog.created_at)).limit(limit).all()

    # Fetch audit logs
    audit_q = db.query(AuditLog)
    if role == "content_creator":
        audit_q = audit_q.filter(AuditLog.user_id == user_id)
    recent_audits = audit_q.order_by(desc(AuditLog.created_at)).limit(limit).all()

    combined = []
    for l in recent_pub_logs:
        combined.append({
            "id": f"pub_{l.id}",
            "type": "publishing",
            "level": l.level,
            "event_name": l.event_name,
            "message": l.message,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "post_id": l.post_id,
        })
    for a in recent_audits:
        combined.append({
            "id": f"audit_{a.id}",
            "type": "audit",
            "level": "info",
            "event_name": a.action,
            "message": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "user_email": a.user_email,
            "module": a.module,
        })

    # Sort combined by created_at desc
    combined.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return combined[:limit]
