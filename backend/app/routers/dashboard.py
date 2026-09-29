from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.postgres import SessionLocal
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.models.user import User
from app.core.security import get_current_user


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("/stats")
def get_dashboard_stats(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    total_accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user_id
    ).count()

    campaigns = db.query(Campaign).filter(
        Campaign.user_id == current_user_id
    )

    current_user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    total_posts = db.query(Post).filter(
        Post.user_id == current_user_id
    ).count()

    draft_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        func.lower(Post.status) == "draft"
    ).count()

    scheduled_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        func.lower(Post.status) == "scheduled"
    ).count()

    published_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        func.lower(Post.status) == "published"
    ).count()

    return {
        "user_name": current_user.name if current_user else "",
        "connected_accounts": total_accounts,
        "total_campaigns": campaigns.count(),
        "active_campaigns": campaigns.filter(
            func.lower(Campaign.status) == "active"
        ).count(),
        "total_posts": total_posts,
        "draft_posts": draft_posts,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts
    }


@router.get("/recent-campaigns")
def get_recent_campaigns(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.user_id == current_user_id)
        .order_by(Campaign.created_at.desc(), Campaign.id.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "created_at": campaign.created_at,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date,
            "posts": sum(post.user_id == current_user_id for post in campaign.posts),
            "platforms": sorted({
                account.platform
                for account in campaign.social_accounts
                if account.user_id == current_user_id
            }),
        }
        for campaign in campaigns
    ]


@router.get("/recent-posts")
def get_recent_posts(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    posts = (
        db.query(Post)
        .filter(Post.user_id == current_user_id)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "id": post.id,
            "content": post.content,
            "status": post.status,
            "created_at": post.created_at,
            "scheduled_at": post.scheduled_at,
            "published_at": post.published_at,
            "platform": (
                post.social_account.platform
                if post.social_account and post.social_account.user_id == current_user_id
                else None
            ),
            "campaign_name": (
                post.campaign.name
                if post.campaign and post.campaign.user_id == current_user_id
                else None
            ),
        }
        for post in posts
    ]