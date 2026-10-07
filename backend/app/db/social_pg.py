# app/db/social_pg.py
#
# ONE job: database reads/writes for the social_connections table.

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_pg import SocialConnection


async def upsert_connection(
    db: AsyncSession,
    user_id: str,
    platform: str,
    platform_user_id: str,
    display_name: str | None,
    access_token: str,
    expires_at: datetime | None,
) -> SocialConnection:
    """Creates the connection, or updates it if this user already has one for the platform."""
    result = await db.execute(
        select(SocialConnection).where(
            SocialConnection.user_id == user_id,
            SocialConnection.platform == platform,
        )
    )
    conn = result.scalar_one_or_none()

    if conn is None:
        conn = SocialConnection(user_id=user_id, platform=platform)
        db.add(conn)

    conn.platform_user_id = platform_user_id
    conn.display_name = display_name
    conn.access_token = access_token
    conn.expires_at = expires_at

    await db.commit()
    await db.refresh(conn)
    return conn


async def get_connections_by_user(db: AsyncSession, user_id: str) -> list[SocialConnection]:
    result = await db.execute(
        select(SocialConnection).where(SocialConnection.user_id == user_id)
    )
    return list(result.scalars().all())

async def get_connection(
    db: AsyncSession, user_id: str, platform: str
) -> SocialConnection | None:
    """Returns this user's connection for one platform, or None if not connected."""
    result = await db.execute(
        select(SocialConnection).where(
            SocialConnection.user_id == user_id,
            SocialConnection.platform == platform,
        )
    )
    return result.scalar_one_or_none()