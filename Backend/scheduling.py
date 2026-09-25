"""Scheduling, calendar, queue and log APIs with owner-scoped access."""
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import ipaddress
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, field_validator, model_validator
from sqlalchemy.orm import Session

from database import get_db
from models import Post, PublishingJob, PublishingLog, SocialAccount, SocialCredential
from posts import owned_post

JobStatus = Literal["scheduled", "processing", "retry", "published", "failed", "cancelled", "uncertain"]
ACTIVE = {"scheduled", "retry", "processing"}


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def validate_image(value):
    if value is None:
        return value
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Image URL must be a public HTTPS URL without credentials")
    if parsed.hostname.lower() in {"localhost", "localhost.localdomain"} or parsed.hostname.endswith((".local", ".internal")):
        raise ValueError("Image URL must be public")
    try:
        address = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError("Image URL must be public")
    return value


class ScheduleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scheduled_at: AwareDatetime
    timezone_name: str = Field(default="Asia/Kolkata", max_length=100)
    account_ids: list[int] = Field(min_length=1, max_length=10)
    recurrence: Literal["none", "daily", "weekly"] = "none"
    occurrences: int = Field(default=1, ge=1, le=52)

    @field_validator("timezone_name")
    @classmethod
    def timezone_exists(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown IANA timezone")
        return value

    @model_validator(mode="after")
    def check_recurrence(self):
        if self.recurrence == "none" and self.occurrences != 1:
            raise ValueError("Non-recurring schedules have one occurrence")
        if len(set(self.account_ids)) != len(self.account_ids) or any(i <= 0 for i in self.account_ids):
            raise ValueError("Account IDs must be unique positive integers")
        return self


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: int
    account_id: int | None
    provider: str
    content: str
    image_url: str | None
    video_url: str | None = None
    scheduled_at: datetime
    run_at: datetime
    timezone_name: str
    recurrence: str
    status: str
    attempts: int
    provider_post_id: str | None
    error: str | None

    @field_validator("scheduled_at", "run_at")
    @classmethod
    def as_utc(cls, value):
        return utc(value)


class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    event: str
    message: str
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value):
        return utc(value)


def log(db, job, event, message):
    db.add(PublishingLog(job_id=job.id, event=event, message=message))


def sync_post(db, post):
    db.flush()
    statuses = {row[0] for row in db.query(PublishingJob.status).filter_by(post_id=post.id).all()}
    if "processing" in statuses:
        post.status = "publishing"
    elif statuses & {"scheduled", "retry"}:
        post.status = "scheduled"
    elif "uncertain" in statuses:
        post.status = "needs_review"
    elif "failed" in statuses:
        post.status = "partially_published" if "published" in statuses else "failed"
    elif "published" in statuses:
        post.status = "published"
    elif statuses:
        post.status = "cancelled"
    post.updated_at = datetime.now(timezone.utc)


def owned_job(db, user_id, job_id):
    job = db.query(PublishingJob).filter_by(id=job_id, user_id=user_id).first()
    if job is None:
        raise HTTPException(404, "Publishing job not found")
    return job


def times_for(data, now):
    if data.scheduled_at <= now:
        raise HTTPException(422, "Schedule must be in the future")
    zone = ZoneInfo(data.timezone_name)
    local = data.scheduled_at.astimezone(zone)
    step = 7 if data.recurrence == "weekly" else 1
    result = []
    for occurrence in range(data.occurrences):
        date = local + timedelta(days=step * occurrence)
        normalized = date.astimezone(timezone.utc)
        if normalized.astimezone(zone).replace(tzinfo=None) != date.replace(tzinfo=None):
            raise HTTPException(422, "A recurring time falls in a daylight-saving gap; choose another time")
        result.append(normalized)
    return result


def validate_content(post, provider):
    # Image posts can be published without a caption; YouTube uses the title and a video.
    if provider == "youtube":
        if not post.video_url:
            raise HTTPException(422, "YouTube requires a public HTTPS video URL")
        if len(post.title) > 100:
            raise HTTPException(422, "YouTube titles are limited to 100 characters")
        if len(post.content) > 5000:
            raise HTTPException(422, "YouTube descriptions are limited to 5000 characters")
        if "<" in post.title or ">" in post.title:
            raise HTTPException(422, "YouTube titles cannot contain < or >")
        return
    if not post.content.strip() and not (provider in {"facebook", "instagram", "linkedin", "x"} and post.image_url):
        raise HTTPException(422, "Add post content before scheduling")
    if provider == "instagram" and not post.image_url:
        raise HTTPException(422, "Instagram requires a public HTTPS image URL")
    if provider == "instagram" and len(post.content) > 2200:
        raise HTTPException(422, "Instagram caption exceeds 2200 characters")
    if provider == "linkedin" and len(post.content) > 3000:
        raise HTTPException(422, "LinkedIn text exceeds 3000 characters")
    # Conservative bound; X performs its own weighted character validation.
    if provider == "x" and len(post.content) > 280:
        raise HTTPException(422, "X text exceeds this app's 280-character limit")


