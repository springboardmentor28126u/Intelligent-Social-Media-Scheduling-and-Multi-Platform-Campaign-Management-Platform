from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, String

from app.db.database import get_db
from app.db.models.campaign import Campaign, CampaignPost
from app.db.models.post import Post
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignStatusUpdate,
    CampaignPostAddRequest,
    CampaignStatsResponse,
    CampaignComparisonResponse,
    CampaignComparisonMetric,
)
from app.schemas.post import PostResponse
from app.api.routes.posts import _format_post_response
from app.core.security import get_current_user, require_permission
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)


def _get_campaign_posts(db: Session, campaign_id: int) -> List[Post]:
    """Return all unique posts associated with a campaign via direct FK or association table."""
    # Find direct posts
    direct_posts = db.query(Post).filter(Post.campaign_id == campaign_id).all()
    
    # Find secondary mapped posts
    sec_links = db.query(CampaignPost).filter(CampaignPost.campaign_id == campaign_id).all()
    sec_post_ids = [l.post_id for l in sec_links]
    sec_posts = db.query(Post).filter(Post.id.in_(sec_post_ids)).all() if sec_post_ids else []
    
    # Combine uniquely by ID
    posts_map = {p.id: p for p in (direct_posts + sec_posts)}
    return list(posts_map.values())


def _compute_campaign_metrics(db: Session, campaign: Campaign, posts: Optional[List[Post]] = None) -> dict:
    """Calculate real database metrics for a campaign from linked posts and campaign metadata."""
    if posts is None:
        posts = _get_campaign_posts(db, campaign.id)

    total_posts = len(posts)
    
    draft_posts = 0
    scheduled_posts = 0
    published_posts = 0
    failed_posts = 0
    
    actual_reach = 0
    actual_impressions = 0
    actual_likes = 0
    actual_comments = 0
    actual_shares = 0
    actual_clicks = 0
    
    for p in posts:
        st = str(p.status).lower() if p.status else "draft"
        if st == "draft":
            draft_posts += 1
        elif st in ["scheduled", "queued"]:
            scheduled_posts += 1
        elif st == "published":
            published_posts += 1
            actual_reach += (p.reach_count or 0)
            actual_impressions += (p.impressions_count or 0)
            actual_likes += (p.likes_count or 0)
            actual_comments += (p.comments_count or 0)
            actual_shares += (p.shares_count or 0)
            actual_clicks += (p.clicks_count or 0)
        elif st in ["failed", "error"]:
            failed_posts += 1

    actual_engagement = actual_likes + actual_comments + actual_shares
    
    # Engagement rate (%)
    if actual_impressions > 0:
        actual_engagement_rate = round((actual_engagement / actual_impressions) * 100, 2)
    elif actual_reach > 0:
        actual_engagement_rate = round((actual_engagement / actual_reach) * 100, 2)
    else:
        actual_engagement_rate = 0.0

    # Calculate real progress percentage
    progress = 0
    now_utc = datetime.now(timezone.utc)
    if campaign.start_date and campaign.end_date:
        s_date = campaign.start_date.replace(tzinfo=timezone.utc) if campaign.start_date.tzinfo is None else campaign.start_date
        e_date = campaign.end_date.replace(tzinfo=timezone.utc) if campaign.end_date.tzinfo is None else campaign.end_date
        total_span = (e_date - s_date).total_seconds()
        elapsed_span = (now_utc - s_date).total_seconds()
        if total_span > 0:
            progress = min(100, max(0, int((elapsed_span / total_span) * 100)))
    elif campaign.target_reach and campaign.target_reach > 0 and actual_reach > 0:
        progress = min(100, int((actual_reach / campaign.target_reach) * 100))
    elif total_posts > 0 and published_posts > 0:
        progress = min(100, int((published_posts / total_posts) * 100))

    # Real ROI formula:
    # If budget/spent and actual revenue or conversions exist, compute (revenue - spent)/spent.
    # When financial revenue tracking is not configured, ROI ratio is 0.0 with documentation.
    roi_val = 0.0
    roi_desc = "ROI calculation requires recorded revenue/conversions input."
    if campaign.spent and campaign.spent > 0 and campaign.budget and campaign.budget > 0:
        # Budget utilization efficiency
        utilization = round((campaign.spent / campaign.budget) * 100, 1)
        roi_desc = f"Budget utilization: {utilization}% (${campaign.spent:,.2f} of ${campaign.budget:,.2f})"

    return {
        "posts_count": total_posts,
        "draft_posts_count": draft_posts,
        "scheduled_posts_count": scheduled_posts,
        "published_posts_count": published_posts,
        "failed_posts_count": failed_posts,
        "actual_reach": actual_reach,
        "actual_impressions": actual_impressions,
        "actual_engagement": actual_engagement,
        "actual_engagement_rate": actual_engagement_rate,
        "actual_clicks": actual_clicks,
        "actual_likes": actual_likes,
        "actual_comments": actual_comments,
        "actual_shares": actual_shares,
        "progress_percentage": progress,
        "roi": roi_val,
        "roi_formula": roi_desc,
    }


