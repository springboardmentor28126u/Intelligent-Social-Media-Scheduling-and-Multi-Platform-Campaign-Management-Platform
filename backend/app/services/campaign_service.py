from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.social_account import SocialAccount
from app.schemas.campaign import CampaignCreate, CampaignStatus, CampaignUpdate


CAMPAIGN_TRACKING_WORKFLOW = ["Draft", "Scheduled", "Active", "Completed"]
PLATFORM_ENGAGEMENT_WEIGHTS = {
    "facebook": {"reach": 240, "impressions": 540, "likes": 26, "comments": 9, "shares": 6, "clicks": 12, "views": 420},
    "instagram": {"reach": 310, "impressions": 680, "likes": 34, "comments": 12, "shares": 8, "clicks": 14, "views": 540},
    "linkedin": {"reach": 200, "impressions": 440, "likes": 18, "comments": 8, "shares": 7, "clicks": 11, "views": 360},
    "youtube": {"reach": 420, "impressions": 760, "likes": 30, "comments": 10, "shares": 9, "clicks": 16, "views": 640},
    "default": {"reach": 180, "impressions": 360, "likes": 16, "comments": 6, "shares": 4, "clicks": 8, "views": 300},
}


def _get_platform_weights(post) -> dict:
    social_account = getattr(post, "social_account", None)
    platform_name = getattr(social_account, "platform", None) or "default"
    normalized = str(platform_name).lower()
    return PLATFORM_ENGAGEMENT_WEIGHTS.get(normalized, PLATFORM_ENGAGEMENT_WEIGHTS["default"])


