from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Post


router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)


# -----------------------------
# Request model
# -----------------------------

class PostCreate(BaseModel):
    content: str
    platforms: List[str]
    content_type: str = "text"
    scheduled_at: Optional[datetime] = None
    status: str = "draft"


# -----------------------------
# Create a post
# -----------------------------

@router.post("/")
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db)
):
    new_post = Post(
        content=post_data.content,
        platforms=post_data.platforms,
        content_type=post_data.content_type,
        status=post_data.status,
        scheduled_at=post_data.scheduled_at,
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
        "status": new_post.status,
        "scheduled_at": new_post.scheduled_at,
    }


# -----------------------------
# Get all posts
# -----------------------------

@router.get("/")
def get_posts(
    db: Session = Depends(get_db)
):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()

    return posts


# -----------------------------
# Get one post
# -----------------------------

@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    return post