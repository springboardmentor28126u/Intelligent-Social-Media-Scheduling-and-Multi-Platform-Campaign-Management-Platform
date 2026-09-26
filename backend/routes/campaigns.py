from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user

from models import (
    Campaign,
    CampaignPerformanceHistory,
    Post,
    User,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class CampaignCreate(BaseModel):
    name: str
    platform: str

    description: str | None = None

    start_date: datetime | None = None
    end_date: datetime | None = None

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

    description: str | None = None

    start_date: datetime | None = None
    end_date: datetime | None = None

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


class PerformanceHistoryCreate(BaseModel):
    reach: int | None = None
    engagement: float | None = None
    clicks: int | None = None
    roi: float | None = None


# ============================================================
# HELPER
# ============================================================

def get_user_campaign(
    campaign_id: int,
    db: Session,
    current_user: User,
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


def get_status_value(post):
    value = getattr(
        post.status,
        "value",
        post.status,
    )

    return str(value).upper()


# ============================================================
# CREATE CAMPAIGN
# ============================================================

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
        description=data.description,

        start_date=data.start_date,
        end_date=data.end_date,

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


# ============================================================
# GET ALL CAMPAIGNS
# ============================================================

@router.get("/")
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.user_id == current_user.id,
        )
        .order_by(
            Campaign.created_at.desc(),
        )
        .all()
    )

    return campaigns


# ============================================================
# CAMPAIGN COMPARISON
# ============================================================

@router.get("/comparison")
def campaign_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.user_id == current_user.id,
        )
        .order_by(
            Campaign.created_at.desc(),
        )
        .all()
    )

    return [
        {
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "platform": campaign.platform,
            "status": campaign.status,

            "budget": campaign.budget,
            "spent": campaign.spent,

            "actual_reach": campaign.actual_reach,
            "actual_engagement": campaign.actual_engagement,
            "actual_clicks": campaign.actual_clicks,

            "roi": campaign.roi,
        }
        for campaign in campaigns
    ]


# ============================================================
# ANALYTICS SUMMARY
# ============================================================

@router.get("/analytics/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.user_id == current_user.id,
        )
        .all()
    )

    def normalize_status(status):
        if status is None:
            return ""

        value = getattr(
            status,
            "value",
            status,
        )

        return str(value).strip().lower()

    active_campaigns = sum(
        1
        for campaign in campaigns
        if normalize_status(campaign.status) == "active"
    )

    completed_campaigns = sum(
        1
        for campaign in campaigns
        if normalize_status(campaign.status) == "completed"
    )

    draft_campaigns = sum(
        1
        for campaign in campaigns
        if normalize_status(campaign.status) == "draft"
    )

    roi_values = [
        campaign.roi
        for campaign in campaigns
        if campaign.roi is not None
    ]

    return {
        "total_campaigns": len(campaigns),

        "active_campaigns": active_campaigns,
        "completed_campaigns": completed_campaigns,
        "draft_campaigns": draft_campaigns,

        "total_budget": sum(
            campaign.budget or 0
            for campaign in campaigns
        ),

        "total_spent": sum(
            campaign.spent or 0
            for campaign in campaigns
        ),

        "total_reach": sum(
            campaign.actual_reach or 0
            for campaign in campaigns
        ),

        "total_engagement": sum(
            campaign.actual_engagement or 0
            for campaign in campaigns
        ),

        "total_clicks": sum(
            campaign.actual_clicks or 0
            for campaign in campaigns
        ),

        "average_roi": (
            sum(roi_values) / len(roi_values)
            if roi_values
            else None
        ),
    }


# ============================================================
# GET SINGLE CAMPAIGN
# ============================================================

@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_campaign(
        campaign_id,
        db,
        current_user,
    )


# ============================================================
# UPDATE CAMPAIGN
# ============================================================

@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    update_data = data.model_dump(
        exclude_unset=True,
    )

    for field, value in update_data.items():
        setattr(
            campaign,
            field,
            value,
        )

    db.commit()
    db.refresh(campaign)

    return campaign


# ============================================================
# DELETE CAMPAIGN
# ============================================================

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    db.delete(campaign)
    db.commit()

    return {
        "message": "Campaign deleted successfully",
    }


# ============================================================
# CAMPAIGN POSTS
# ============================================================