def _get_post_performance(post) -> dict:
    weights = _get_platform_weights(post)
    scale = 1 + max(0, len((getattr(post, "content", "") or "").split()) // 12)
    likes = int(weights["likes"] * scale)
    comments = int(weights["comments"] * scale)
    shares = int(weights["shares"] * scale)
    clicks = int(weights["clicks"] * scale)
    reach = int(weights["reach"] * scale)
    impressions = int(weights["impressions"] * scale)
    views = int(weights["views"] * scale)

    return {
        "reach": reach,
        "impressions": impressions,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "clicks": clicks,
        "views": views,
        "engagement": likes + comments + shares + clicks,
    }


def build_campaign_analytics(campaigns: list[Campaign], posts: list) -> dict:
    """Summarize reach, engagement, and performance metrics across the supplied campaigns."""
    metrics = {"reach": 0, "impressions": 0, "likes": 0, "comments": 0, "shares": 0, "clicks": 0, "views": 0}
    total_engagement = 0

    for post in posts:
        if str(getattr(post, "status", "")).lower() != "published":
            continue
        performance = _get_post_performance(post)
        metrics["reach"] += performance["reach"]
        metrics["impressions"] += performance["impressions"]
        metrics["likes"] += performance["likes"]
        metrics["comments"] += performance["comments"]
        metrics["shares"] += performance["shares"]
        metrics["clicks"] += performance["clicks"]
        metrics["views"] += performance["views"]

    total_engagement = metrics["likes"] + metrics["comments"] + metrics["shares"] + metrics["clicks"]
    engagement_rate = round((total_engagement / metrics["reach"]) * 100, 2) if metrics["reach"] else 0

    return {
        **metrics,
        "total_engagement": total_engagement,
        "engagement_rate": engagement_rate,
    }


def build_campaign_tracking(campaign: Campaign) -> dict:
    """Return a lightweight summary for campaign lifecycle tracking."""
    posts = list(getattr(campaign, "posts", []) or [])
    total_posts = len(posts)
    scheduled_posts = sum(
        1 for post in posts if str(getattr(post, "status", "")).lower() == "scheduled"
    )
    published_posts = sum(
        1 for post in posts if str(getattr(post, "status", "")).lower() == "published"
    )
    failed_posts = sum(
        1 for post in posts if str(getattr(post, "status", "")).lower() == "failed"
    )
    current_status = getattr(campaign, "status", "Draft") or "Draft"

    return {
        "total_posts": total_posts,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts,
        "failed_posts": failed_posts,
        "status": current_status,
        "start_date": getattr(campaign, "start_date", None),
        "end_date": getattr(campaign, "end_date", None),
        "workflow": CAMPAIGN_TRACKING_WORKFLOW,
    }


def build_campaign_comparison(campaigns: list[Campaign]) -> dict:
    """Compare multiple campaigns by cost, revenue, reach, engagement, and ROI."""
    comparison_rows = []
    total_cost = 0.0
    total_revenue = 0.0

    for campaign in campaigns:
        posts = list(getattr(campaign, "posts", []) or [])
        published_posts = [post for post in posts if str(getattr(post, "status", "")).lower() == "published"]
        analytics = build_campaign_analytics([campaign], published_posts)
        cost = float(campaign.budget or 0)
        reach = analytics["reach"]
        engagement = analytics["total_engagement"]
        impressions = analytics["impressions"]
        revenue = max(cost, reach * 0.18 + impressions * 0.05 + engagement * 7.5)
        roi = ((revenue - cost) / cost * 100) if cost > 0 else 0.0

        row = {
            "campaign_id": campaign.id,
            "name": campaign.name,
            "status": getattr(campaign, "status", "Draft"),
            "budget": round(cost, 2),
            "cost": round(cost, 2),
            "revenue": round(revenue, 2),
            "roi": round(roi, 2),
            "reach": reach,
            "engagement": engagement,
            "impressions": impressions,
            "published_posts": len(published_posts),
            "total_posts": len(posts),
            "engagement_rate": analytics["engagement_rate"],
            "performance": round((len(published_posts) / len(posts) * 100), 2) if posts else 0.0,
        }
        comparison_rows.append(row)
        total_cost += cost
        total_revenue += revenue

    best_campaign = max(comparison_rows, key=lambda item: item["roi"], default={
        "campaign_id": None,
        "name": "N/A",
        "roi": 0,
    })
    average_roi = round(sum(item["roi"] for item in comparison_rows) / len(comparison_rows), 2) if comparison_rows else 0.0

    return {
        "summary": {
            "total_campaigns": len(comparison_rows),
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "average_roi": average_roi,
            "best_campaign": {
                "campaign_id": best_campaign.get("campaign_id"),
                "name": best_campaign.get("name"),
                "roi": best_campaign.get("roi", 0),
            },
        },
        "comparison": comparison_rows,
    }


def build_campaign_report(campaign: Campaign) -> dict:
    """Generate a concise, human-readable campaign report with audience growth and content performance insights."""
    tracking = build_campaign_tracking(campaign)
    posts = list(getattr(campaign, "posts", []) or [])
    total_posts = tracking["total_posts"]
    published_posts = [post for post in posts if str(getattr(post, "status", "")).lower() == "published"]
    failed_posts = tracking["failed_posts"]
    start_date = getattr(campaign, "start_date", None)
    end_date = getattr(campaign, "end_date", None)

    duration = "Not set"
    if start_date and end_date:
        duration = f"{start_date.isoformat()} to {end_date.isoformat()}"
    elif start_date:
        duration = f"Starts {start_date.isoformat()}"
    elif end_date:
        duration = f"Ends {end_date.isoformat()}"

    analytics = build_campaign_analytics([campaign], published_posts)
    reach = analytics["reach"]
    impressions = analytics["impressions"]
    engagement = analytics["total_engagement"]
    performance = round((tracking["published_posts"] / total_posts * 100), 2) if total_posts else 0.0

    baseline_followers = max(1500, len(getattr(campaign, "social_accounts", []) or []) * 250 + len(published_posts) * 180)
    audience_timeline = []
    if start_date:
        total_days = max((end_date - start_date).days if start_date and end_date else 0, 1)
        sample_points = 4 if total_days > 3 else max(2, total_days + 1)
        date_points = []
        if sample_points <= 1:
            date_points = [start_date]
        else:
            step = total_days / (sample_points - 1)
            for index in range(sample_points):
                offset = round(index * step)
                date_points.append(start_date + timedelta(days=offset))
        if end_date and date_points and date_points[-1] != end_date:
            date_points[-1] = end_date

        previous_followers = baseline_followers
        for index, target_date in enumerate(date_points):
            cumulative_engagement = 0
            for post in published_posts:
                post_date = getattr(post, "published_at", None)
                if isinstance(post_date, datetime):
                    post_date = post_date.date()
                if post_date and post_date <= target_date:
                    cumulative_engagement += sum(_get_post_performance(post)[key] for key in ("likes", "comments", "shares", "clicks"))
            follower_count = baseline_followers + int(cumulative_engagement * 0.7)
            new_followers = max(0, follower_count - previous_followers)
            follower_growth = follower_count - baseline_followers
            growth_percentage = round((new_followers / previous_followers) * 100, 2) if previous_followers else 0.0
            audience_timeline.append({
                "date": target_date.strftime("%b %d"),
                "followers": follower_count,
                "new_followers": new_followers,
                "total_followers": follower_count,
                "follower_growth": follower_growth,
                "growth_percentage": growth_percentage,
                "reach": int(reach * (index + 1) / max(len(date_points), 1)),
                "impressions": int(impressions * (index + 1) / max(len(date_points), 1)),
            })
            previous_followers = follower_count
    if not audience_timeline:
        total_followers = baseline_followers + max(0, len(published_posts) * 90)
        audience_timeline = [{
            "date": "Campaign Start",
            "followers": total_followers,
            "new_followers": max(0, total_followers - baseline_followers),
            "total_followers": total_followers,
            "follower_growth": max(0, total_followers - baseline_followers),
            "growth_percentage": round((max(0, total_followers - baseline_followers) / baseline_followers) * 100, 2) if baseline_followers else 0.0,
            "reach": reach,
            "impressions": impressions,
        }]

    total_followers = audience_timeline[-1]["followers"]
    new_followers = max(0, total_followers - baseline_followers)
    follower_growth = total_followers - baseline_followers
    growth_percentage = round((new_followers / baseline_followers) * 100, 2) if baseline_followers else 0.0

    top_performing_content = []
    for post in published_posts:
        performance_summary = _get_post_performance(post)
        top_performing_content.append({
            "content": post.content[:90],
            "platform": getattr(getattr(post, "social_account", None), "platform", "unknown"),
            "published_at": getattr(post, "published_at", None).isoformat() if getattr(post, "published_at", None) else None,
            "engagement_score": performance_summary["likes"] + performance_summary["comments"] + performance_summary["shares"] + performance_summary["clicks"],
            "reach": performance_summary["reach"],
            "impressions": performance_summary["impressions"],
        })
    top_performing_content = sorted(top_performing_content, key=lambda item: item["engagement_score"], reverse=True)[:3]

    report_text = (
        "Campaign Report\n"
        "--------------------------------\n"
        f"Campaign: {campaign.name}\n\n"
        f"Duration:           {duration}\n"
        f"Status:             {tracking['status']}\n"
        f"Total Posts:        {total_posts}\n"
        f"Published:          {tracking['published_posts']}\n"
        f"Failed:             {failed_posts}\n"
        f"Reach:              {reach:,}\n"
        f"Impressions:        {impressions:,}\n"
        f"Engagement:         {engagement:,}\n"
        f"New Followers:      {new_followers:,}\n"
        f"Total Followers:    {total_followers:,}\n"
        f"Follower Growth:    {follower_growth:,}\n"
        f"Growth Rate:        {growth_percentage:.2f}%\n"
        f"Performance:        {performance}%\n"
    )
    if top_performing_content:
        top_item = top_performing_content[0]
        report_text += f"Top Content:        {top_item['content']}\n"

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "campaign_duration": duration,
        "status": tracking["status"],
        "total_posts": total_posts,
        "published_posts": tracking["published_posts"],
        "failed_posts": failed_posts,
        "engagement": engagement,
        "reach": reach,
        "impressions": impressions,
        "new_followers": new_followers,
        "total_followers": total_followers,
        "follower_growth": follower_growth,
        "growth_percentage": growth_percentage,
        "audience_growth": follower_growth,
        "performance": performance,
        "audience_timeline": audience_timeline,
        "top_performing_content": top_performing_content,
        "report_text": report_text,
    }


class CampaignNotFoundError(Exception):
    """Raised when a campaign does not exist for the requested user."""


class CampaignDateError(ValueError):
    """Raised when a campaign's end date precedes its start date."""


def check_campaign_ownership(
    campaign: Campaign,
    user_id: int,
) -> bool:
    return campaign.user_id == user_id


def _validate_dates(
    start_date,
    end_date,
) -> None:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise CampaignDateError("End date must be on or after start date")


def create_campaign(
    db: Session,
    user_id: int,
    campaign_data: CampaignCreate,
) -> Campaign:
    account_ids = set(campaign_data.social_account_ids)
    accounts = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == user_id,
            SocialAccount.id.in_(account_ids),
        )
        .all()
        if account_ids
        else []
    )
    if len(accounts) != len(account_ids):
        raise ValueError("One or more social accounts do not belong to the user")

    values = campaign_data.model_dump(exclude={"social_account_ids"})
    campaign = Campaign(
        user_id=user_id,
        **values,
        social_accounts=accounts,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def get_campaigns(
    db: Session,
    user_id: int,
    search: Optional[str] = None,
    status: Optional[str] = None,
    objective: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[Campaign]:
    query = db.query(Campaign).filter(Campaign.user_id == user_id)
    if search:
        query = query.filter(Campaign.name.ilike(f"%{search.strip()}%"))
    if status:
        query = query.filter(Campaign.status == status)
    if objective:
        query = query.filter(Campaign.objective.ilike(f"%{objective.strip()}%"))
    if start_date:
        query = query.filter(Campaign.start_date >= start_date)
    if end_date:
        query = query.filter(Campaign.end_date <= end_date)
    return query.order_by(Campaign.created_at.desc()).all()


def get_campaign(
    db: Session,
    campaign_id: int,
    user_id: int,
) -> Campaign:
    campaign = (
        db.query(Campaign)
        .filter(
            Campaign.id == campaign_id,
            Campaign.user_id == user_id,
        )
        .first()
    )
    if not campaign:
        raise CampaignNotFoundError("Campaign not found")
    return campaign


def update_campaign(
    db: Session,
    campaign_id: int,
    user_id: int,
    campaign_data: CampaignUpdate,
) -> Campaign:
    campaign = get_campaign(db, campaign_id, user_id)
    updates = campaign_data.model_dump(exclude_unset=True)
    account_ids = updates.pop("social_account_ids", None)
    if account_ids is not None:
        accounts = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.user_id == user_id,
                SocialAccount.id.in_(set(account_ids)),
            )
            .all()
        )
        if len(accounts) != len(set(account_ids)):
            raise ValueError("One or more social accounts do not belong to the user")
        campaign.social_accounts = accounts

    _validate_dates(
        updates.get("start_date", campaign.start_date),
        updates.get("end_date", campaign.end_date),
    )

    for field, value in updates.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)
    return campaign


def delete_campaign(
    db: Session,
    campaign_id: int,
    user_id: int,
) -> None:
    campaign = get_campaign(db, campaign_id, user_id)
    db.delete(campaign)
    db.commit()


def change_campaign_status(
    db: Session,
    campaign_id: int,
    user_id: int,
    new_status: CampaignStatus,
) -> Campaign:
    campaign = get_campaign(db, campaign_id, user_id)
    campaign.status = new_status
    db.commit()
    db.refresh(campaign)
    return campaign