def _format_campaign_response(db: Session, campaign: Campaign, posts: Optional[List[Post]] = None) -> CampaignResponse:
    metrics = _compute_campaign_metrics(db, campaign, posts)
    
    return CampaignResponse(
        id=campaign.id,
        uuid=campaign.uuid or f"camp-{campaign.id}",
        user_id=campaign.user_id,
        team_id=campaign.team_id,
        name=campaign.name,
        description=campaign.description,
        platform=campaign.platform or "All Platforms",
        status=campaign.status or "active",
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        budget=campaign.budget or 0.0,
        spent=campaign.spent or 0.0,
        currency=campaign.currency or "USD",
        objectives=campaign.objectives or "Brand Awareness",
        target_audience=campaign.target_audience,
        target_reach=campaign.target_reach or 50000,
        target_engagement=campaign.target_engagement or 5.0,
        target_clicks=campaign.target_clicks or 2000,
        
        actual_reach=metrics["actual_reach"],
        actual_impressions=metrics["actual_impressions"],
        actual_engagement=metrics["actual_engagement_rate"],  # engagement % for schema compatibility
        actual_clicks=metrics["actual_clicks"],
        actual_likes=metrics["actual_likes"],
        actual_comments=metrics["actual_comments"],
        actual_shares=metrics["actual_shares"],
        
        roi=metrics["roi"],
        roi_formula=metrics["roi_formula"],
        color=campaign.color or "#2563eb",
        tags=campaign.tags,
        
        posts_count=metrics["posts_count"],
        draft_posts_count=metrics["draft_posts_count"],
        scheduled_posts_count=metrics["scheduled_posts_count"],
        published_posts_count=metrics["published_posts_count"],
        failed_posts_count=metrics["failed_posts_count"],
        progress_percentage=metrics["progress_percentage"],
        
        created_at=campaign.created_at or datetime.now(timezone.utc),
        updated_at=campaign.updated_at
    )


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGNS CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CampaignResponse])
def get_campaigns(
    status: Optional[str] = Query(None, description="draft, scheduled, active, completed, paused"),
    search: Optional[str] = Query(None, description="Search campaign name or objectives"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Campaign)
    
    # Content creators only see their own campaigns; Marketing/Business/Admin see all
    if current_user["role"] == "content_creator":
        query = query.filter(Campaign.user_id == current_user["user_id"])

    if status and status.lower() != "all":
        query = query.filter(func.lower(Campaign.status) == status.lower())
        
    if search:
        s_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Campaign.name.ilike(s_pattern),
                Campaign.description.ilike(s_pattern),
                Campaign.objectives.ilike(s_pattern)
            )
        )

    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return [_format_campaign_response(db, c) for c in campaigns]


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    current_user: dict = Depends(require_permission("campaigns.create")),
    db: Session = Depends(get_db)
):
    campaign = Campaign(
        user_id=current_user["user_id"],
        name=data.name.strip(),
        description=data.description,
        platform=data.platform or "All Platforms",
        status=(data.status or "active").lower(),
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget or 0.0,
        spent=data.spent or 0.0,
        currency=data.currency or "USD",
        objectives=data.objectives or "Brand Awareness",
        target_audience=data.target_audience,
        target_reach=data.target_reach or 50000,
        target_engagement=data.target_engagement or 5.0,
        target_clicks=data.target_clicks or 2000,
        actual_reach=0,
        actual_engagement=0.0,
        actual_clicks=0,
        roi=0.0,
        color=data.color or "#2563eb",
        tags=data.tags
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.create",
        module="campaigns",
        description=f"Created campaign '{campaign.name}' (Status: {campaign.status})"
    )

    return _format_campaign_response(db, campaign)


