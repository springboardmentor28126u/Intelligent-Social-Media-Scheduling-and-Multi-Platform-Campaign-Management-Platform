from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, String

from app.db.database import get_db
from app.db.models.post import Post, PublishingLog, PostMedia, PostPlatformTarget
from app.db.models.social_account import SocialAccount
from app.db.models.audit import AuditLog
from app.services.providers import get_social_provider
from app.core.security import get_current_user
from app.schemas.post import PostResponse, PostMediaResponse, PublishingLogResponse


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def _format_post(p: Post) -> dict:
    media_url = p.media_url or (p.media[0].file_url if (hasattr(p, 'media') and p.media) else None)
    return {
        "id": p.id,
        "uuid": p.uuid,
        "title": p.title or "Untitled Post",
        "content": p.content,
        "platform": p.platform,
        "post_type": p.post_type,
        "media_url": media_url,
        "media_type": p.media_type,
        "status": p.status.lower() if p.status else "draft",
        "approval_status": getattr(p, "approval_status", "approved") or "approved",
        "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "retry_count": getattr(p, "retry_count", 0),
        "max_retries": getattr(p, "max_retries", 3),
        "failure_reason": getattr(p, "failure_reason", None),
        "external_post_id": getattr(p, "external_post_id", None),
        "is_recurring": getattr(p, "is_recurring", False),
        "recurrence_rule": getattr(p, "recurrence_rule", None),
        "likes_count": getattr(p, "likes_count", 0),
        "comments_count": getattr(p, "comments_count", 0),
        "shares_count": getattr(p, "shares_count", 0),
        "clicks_count": getattr(p, "clicks_count", 0),
        "reach_count": getattr(p, "reach_count", 0),
        "impressions_count": getattr(p, "impressions_count", 0),
        "author_name": p.user.name if p.user else None,
        "campaign_name": None,
        "account_name": None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _calc_trend(cur_val: int, prev_val: int) -> dict:
    if prev_val > 0:
        pct = round(((cur_val - prev_val) / prev_val) * 100, 1)
        return {
            "value": abs(pct),
            "positive": pct >= 0,
            "is_available": True,
            "label": f"{'+' if pct >= 0 else '-'}{abs(pct)}%"
        }
    elif cur_val > 0 and prev_val == 0:
        return {
            "value": 100.0,
            "positive": True,
            "is_available": True,
            "label": "New"
        }
    else:
        return {
            "value": 0.0,
            "positive": True,
            "is_available": False,
            "label": "No change"
        }


@router.get("/stats")
def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch live statistics from the database and connected providers for the current user's workspace.
    Guarantees REAL data only with no simulated or hardcoded values.
    """
    user_id = current_user["user_id"]
    role = current_user["role"]

    # 1. Base query for posts
    posts_q = db.query(Post)
    if role == "content_creator":
        posts_q = posts_q.filter(Post.user_id == user_id)

    total_posts = posts_q.count()
    status_str = func.lower(func.cast(Post.status, String))
    scheduled_posts = posts_q.filter(status_str.in_(["scheduled", "queued", "publishing"])).count()
    published_posts = posts_q.filter(status_str == "published").count()
    failed_posts = posts_q.filter(status_str == "failed").count()
    draft_posts = posts_q.filter(status_str == "draft").count()
    pending_approval_posts = posts_q.filter(status_str.in_(["pending_approval", "pending"])).count()

    # 2. Query active connected accounts for current user
    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    all_accounts = accounts_q.all()

    def _get_stable_account_key(acc: SocialAccount) -> str:
        """Extract a canonical stable platform account identifier for deduplication."""
        for field in [acc.platform_user_id, acc.account_id, acc.account_handle, acc.account_name]:
            if field and str(field).strip():
                val = str(field).strip().lower()
                if val.startswith("urn:li:person:"):
                    val = val.replace("urn:li:person:", "")
                elif val.startswith("urn:li:organization:"):
                    val = val.replace("urn:li:organization:", "")
                return val
        return str(acc.id)

    # 3. Calculate real connected accounts per platform with stable deduplication
    standard_platforms = ["instagram", "linkedin", "facebook", "twitter", "pinterest", "youtube"]
    platforms_meta: Dict[str, Any] = {}

    for plat in standard_platforms:
        # Match accounts for this platform
        matching = [
            a for a in all_accounts
            if (a.platform and (a.platform.lower() == plat or (plat == "twitter" and a.platform.lower() == "x")))
        ]
        seen_keys = set()
        unique_matching = []
        for a in matching:
            k = _get_stable_account_key(a)
            if k not in seen_keys:
                seen_keys.add(k)
                unique_matching.append(a)

        acc_cnt = len(unique_matching)
        platforms_meta[plat] = {
            "connected": bool(acc_cnt > 0),
            "account_count": acc_cnt,
            "platform": plat
        }

    connected_accounts = sum(platforms_meta[p]["account_count"] for p in standard_platforms)

    # Backward compatibility fields
    instagram_followers = None
    linkedin_followers = None
    facebook_followers = None
    twitter_followers = None
    pinterest_followers = None
    youtube_subscribers = None
    total_followers = None

    # 4. Engagement aggregates from published posts
    published_list = posts_q.filter(status_str == "published").all()
    total_likes = sum(p.likes_count or 0 for p in published_list)
    total_comments = sum(p.comments_count or 0 for p in published_list)
    total_shares = sum(p.shares_count or 0 for p in published_list)
    total_clicks = sum(p.clicks_count or 0 for p in published_list)
    total_reach = sum(p.reach_count or 0 for p in published_list)
    total_impressions = sum(p.impressions_count or 0 for p in published_list)
    total_engagement = total_likes + total_comments + total_shares

    # 5. Real 7-day period comparison trends
    now = datetime.now(timezone.utc)
    cur_7d_start = now - timedelta(days=7)
    prev_7d_start = now - timedelta(days=14)

    def _get_pub_dt(p: Post) -> Optional[datetime]:
        if not p.published_at:
            return None
        if isinstance(p.published_at, datetime):
            return p.published_at if p.published_at.tzinfo else p.published_at.replace(tzinfo=timezone.utc)
        return None

    cur_7d_posts = [p for p in published_list if _get_pub_dt(p) and _get_pub_dt(p) >= cur_7d_start]
    prev_7d_posts = [p for p in published_list if _get_pub_dt(p) and prev_7d_start <= _get_pub_dt(p) < cur_7d_start]

    cur_eng_7d = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in cur_7d_posts)
    prev_eng_7d = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in prev_7d_posts)

    cur_reach_7d = sum(p.reach_count or 0 for p in cur_7d_posts)
    prev_reach_7d = sum(p.reach_count or 0 for p in prev_7d_posts)

    cur_clicks_7d = sum(p.clicks_count or 0 for p in cur_7d_posts)
    prev_clicks_7d = sum(p.clicks_count or 0 for p in prev_7d_posts)

    posts_trend = _calc_trend(len(cur_7d_posts), len(prev_7d_posts))
    engagement_trend = _calc_trend(cur_eng_7d, prev_eng_7d)
    reach_trend = _calc_trend(cur_reach_7d, prev_reach_7d)
    clicks_trend = _calc_trend(cur_clicks_7d, prev_clicks_7d)

    connected_platforms = [plat for plat, p_data in platforms_meta.items() if p_data["connected"]]

    return {
        "total_posts": total_posts,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts,
        "failed_posts": failed_posts,
        "draft_posts": draft_posts,
        "pending_approval_posts": pending_approval_posts,
        "connected_accounts": connected_accounts,
        "connected_platforms": connected_platforms,
        "platforms": platforms_meta,
        "total_followers": total_followers,
        "instagram_followers": instagram_followers,
        "linkedin_followers": linkedin_followers,
        "facebook_followers": facebook_followers,
        "twitter_followers": twitter_followers,
        "pinterest_followers": pinterest_followers,
        "youtube_subscribers": youtube_subscribers,
        "total_reach": total_reach,
        "total_impressions": total_impressions,
        "total_engagement": total_engagement,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "total_clicks": total_clicks,
        "posts_trend": posts_trend,
        "engagement_trend": engagement_trend,
        "reach_trend": reach_trend,
        "clicks_trend": clicks_trend,
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

    posts_q = db.query(Post)
    if role == "content_creator":
        posts_q = posts_q.filter(Post.user_id == user_id)

    total_posts = posts_q.count()
    status_str = func.lower(func.cast(Post.status, String))
    scheduled = posts_q.filter(status_str.in_(["scheduled", "queued", "publishing"])).count()
    published = posts_q.filter(status_str == "published").count()
    failed = posts_q.filter(status_str == "failed").count()
    drafts = posts_q.filter(status_str == "draft").count()
    pending_approval = posts_q.filter(status_str.in_(["pending_approval", "pending"])).count()

    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    all_accounts = accounts_q.all()
    connected_accounts = len(all_accounts)

    return {
        "total_posts": total_posts,
        "scheduled": scheduled,
        "published": published,
        "failed": failed,
        "drafts": drafts,
        "pending_approval": pending_approval,
        "published_content": published,
        "connected_accounts": connected_accounts,
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
    status_str = func.lower(func.cast(Post.status, String))

    query = db.query(Post).filter(
        status_str.in_(["scheduled", "queued", "pending_approval", "pending"]),
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