@router.get("/{campaign_id}/posts")
def get_campaign_posts(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    posts = (
        db.query(Post)
        .filter(
            Post.campaign_id == campaign.id,
        )
        .order_by(
            Post.created_at.desc(),
        )
        .all()
    )

    return posts


# ============================================================
# UPDATE PERFORMANCE
# ============================================================

@router.put("/{campaign_id}/performance")
def update_campaign_performance(
    campaign_id: int,
    data: CampaignPerformanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
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

    history = CampaignPerformanceHistory(
        campaign_id=campaign.id,

        reach=campaign.actual_reach,
        engagement=campaign.actual_engagement,
        clicks=campaign.actual_clicks,
        roi=campaign.roi,
    )

    db.add(history)

    db.commit()
    db.refresh(campaign)

    return campaign


# ============================================================
# CAMPAIGN ANALYTICS
# ============================================================

@router.get("/{campaign_id}/analytics")
def get_campaign_analytics(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    reach_achievement = None
    engagement_achievement = None
    click_achievement = None
    budget_used = None

    if (
        campaign.target_reach
        and campaign.actual_reach is not None
    ):
        reach_achievement = (
            campaign.actual_reach
            / campaign.target_reach
        ) * 100

    if (
        campaign.target_engagement
        and campaign.actual_engagement is not None
    ):
        engagement_achievement = (
            campaign.actual_engagement
            / campaign.target_engagement
        ) * 100

    if (
        campaign.target_clicks
        and campaign.actual_clicks is not None
    ):
        click_achievement = (
            campaign.actual_clicks
            / campaign.target_clicks
        ) * 100

    if (
        campaign.budget
        and campaign.spent is not None
    ):
        budget_used = (
            campaign.spent
            / campaign.budget
        ) * 100

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "platform": campaign.platform,

        "target_reach": campaign.target_reach,
        "actual_reach": campaign.actual_reach,
        "reach_achievement": reach_achievement,

        "target_engagement":
            campaign.target_engagement,
        "actual_engagement":
            campaign.actual_engagement,
        "engagement_achievement":
            engagement_achievement,

        "target_clicks":
            campaign.target_clicks,
        "actual_clicks":
            campaign.actual_clicks,
        "click_achievement":
            click_achievement,

        "budget":
            campaign.budget,
        "spent":
            campaign.spent,
        "budget_used":
            budget_used,

        "roi":
            campaign.roi,
    }


# ============================================================
# CAMPAIGN REPORT
# ============================================================

@router.get("/{campaign_id}/report")
def get_campaign_report(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    posts = (
        db.query(Post)
        .filter(
            Post.campaign_id == campaign.id,
        )
        .all()
    )

    published_posts = sum(
        1
        for post in posts
        if get_status_value(post) == "PUBLISHED"
    )

    failed_posts = sum(
        1
        for post in posts
        if get_status_value(post) == "FAILED"
    )

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "platform": campaign.platform,
        "status": campaign.status,

        "start_date": campaign.start_date,
        "end_date": campaign.end_date,

        "budget": campaign.budget,
        "spent": campaign.spent,
        "roi": campaign.roi,

        "target_reach": campaign.target_reach,
        "actual_reach": campaign.actual_reach,

        "target_engagement":
            campaign.target_engagement,
        "actual_engagement":
            campaign.actual_engagement,

        "target_clicks":
            campaign.target_clicks,
        "actual_clicks":
            campaign.actual_clicks,

        "total_posts": len(posts),
        "published_posts": published_posts,
        "failed_posts": failed_posts,
    }


# ============================================================
# AUDIENCE PERFORMANCE
# ============================================================

@router.get("/{campaign_id}/audience-performance")
def get_audience_performance(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    reach_growth = None
    engagement_growth = None
    click_growth = None

    if (
        campaign.target_reach
        and campaign.actual_reach is not None
    ):
        reach_growth = (
            (
                campaign.actual_reach
                - campaign.target_reach
            )
            / campaign.target_reach
        ) * 100

    if (
        campaign.target_engagement
        and campaign.actual_engagement is not None
    ):
        engagement_growth = (
            (
                campaign.actual_engagement
                - campaign.target_engagement
            )
            / campaign.target_engagement
        ) * 100

    if (
        campaign.target_clicks
        and campaign.actual_clicks is not None
    ):
        click_growth = (
            (
                campaign.actual_clicks
                - campaign.target_clicks
            )
            / campaign.target_clicks
        ) * 100

    return {
        "campaign_id":
            campaign.id,

        "campaign_name":
            campaign.name,

        "target_audience":
            campaign.target_audience,

        "target_reach":
            campaign.target_reach,

        "actual_reach":
            campaign.actual_reach,

        "reach_growth":
            reach_growth,

        "target_engagement":
            campaign.target_engagement,

        "actual_engagement":
            campaign.actual_engagement,

        "engagement_growth":
            engagement_growth,

        "target_clicks":
            campaign.target_clicks,

        "actual_clicks":
            campaign.actual_clicks,

        "click_growth":
            click_growth,
    }


# ============================================================
# ENGAGEMENT ANALYTICS
# ============================================================

@router.get("/{campaign_id}/engagement-analytics")
def get_engagement_analytics(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    history = (
        db.query(
            CampaignPerformanceHistory
        )
        .filter(
            CampaignPerformanceHistory.campaign_id
            == campaign.id
        )
        .order_by(
            CampaignPerformanceHistory.recorded_at.asc()
        )
        .all()
    )

    values = [
        item.engagement
        for item in history
        if item.engagement is not None
    ]

    first_value = (
        values[0]
        if values
        else None
    )

    latest_value = (
        values[-1]
        if values
        else campaign.actual_engagement
    )

    growth = None

    if (
        first_value not in (None, 0)
        and latest_value is not None
    ):
        growth = (
            (
                latest_value
                - first_value
            )
            / first_value
        ) * 100

    posts = (
        db.query(Post)
        .filter(
            Post.campaign_id == campaign.id
        )
        .all()
    )

    return {
        "campaign_id":
            campaign.id,

        "campaign_name":
            campaign.name,

        "target_engagement":
            campaign.target_engagement,

        "actual_engagement":
            campaign.actual_engagement,

        "first_recorded_engagement":
            first_value,

        "latest_recorded_engagement":
            latest_value,

        "engagement_growth":
            growth,

        "average_engagement": (
            sum(values) / len(values)
            if values
            else None
        ),

        "history_points":
            len(history),

        "total_posts":
            len(posts),

        "published_posts":
            sum(
                1
                for post in posts
                if get_status_value(post) == "PUBLISHED"
            ),

        "failed_posts":
            sum(
                1
                for post in posts
                if get_status_value(post) == "FAILED"
            ),

        "roi":
            campaign.roi,
    }


# ============================================================
# AUDIENCE GROWTH
# ============================================================

@router.get("/{campaign_id}/audience-growth")
def get_audience_growth(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    history = (
        db.query(
            CampaignPerformanceHistory
        )
        .filter(
            CampaignPerformanceHistory.campaign_id
            == campaign.id
        )
        .order_by(
            CampaignPerformanceHistory.recorded_at.asc()
        )
        .all()
    )

    reach_values = [
        item.reach
        for item in history
        if item.reach is not None
    ]

    first_reach = (
        reach_values[0]
        if reach_values
        else None
    )

    latest_reach = (
        reach_values[-1]
        if reach_values
        else campaign.actual_reach
    )

    growth = None

    if (
        first_reach not in (None, 0)
        and latest_reach is not None
    ):
        growth = (
            (
                latest_reach
                - first_reach
            )
            / first_reach
        ) * 100

    return {
        "campaign_id":
            campaign.id,

        "campaign_name":
            campaign.name,

        "target_reach":
            campaign.target_reach,

        "current_reach":
            campaign.actual_reach,

        "first_recorded_reach":
            first_reach,

        "latest_recorded_reach":
            latest_reach,

        "reach_growth":
            growth,

        "first_recorded_at": (
            history[0].recorded_at
            if history
            else None
        ),

        "latest_recorded_at": (
            history[-1].recorded_at
            if history
            else None
        ),
    }


# ============================================================
# PERFORMANCE HISTORY
# ============================================================

@router.get("/{campaign_id}/performance-history")
def get_performance_history(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
    )

    return (
        db.query(
            CampaignPerformanceHistory
        )
        .filter(
            CampaignPerformanceHistory.campaign_id
            == campaign.id
        )
        .order_by(
            CampaignPerformanceHistory.recorded_at.asc()
        )
        .all()
    )


# ============================================================
# CREATE PERFORMANCE HISTORY
# ============================================================

@router.post("/{campaign_id}/performance-history")
def create_performance_history(
    campaign_id: int,
    data: PerformanceHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_user_campaign(
        campaign_id,
        db,
        current_user,
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