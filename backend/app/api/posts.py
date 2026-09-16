"""
Posts API routes — now backed by Postgres (via posts_pg.py) instead of MongoDB.
Validation preserved from the old Mongo version:
  - Draft: scheduled_at forced to None.
  - Scheduled: needs scheduled_at in the future AND at least one platform, else 400.
  - Ownership: get/update/delete only work on the current user's own posts (404 otherwise).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database_pg import get_db
from app.db import posts_pg
from app.models.schemas import PostCreate, PostUpdate, PostPublic, PostStatus, UserPublic

router = APIRouter(prefix="/posts", tags=["posts"])


def _validate_post_data(post_data: PostCreate) -> None:
    if post_data.status == PostStatus.DRAFT:
        post_data.scheduled_at = None
    elif post_data.status == PostStatus.SCHEDULED:
        if post_data.scheduled_at is None:
            raise HTTPException(400, "Scheduled posts must include a scheduled_at datetime.")
        scheduled_at = post_data.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(400, "scheduled_at must be in the future.")
        if not post_data.platforms:
            raise HTTPException(400, "Scheduled posts require at least one platform.")


@router.post("", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_post_data(post_data)
    return await posts_pg.create_post(db, current_user.id, post_data)


@router.get("", response_model=list[PostPublic])
async def list_posts(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await posts_pg.get_posts_by_user(db, current_user.id)

@router.get("/calendar", response_model=list[PostPublic])
async def get_calendar_posts(
    start_date: datetime,
    end_date: datetime,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await posts_pg.get_posts_in_range(db, current_user.id, start_date, end_date)

@router.get("/{post_id}", response_model=PostPublic)
async def get_post(
    post_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await posts_pg.get_post_by_id(db, post_id, current_user.id)
    if post is None:
        raise HTTPException(404, "Post not found.")
    return post


@router.patch("/{post_id}", response_model=PostPublic)
async def update_post(
    post_id: str,
    update_data: PostUpdate,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if update_data.status == PostStatus.SCHEDULED:
        existing = await posts_pg.get_post_by_id(db, post_id, current_user.id)
        if existing is None:
            raise HTTPException(404, "Post not found.")
        scheduled_at = update_data.scheduled_at or existing.scheduled_at
        platforms = update_data.platforms if update_data.platforms is not None else existing.platforms
        if scheduled_at is None:
            raise HTTPException(400, "Scheduled posts must include a scheduled_at datetime.")
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(400, "scheduled_at must be in the future.")
        if not platforms:
            raise HTTPException(400, "Scheduled posts require at least one platform.")
    elif update_data.status == PostStatus.DRAFT:
        update_data.scheduled_at = None

    post = await posts_pg.update_post(db, post_id, current_user.id, update_data)
    if post is None:
        raise HTTPException(404, "Post not found.")
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await posts_pg.delete_post(db, post_id, current_user.id)
    if not deleted:
        raise HTTPException(404, "Post not found.")