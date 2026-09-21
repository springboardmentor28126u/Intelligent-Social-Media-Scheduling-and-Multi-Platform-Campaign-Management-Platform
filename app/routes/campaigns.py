from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.campaign import Campaign
from app.models.campaign_performance import CampaignPerformanceHistory
from app.models.user import User


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
)


# =====================================
# Request Schemas
# =====================================

class CampaignCreate(BaseModel):
    name: str
    platform: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None
    budget: float | None = None
    spent: float | None = None
    currency: str | None = None
    objectives: str | None = None
    target_audience: str | None = None
    target_reach: int | None = None
    target_engagement: float | None = None
    target_clicks: int | None = None
    color: str | None = None
    tags: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    platform: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None
    budget: float | None = None
    spent: float | None = None
    currency: str | None = None
    objectives: str | None = None
    target_audience: str | None = None
    target_reach: int | None = None
    target_engagement: float | None = None
    target_clicks: int | None = None
    color: str | None = None
    tags: str | None = None
    status: str | None = None


class CampaignPerformanceUpdate(BaseModel):
    actual_reach: int | None = None
    actual_engagement: float | None = None
    actual_clicks: int | None = None
    spent: float | None = None
    roi: float | None = None

class CampaignPerformanceHistoryCreate(BaseModel):
    reach: int | None = None
    engagement: float | None = None
    clicks: int | None = None
    roi: float | None = None


# =====================================
# Analytics Response
# =====================================

class CampaignAnalyticsResponse(BaseModel):
    campaign_id: int
    campaign_name: str
    platform: str

    target_reach: int | None = None
    actual_reach: int | None = None
    reach_achievement: float | None = None

    target_engagement: float | None = None
    actual_engagement: float | None = None
    engagement_achievement: float | None = None

    target_clicks: int | None = None
    actual_clicks: int | None = None
    click_achievement: float | None = None

    budget: float | None = None
    spent: float | None = None
    budget_used: float | None = None

    roi: float | None = None


# =====================================
# Campaign Report Response
# =====================================

class CampaignReportResponse(BaseModel):
    campaign_id: int
    campaign_name: str
    platform: str
    status: str

    start_date: datetime | None = None
    end_date: datetime | None = None

    budget: float | None = None
    spent: float | None = None
    roi: float | None = None

    target_reach: int | None = None
    actual_reach: int | None = None

    target_engagement: float | None = None
    actual_engagement: float | None = None

    target_clicks: int | None = None
    actual_clicks: int | None = None

    total_posts: int = 0
    published_posts: int = 0
    failed_posts: int = 0


# =====================================
# Audience Performance Response
# =====================================

class AudiencePerformanceResponse(BaseModel):
    campaign_id: int
    campaign_name: str

    target_reach: int | None = None
    actual_reach: int | None = None
    reach_growth: float | None = None

    target_engagement: float | None = None
    actual_engagement: float | None = None
    engagement_growth: float | None = None

    target_clicks: int | None = None
    actual_clicks: int | None = None
    click_growth: float | None = None


# =====================================
# Campaign Comparison Response
# =====================================

class CampaignComparisonItem(BaseModel):
    campaign_id: int
    campaign_name: str
    platform: str

    budget: float | None = None
    spent: float | None = None

    actual_reach: int | None = None
    actual_engagement: float | None = None
    actual_clicks: int | None = None

    roi: float | None = None


# =====================================
# Create Campaign
# =====================================

@router.post("/")
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = Campaign(
        user_id=current_user.id,
        name=data.name,
        platform=data.platform,
        start_date=data.start_date,
        end_date=data.end_date,
        description=data.description,
        budget=data.budget,
        spent=data.spent,
        currency=data.currency,
        objectives=data.objectives,
        target_audience=data.target_audience,
        target_reach=data.target_reach,
        target_engagement=data.target_engagement,
        target_clicks=data.target_clicks,
        color=data.color,
        tags=data.tags,
        status="draft",
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign


# =====================================
# List Campaigns
# =====================================

@router.get("/")
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Campaign)
        .filter(Campaign.user_id == current_user.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )


# =====================================
# Campaign Comparison
# IMPORTANT:
# This route MUST come before /{campaign_id}
# =====================================

@router.get("/comparison", response_model=list[CampaignComparisonItem])
def compare_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.user_id == current_user.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )

    return [
        CampaignComparisonItem(
            campaign_id=campaign.id,
            campaign_name=campaign.name,
            platform=campaign.platform,
            budget=campaign.budget,
            spent=campaign.spent,
            actual_reach=campaign.actual_reach,
            actual_engagement=campaign.actual_engagement,
            actual_clicks=campaign.actual_clicks,
            roi=campaign.roi,
        )
        for campaign in campaigns
    ]


# =====================================
# Get Campaign
# =====================================

@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return campaign


# =====================================
# Update Campaign
# =====================================

@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)

    return campaign


# =====================================
# Delete Campaign
# =====================================

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    db.delete(campaign)
    db.commit()

    return {
        "message": "Campaign deleted successfully"
    }


# =====================================
# Get Campaign Posts
# =====================================

@router.get("/{campaign_id}/posts")
def get_campaign_posts(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return campaign.posts


# =====================================
# Update Campaign Performance
# =====================================

@router.put("/{campaign_id}/performance")
def update_campaign_performance(
    campaign_id: int,
    data: CampaignPerformanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    if data.actual_reach is not None:
        campaign.actual_reach = data.actual_reach

    if data.actual_engagement is not None:
        campaign.actual_engagement = data.actual_engagement

    if data.actual_clicks is not None:
        campaign.actual_clicks = data.actual_clicks

    if data.spent is not None:
        campaign.spent = data.spent

    if data.roi is not None:
        campaign.roi = data.roi

    db.commit()
    db.refresh(campaign)

    return campaign


# =====================================
# Campaign Analytics
# =====================================

@router.get(
    "/{campaign_id}/analytics",
    response_model=CampaignAnalyticsResponse,
)
def get_campaign_analytics(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return CampaignAnalyticsResponse(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        platform=campaign.platform,

        target_reach=campaign.target_reach,
        actual_reach=campaign.actual_reach,
        reach_achievement=(
            (campaign.actual_reach / campaign.target_reach) * 100
            if campaign.actual_reach is not None
            and campaign.target_reach
            else None
        ),

        target_engagement=campaign.target_engagement,
        actual_engagement=campaign.actual_engagement,
        engagement_achievement=(
            (campaign.actual_engagement / campaign.target_engagement) * 100
            if campaign.actual_engagement is not None
            and campaign.target_engagement
            else None
        ),

        target_clicks=campaign.target_clicks,
        actual_clicks=campaign.actual_clicks,
        click_achievement=(
            (campaign.actual_clicks / campaign.target_clicks) * 100
            if campaign.actual_clicks is not None
            and campaign.target_clicks
            else None
        ),

        budget=campaign.budget,
        spent=campaign.spent,
        budget_used=(
            (campaign.spent / campaign.budget) * 100
            if campaign.spent is not None
            and campaign.budget
            else None
        ),

        roi=campaign.roi,
    )


# =====================================
# Campaign Report
# =====================================

@router.get(
    "/{campaign_id}/report",
    response_model=CampaignReportResponse,
)
def get_campaign_report(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    total_posts = len(campaign.posts)

    published_posts = sum(
        1
        for post in campaign.posts
        if post.status == "PUBLISHED"
    )

    failed_posts = sum(
        1
        for post in campaign.posts
        if post.status == "FAILED"
    )

    return CampaignReportResponse(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        platform=campaign.platform,
        status=campaign.status,

        start_date=campaign.start_date,
        end_date=campaign.end_date,

        budget=campaign.budget,
        spent=campaign.spent,
        roi=campaign.roi,

        target_reach=campaign.target_reach,
        actual_reach=campaign.actual_reach,

        target_engagement=campaign.target_engagement,
        actual_engagement=campaign.actual_engagement,

        target_clicks=campaign.target_clicks,
        actual_clicks=campaign.actual_clicks,

        total_posts=total_posts,
        published_posts=published_posts,
        failed_posts=failed_posts,
    )


# =====================================
# Audience Performance
# =====================================

@router.get(
    "/{campaign_id}/audience-performance",
    response_model=AudiencePerformanceResponse,
)
def get_audience_performance(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return AudiencePerformanceResponse(
        campaign_id=campaign.id,
        campaign_name=campaign.name,

        target_reach=campaign.target_reach,
        actual_reach=campaign.actual_reach,
        reach_growth=(
            (
                (campaign.actual_reach - campaign.target_reach)
                / campaign.target_reach
            ) * 100
            if campaign.actual_reach is not None
            and campaign.target_reach
            else None
        ),

        target_engagement=campaign.target_engagement,
        actual_engagement=campaign.actual_engagement,
        engagement_growth=(
            (
                (campaign.actual_engagement - campaign.target_engagement)
                / campaign.target_engagement
            ) * 100
            if campaign.actual_engagement is not None
            and campaign.target_engagement
            else None
        ),

        target_clicks=campaign.target_clicks,
        actual_clicks=campaign.actual_clicks,
        click_growth=(
            (
                (campaign.actual_clicks - campaign.target_clicks)
                / campaign.target_clicks
            ) * 100
            if campaign.actual_clicks is not None
            and campaign.target_clicks
            else None
        ),
    )
# =====================================
# Campaign Performance History
# =====================================

@router.get("/{campaign_id}/performance-history")
def get_campaign_performance_history(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    history = (
        db.query(CampaignPerformanceHistory)
        .filter(
            CampaignPerformanceHistory.campaign_id == campaign_id
        )
        .order_by(
            CampaignPerformanceHistory.recorded_at.asc()
        )
        .all()
    )

    return history
# =====================================
# Create Campaign Performance History
# =====================================

@router.post("/{campaign_id}/performance-history")
def create_campaign_performance_history(
    campaign_id: int,
    data: CampaignPerformanceHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id,
        )
        .first()
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    history = CampaignPerformanceHistory(
        campaign_id=campaign.id,
        reach=data.reach,
        engagement=data.engagement,
        clicks=data.clicks,
        roi=data.roi,
    )

    db.add(history)
    db.commit()
    db.refresh(history)

    return history