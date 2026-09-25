"""Campaign analytics and provider-backed engagement tracking."""
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from database import get_db
from models import (AudienceSnapshot, EngagementSnapshot, EngagementWorkflow, Post, PublishingJob,
                    SocialAccount, SocialCredential)
from publishers import PublishError, access_token, request


WorkflowStatus = Literal["monitoring", "needs_attention", "reviewed"]
DEMO_PREFIX = "demo_"  # provider post IDs of sample data; never sent to a provider


class WorkflowUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: WorkflowStatus
    note: str = Field(default="", max_length=500)


def as_utc(value):
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def count(value):
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def graph_version():
    version = os.getenv("META_GRAPH_VERSION", "")
    if not re.fullmatch(r"v\d+\.\d+", version):
        raise PublishError("Configure META_GRAPH_VERSION before refreshing analytics")
    return version


def insight_values(result):
    values = {}
    for row in result.get("data", []) if isinstance(result.get("data"), list) else []:
        entries = row.get("values") or [{}]
        value = row.get("total_value", {}).get("value", entries[-1].get("value"))
        values[row.get("name")] = count(value)
    return values


def provider_insights(job, token, version, external_post):
    """Reach/impressions/clicks need insights permissions; missing access leaves zeros."""
    try:
        if job.provider == "facebook":
            result, _ = request(f"https://graph.facebook.com/{version}/{external_post}/insights"
                                "?metric=post_impressions,post_impressions_unique,post_clicks", token)
            data = insight_values(result)
            return {"impressions": data.get("post_impressions", 0),
                    "reach": data.get("post_impressions_unique", 0), "clicks": data.get("post_clicks", 0)}
        result, _ = request(f"https://graph.instagram.com/{version}/{external_post}/insights"
                            "?metric=reach,views,shares", token)
        data = insight_values(result)
        return {"reach": data.get("reach", 0), "impressions": data.get("views", 0), "shares": data.get("shares", 0)}
    except PublishError:
        return {}


def provider_metrics(db, job, credential):
    """Read public engagement counters without exposing provider responses."""
    token = access_token(db, credential)
    external_post = quote(job.provider_post_id, safe="")
    version = graph_version()
    if job.provider == "facebook":
        result, _ = request(
            f"https://graph.facebook.com/{version}/{external_post}"
            "?fields=reactions.limit(0).summary(true),comments.limit(0).summary(true),shares",
            token,
        )
        return {
            "likes": count(result.get("reactions", {}).get("summary", {}).get("total_count")),
            "comments": count(result.get("comments", {}).get("summary", {}).get("total_count")),
            "shares": count(result.get("shares", {}).get("count")),
            "reach": 0, "impressions": 0, "clicks": 0,
            **provider_insights(job, token, version, external_post),
        }
    if job.provider == "instagram":
        result, _ = request(
            f"https://graph.instagram.com/{version}/{external_post}?fields=like_count,comments_count",
            token,
        )
        return {
            "likes": count(result.get("like_count")),
            "comments": count(result.get("comments_count")),
            "shares": 0, "reach": 0, "impressions": 0, "clicks": 0,
            **provider_insights(job, token, version, external_post),
        }
    raise PublishError("Engagement sync is available for Facebook and Instagram")


def provider_audience(db, credential):
    """Current follower counts for a connected Facebook Page or Instagram account."""
    token = access_token(db, credential)
    version = graph_version()
    if credential.provider == "facebook":
        page = quote(credential.external_id, safe="")
        result, _ = request(f"https://graph.facebook.com/{version}/{page}?fields=followers_count,fan_count", token)
        return {"followers": count(result.get("followers_count") or result.get("fan_count")), "following": 0, "media_count": 0}
    if credential.provider == "instagram":
        result, _ = request(f"https://graph.instagram.com/{version}/me?fields=followers_count,follows_count,media_count", token)
        return {"followers": count(result.get("followers_count")), "following": count(result.get("follows_count")),
                "media_count": count(result.get("media_count"))}
    raise PublishError("Audience sync is available for Facebook and Instagram")


