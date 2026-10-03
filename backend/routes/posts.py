from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Post, PostStatus, User
from auth import get_current_user


router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)


def map_post_status(raw: Optional[str]) -> PostStatus:
    if not raw:
        return PostStatus.DRAFT
    cleaned = raw.strip().upper()
    if cleaned in PostStatus.__members__:
        return PostStatus[cleaned]
    return PostStatus.DRAFT


# -----------------------------
# Request model
# -----------------------------

class PostCreate(BaseModel):
    content: str
    platforms: List[str]
    content_type: str = "text"
    media_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: str = "draft"


# -----------------------------
# Create a post
# -----------------------------

@router.post("")
@router.post("/")
def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status_enum = map_post_status(post_data.status)
    new_post = Post(
        user_id=current_user.id,
        content=post_data.content,
        platforms=post_data.platforms,
        content_type=post_data.content_type,
        media_url=post_data.media_url,
        status=status_enum,
        scheduled_at=post_data.scheduled_at or datetime.utcnow(),
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return {
        "message": "Post created successfully",
        "post_id": new_post.id,
        "content": new_post.content,
        "platforms": new_post.platforms,
        "content_type": new_post.content_type,
        "media_url": new_post.media_url,
        "status": new_post.status.value.lower() if hasattr(new_post.status, "value") else str(new_post.status).lower(),
        "scheduled_at": new_post.scheduled_at.isoformat() if new_post.scheduled_at else None,
    }


# -----------------------------
# Get all posts
# -----------------------------

@router.get("")
@router.get("/")
def get_posts(
    db: Session = Depends(get_db)
):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "content": p.content,
            "platforms": p.platforms,
            "content_type": p.content_type,
            "media_url": p.media_url,
            "status": p.status.value.lower() if hasattr(p.status, "value") else str(p.status).lower(),
            "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]


# -----------------------------
# Get one post
# -----------------------------

@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    p = db.query(Post).filter(Post.id == post_id).first()

    if not p:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    return {
        "id": p.id,
        "user_id": p.user_id,
        "content": p.content,
        "platforms": p.platforms,
        "content_type": p.content_type,
        "media_url": p.media_url,
        "status": p.status.value.lower() if hasattr(p.status, "value") else str(p.status).lower(),
        "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }