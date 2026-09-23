from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, String, desc, or_

from app.db.database import get_db
from app.db.models.post import Post, PostPlatformTarget
from app.db.models.social_account import SocialAccount
from app.db.models.analytics import AnalyticsMetric, AudienceMetric
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    MetricDataPoint,
    PlatformDistribution,
    DemographicItem
)
from app.services.providers import get_social_provider
from app.core.security import get_current_user, require_permission


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


def _calc_growth_pct(current_val: int, prev_val: int) -> Optional[float]:
    """Calculate real percentage growth between current period and previous equal-length period."""
    if prev_val > 0:
        return round(((current_val - prev_val) / prev_val) * 100, 1)
    elif current_val > 0 and prev_val == 0:
        return 100.0
    elif current_val == 0 and prev_val == 0:
        return 0.0
    return None


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    time_range: str = Query("30d", alias="range", description="7d, 30d, 90d, 1y"),
    platform: str = Query("all", description="all, facebook, instagram, linkedin, twitter, youtube, pinterest"),
    campaign_id: Optional[int] = Query(None, description="Optional campaign ID to filter analytics"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.db.models.campaign import CampaignPost
    user_id = current_user["user_id"]
    role = current_user.get("role", "content_creator")

    days = 30
    if time_range == "7d":
        days = 7
    elif time_range == "90d":
        days = 90
    elif time_range == "1y":
        days = 365

    today = date.today()
    cur_start_date = today - timedelta(days=days)
    prev_start_date = today - timedelta(days=days * 2)

    # 1. Query real posts from DB for current user
    posts_query = db.query(Post)
    if role == "content_creator":
        posts_query = posts_query.filter(Post.user_id == user_id)

    if campaign_id:
        camp_post_ids = [cp.post_id for cp in db.query(CampaignPost).filter(CampaignPost.campaign_id == campaign_id).all()]
        if camp_post_ids:
            posts_query = posts_query.filter(or_(Post.campaign_id == campaign_id, Post.id.in_(camp_post_ids)))
        else:
            posts_query = posts_query.filter(Post.campaign_id == campaign_id)

    total_posts = posts_query.count()
    status_str = func.lower(func.cast(Post.status, String))
    scheduled_posts = posts_query.filter(status_str.in_(["scheduled", "queued"])).count()
    all_published = posts_query.filter(status_str == "published").all()

    if platform != "all":
        all_published = [p for p in all_published if p.platform and p.platform.lower() == platform.lower()]

    # Current period published posts
    def _post_date(p: Post) -> Optional[date]:
        if not p.published_at:
            return None
        return p.published_at.date() if isinstance(p.published_at, datetime) else p.published_at

    current_period_posts = [p for p in all_published if _post_date(p) and _post_date(p) >= cur_start_date]
    prev_period_posts = [p for p in all_published if _post_date(p) and prev_start_date <= _post_date(p) < cur_start_date]

    # Aggregate current metrics
    total_likes = sum(p.likes_count or 0 for p in all_published)
    total_comments = sum(p.comments_count or 0 for p in all_published)
    total_shares = sum(p.shares_count or 0 for p in all_published)
    total_clicks = sum(p.clicks_count or 0 for p in all_published)
    total_reach = sum(p.reach_count or 0 for p in all_published)
    total_impressions = sum(p.impressions_count or 0 for p in all_published)
    total_engagement = total_likes + total_comments + total_shares

    # Period comparison for growth
    cur_engagement = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in current_period_posts)
    prev_engagement = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in prev_period_posts)
    engagement_growth_pct = _calc_growth_pct(cur_engagement, prev_engagement)

    cur_reach = sum(p.reach_count or 0 for p in current_period_posts)
    prev_reach = sum(p.reach_count or 0 for p in prev_period_posts)
    reach_growth_pct = _calc_growth_pct(cur_reach, prev_reach)

    cur_posts_cnt = len(current_period_posts)
    prev_posts_cnt = len(prev_period_posts)
    posts_growth_pct = _calc_growth_pct(cur_posts_cnt, prev_posts_cnt)

    cur_clicks = sum(p.clicks_count or 0 for p in current_period_posts)
    prev_clicks = sum(p.clicks_count or 0 for p in prev_period_posts)
    clicks_growth_pct = _calc_growth_pct(cur_clicks, prev_clicks)

    # Followers from connected active accounts
    accounts_q = db.query(SocialAccount).filter(SocialAccount.is_active == True)
    if role == "content_creator":
        accounts_q = accounts_q.filter(SocialAccount.user_id == user_id)
    if platform != "all":
        accounts_q = accounts_q.filter(func.lower(SocialAccount.platform) == platform.lower())
    
    accounts = accounts_q.all()
    
    # Query live follower counts from providers where available
    total_followers_val = 0
    any_followers_avail = False
    for acc in accounts:
        plat_key = (acc.platform or "").lower()
        try:
            prov = get_social_provider(plat_key, is_demo=getattr(acc, "is_demo", False))
            m = prov.get_account_metrics(acc.access_token or "", acc.platform_user_id or acc.account_id or "")
            if m.get("followers_available") and m.get("followers") is not None:
                total_followers_val += m["followers"]
                any_followers_avail = True
        except Exception:
            pass

    total_followers = total_followers_val if any_followers_avail else None

    avg_engagement_rate = round(
        (total_engagement / total_impressions * 100) if total_impressions > 0 else 0.0,
        2
    )

    # 2. Build real timeline series from published posts
    timeline_points: List[MetricDataPoint] = []
    step = 1 if days <= 30 else (3 if days <= 90 else 7)

    for i in range(0, days, step):
        d_start = cur_start_date + timedelta(days=i)
        d_end = cur_start_date + timedelta(days=min(days - 1, i + step - 1))
        date_label = d_start.strftime("%b %d")

        # Filter posts published in this date window
        bucket_posts = [
            p for p in all_published
            if _post_date(p) and d_start <= _post_date(p) <= d_end
        ]

        b_likes = sum(p.likes_count or 0 for p in bucket_posts)
        b_comments = sum(p.comments_count or 0 for p in bucket_posts)
        b_shares = sum(p.shares_count or 0 for p in bucket_posts)
        b_clicks = sum(p.clicks_count or 0 for p in bucket_posts)
        b_reach = sum(p.reach_count or 0 for p in bucket_posts)
        b_impressions = sum(p.impressions_count or 0 for p in bucket_posts)
        b_engagement = b_likes + b_comments + b_shares

        # Platform specific real engagement
        ig_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() == "instagram")
        li_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() == "linkedin")
        fb_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() == "facebook")
        x_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() in ["twitter", "x"])
        pin_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() == "pinterest")
        yt_eng = sum((p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0) for p in bucket_posts if p.platform and p.platform.lower() == "youtube")

        timeline_points.append(MetricDataPoint(
            date=date_label,
            reach=b_reach,
            impressions=b_impressions,
            engagement=b_engagement,
            clicks=b_clicks,
            likes=b_likes,
            comments=b_comments,
            shares=b_shares,
            followers=total_followers,
            instagram_engagement=ig_eng,
            linkedin_engagement=li_eng,
            facebook_engagement=fb_eng,
            x_engagement=x_eng,
            twitter_engagement=x_eng,
            pinterest_engagement=pin_eng,
            youtube_engagement=yt_eng
        ))

    # 3. Real Platform Distribution from published posts
    platforms_map: Dict[str, Dict[str, int]] = {}
    for p in all_published:
        plat = (p.platform or "other").title()
        if plat not in platforms_map:
            platforms_map[plat] = {"count": 0, "engagement": 0, "reach": 0}
        platforms_map[plat]["count"] += 1
        platforms_map[plat]["reach"] += p.reach_count or 0
        platforms_map[plat]["engagement"] += (p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0)

    total_pub = len(all_published)
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
        reach_growth_pct=reach_growth_pct,
        engagement_growth_pct=engagement_growth_pct,
        followers_growth_pct=None,
        posts_growth_pct=posts_growth_pct,
        clicks_growth_pct=clicks_growth_pct,
        timeline=timeline_points,
        platforms=platform_data,
        demographics_age=demographics_age,
        demographics_gender=demographics_gender,
        demographics_location=demographics_location
    )