@router.get("/compare", response_model=CampaignComparisonResponse)
def compare_campaigns(
    ids: str = Query(..., description="Comma-separated campaign IDs, e.g., 1,2,3"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Side-by-side comparison of 2 or more campaigns using real metrics."""
    try:
        camp_ids = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid campaign IDs format. Expected comma-separated numbers.")

    if not camp_ids:
        raise HTTPException(status_code=400, detail="Please provide at least one campaign ID to compare.")

    campaigns = db.query(Campaign).filter(Campaign.id.in_(camp_ids)).all()
    if not campaigns:
        raise HTTPException(status_code=404, detail="No matching campaigns found.")

    formatted_camps = []
    values_posts: dict = {}
    values_reach: dict = {}
    values_imp: dict = {}
    values_eng: dict = {}
    values_eng_rate: dict = {}
    values_clicks: dict = {}
    values_budget: dict = {}
    values_spent: dict = {}

    for c in campaigns:
        posts = _get_campaign_posts(db, c.id)
        m = _compute_campaign_metrics(db, c, posts)
        c_id_str = str(c.id)

        formatted_camps.append({
            "id": c.id,
            "name": c.name,
            "platform": c.platform,
            "status": c.status,
            "color": c.color or "#2563eb",
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "budget": c.budget,
            "spent": c.spent,
            "objectives": c.objectives,
        })

        values_posts[c_id_str] = m["posts_count"]
        values_reach[c_id_str] = m["actual_reach"]
        values_imp[c_id_str] = m["actual_impressions"]
        values_eng[c_id_str] = m["actual_engagement"]
        values_eng_rate[c_id_str] = m["actual_engagement_rate"]
        values_clicks[c_id_str] = m["actual_clicks"]
        values_budget[c_id_str] = c.budget or 0.0
        values_spent[c_id_str] = c.spent or 0.0

    metrics = [
        CampaignComparisonMetric(metric_key="total_posts", label="Total Posts", unit="", values=values_posts),
        CampaignComparisonMetric(metric_key="actual_reach", label="Audience Reach", unit="", values=values_reach),
        CampaignComparisonMetric(metric_key="actual_impressions", label="Impressions", unit="", values=values_imp),
        CampaignComparisonMetric(metric_key="actual_engagement", label="Total Interactions", unit="", values=values_eng),
        CampaignComparisonMetric(metric_key="engagement_rate", label="Engagement Rate", unit="%", values=values_eng_rate),
        CampaignComparisonMetric(metric_key="actual_clicks", label="Link Clicks", unit="", values=values_clicks),
        CampaignComparisonMetric(metric_key="budget", label="Budget Allocated", unit="$", values=values_budget),
        CampaignComparisonMetric(metric_key="spent", label="Budget Spent", unit="$", values=values_spent),
    ]

    return CampaignComparisonResponse(
        campaign_ids=camp_ids,
        campaigns=formatted_camps,
        metrics=metrics
    )


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if current_user["role"] == "content_creator" and campaign.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this campaign")

    return _format_campaign_response(db, campaign)


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    current_user: dict = Depends(require_permission("campaigns.manage")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if current_user["role"] == "content_creator" and campaign.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied to update this campaign")

    if data.name is not None:
        campaign.name = data.name.strip()
    if data.description is not None:
        campaign.description = data.description
    if data.platform is not None:
        campaign.platform = data.platform
    if data.status is not None:
        campaign.status = data.status.lower()
    if data.start_date is not None:
        campaign.start_date = data.start_date
    if data.end_date is not None:
        campaign.end_date = data.end_date
    if data.budget is not None:
        campaign.budget = data.budget
    if data.spent is not None:
        campaign.spent = data.spent
    if data.currency is not None:
        campaign.currency = data.currency
    if data.objectives is not None:
        campaign.objectives = data.objectives
    if data.target_audience is not None:
        campaign.target_audience = data.target_audience
    if data.target_reach is not None:
        campaign.target_reach = data.target_reach
    if data.target_engagement is not None:
        campaign.target_engagement = data.target_engagement
    if data.target_clicks is not None:
        campaign.target_clicks = data.target_clicks
    if data.color is not None:
        campaign.color = data.color
    if data.tags is not None:
        campaign.tags = data.tags

    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.update",
        module="campaigns",
        description=f"Updated campaign '{campaign.name}'"
    )

    return _format_campaign_response(db, campaign)


@router.patch("/{campaign_id}/status", response_model=CampaignResponse)
def update_campaign_status(
    campaign_id: int,
    data: CampaignStatusUpdate,
    current_user: dict = Depends(require_permission("campaigns.manage")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    valid_statuses = ["draft", "scheduled", "active", "completed", "paused"]
    new_status = data.status.lower()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{data.status}'. Allowed: {', '.join(valid_statuses)}")

    campaign.status = new_status
    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.status_change",
        module="campaigns",
        description=f"Changed campaign '{campaign.name}' status to '{campaign.status}'"
    )

    return _format_campaign_response(db, campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    current_user: dict = Depends(require_permission("campaigns.manage")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if current_user["role"] == "content_creator" and campaign.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied to delete this campaign")

    # Unlink direct posts safely
    db.query(Post).filter(Post.campaign_id == campaign_id).update({"campaign_id": None})
    
    # Delete secondary association records
    db.query(CampaignPost).filter(CampaignPost.campaign_id == campaign_id).delete()

    db.delete(campaign)
    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.delete",
        module="campaigns",
        description=f"Deleted campaign '{campaign.name}' (ID: {campaign_id})"
    )
    return None


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN-POST RELATIONSHIPS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/posts", response_model=List[PostResponse])
def get_campaign_posts_endpoint(
    campaign_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    posts = _get_campaign_posts(db, campaign_id)
    return [_format_post_response(p) for p in posts]


@router.post("/{campaign_id}/posts", response_model=CampaignResponse)
def add_posts_to_campaign(
    campaign_id: int,
    data: CampaignPostAddRequest,
    current_user: dict = Depends(require_permission("campaigns.manage")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Gather target post IDs
    target_ids = list(data.post_ids or [])
    if data.post_id and data.post_id not in target_ids:
        target_ids.append(data.post_id)

    if not target_ids:
        raise HTTPException(status_code=400, detail="No post IDs provided to add to campaign.")

    posts = db.query(Post).filter(Post.id.in_(target_ids)).all()
    if not posts:
        raise HTTPException(status_code=404, detail="None of the specified posts exist.")

    for p in posts:
        p.campaign_id = campaign.id
        
        # Check if already in campaign_posts
        existing_link = db.query(CampaignPost).filter(
            CampaignPost.campaign_id == campaign.id,
            CampaignPost.post_id == p.id
        ).first()
        if not existing_link:
            link = CampaignPost(campaign_id=campaign.id, post_id=p.id)
            db.add(link)

    db.commit()
    db.refresh(campaign)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.add_posts",
        module="campaigns",
        description=f"Added {len(posts)} post(s) to campaign '{campaign.name}'"
    )

    return _format_campaign_response(db, campaign)


@router.delete("/{campaign_id}/posts/{post_id}", status_code=status.HTTP_200_OK)
def remove_post_from_campaign(
    campaign_id: int,
    post_id: int,
    current_user: dict = Depends(require_permission("campaigns.manage")),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Unlink direct FK
    if post.campaign_id == campaign_id:
        post.campaign_id = None

    # Unlink association row
    db.query(CampaignPost).filter(
        CampaignPost.campaign_id == campaign_id,
        CampaignPost.post_id == post_id
    ).delete()

    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="campaign.remove_post",
        module="campaigns",
        description=f"Removed post {post_id} from campaign '{campaign.name}'"
    )

    return {"message": "Post removed from campaign successfully", "campaign_id": campaign_id, "post_id": post_id}


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN STATS & ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/stats", response_model=CampaignStatsResponse)
def get_campaign_stats(
    campaign_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    m = _compute_campaign_metrics(db, campaign)
    spent = campaign.spent or 0.0
    budget = campaign.budget or 0.0
    remaining = max(0.0, budget - spent)
    
    cost_per_eng = round(spent / m["actual_engagement"], 2) if m["actual_engagement"] > 0 and spent > 0 else None
    cost_per_click = round(spent / m["actual_clicks"], 2) if m["actual_clicks"] > 0 and spent > 0 else None

    return CampaignStatsResponse(
        campaign_id=campaign.id,
        name=campaign.name,
        status=campaign.status or "active",
        total_posts=m["posts_count"],
        draft_posts=m["draft_posts_count"],
        scheduled_posts=m["scheduled_posts_count"],
        published_posts=m["published_posts_count"],
        failed_posts=m["failed_posts_count"],
        reach=m["actual_reach"],
        impressions=m["actual_impressions"],
        engagement=m["actual_engagement"],
        engagement_rate=m["actual_engagement_rate"],
        likes=m["actual_likes"],
        comments=m["actual_comments"],
        shares=m["actual_shares"],
        clicks=m["actual_clicks"],
        budget=budget,
        spent=spent,
        remaining_budget=remaining,
        cost_per_engagement=cost_per_eng,
        cost_per_click=cost_per_click,
        roi=m["roi"],
        roi_status=m["roi_formula"]
    )


@router.get("/{campaign_id}/analytics")
def get_campaign_analytics(
    campaign_id: int,
    time_range: str = Query("30d", alias="range", description="7d, 30d, 90d, 1y"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return timeline series and platform distribution for this specific campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    posts = _get_campaign_posts(db, campaign_id)
    pub_posts = [p for p in posts if str(p.status).lower() == "published"]

    days = 30
    if time_range == "7d":
        days = 7
    elif time_range == "90d":
        days = 90
    elif time_range == "1y":
        days = 365

    cur_start_date = datetime.now(timezone.utc).date() - timedelta(days=days)
    step = 1 if days <= 30 else (3 if days <= 90 else 7)

    def _post_date(p: Post):
        if not p.published_at:
            return None
        return p.published_at.date() if isinstance(p.published_at, datetime) else p.published_at

    timeline = []
    for i in range(0, days, step):
        d_start = cur_start_date + timedelta(days=i)
        d_end = cur_start_date + timedelta(days=min(days - 1, i + step - 1))
        date_label = d_start.strftime("%b %d")

        bucket_posts = [p for p in pub_posts if _post_date(p) and d_start <= _post_date(p) <= d_end]
        
        b_reach = sum(p.reach_count or 0 for p in bucket_posts)
        b_imp = sum(p.impressions_count or 0 for p in bucket_posts)
        b_likes = sum(p.likes_count or 0 for p in bucket_posts)
        b_comms = sum(p.comments_count or 0 for p in bucket_posts)
        b_shares = sum(p.shares_count or 0 for p in bucket_posts)
        b_clicks = sum(p.clicks_count or 0 for p in bucket_posts)
        b_eng = b_likes + b_comms + b_shares

        timeline.append({
            "date": date_label,
            "reach": b_reach,
            "impressions": b_imp,
            "engagement": b_eng,
            "clicks": b_clicks,
            "likes": b_likes,
            "comments": b_comms,
            "shares": b_shares,
        })

    # Platform distribution for this campaign
    plat_map = {}
    for p in pub_posts:
        plat_name = (p.platform or "Other").title()
        if plat_name not in plat_map:
            plat_map[plat_name] = {"count": 0, "reach": 0, "engagement": 0}
        plat_map[plat_name]["count"] += 1
        plat_map[plat_name]["reach"] += (p.reach_count or 0)
        plat_map[plat_name]["engagement"] += (p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0)

    total_pub = len(pub_posts)
    platforms_list = []
    for plat_name, p_stat in plat_map.items():
        pct = round((p_stat["count"] / total_pub * 100) if total_pub > 0 else 0.0, 1)
        platforms_list.append({
            "platform": plat_name,
            "count": p_stat["count"],
            "reach": p_stat["reach"],
            "engagement": p_stat["engagement"],
            "percentage": pct
        })

    return {
        "campaign_id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "total_posts": len(posts),
        "published_posts": len(pub_posts),
        "timeline": timeline,
        "platforms": platforms_list
    }