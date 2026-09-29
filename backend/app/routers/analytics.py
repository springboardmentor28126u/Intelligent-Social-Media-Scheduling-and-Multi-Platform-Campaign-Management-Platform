from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.postgres import SessionLocal
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.services.campaign_service import build_campaign_analytics


router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_analytics_data(
    db: Session,
    user_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    campaign_id: int | None = None,
    platform: str | None = None,
):
    campaign_query = db.query(Campaign).filter(Campaign.user_id == user_id)
    if campaign_id is not None:
        campaign_query = campaign_query.filter(Campaign.id == campaign_id)
    campaigns = campaign_query.order_by(Campaign.created_at.desc()).all()

    if campaign_id is not None and not campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")

    post_query = db.query(Post).filter(
        Post.user_id == user_id,
        func.lower(Post.status) == "published",
    )
    if campaign_id is not None:
        post_query = post_query.filter(Post.campaign_id == campaign_id)
    if start_date is not None:
        post_query = post_query.filter(
            Post.published_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date is not None:
        post_query = post_query.filter(
            Post.published_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        )
    if platform:
        post_query = post_query.join(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            func.lower(SocialAccount.platform) == platform.lower(),
        )

    posts = post_query.order_by(Post.published_at.asc().nullslast()).all()
    return campaigns, posts


def _metrics(campaigns: list[Campaign], posts: list[Post]) -> dict:
    metrics = build_campaign_analytics(campaigns, posts)
    return {
        "reach": metrics["reach"],
        "impressions": metrics["impressions"],
        "engagement": metrics["total_engagement"],
        "engagement_rate": metrics["engagement_rate"],
        "clicks": metrics["clicks"],
        "likes": metrics["likes"],
        "comments": metrics["comments"],
        "shares": metrics["shares"],
        "views": metrics["views"],
    }


def _performance_rows(campaigns: list[Campaign], posts: list[Post]) -> list[dict]:
    rows = []
    for campaign in campaigns:
        campaign_posts = [post for post in posts if post.campaign_id == campaign.id]
        metrics = _metrics([campaign], campaign_posts)
        platforms = sorted({
            post.social_account.platform
            for post in campaign_posts
            if post.social_account and post.social_account.user_id == campaign.user_id
        })
        rows.append({
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "platform": ", ".join(platforms) if platforms else "-",
            "posts": len(campaign_posts),
            **metrics,
            "status": campaign.status,
        })
    return rows


def _filters(
    start_date: date | None,
    end_date: date | None,
    campaign_id: int | None,
    platform: str | None,
):
    return {
        "start_date": start_date,
        "end_date": end_date,
        "campaign_id": campaign_id,
        "platform": platform,
    }


@router.get("/overview")
def get_overview(
    start_date: date | None = None,
    end_date: date | None = None,
    campaign_id: int | None = None,
    platform: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns, posts = _get_analytics_data(
        db, current_user_id, start_date, end_date, campaign_id, platform
    )
    return {
        **_metrics(campaigns, posts),
        "audience_growth": None,
        "metric_source": "estimated from published post and platform data",
        "audience_data_available": False,
        "filters": _filters(start_date, end_date, campaign_id, platform),
    }


@router.get("/engagement")
def get_engagement(
    start_date: date | None = None,
    end_date: date | None = None,
    campaign_id: int | None = None,
    platform: str | None = None,
    metric: str = "reach",
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns, posts = _get_analytics_data(
        db, current_user_id, start_date, end_date, campaign_id, platform
    )
    metrics = _metrics(campaigns, posts)
    metric_names = ("likes", "comments", "shares", "clicks", "views", "reach", "impressions")
    timeline = {}
    for post in posts:
        post_metrics = _metrics([post.campaign] if post.campaign else [], [post])
        timestamp = post.published_at or post.created_at
        label = timestamp.date().isoformat() if timestamp else "Undated"
        point = timeline.setdefault(label, {name: 0 for name in metric_names})
        for name in metric_names:
            point[name] += post_metrics[name]

    return {
        "metrics": metrics,
        "timeline": [
            {"date": label, **values}
            for label, values in sorted(timeline.items())
        ],
        "selected_metric": metric if metric in metric_names else "reach",
        "metric_source": "estimated from published post and platform data",
        "filters": _filters(start_date, end_date, campaign_id, platform),
    }


@router.get("/audience")
def get_audience(
    start_date: date | None = None,
    end_date: date | None = None,
    campaign_id: int | None = None,
    platform: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_analytics_data(db, current_user_id, start_date, end_date, campaign_id, platform)
    return {
        "current_followers": None,
        "new_followers": None,
        "lost_followers": None,
        "net_growth": None,
        "growth_percentage": None,
        "available": False,
        "message": "Follower history is not tracked for connected accounts yet.",
        "filters": _filters(start_date, end_date, campaign_id, platform),
    }


@router.get("/campaigns")
def get_campaign_performance(
    start_date: date | None = None,
    end_date: date | None = None,
    campaign_id: int | None = None,
    platform: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns, posts = _get_analytics_data(
        db, current_user_id, start_date, end_date, campaign_id, platform
    )
    return {
        "campaigns": _performance_rows(campaigns, posts),
        "metric_source": "estimated from published post and platform data",
        "filters": _filters(start_date, end_date, campaign_id, platform),
    }


@router.get("/campaigns/{campaign_id}")
def get_campaign_performance_detail(
    campaign_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    platform: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns, posts = _get_analytics_data(
        db, current_user_id, start_date, end_date, campaign_id, platform
    )
    return _performance_rows(campaigns, posts)[0]


@router.get("/comparison")
def get_campaign_comparison(
    campaign_ids: list[int] = Query(default=[]),
    start_date: date | None = None,
    end_date: date | None = None,
    platform: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign_query = db.query(Campaign).filter(Campaign.user_id == current_user_id)
    if campaign_ids:
        campaign_query = campaign_query.filter(Campaign.id.in_(campaign_ids))
    campaigns = campaign_query.order_by(Campaign.created_at.desc()).all()
    if campaign_ids and len(campaigns) != len(set(campaign_ids)):
        raise HTTPException(status_code=404, detail="One or more campaigns not found")

    posts_query = db.query(Post).filter(
        Post.user_id == current_user_id,
        func.lower(Post.status) == "published",
    )
    if campaign_ids:
        posts_query = posts_query.filter(Post.campaign_id.in_(campaign_ids))
    if start_date:
        posts_query = posts_query.filter(
            Post.published_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        posts_query = posts_query.filter(
            Post.published_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        )
    if platform:
        posts_query = posts_query.join(SocialAccount).filter(
            SocialAccount.user_id == current_user_id,
            func.lower(SocialAccount.platform) == platform.lower(),
        )
    posts = posts_query.all()
    rows = _performance_rows(campaigns, posts)
    for row in rows:
        row["audience_growth"] = None

    return {
        "campaigns": rows,
        "comparison_metrics": ["reach", "engagement", "clicks", "impressions", "audience_growth"],
        "audience_data_available": False,
    }


@router.get("/roi")
def get_roi_report(
    campaign_id: int | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign_query = db.query(Campaign).filter(Campaign.user_id == current_user_id)
    if campaign_id is not None:
        campaign_query = campaign_query.filter(Campaign.id == campaign_id)
    campaigns = campaign_query.order_by(Campaign.created_at.desc()).all()
    if campaign_id is not None and not campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "available": False,
        "message": "Revenue is not tracked, so profit and ROI cannot be calculated.",
        "campaigns": [
            {
                "campaign_id": campaign.id,
                "campaign_name": campaign.name,
                "campaign_cost": float(campaign.budget) if campaign.budget is not None else None,
                "revenue": None,
                "profit": None,
                "roi": None,
            }
            for campaign in campaigns
        ],
    }