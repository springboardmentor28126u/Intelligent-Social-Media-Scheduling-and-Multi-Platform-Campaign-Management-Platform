from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.post import Post
from app.schemas.post import (
    PostCreate, PostUpdate, PostOut, PostScheduleRequest, CalendarPostItem
)
from app.services.auth_service import get_current_user
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["Posts & Scheduling"])

@router.get("", response_model=List[PostOut])
def list_posts(
    status: Optional[str] = Query(None, description="Filter by status: Draft, Scheduled, Published, Failed, etc."),
    platform: Optional[str] = Query(None, description="Filter by platform name"),
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return PostService.get_posts(
        db=db,
        user_id=current_user.id,
        status=status,
        platform=platform,
        campaign_id=campaign_id,
        limit=limit
    )

@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return PostService.create_post(db=db, user_id=current_user.id, post_in=post_in)

@router.get("/calendar", response_model=List[CalendarPostItem])
def get_calendar_posts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    posts = PostService.get_posts(db=db, user_id=current_user.id, status=status, platform=platform, limit=300)
    
    calendar_items = []
    for p in posts:
        # Include items that have scheduled_at or published_at or created_at
        display_time = p.scheduled_at or p.published_at or p.created_at
        platforms_list = [x.strip() for x in p.platforms.split(",") if x.strip()]
        calendar_items.append(CalendarPostItem(
            id=p.id,
            content=p.content,
            platforms=platforms_list,
            status=p.status,
            scheduled_at=p.scheduled_at,
            published_at=p.published_at,
            media_url=p.media_url
        ))
    return calendar_items

@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = PostService.get_post_by_id(db=db, post_id=post_id, user_id=current_user.id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post

@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    post_update: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = PostService.get_post_by_id(db=db, post_id=post_id, user_id=current_user.id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return PostService.update_post(db=db, post=post, post_in=post_update)

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = PostService.get_post_by_id(db=db, post_id=post_id, user_id=current_user.id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    PostService.delete_post(db=db, post=post)
    return {"success": True, "message": "Post deleted successfully"}

@router.post("/{post_id}/publish", response_model=PostOut)
def publish_post_now(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = PostService.get_post_by_id(db=db, post_id=post_id, user_id=current_user.id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return PostService.publish_now(db=db, post=post)

@router.post("/{post_id}/schedule", response_model=PostOut)
def schedule_post(
    post_id: int,
    schedule_in: PostScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = PostService.get_post_by_id(db=db, post_id=post_id, user_id=current_user.id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.scheduled_at = schedule_in.scheduled_at
    post.status = "Scheduled"
    db.commit()
    db.refresh(post)
    return post
