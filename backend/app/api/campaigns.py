"""
Campaigns API routes. Ownership enforced everywhere:
other users' campaigns return 404, never 403.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database_pg import get_db
from app.db import campaigns_pg
from app.models.schemas import (
    CampaignCreate, CampaignUpdate, CampaignPublic, PostPublic, UserPublic,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _aware(dt: datetime) -> datetime:
    # Treat naive datetimes as UTC so comparisons never crash
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.post("", response_model=CampaignPublic, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await campaigns_pg.create_campaign(db, current_user.id, data)


@router.get("", response_model=list[CampaignPublic])
async def list_campaigns(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await campaigns_pg.get_campaigns_by_user(db, current_user.id)


@router.get("/{campaign_id}", response_model=CampaignPublic)
async def get_campaign(
    campaign_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await campaigns_pg.get_campaign_by_id(db, campaign_id, current_user.id)
    if campaign is None:
        raise HTTPException(404, "Campaign not found.")
    return campaign


@router.get("/{campaign_id}/posts", response_model=list[PostPublic])
async def get_campaign_posts(
    campaign_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Confirm the campaign is yours first, then list its posts
    campaign = await campaigns_pg.get_campaign_by_id(db, campaign_id, current_user.id)
    if campaign is None:
        raise HTTPException(404, "Campaign not found.")
    return await campaigns_pg.get_posts_for_campaign(db, campaign_id, current_user.id)


@router.patch("/{campaign_id}", response_model=CampaignPublic)
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await campaigns_pg.get_campaign_by_id(db, campaign_id, current_user.id)
    if existing is None:
        raise HTTPException(404, "Campaign not found.")

    # Date sanity check using new value if sent, else the stored one
    start = _aware(data.start_date or existing.start_date)
    end = _aware(data.end_date or existing.end_date)
    if end < start:
        raise HTTPException(400, "end_date must be on or after start_date.")

    return await campaigns_pg.update_campaign(db, campaign_id, current_user.id, data)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await campaigns_pg.delete_campaign(db, campaign_id, current_user.id)
    if not deleted:
        raise HTTPException(404, "Campaign not found.")