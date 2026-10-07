"""
Postgres CRUD for Campaigns. Same pattern as posts_pg.py:
every function takes user_id and filters by it (per-user isolation).
"""
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_pg import Campaign, Post
from app.models.schemas import CampaignCreate, CampaignUpdate


async def create_campaign(db: AsyncSession, user_id: str, data: CampaignCreate) -> Campaign:
    campaign = Campaign(
        user_id=user_id,
        name=data.name,
        platforms=[p.value for p in data.platforms],  # enum -> plain strings
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
        objectives=data.objectives,
        status=data.status.value,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def get_campaigns_by_user(db: AsyncSession, user_id: str) -> list[Campaign]:
    result = await db.execute(
        select(Campaign)
        .where(Campaign.user_id == user_id)
        .order_by(Campaign.created_at.desc())
    )
    return list(result.scalars().all())


async def get_campaign_by_id(db: AsyncSession, campaign_id: str, user_id: str) -> Campaign | None:
    # Returns None if missing OR owned by someone else (API turns it into 404)
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_campaign(
    db: AsyncSession, campaign_id: str, user_id: str, data: CampaignUpdate
) -> Campaign | None:
    campaign = await get_campaign_by_id(db, campaign_id, user_id)
    if campaign is None:
        return None

    changes = data.model_dump(exclude_unset=True)  # only fields the client sent
    for field, value in changes.items():
        if field == "platforms" and value is not None:
            value = [p.value if hasattr(p, "value") else p for p in value]
        elif field == "status" and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(campaign, field, value)

    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def delete_campaign(db: AsyncSession, campaign_id: str, user_id: str) -> bool:
    campaign = await get_campaign_by_id(db, campaign_id, user_id)
    if campaign is None:
        return False
    # Don't leave posts pointing at a deleted campaign: unlink them first
    await db.execute(
        update(Post)
        .where(Post.campaign_id == campaign_id, Post.user_id == user_id)
        .values(campaign_id=None)
    )
    await db.delete(campaign)
    await db.commit()
    return True


async def get_posts_for_campaign(db: AsyncSession, campaign_id: str, user_id: str) -> list[Post]:
    result = await db.execute(
        select(Post)
        .where(Post.campaign_id == campaign_id, Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    return list(result.scalars().all())