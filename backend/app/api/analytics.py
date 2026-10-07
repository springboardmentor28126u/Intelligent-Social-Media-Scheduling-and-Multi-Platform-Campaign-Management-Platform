"""
Analytics API routes. All read-only, all filtered by current_user.id.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database_pg import get_db
from app.db import analytics_pg, campaigns_pg
from app.db.models_pg import PostEngagement
from app.models.schemas import UserPublic
from app.services.audience_mock import generate_audience

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/content")
async def content_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_pg.content_analytics(db, current_user.id, days)


@router.get("/audience")
async def audience_analytics(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Use platforms the user has actually published to; fall back to a default set
    res = await db.execute(
        select(distinct(PostEngagement.platform)).where(PostEngagement.user_id == current_user.id)
    )
    platforms = sorted(r[0] for r in res.all()) or ["instagram", "facebook", "linkedin"]
    return generate_audience(current_user.id, platforms)


# NOTE: "/campaigns" must stay ABOVE "/campaigns/{campaign_id}"
@router.get("/campaigns")
async def campaigns_summary(
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaigns = await campaigns_pg.get_campaigns_by_user(db, current_user.id)
    return await analytics_pg.all_campaigns_summary(db, current_user.id, campaigns)


@router.get("/campaigns/{campaign_id}")
async def campaign_analytics(
    campaign_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await campaigns_pg.get_campaign_by_id(db, campaign_id, current_user.id)
    if campaign is None:
        raise HTTPException(404, "Campaign not found.")
    return await analytics_pg.campaign_analytics(db, campaign)