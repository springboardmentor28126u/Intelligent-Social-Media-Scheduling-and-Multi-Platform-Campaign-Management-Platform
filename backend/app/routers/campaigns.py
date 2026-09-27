from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.postgres import SessionLocal
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignUpdate
from app.schemas.campaign_post import CampaignPostCreate, CampaignPostResponse
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.services.campaign_service import (
    CampaignDateError,
    CampaignNotFoundError,
    build_campaign_analytics,
    build_campaign_comparison,
    build_campaign_report,
    build_campaign_tracking,
    create_campaign as create_campaign_service,
    delete_campaign as delete_campaign_service,
    get_campaign as get_campaign_service,
    get_campaigns as get_campaigns_service,
    update_campaign as update_campaign_service,
)


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
)


def _serialize_campaign(campaign):
    tracking = build_campaign_tracking(campaign)
    for key, value in tracking.items():
        setattr(campaign, key, value)
    return CampaignResponse.model_validate(campaign)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post(
    "",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_campaign(
    campaign_data: CampaignCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        campaign = create_campaign_service(db, current_user_id, campaign_data)
        return _serialize_campaign(campaign)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=list[CampaignResponse])
def list_campaigns(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    objective: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns = get_campaigns_service(
        db,
        current_user_id,
        search=search,
        status=status_filter,
        objective=objective,
        start_date=start_date,
        end_date=end_date,
    )
    return [_serialize_campaign(campaign) for campaign in campaigns]


@router.get("/analytics/overview")
def campaign_analytics_overview(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns = get_campaigns_service(db, current_user_id)
    campaign_ids = [campaign.id for campaign in campaigns]
    posts = (
        db.query(Post)
        .filter(Post.user_id == current_user_id, Post.campaign_id.in_(campaign_ids))
        .all()
        if campaign_ids
        else []
    )
    counts = {status_name: sum(campaign.status == status_name for campaign in campaigns) for status_name in ("Active", "Scheduled", "Completed")}
    analytics = build_campaign_analytics(campaigns, posts)
    return {
        "summary": {
            "total_campaigns": len(campaigns),
            "active_campaigns": counts["Active"],
            "scheduled_campaigns": counts["Scheduled"],
            "completed_campaigns": counts["Completed"],
            "total_posts": len(posts),
            "total_engagement": analytics["total_engagement"],
        },
        "metrics": {
            "reach": analytics["reach"],
            "impressions": analytics["impressions"],
            "likes": analytics["likes"],
            "comments": analytics["comments"],
            "shares": analytics["shares"],
            "clicks": analytics["clicks"],
            "views": analytics["views"],
            "engagement_rate": analytics["engagement_rate"],
        },
        "performance": [
            {
                "campaign_id": campaign.id,
                "name": campaign.name,
                "posts": sum(post.campaign_id == campaign.id for post in posts),
                "published_posts": sum(post.campaign_id == campaign.id and post.status == "published" for post in posts),
            }
            for campaign in campaigns
        ],
    }


def _get_owned_campaign(db: Session, campaign_id: int, user_id: int):
    try:
        return get_campaign_service(db, campaign_id, user_id)
    except CampaignNotFoundError:
        raise HTTPException(status_code=404, detail="Campaign not found")


def _post_response(post: Post):
    return {
        "id": post.id,
        "campaign_id": post.campaign_id,
        "user_id": post.user_id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "media_filename": post.media_filename,
        "social_account_id": post.social_account_id,
        "platform": post.social_account.platform if post.social_account else None,
        "username": post.social_account.username if post.social_account else None,
        "scheduled_at": post.scheduled_at,
        "status": post.status,
    }


@router.get("/{campaign_id}/accounts")
def get_campaign_accounts(
    campaign_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = _get_owned_campaign(db, campaign_id, current_user_id)
    return [
        {
            "id": account.id,
            "platform": account.platform,
            "username": account.username,
            "page_id": account.page_id,
            "channel_id": account.channel_id,
            "connected": bool(account.access_token),
        }
        for account in campaign.social_accounts
    ]


@router.get("/analytics/comparison")
def campaign_comparison_report(
    campaign_ids: list[int] = Query(default_factory=list),
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns = get_campaigns_service(db, current_user_id)
    if campaign_ids:
        campaigns = [campaign for campaign in campaigns if campaign.id in campaign_ids]
    if not campaigns:
        return {"summary": {"total_campaigns": 0, "total_cost": 0, "total_revenue": 0, "average_roi": 0, "best_campaign": {"campaign_id": None, "name": "N/A", "roi": 0}}, "comparison": []}
    return build_campaign_comparison(campaigns)


@router.get("/{campaign_id}/report")
def generate_campaign_report(
    campaign_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = _get_owned_campaign(db, campaign_id, current_user_id)
    return build_campaign_report(campaign)


@router.post("/{campaign_id}/posts", response_model=CampaignPostResponse, status_code=201)
def create_campaign_post(
    campaign_id: int,
    post_data: CampaignPostCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = _get_owned_campaign(db, campaign_id, current_user_id)
    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == post_data.social_account_id,
            SocialAccount.user_id == current_user_id,
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Social account not found")
    if account not in campaign.social_accounts:
        raise HTTPException(status_code=400, detail="Social account is not connected to this campaign")

    scheduled_at = post_data.scheduled_at
    if post_data.status == "scheduled" and scheduled_at is None:
        raise HTTPException(status_code=400, detail="Scheduled posts require a date and time")
    if scheduled_at is not None:
        scheduled_at = scheduled_at.replace(tzinfo=None)
        now = datetime.now()
        if scheduled_at <= now:
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        if campaign.start_date and scheduled_at.date() < campaign.start_date:
            raise HTTPException(status_code=400, detail="Post cannot be scheduled before the campaign starts")
        if campaign.end_date and scheduled_at.date() > campaign.end_date:
            raise HTTPException(status_code=400, detail="Post cannot be scheduled after the campaign ends")

    post = Post(
        user_id=current_user_id,
        campaign_id=campaign.id,
        social_account_id=account.id,
        content=post_data.content,
        media_url=post_data.media_url,
        media_type=post_data.media_type,
        media_filename=post_data.media_filename,
        scheduled_at=scheduled_at,
        status="scheduled" if scheduled_at else post_data.status,
        is_recurring=False,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_response(post)


@router.get("/{campaign_id}/posts", response_model=list[CampaignPostResponse])
def list_campaign_posts(
    campaign_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_campaign(db, campaign_id, current_user_id)
    posts = (
        db.query(Post)
        .filter(Post.campaign_id == campaign_id, Post.user_id == current_user_id)
        .order_by(Post.scheduled_at.asc().nullslast(), Post.id.desc())
        .all()
    )
    return [_post_response(post) for post in posts]


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        campaign = get_campaign_service(db, campaign_id, current_user_id)
        return _serialize_campaign(campaign)
    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    campaign_data: CampaignUpdate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        campaign = update_campaign_service(
            db,
            campaign_id,
            current_user_id,
            campaign_data,
        )
        return _serialize_campaign(campaign)
    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    except CampaignDateError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        delete_campaign_service(db, campaign_id, current_user_id)
    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
