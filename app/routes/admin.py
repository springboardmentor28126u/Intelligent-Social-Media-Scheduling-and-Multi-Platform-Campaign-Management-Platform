from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, SystemRole
from app.models.post import Post, PostStatus
from app.models.social_account import SocialAccount
from app.models.publishing_log import (
    PublishingLog,
    PublishingLogStatus,
)
from app.dependencies.admin import get_current_admin


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    current_admin: User = Depends(get_current_admin)
):
    return {
        "message": "Welcome to Admin Dashboard",
        "admin_id": current_admin.id,
        "name": current_admin.name,
        "system_role": current_admin.system_role
    }


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    total_users = db.scalar(
        select(func.count(User.id))
    )

    total_admins = db.scalar(
        select(func.count(User.id)).where(
            User.system_role == SystemRole.ADMIN
        )
    )

    total_normal_users = db.scalar(
        select(func.count(User.id)).where(
            User.system_role == SystemRole.USER
        )
    )

    total_social_accounts = db.scalar(
        select(func.count(SocialAccount.id))
    )

    active_social_accounts = db.scalar(
        select(func.count(SocialAccount.id)).where(
            SocialAccount.is_active.is_(True)
        )
    )

    total_posts = db.scalar(
        select(func.count(Post.id))
    )

    draft_posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.status == PostStatus.DRAFT
        )
    )

    scheduled_posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.status == PostStatus.SCHEDULED
        )
    )

    publishing_posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.status == PostStatus.PUBLISHING
        )
    )

    published_posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.status == PostStatus.PUBLISHED
        )
    )

    failed_posts = db.scalar(
        select(func.count(Post.id)).where(
            Post.status == PostStatus.FAILED
        )
    )

    total_publishing_logs = db.scalar(
        select(func.count(PublishingLog.id))
    )

    successful_publishing_logs = db.scalar(
        select(func.count(PublishingLog.id)).where(
            PublishingLog.status == PublishingLogStatus.SUCCESS
        )
    )

    failed_publishing_logs = db.scalar(
        select(func.count(PublishingLog.id)).where(
            PublishingLog.status == PublishingLogStatus.FAILED
        )
    )

    return {
        "users": {
            "total": total_users,
            "admins": total_admins,
            "normal_users": total_normal_users,
        },
        "social_accounts": {
            "total": total_social_accounts,
            "active": active_social_accounts,
        },
        "posts": {
            "total": total_posts,
            "draft": draft_posts,
            "scheduled": scheduled_posts,
            "publishing": publishing_posts,
            "published": published_posts,
            "failed": failed_posts,
        },
        "publishing_logs": {
            "total": total_publishing_logs,
            "successful": successful_publishing_logs,
            "failed": failed_publishing_logs,
        },
    }
@router.get("/users")
def admin_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    users = db.scalars(
        select(User)
        .order_by(User.id)
    ).all()

    result = []

    for user in users:
        social_account_count = db.scalar(
            select(func.count(SocialAccount.id)).where(
                SocialAccount.user_id == user.id
            )
        )

        post_count = db.scalar(
            select(func.count(Post.id)).where(
                Post.user_id == user.id
            )
        )

        result.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "system_role": user.system_role,
                "social_accounts": social_account_count,
                "posts": post_count,
                "created_at": user.created_at,
            }
        )

    return result