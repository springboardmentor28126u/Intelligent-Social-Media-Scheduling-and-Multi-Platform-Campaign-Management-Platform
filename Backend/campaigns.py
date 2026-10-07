"""Campaign management: CRUD, content grouping, tracking and campaign reports."""
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from analytics import as_utc, count, latest_snapshots
from visibility import scoped_query
from posts import change_campaign
from database import get_db
from models import Campaign, Post, PublishingJob, CampaignAssignment, Membership

Objective = Literal["awareness", "engagement", "traffic", "conversions", "followers", "sales"]
CampaignStatus = Literal["active", "paused", "completed", "archived"]
PLATFORMS = ("facebook", "instagram", "linkedin", "x", "youtube", "pinterest")
METRICS = ("likes", "comments", "shares", "reach", "impressions", "clicks")


class CampaignBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    objective: Objective = "engagement"
    platforms: list[Literal[PLATFORMS]] = Field(default_factory=list, max_length=6)
    start_date: date
    end_date: date
    budget: float = Field(default=0, ge=0, le=1_000_000_000)
    revenue: float = Field(default=0, ge=0, le=1_000_000_000)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    target_engagements: int = Field(default=0, ge=0, le=1_000_000_000)
    target_posts: int = Field(default=0, ge=0, le=10_000)
    shared_with_team: bool = False
    assigned_member_ids: list[int] = Field(default_factory=list, max_length=200)
    status: CampaignStatus = "active"

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, value):
        if not value.isalpha():
            raise ValueError("Currency must be a 3-letter code")
        return value.upper()

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after the start date")
        if (self.end_date - self.start_date).days > 730:
            raise ValueError("Campaigns can run for at most two years")
        return self


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    objective: Objective | None = None
    platforms: list[Literal[PLATFORMS]] | None = Field(default=None, max_length=6)
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = Field(default=None, ge=0, le=1_000_000_000)
    revenue: float | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    target_engagements: int | None = Field(default=None, ge=0, le=1_000_000_000)
    target_posts: int | None = Field(default=None, ge=0, le=10_000)
    shared_with_team: bool | None = None
    assigned_member_ids: list[int] | None = Field(default=None, max_length=200)
    status: CampaignStatus | None = None

    @model_validator(mode="after")
    def not_empty(self):
        if not self.model_fields_set:
            raise ValueError("Supply at least one field")
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(name + " cannot be null")
        if self.currency is not None:
            if not self.currency.isalpha():
                raise ValueError("Currency must be a 3-letter code")
            self.currency = self.currency.upper()
        if self.name is not None:
            self.name = self.name.strip()
            if not self.name:
                raise ValueError("name cannot be blank")
        return self


class PostAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    post_ids: list[int] = Field(min_length=1, max_length=200)


def owned_campaign(db, user_id, campaign_id):
    campaign = scoped_query(db, Campaign).filter_by(id=campaign_id, user_id=user_id).first()
    if campaign is None:
        raise HTTPException(404, "Campaign not found")
    return campaign


def phase(campaign, today=None):
    today = today or datetime.now(timezone.utc).date()
    if campaign.status in {"completed", "archived"}:
        return "ended"
    if today < campaign.start_date:
        return "upcoming"
    if today > campaign.end_date:
        return "ended"
    return "running"


def pct(part, whole):
    return round(part * 100 / whole, 1) if whole else None


