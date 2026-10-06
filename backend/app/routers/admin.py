from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_

from app.core.security import require_admin
from app.database.postgres import SessionLocal
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.publishing_log import PublishingLog
from app.models.social_account import SocialAccount
from app.models.user import User
from app.services.scheduler import scheduler


router = APIRouter(prefix="/admin", tags=["Admin"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/overview")
def get_admin_overview(
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    user_count = db.query(User).count()
    campaign_statuses = dict(
        db.query(func.lower(Campaign.status), func.count(Campaign.id))
        .group_by(func.lower(Campaign.status))
        .all()
    )
    post_statuses = dict(
        db.query(func.lower(Post.status), func.count(Post.id))
        .group_by(func.lower(Post.status))
        .all()
    )
    platform_counts = dict(
        db.query(func.lower(SocialAccount.platform), func.count(SocialAccount.id))
        .group_by(func.lower(SocialAccount.platform))
        .all()
    )

    recent_users = (
        db.query(User)
        .order_by(User.id.desc())
        .limit(5)
        .all()
    )
    recent_campaigns = (
        db.query(Campaign)
        .order_by(Campaign.created_at.desc(), Campaign.id.desc())
        .limit(5)
        .all()
    )
    queue_posts = (
        db.query(Post)
        .filter(func.lower(Post.status).in_(["scheduled", "publishing"]))
        .order_by(Post.scheduled_at.asc().nullslast(), Post.id.desc())
        .limit(6)
        .all()
    )
    recent_logs = (
        db.query(PublishingLog)
        .order_by(PublishingLog.published_at.desc(), PublishingLog.id.desc())
        .limit(6)
        .all()
    )
    today = datetime.now().date()
    trend_start = datetime.combine(today - timedelta(days=6), datetime.min.time())
    trend_rows = (
        db.query(func.date(PublishingLog.published_at), func.count(PublishingLog.id))
        .filter(PublishingLog.published_at >= trend_start)
        .group_by(func.date(PublishingLog.published_at))
        .all()
    )
    trend_counts = {day.isoformat(): count for day, count in trend_rows}

    return {
        "summary": {
            "total_users": user_count,
            "active_users": None,
            "total_campaigns": sum(campaign_statuses.values()),
            "active_campaigns": campaign_statuses.get("active", 0),
            "total_posts": sum(post_statuses.values()),
            "scheduled_posts": post_statuses.get("scheduled", 0),
            "published_posts": post_statuses.get("published", 0),
            "connected_accounts": db.query(SocialAccount).count(),
        },
        "campaign_statuses": campaign_statuses,
        "post_statuses": post_statuses,
        "platform_counts": platform_counts,
        "recent_users": [
            {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
            for user in recent_users
        ],
        "recent_campaigns": [
            {
                "id": campaign.id,
                "name": campaign.name,
                "owner": campaign.user.name if campaign.user else "Unknown",
                "status": campaign.status,
                "start_date": campaign.start_date,
                "end_date": campaign.end_date,
                "post_count": len(campaign.posts),
            }
            for campaign in recent_campaigns
        ],
        "queue": [
            {
                "id": post.id,
                "content": post.content[:100],
                "owner": post.user.name if post.user else "Unknown",
                "platform": post.social_account.platform if post.social_account else "-",
                "campaign": post.campaign.name if post.campaign else "-",
                "scheduled_at": post.scheduled_at,
                "status": post.status,
            }
            for post in queue_posts
        ],
        "publishing_activity": [
            {
                "id": log.id,
                "platform": log.platform,
                "status": log.status,
                "owner": log.user.name if log.user else "Unknown",
                "occurred_at": log.published_at,
            }
            for log in recent_logs
        ],
        "publishing_trend": [
            {
                "date": (today - timedelta(days=offset)).isoformat(),
                "count": trend_counts.get((today - timedelta(days=offset)).isoformat(), 0),
            }
            for offset in range(6, -1, -1)
        ],
        "system_status": {
            "api": "Operational",
            "database": "Operational",
            "scheduler": "Operational" if scheduler.running else "Warning",
            "publishing_worker": "Not monitored",
            "social_apis": "Not checked",
        },
    }


@router.get("/{resource}")
def get_admin_resource(
    resource: str,
    search: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    role: str | None = None,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if resource == "users":
        query = db.query(User)
        if search:
            query = query.filter(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
        if role:
            query = query.filter(func.lower(User.role) == role.lower())
        items = query.order_by(User.id.desc()).limit(250).all()
        return {
            "total": query.count(),
            "items": [
                {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "status": "Not tracked"}
                for user in items
            ],
        }

    if resource == "campaigns":
        query = db.query(Campaign).join(User, Campaign.user_id == User.id)
        if search:
            query = query.filter(or_(Campaign.name.ilike(f"%{search}%"), User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
        if status_filter:
            query = query.filter(func.lower(Campaign.status) == status_filter.lower())
        total = query.count()
        campaigns = query.order_by(Campaign.created_at.desc()).limit(250).all()
        return {
            "total": total,
            "items": [
                {
                    "id": campaign.id,
                    "name": campaign.name,
                    "owner": campaign.user.name if campaign.user else "Unknown",
                    "owner_email": campaign.user.email if campaign.user else "",
                    "start_date": campaign.start_date,
                    "end_date": campaign.end_date,
                    "status": campaign.status,
                    "posts": len(campaign.posts),
                }
                for campaign in campaigns
            ],
        }

    if resource in {"posts", "queue"}:
        query = db.query(Post)
        if resource == "queue":
            query = query.filter(func.lower(Post.status).in_(["scheduled", "publishing"]))
        if search:
            query = query.join(User, Post.user_id == User.id).filter(
                or_(Post.content.ilike(f"%{search}%"), User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
            )
        if status_filter:
            query = query.filter(func.lower(Post.status) == status_filter.lower())
        total = query.count()
        posts = query.order_by(Post.scheduled_at.asc().nullslast(), Post.id.desc()).limit(250).all()
        return {
            "total": total,
            "items": [
                {
                    "id": post.id,
                    "content": post.content[:140],
                    "owner": post.user.name if post.user else "Unknown",
                    "platform": post.social_account.platform if post.social_account else "-",
                    "campaign": post.campaign.name if post.campaign else "-",
                    "scheduled_at": post.scheduled_at,
                    "status": post.status,
                }
                for post in posts
            ],
        }

    if resource == "logs":
        query = db.query(PublishingLog)
        if search:
            query = query.join(User, PublishingLog.user_id == User.id).filter(
                or_(PublishingLog.platform.ilike(f"%{search}%"), User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
            )
        if status_filter:
            query = query.filter(func.lower(PublishingLog.status) == status_filter.lower())
        total = query.count()
        logs = query.order_by(PublishingLog.published_at.desc()).limit(250).all()
        return {
            "total": total,
            "items": [
                {
                    "id": log.id,
                    "post_id": log.post_id,
                    "owner": log.user.name if log.user else "Unknown",
                    "platform": log.platform,
                    "status": log.status,
                    "occurred_at": log.published_at,
                }
                for log in logs
            ],
        }

    if resource == "social-accounts":
        query = db.query(SocialAccount).join(User, SocialAccount.user_id == User.id)
        if search:
            query = query.filter(or_(SocialAccount.platform.ilike(f"%{search}%"), SocialAccount.username.ilike(f"%{search}%"), User.name.ilike(f"%{search}%")))
        if status_filter:
            connected = status_filter.lower() == "connected"
            query = query.filter(SocialAccount.access_token.isnot(None) if connected else SocialAccount.access_token.is_(None))
        total = query.count()
        accounts = query.order_by(SocialAccount.id.desc()).limit(250).all()
        return {
            "total": total,
            "items": [
                {
                    "id": account.id,
                    "platform": account.platform,
                    "username": account.username,
                    "owner": account.user.name if account.user else "Unknown",
                    "status": "Connected" if account.access_token else "Disconnected",
                }
                for account in accounts
            ],
        }

    raise HTTPException(status_code=404, detail="Admin resource not found")