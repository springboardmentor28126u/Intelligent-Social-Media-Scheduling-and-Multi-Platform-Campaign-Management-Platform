from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models.post import Post
from app.db.models.social_account import SocialAccount
from app.db.models.analytics import AnalyticsMetric, AudienceMetric
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    MetricDataPoint,
    PlatformDistribution,
    DemographicItem
)
from app.core.security import get_current_user, require_permission


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    time_range: str = Query("30d", alias="range", description="7d, 30d, 90d, 1y"),
    platform: str = Query("all", description="all, facebook, instagram, linkedin, twitter, youtube, pinterest"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]
    role = current_user.get("role", "content_creator")

    days = 30
    if time_range == "7d":
        days = 7
    elif time_range == "90d":
        days = 90
    elif time_range == "1y":
        days = 365

    # 1. Query real posts from DB
    posts_query = db.query(Post)
    if role == "content_creator":
        posts_query = posts_query.filter(Post.user_id == user_id)
    if platform != "all":
        posts_query = posts_query.filter(Post.platform == platform.lower())

    total_posts = posts_query.count()
    scheduled_posts = posts_query.filter(Post.status.in_(["scheduled", "queued"])).count()
    published_posts = posts_query.filter(Post.status == "published").all()

    # Aggregate actual engagement from published posts
    total_likes = sum(p.likes_count or 0 for p in published_posts)
    total_comments = sum(p.comments_count or 0 for p in published_posts)
    total_shares = sum(p.shares_count or 0 for p in published_posts)
    total_clicks = sum(p.clicks_count or 0 for p in published_posts)
    total_reach = sum(p.reach_count or 0 for p in published_posts)
    total_impressions = sum(p.impressions_count or 0 for p in published_posts)
    total_engagement = total_likes + total_comments + total_shares

    # Followers from user connected accounts
    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    if platform != "all":
        accounts_q = accounts_q.filter(SocialAccount.platform == platform.lower())
    
    accounts = accounts_q.all()
    total_followers = sum(a.followers_count or 0 for a in accounts)

    avg_engagement_rate = round(
        (total_engagement / total_impressions * 100) if total_impressions > 0 else 0.0,
        2
    )

    # 2. Build real timeline series from published posts
    timeline_points: List[MetricDataPoint] = []
    base_date = date.today() - timedelta(days=days)
    step = max(1, days // 14)

    for i in range(0, days, step):
        d_start = base_date + timedelta(days=i)
        d_end = base_date + timedelta(days=min(days, i + step))
        date_label = d_start.strftime("%b %d")

        # Filter posts published in this window
        bucket_posts = [
            p for p in published_posts
            if p.published_at and d_start <= p.published_at.date() <= d_end
        ]

        b_likes = sum(p.likes_count or 0 for p in bucket_posts)
        b_comments = sum(p.comments_count or 0 for p in bucket_posts)
        b_shares = sum(p.shares_count or 0 for p in bucket_posts)
        b_clicks = sum(p.clicks_count or 0 for p in bucket_posts)
        b_reach = sum(p.reach_count or 0 for p in bucket_posts)
        b_impressions = sum(p.impressions_count or 0 for p in bucket_posts)
        b_engagement = b_likes + b_comments + b_shares

        timeline_points.append(MetricDataPoint(
            date=date_label,
            reach=b_reach,
            impressions=b_impressions,
            engagement=b_engagement,
            clicks=b_clicks,
            likes=b_likes,
            comments=b_comments,
            shares=b_shares,
            followers=total_followers
        ))

    # 3. Real Platform Distribution from published posts
    platforms_map = {}
    for p in published_posts:
        plat = (p.platform or "other").title()
        if plat not in platforms_map:
            platforms_map[plat] = {"count": 0, "engagement": 0, "reach": 0}
        platforms_map[plat]["count"] += 1
        platforms_map[plat]["reach"] += p.reach_count or 0
        platforms_map[plat]["engagement"] += (p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0)

    total_pub = len(published_posts)
    platform_data: List[PlatformDistribution] = []
    for plat, p_data in platforms_map.items():
        pct = round((p_data["count"] / total_pub * 100) if total_pub > 0 else 0.0, 1)
        platform_data.append(PlatformDistribution(
            platform=plat,
            count=p_data["count"],
            reach=p_data["reach"],
            engagement=p_data["engagement"],
            percentage=pct
        ))

    # Real Demographics (empty when no third-party audience demographic API is authorized)
    demographics_age: List[DemographicItem] = []
    demographics_gender: List[DemographicItem] = []
    demographics_location: List[DemographicItem] = []

    return AnalyticsOverviewResponse(
        total_posts=total_posts,
        scheduled_posts=scheduled_posts,
        total_reach=total_reach,
        total_impressions=total_impressions,
        total_engagement=total_engagement,
        average_engagement_rate=avg_engagement_rate,
        total_clicks=total_clicks,
        total_followers=total_followers,
        reach_growth_pct=0.0,
        engagement_growth_pct=0.0,
        followers_growth_pct=0.0,
        timeline=timeline_points,
        platforms=platform_data,
        demographics_age=demographics_age,
        demographics_gender=demographics_gender,
        demographics_location=demographics_location
    )