def rollup(db, user_id, campaigns, detail=False):
    """Aggregate posts, publishing jobs and latest engagement for campaigns."""
    ids = [c.id for c in campaigns]
    posts = scoped_query(db, Post).filter(Post.user_id == user_id, Post.campaign_id.in_(ids)).all() if ids else []
    post_ids = [p.id for p in posts]
    jobs = scoped_query(db, PublishingJob).filter(PublishingJob.user_id == user_id,
                                          PublishingJob.post_id.in_(post_ids)).all() if post_ids else []
    snapshots = latest_snapshots(db, user_id, [j.id for j in jobs if j.status == "published"]) if jobs else {}
    post_campaign = {p.id: p.campaign_id for p in posts}
    by_campaign = {cid: {"posts": [], "jobs": []} for cid in ids}
    for post in posts:
        by_campaign[post.campaign_id]["posts"].append(post)
    for job in jobs:
        by_campaign[post_campaign[job.post_id]]["jobs"].append(job)
    today = datetime.now(timezone.utc).date()
    result = {c.id: summarize(c, by_campaign[c.id]["posts"], by_campaign[c.id]["jobs"], snapshots, today, detail)
            for c in campaigns}
    for c in campaigns:
        result[c.id]["creator_id"] = c.creator_id
        result[c.id]["shared_with_team"] = c.shared_with_team
        result[c.id]["assigned_member_ids"] = [a.user_id for a in db.query(CampaignAssignment).filter_by(campaign_id=c.id)]
    return result


def summarize(campaign, posts, jobs, snapshots, today, detail):
    totals = {key: 0 for key in METRICS}
    status_counts = defaultdict(int)
    platforms = defaultdict(lambda: {"published": 0, "failed": 0, "scheduled": 0, "engagements": 0, "reach": 0})
    timeline = defaultdict(lambda: {"published": 0, "engagements": 0})
    per_post = defaultdict(lambda: {"engagements": 0, "reach": 0, "jobs": 0, "published": 0})
    for job in jobs:
        status_counts[job.status] += 1
        row = platforms[job.provider]
        per_post[job.post_id]["jobs"] += 1
        if job.status in {"scheduled", "retry", "processing"}:
            row["scheduled"] += 1
        elif job.status == "failed":
            row["failed"] += 1
        elif job.status == "published":
            row["published"] += 1
            per_post[job.post_id]["published"] += 1
            snapshot = snapshots.get(job.id)
            engagement = 0
            if snapshot:
                for key in METRICS:
                    totals[key] += count(getattr(snapshot, key))
                engagement = snapshot.likes + snapshot.comments + snapshot.shares + snapshot.clicks
                row["reach"] += count(snapshot.reach)
                per_post[job.post_id]["reach"] += count(snapshot.reach)
            row["engagements"] += engagement
            per_post[job.post_id]["engagements"] += engagement
            timeline[as_utc(job.scheduled_at).date().isoformat()]["published"] += 1
            timeline[as_utc(job.scheduled_at).date().isoformat()]["engagements"] += engagement
    engagements = totals["likes"] + totals["comments"] + totals["shares"] + totals["clicks"]
    published, failed = status_counts["published"], status_counts["failed"]
    budget, revenue = float(campaign.budget or 0), float(campaign.revenue or 0)
    duration = (campaign.end_date - campaign.start_date).days + 1
    elapsed = min(max((today - campaign.start_date).days + 1, 0), duration)
    current_phase = phase(campaign, today)
    metrics = {
        **totals, "engagements": engagements, "posts": len(posts),
        "published_jobs": published, "failed_jobs": failed,
        "scheduled_jobs": sum(status_counts[s] for s in ("scheduled", "retry", "processing")),
        "cancelled_jobs": status_counts["cancelled"],
        "success_rate": pct(published, published + failed),
        "engagement_rate": pct(engagements, totals["reach"]),
        "avg_engagement_per_post": round(engagements / published, 1) if published else 0,
        "cost_per_engagement": round(budget / engagements, 2) if engagements and budget else None,
        # No revenue entered yet (e.g. upcoming campaigns) means ROI is unknown, not -100%.
        "roi_pct": round((revenue - budget) * 100 / budget, 1) if budget and revenue else None,
        "profit": round(revenue - budget, 2),
        "target_progress": pct(engagements, campaign.target_engagements),
        "posts_progress": pct(sum(1 for p in per_post.values() if p["published"]), campaign.target_posts),
        "time_elapsed_pct": pct(elapsed, duration),
    }
    alerts = []
    if failed:
        alerts.append({"level": "warning", "message": f"{failed} publication(s) failed; open Posts to retry."})
    if status_counts["uncertain"]:
        alerts.append({"level": "warning", "message": f"{status_counts['uncertain']} publication(s) need manual review."})
    if current_phase == "running" and campaign.status == "active" and not posts:
        alerts.append({"level": "info", "message": "Campaign is running but has no posts assigned."})
    if current_phase == "running" and campaign.target_engagements and metrics["time_elapsed_pct"] >= 50 \
            and (metrics["target_progress"] or 0) < metrics["time_elapsed_pct"] / 2:
        alerts.append({"level": "warning", "message": "Engagement is well behind target for the time elapsed."})
    days_left = (campaign.end_date - today).days
    if current_phase == "running" and 0 <= days_left <= 3:
        alerts.append({"level": "info", "message": f"Campaign ends in {days_left} day(s)."})
    if today > campaign.end_date and campaign.status == "active":
        alerts.append({"level": "info", "message": "End date has passed; mark the campaign completed."})
    result = {
        "id": campaign.id, "name": campaign.name, "description": campaign.description,
        "objective": campaign.objective, "platforms": [p for p in (campaign.platforms or "").split(",") if p],
        "start_date": campaign.start_date.isoformat(), "end_date": campaign.end_date.isoformat(),
        "budget": budget, "revenue": revenue, "currency": campaign.currency,
        "target_engagements": campaign.target_engagements, "target_posts": campaign.target_posts,
        "status": campaign.status, "phase": current_phase, "days_left": max(days_left, 0),
        "created_at": as_utc(campaign.created_at), "updated_at": as_utc(campaign.updated_at),
        "metrics": metrics, "alerts": alerts,
        "platform_breakdown": [{"platform": k, **v} for k, v in sorted(platforms.items())],
    }
    if detail:
        result["timeline"] = [{"date": k, **v} for k, v in sorted(timeline.items())]
        result["posts"] = [{
            "id": p.id, "title": p.title, "status": p.status, "platform": p.platform,
            "created_at": as_utc(p.created_at), **per_post[p.id],
        } for p in sorted(posts, key=lambda p: p.created_at, reverse=True)]
    return result