def make_router(require_permission):
    router = APIRouter(tags=["Scheduling and publishing"])

    @router.post("/posts/{post_id}/schedule", response_model=list[JobResponse], status_code=201)
    def schedule(post_id: int, data: ScheduleRequest, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        if post.status not in {"draft", "scheduled", "cancelled"}:
            raise HTTPException(409, "Only drafts, cancelled posts and idle schedules can be scheduled")
        existing = db.query(PublishingJob).filter_by(post_id=post.id).all()
        if any(j.status in {"processing", "uncertain", "failed", "published"} for j in existing):
            raise HTTPException(409, "Schedule has executed jobs; create a new draft instead")
        times = times_for(data, datetime.now(timezone.utc))
        accounts = []
        for account_id in data.account_ids:
            account = db.query(SocialAccount).filter_by(id=account_id, user_id=post.user_id).first()
            credential = db.query(SocialCredential).filter_by(account_id=account_id, user_id=post.user_id).first()
            if account is None:
                raise HTTPException(404, "Social account not found")
            if not account.connected or credential is None:
                raise HTTPException(422, "Authorize every target account before scheduling")
            if credential.provider != account.platform.lower():
                raise HTTPException(422, "Account authorization does not match its platform")
            validate_content(post, credential.provider)
            accounts.append((account, credential.provider))
        for job in existing:
            if job.status in {"scheduled", "retry"}:
                job.status = "cancelled"
                log(db, job, "cancelled", "Replaced by a new schedule")
        jobs = []
        for scheduled_at in times:
            for account, provider in accounts:
                job = PublishingJob(post_id=post.id, user_id=post.user_id, account_id=account.id,
                    provider=provider, content=post.content, image_url=post.image_url, video_url=post.video_url, scheduled_at=scheduled_at,
                    run_at=scheduled_at, timezone_name=data.timezone_name, recurrence=data.recurrence, status="scheduled")
                db.add(job)
                db.flush()
                log(db, job, "scheduled", "Publishing occurrence added to queue")
                jobs.append(job)
        post.status = "scheduled"
        post.updated_at = datetime.now(timezone.utc)
        db.commit()
        return jobs

    @router.post("/posts/{post_id}/cancel")
    def cancel(post_id: int, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        jobs = db.query(PublishingJob).filter_by(post_id=post.id).all()
        if any(job.status == "processing" for job in jobs):
            raise HTTPException(409, "Publishing is in progress; wait for its result")
        count = 0
        for job in jobs:
            if job.status in {"scheduled", "retry"}:
                job.status = "cancelled"
                log(db, job, "cancelled", "Cancelled by owner")
                count += 1
        sync_post(db, post)
        db.commit()
        return {"cancelled_jobs": count}

    @router.post("/posts/{post_id}/restore-draft")
    def restore(post_id: int, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        if db.query(PublishingJob).filter(PublishingJob.post_id == post.id, PublishingJob.status != "cancelled").first():
            raise HTTPException(409, "Only posts with no history or entirely cancelled jobs can return to draft")
        post.status = "draft"
        db.commit()
        return {"status": "draft"}

    @router.get("/calendar", response_model=list[JobResponse])
    def calendar(start: AwareDatetime, end: AwareDatetime, offset: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500),
                 payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        if end <= start or end - start > timedelta(days=366):
            raise HTTPException(422, "Calendar range must be positive and no longer than 366 days")
        return db.query(PublishingJob).filter(PublishingJob.user_id == int(payload["sub"]),
            PublishingJob.scheduled_at >= start.astimezone(timezone.utc), PublishingJob.scheduled_at < end.astimezone(timezone.utc)
        ).order_by(PublishingJob.scheduled_at, PublishingJob.id).offset(offset).limit(limit).all()

    @router.get("/queue", response_model=list[JobResponse])
    def queue(status: JobStatus | None = None, post_id: int | None = None, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
              payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        query = db.query(PublishingJob).filter_by(user_id=int(payload["sub"]))
        if status:
            query = query.filter_by(status=status)
        if post_id is not None:
            query = query.filter_by(post_id=post_id)
        return query.order_by(PublishingJob.run_at, PublishingJob.id).offset(offset).limit(limit).all()

    @router.get("/queue/{job_id}/logs", response_model=list[LogResponse])
    def logs(job_id: int, payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        owned_job(db, int(payload["sub"]), job_id)
        return db.query(PublishingLog).filter_by(job_id=job_id).order_by(PublishingLog.id).all()

    @router.post("/queue/{job_id}/retry", response_model=JobResponse)
    def retry(job_id: int, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        job = owned_job(db, int(payload["sub"]), job_id)
        post = owned_post(db, int(payload["sub"]), job.post_id, lock=True)
        db.refresh(job)
        if job.status != "failed":
            raise HTTPException(409, "Only confirmed failed jobs can be retried")
        job.status, job.attempts, job.error = "retry", 0, None
        job.run_at = datetime.now(timezone.utc)
        log(db, job, "retry", "Manual retry requested")
        sync_post(db, post)
        db.commit()
        return job

    @router.post("/queue/run", status_code=202)
    def run(background_tasks: BackgroundTasks, payload=Depends(require_permission("posts:write"))):
        from publishing_worker import run_due
        background_tasks.add_task(run_due, user_id=int(payload["sub"]))
        return {"message": "Due jobs queued for background processing; inspect /queue and job logs"}

    return router
