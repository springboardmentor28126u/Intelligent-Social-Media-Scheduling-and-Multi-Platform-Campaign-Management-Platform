from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_ROLES = ["Administrator", "admin"]

DEFAULT_SETTINGS: Dict[str, Any] = {
    "allow_signups": True,
    "require_approval": False,
    "max_upload_size_mb": 200,
    "default_user_role": "Content Creator",
    "maintenance_mode": False,
    "system_announcement": "",
    "allowed_platforms": ["instagram", "facebook", "linkedin", "youtube", "x"],
    "email_notifications": True,
}


def get_all_settings_dict(db: Session) -> Dict[str, Any]:
    settings_records = db.query(models.SystemSetting).all()
    settings_dict = dict(DEFAULT_SETTINGS)
    for record in settings_records:
        settings_dict[record.key] = record.value
    return settings_dict


@router.get("/settings", response_model=schemas.AdminSettingsSchema)
def get_admin_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    settings = get_all_settings_dict(db)
    return schemas.AdminSettingsSchema(**settings)


@router.put("/settings", response_model=schemas.AdminSettingsSchema)
def update_admin_settings(
    new_settings: schemas.AdminSettingsSchema,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    settings_dict = new_settings.dict()
    for key, value in settings_dict.items():
        record = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if record:
            record.value = value
        else:
            record = models.SystemSetting(key=key, value=value, category="general")
            db.add(record)
    db.commit()
    return schemas.AdminSettingsSchema(**settings_dict)


@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    total_users = db.query(models.User).count()
    admin_count = db.query(models.User).filter(models.User.role.in_(ADMIN_ROLES)).count()
    creator_count = total_users - admin_count

    try:
        new_users_this_week = db.query(models.User).filter(models.User.created_at >= seven_days_ago).count()
    except Exception:
        new_users_this_week = 0

    total_posts = db.query(models.Post).count()
    scheduled_posts = db.query(models.Post).filter(models.Post.status == "scheduled").count()
    published_posts = db.query(models.Post).filter(models.Post.status == "published").count()
    active_campaigns = db.query(models.Campaign).filter(models.Campaign.status == models.CampaignStatus.active).count()
    connected_accounts = db.query(models.SocialAccount).filter(models.SocialAccount.status == "connected").count()

    total_media_count = db.query(models.Media).count()
    total_media_bytes = db.query(func.coalesce(func.sum(models.Media.size_bytes), 0)).scalar() or 0

    return schemas.AdminStatsOut(
        total_users=total_users,
        admin_count=admin_count,
        creator_count=creator_count,
        new_users_this_week=new_users_this_week,
        total_posts=total_posts,
        scheduled_posts=scheduled_posts,
        published_posts=published_posts,
        active_campaigns=active_campaigns,
        connected_accounts=connected_accounts,
        total_media_count=total_media_count,
        total_media_bytes=int(total_media_bytes),
    )


@router.get("/analytics", response_model=schemas.AdminAnalyticsOut)
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    stats = get_admin_stats(db, current_user)

    # User growth over the past 7 days
    user_growth = []
    for i in range(6, -1, -1):
        day_date = datetime.utcnow().date() - timedelta(days=i)
        start_dt = datetime.combine(day_date, datetime.min.time())
        end_dt = datetime.combine(day_date, datetime.max.time())
        try:
            count = db.query(models.User).filter(
                models.User.created_at >= start_dt,
                models.User.created_at <= end_dt,
            ).count()
        except Exception:
            count = 0
        user_growth.append({
            "date": day_date.strftime("%b %d"),
            "users": count,
        })

    # Role distribution
    role_dist = {
        "admin": stats.admin_count,
        "creator": stats.creator_count,
    }

    # Post status distribution
    draft_posts = db.query(models.Post).filter(models.Post.status == "draft").count()
    failed_posts = db.query(models.Post).filter(models.Post.status == "failed").count()
    post_status_dist = {
        "published": stats.published_posts,
        "scheduled": stats.scheduled_posts,
        "draft": draft_posts,
        "failed": failed_posts,
    }

    # Platform distribution
    platforms = ["linkedin", "youtube", "instagram", "facebook", "x"]
    platform_dist = {}
    for p in platforms:
        cnt = db.query(models.SocialAccount).filter(
            models.SocialAccount.platform.ilike(f"%{p}%"),
            models.SocialAccount.status == "connected",
        ).count()
        platform_dist[p] = cnt

    return schemas.AdminAnalyticsOut(
        stats=stats,
        user_growth=user_growth,
        role_distribution=role_dist,
        post_status_distribution=post_status_dist,
        platform_distribution=platform_dist,
    )


@router.get("/users", response_model=List[schemas.UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    return db.query(models.User).order_by(models.User.id.asc()).all()


@router.put("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role_data.role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(ADMIN_ROLES)),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted successfully"}
