"""
Postgres CRUD operations for Posts and Publishing Logs.
Mirrors the old app/db/posts.py (MongoDB) but uses SQLAlchemy async ORM instead.
Every function takes user_id explicitly and filters by it, preserving the same
per-user data isolation that the Mongo version had.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_pg import Post
from app.models.schemas import PostCreate, PostUpdate


async def create_post(db: AsyncSession, user_id: str, post_data: PostCreate) -> Post:
    """
    Insert a new post row. Assumes validation (draft vs scheduled rules)
    has already happened in the API layer before this is called.
    """
    new_post = Post(
        user_id=user_id,
        post_type=post_data.post_type,
        platforms=[p.value for p in post_data.platforms],  # enum -> plain strings for ARRAY column
        content=post_data.content,
        scheduled_at=post_data.scheduled_at,
        status=post_data.status.value,
        campaign_id=post_data.campaign_id,
        is_recurring=post_data.is_recurring,
        recurrence_rule=post_data.recurrence_rule,
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)  # pulls back DB-generated defaults (id, created_at, etc.)
    return new_post


async def get_posts_by_user(db: AsyncSession, user_id: str) -> list[Post]:
    """Return all posts belonging to this user, newest first."""
    result = await db.execute(
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    return list(result.scalars().all())


async def get_post_by_id(db: AsyncSession, post_id: str, user_id: str) -> Post | None:
    """
    Fetch a single post, but ONLY if it belongs to this user.
    Returns None if it doesn't exist OR belongs to someone else —
    the API layer turns that None into a 404 either way, so a user
    can never tell the difference between "not found" and "not yours".
    """
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_post(
    db: AsyncSession, post_id: str, user_id: str, update_data: PostUpdate
) -> Post | None:
    """
    Partial update — only fields the client actually sent get changed.
    Returns None if the post doesn't exist or isn't owned by this user.
    """
    post = await get_post_by_id(db, post_id, user_id)
    if post is None:
        return None

    changes = update_data.model_dump(exclude_unset=True)  # only fields explicitly provided
    for field, value in changes.items():
        if field == "platforms" and value is not None:
            value = [p.value if hasattr(p, "value") else p for p in value]
        elif field == "status" and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(post, field, value)

    post.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(post)
    return post


async def delete_post(db: AsyncSession, post_id: str, user_id: str) -> bool:
    """
    Delete a post if (and only if) it belongs to this user.
    Returns True if something was deleted, False if not found/not owned
    — API layer turns False into a 404.
    """
    post = await get_post_by_id(db, post_id, user_id)
    if post is None:
        return False
    await db.delete(post)
    await db.commit()
    return True

async def get_posts_in_range(
    db: AsyncSession, user_id: str, start: datetime, end: datetime
) -> list[Post]:
    """
    Posts for this user scheduled between start and end (inclusive).
    Uses the ix_posts_user_scheduled composite index for efficiency.
    """
    result = await db.execute(
        select(Post)
        .where(
            Post.user_id == user_id,
            Post.scheduled_at >= start,
            Post.scheduled_at <= end,
        )
        .order_by(Post.scheduled_at.asc())
    )
    return list(result.scalars().all())