def collect_audience(db, user_id, now=None):
    """Store a follower snapshot for every connected Facebook/Instagram account."""
    now = now or datetime.now(timezone.utc)
    rows = db.query(SocialAccount, SocialCredential).join(
        SocialCredential, SocialCredential.account_id == SocialAccount.id).filter(
        SocialAccount.user_id == user_id, SocialAccount.connected.is_(True),
        SocialCredential.provider.in_(["facebook", "instagram"])).all()
    refreshed, failed = 0, []
    for account, credential in rows:
        try:
            values = provider_audience(db, credential)
            db.add(AudienceSnapshot(account_id=account.id, user_id=user_id, provider=credential.provider,
                                    collected_at=now, **values))
            refreshed += 1
        except PublishError as error:
            failed.append({"account_id": account.id, "message": str(error)[:300]})
    return refreshed, failed


def sync_engagement(db, user_id, days=30, limit=20, audience=True):
    """Pull fresh counters for recent published posts (API button and background worker)."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    jobs = db.query(PublishingJob).filter(
        PublishingJob.user_id == user_id, PublishingJob.status == "published",
        PublishingJob.provider_post_id.is_not(None), PublishingJob.scheduled_at >= cutoff,
        PublishingJob.provider.in_(["facebook", "instagram"]),
        ~PublishingJob.provider_post_id.startswith(DEMO_PREFIX),
    ).order_by(PublishingJob.scheduled_at.desc()).limit(limit).all()
    refreshed, failed = 0, []
    previous = latest_snapshots(db, user_id, [job.id for job in jobs])
    for job in jobs:
        workflow = db.get(EngagementWorkflow, job.id)
        if workflow is None:
            workflow = EngagementWorkflow(job_id=job.id, user_id=user_id, status="monitoring")
            db.add(workflow)
        credential = db.query(SocialCredential).filter_by(
            account_id=job.account_id, user_id=user_id, provider=job.provider).first()
        try:
            if credential is None:
                raise PublishError("Connected account credential is unavailable")
            metrics = provider_metrics(db, job, credential)
            db.add(EngagementSnapshot(job_id=job.id, user_id=user_id, provider=job.provider,
                                      collected_at=now, **metrics))
            prior = previous.get(job.id)
            if prior is not None and metrics["comments"] > prior.comments:
                workflow.status = "needs_attention"
            workflow.last_synced_at, workflow.last_error = now, None
            refreshed += 1
        except PublishError as error:
            workflow.last_error = str(error)[:300]
            failed.append({"job_id": job.id, "message": workflow.last_error})
        workflow.updated_at = now
    result = {"refreshed": refreshed, "failed": failed, "checked": len(jobs)}
    if audience:
        result["audience_refreshed"], result["audience_failed"] = collect_audience(db, user_id, now)
    db.commit()
    return result


def latest_snapshots(db, user_id, job_ids=None):
    query = db.query(EngagementSnapshot).filter_by(user_id=user_id).order_by(
        EngagementSnapshot.collected_at.desc(), EngagementSnapshot.id.desc())
    if job_ids is not None:
        query = query.filter(EngagementSnapshot.job_id.in_(job_ids))
    latest = {}
    for snapshot in query.all():
        latest.setdefault(snapshot.job_id, snapshot)
    return latest


def serialize_item(job, post, account, workflow, snapshot):
    metrics = {key: count(getattr(snapshot, key, 0)) for key in
               ("likes", "comments", "shares", "reach", "impressions", "clicks")}
    metrics["engagements"] = metrics["likes"] + metrics["comments"] + metrics["shares"] + metrics["clicks"]
    return {
        "job_id": job.id, "post_id": post.id, "campaign": post.title,
        "provider": job.provider, "account_name": account.account_name if account else "Disconnected account",
        "provider_post_id": job.provider_post_id, "published_at": as_utc(job.scheduled_at),
        "status": workflow.status if workflow else "monitoring",
        "note": workflow.note if workflow else "",
        "last_synced_at": as_utc(workflow.last_synced_at) if workflow else None,
        "last_error": workflow.last_error if workflow else None,
        "metrics": metrics,
    }


def make_router(require_permission):
    router = APIRouter(tags=["Analytics and engagement"])

    @router.post("/analytics/refresh")
    def refresh_engagement(
        days: int = Query(30, ge=1, le=365), limit: int = Query(20, ge=1, le=100),
        payload=Depends(require_permission("analytics:write")), db: Session = Depends(get_db),
    ):
        return sync_engagement(db, int(payload["sub"]), days=days, limit=limit)

    @router.post("/analytics/audience/refresh")
    def refresh_audience(payload=Depends(require_permission("analytics:write")), db: Session = Depends(get_db)):
        refreshed, failed = collect_audience(db, int(payload["sub"]))
        db.commit()
        return {"refreshed": refreshed, "failed": failed}

    @router.get("/engagement")
    def engagement_queue(
        days: int = Query(30, ge=1, le=365), status: WorkflowStatus | None = None,
        payload=Depends(require_permission("analytics:read")), db: Session = Depends(get_db),
    ):
        user_id, cutoff = int(payload["sub"]), datetime.now(timezone.utc) - timedelta(days=days)
        jobs = db.query(PublishingJob).filter(
            PublishingJob.user_id == user_id, PublishingJob.status == "published",
            PublishingJob.scheduled_at >= cutoff,
        ).order_by(PublishingJob.scheduled_at.desc()).all()
        snapshots = latest_snapshots(db, user_id, [job.id for job in jobs])
        items = []
        for job in jobs:
            workflow = db.get(EngagementWorkflow, job.id)
            if status and (workflow.status if workflow else "monitoring") != status:
                continue
            post, account = db.get(Post, job.post_id), db.get(SocialAccount, job.account_id) if job.account_id else None
            items.append(serialize_item(job, post, account, workflow, snapshots.get(job.id)))
        return items

    @router.patch("/engagement/{job_id}")
    def update_workflow(
        job_id: int, data: WorkflowUpdate,
        payload=Depends(require_permission("analytics:write")), db: Session = Depends(get_db),
    ):
        user_id = int(payload["sub"])
        job = db.query(PublishingJob).filter_by(id=job_id, user_id=user_id, status="published").first()
        if job is None:
            raise HTTPException(404, "Published campaign not found")
        workflow = db.get(EngagementWorkflow, job.id)
        if workflow is None:
            workflow = EngagementWorkflow(job_id=job.id, user_id=user_id)
            db.add(workflow)
        workflow.status, workflow.note, workflow.updated_at = data.status, data.note.strip(), datetime.now(timezone.utc)
        db.commit()
        return {"job_id": job.id, "status": workflow.status, "note": workflow.note}

    @router.get("/analytics/summary")
    def analytics_summary(
        days: int = Query(30, ge=1, le=365),
        payload=Depends(require_permission("analytics:read")), db: Session = Depends(get_db),
    ):
        user_id, cutoff = int(payload["sub"]), datetime.now(timezone.utc) - timedelta(days=days)
        posts = db.query(Post).filter(Post.user_id == user_id, Post.created_at >= cutoff).all()
        jobs = db.query(PublishingJob).filter(
            PublishingJob.user_id == user_id, PublishingJob.scheduled_at >= cutoff).all()
        published = [job for job in jobs if job.status == "published"]
        snapshots = latest_snapshots(db, user_id, [job.id for job in published])
        totals = {key: 0 for key in ("likes", "comments", "shares", "reach", "impressions", "clicks")}
        platform = defaultdict(lambda: {"campaigns": 0, "published": 0, "engagements": 0})
        timeline = defaultdict(lambda: {"campaigns": 0, "published": 0, "engagements": 0, "reach": 0})
        today = datetime.now(timezone.utc).date()
        for offset in range(min(days, 90) - 1, -1, -1):
            timeline[(today - timedelta(days=offset)).isoformat()]  # zero-filled days keep sparklines continuous
        top = []
        for post in posts:
            platform[(post.platform or "unspecified").lower()]["campaigns"] += 1
            timeline[as_utc(post.created_at).date().isoformat()]["campaigns"] += 1
        for job in published:
            platform[job.provider]["published"] += 1
            day = as_utc(job.scheduled_at).date().isoformat()
            timeline[day]["published"] += 1
            snapshot = snapshots.get(job.id)
            engagement = 0
            if snapshot:
                for key in totals:
                    totals[key] += count(getattr(snapshot, key))
                engagement = snapshot.likes + snapshot.comments + snapshot.shares + snapshot.clicks
            platform[job.provider]["engagements"] += engagement
            timeline[day]["engagements"] += engagement
            timeline[day]["reach"] += count(snapshot.reach) if snapshot else 0
            post = db.get(Post, job.post_id)
            account = db.get(SocialAccount, job.account_id) if job.account_id else None
            top.append({"job_id": job.id, "post_id": job.post_id, "campaign": post.title if post else f"Post {job.post_id}",
                        "provider": job.provider, "engagements": engagement, "content": job.content[:280],
                        "image_url": job.image_url, "published_at": as_utc(job.scheduled_at),
                        "account_name": account.account_name if account else None,
                        **({key: count(getattr(snapshot, key)) for key in ("likes", "comments", "shares", "reach")} if snapshot else {})})
        workflow_counts = defaultdict(int)
        for row in db.query(EngagementWorkflow).join(PublishingJob, PublishingJob.id == EngagementWorkflow.job_id).filter(
                EngagementWorkflow.user_id == user_id, PublishingJob.scheduled_at >= cutoff).all():
            workflow_counts[row.status] += 1
        totals["engagements"] = totals["likes"] + totals["comments"] + totals["shares"] + totals["clicks"]
        # Same-length window immediately before this one, for "vs previous period" trend chips.
        prev_start = cutoff - timedelta(days=days)
        prev_jobs = db.query(PublishingJob).filter(
            PublishingJob.user_id == user_id, PublishingJob.status == "published",
            PublishingJob.scheduled_at >= prev_start, PublishingJob.scheduled_at < cutoff).all()
        prev_snaps = latest_snapshots(db, user_id, [job.id for job in prev_jobs])
        previous = {key: sum(count(getattr(s, key)) for s in prev_snaps.values())
                    for key in ("likes", "comments", "shares", "reach", "impressions", "clicks")}
        previous["engagements"] = previous["likes"] + previous["comments"] + previous["shares"] + previous["clicks"]
        previous["published"] = len(prev_jobs)
        previous["campaigns"] = db.query(Post).filter(Post.user_id == user_id, Post.created_at >= prev_start,
                                                      Post.created_at < cutoff).count()
        return {
            "previous": previous,
            "range_days": days,
            "totals": {"campaigns": len(posts), "scheduled": sum(j.status in {"scheduled", "retry", "processing"} for j in jobs),
                       "published": len(published), "connected_platforms": db.query(SocialAccount).filter_by(user_id=user_id, connected=True).count(),
                       **totals},
            "platforms": [{"platform": key, **value} for key, value in sorted(platform.items())],
            "timeline": [{"date": key, **value} for key, value in sorted(timeline.items())],
            "workflow": {key: workflow_counts.get(key, 0) for key in ("monitoring", "needs_attention", "reviewed")},
            "top_campaigns": sorted(top, key=lambda row: row["engagements"], reverse=True)[:5],
            "last_synced_at": max((as_utc(s.collected_at) for s in snapshots.values()), default=None),
        }

    return router