def apply(campaign, values):
    for name, value in values.items():
        setattr(campaign, name, ",".join(dict.fromkeys(value)) if name == "platforms" else value)
    if campaign.end_date < campaign.start_date:
        raise HTTPException(422, "End date must be on or after the start date")
    campaign.updated_at = datetime.now(timezone.utc)


def set_assignments(db, campaign, ids, payload):
    ids = set(ids)
    allowed = {int(payload.get("actor_sub", payload["sub"]))}
    if payload.get("workspace_id"):
        allowed = {m.user_id for m in db.query(Membership).filter_by(workspace_id=payload["workspace_id"], status="active")}
    if not ids <= allowed:
        raise HTTPException(422, "Assign only active members of this workspace")
    db.query(CampaignAssignment).filter_by(campaign_id=campaign.id).delete()
    for user_id in ids:
        db.add(CampaignAssignment(campaign_id=campaign.id, user_id=user_id))


def require_campaign_owner(campaign, payload):
    if not payload.get("can_manage") and payload["role"] != "administrator" and campaign.creator_id != int(payload.get("actor_sub", payload["sub"])):
        raise HTTPException(403, "Only the campaign creator or workspace admin can change sharing or delete this campaign")


def make_router(require_permission):
    router = APIRouter(prefix="/campaigns", tags=["Campaign management"])

    @router.get("")
    def list_campaigns(status: CampaignStatus | None = None, include_archived: bool = False,
                       payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        query = scoped_query(db, Campaign).filter_by(user_id=user_id)
        if status:
            query = query.filter_by(status=status)
        elif not include_archived:
            query = query.filter(Campaign.status != "archived")
        campaigns = query.order_by(Campaign.start_date.desc(), Campaign.id.desc()).limit(500).all()
        summaries = rollup(db, user_id, campaigns)
        return [summaries[c.id] for c in campaigns]

    @router.post("", status_code=201)
    def create_campaign(data: CampaignCreate, payload=Depends(require_permission("content:write")),
                        db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = Campaign(user_id=user_id, creator_id=int(payload.get("actor_sub", payload["sub"])))
        values = data.model_dump()
        ids = values.pop("assigned_member_ids")
        apply(campaign, values)
        campaign.created_at = campaign.updated_at
        db.add(campaign)
        db.flush()
        set_assignments(db, campaign, ids, payload)
        db.commit()
        db.refresh(campaign)
        return rollup(db, user_id, [campaign], detail=True)[campaign.id]

    @router.get("/{campaign_id}")
    def campaign_report(campaign_id: int, payload=Depends(require_permission("posts:read")),
                        db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = owned_campaign(db, user_id, campaign_id)
        return rollup(db, user_id, [campaign], detail=True)[campaign.id]

    @router.patch("/{campaign_id}")
    def update_campaign(campaign_id: int, data: CampaignUpdate, payload=Depends(require_permission("content:write")),
                        db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = owned_campaign(db, user_id, campaign_id)
        values = data.model_dump(exclude_unset=True)
        if {"assigned_member_ids", "shared_with_team"} & values.keys():
            require_campaign_owner(campaign, payload)
        if "assigned_member_ids" in values:
            set_assignments(db, campaign, values.pop("assigned_member_ids"), payload)
        apply(campaign, values)
        db.commit()
        db.refresh(campaign)
        return rollup(db, user_id, [campaign], detail=True)[campaign.id]

    @router.delete("/{campaign_id}")
    def delete_campaign(campaign_id: int, payload=Depends(require_permission("content:write")),
                        db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = owned_campaign(db, user_id, campaign_id)
        require_campaign_owner(campaign, payload)
        db.query(CampaignAssignment).filter_by(campaign_id=campaign.id).delete()
        for post in scoped_query(db, Post).filter_by(user_id=user_id, campaign_id=campaign.id).with_for_update().all():
            change_campaign(post, None, payload)
        db.delete(campaign)
        db.commit()
        return {"message": "Campaign deleted; its posts were kept"}

    @router.post("/{campaign_id}/posts")
    def assign_posts(campaign_id: int, data: PostAssignment, payload=Depends(require_permission("content:write")),
                     db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = owned_campaign(db, user_id, campaign_id)
        ids = set(data.post_ids)
        posts = scoped_query(db, Post).filter(Post.user_id == user_id, Post.id.in_(ids)).order_by(Post.id).with_for_update().all()
        if len(posts) != len(ids):
            raise HTTPException(404, "One or more posts were not found")
        for post in posts:
            change_campaign(post, campaign.id, payload)
        db.commit()
        return rollup(db, user_id, [campaign], detail=True)[campaign.id]

    @router.delete("/{campaign_id}/posts/{post_id}")
    def unassign_post(campaign_id: int, post_id: int, payload=Depends(require_permission("content:write")),
                      db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        campaign = owned_campaign(db, user_id, campaign_id)
        post = scoped_query(db, Post).filter_by(id=post_id, user_id=user_id, campaign_id=campaign.id).with_for_update().first()
        if post is None:
            raise HTTPException(404, "Post is not part of this campaign")
        change_campaign(post, None, payload)
        db.commit()
        return rollup(db, user_id, [campaign], detail=True)[campaign.id]

    return router


def comparison_rows(db, user_id, ids=None, days=None):
    query = scoped_query(db, Campaign).filter_by(user_id=user_id)
    if ids:
        query = query.filter(Campaign.id.in_(ids))
    if days:
        cutoff = datetime.now(timezone.utc).date() - timedelta(days=days)
        query = query.filter(Campaign.end_date >= cutoff)
    campaigns = query.order_by(Campaign.start_date.desc()).limit(200).all()
    summaries = rollup(db, user_id, campaigns)
    return [summaries[c.id] for c in campaigns]
