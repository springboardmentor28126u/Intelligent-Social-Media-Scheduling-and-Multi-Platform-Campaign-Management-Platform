from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.postgres import SessionLocal
from app.models.post import Post
from app.models.social_account import SocialAccount
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

    total_posts = db.query(Post).filter(
        Post.user_id == current_user_id
    ).count()

    draft_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        Post.status == "draft"
    ).count()

    scheduled_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        Post.status == "scheduled"
    ).count()

    published_posts = db.query(Post).filter(
        Post.user_id == current_user_id,
        Post.status == "published"
    ).count()

    return {
        "connected_accounts": total_accounts,
        "total_posts": total_posts,
        "draft_posts": draft_posts,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts
    }