import sys
import os
import platform
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.db.models.team import Team
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post, PublishingLog
from app.db.models.campaign import Campaign
from app.db.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AdminDashboardResponse
from app.schemas.post import QueueStatsResponse
from app.core.security import require_roles
from app.services.scheduler import publish_post_now


router = APIRouter(
    prefix="/admin",
    tags=["Admin & Monitoring"]
)


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    """Admin dashboard with platform-wide statistics."""
    total_users = db.query(User).count()
    active_teams = db.query(Team).count()
    connected_accounts = db.query(SocialAccount).count()
    total_posts = db.query(Post).count()
    published_posts = db.query(Post).filter(Post.status == "published").count()
    scheduled_posts = db.query(Post).filter(Post.status == "scheduled").count()
    failed_posts = db.query(Post).filter(Post.status == "failed").count()
    pending_approvals = db.query(Post).filter((Post.status == "pending_approval") | (Post.approval_status == "pending")).count()
    total_campaigns = db.query(Campaign).count()

    recent_logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
        .all()
    )

    system_status = {
        "python_version": sys.version.split()[0],
        "os": platform.system(),
        "platform_release": platform.release(),
        "database": "online",
        "scheduler": "running (APScheduler, 60s interval)",
        "queue": "active",
    }

    return AdminDashboardResponse(
        total_users=total_users,
        active_teams=active_teams,
        connected_accounts=connected_accounts,
        total_posts=total_posts,
        published_posts=published_posts,
        scheduled_posts=scheduled_posts,
        failed_posts=failed_posts,
        pending_approvals=pending_approvals,
        total_campaigns=total_campaigns,
        recent_logs=[AuditLogResponse.model_validate(l) for l in recent_logs],
        system_status=system_status
    )


@router.get("/queue-stats", response_model=QueueStatsResponse)
def get_queue_stats(
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    """Real-time publishing queue statistics."""
    scheduled_count = db.query(Post).filter(Post.status == "scheduled").count()
    failed_count = db.query(Post).filter(Post.status == "failed").count()
    
    # Posts that are due for publishing (scheduled_at <= now)
    now = datetime.now(timezone.utc)
    queued_count = (
        db.query(Post)
        .filter(Post.status == "scheduled", Post.scheduled_at <= now)
        .count()
    )

    # Posts published today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    published_today = (
        db.query(Post)
        .filter(Post.status == "published", Post.published_at >= today_start)
        .count()
    )

    total_posts = db.query(Post).count()

    return QueueStatsResponse(
        scheduled_count=scheduled_count,
        failed_count=failed_count,
        queued_count=queued_count,
        published_today=published_today,
        total_posts=total_posts,
        scheduler_running=True,
        next_check_seconds=60
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    """Retrieve system audit logs."""
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs


@router.post("/retry-failed-jobs")
def retry_all_failed_jobs(
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    """Retry all failed publishing jobs (admin only)."""
    failed_posts = db.query(Post).filter(Post.status == "failed").all()
    retried_count = 0
    for p in failed_posts:
        if p.retry_count < p.max_retries:
            p.retry_count = 0
            p.failure_reason = None
            p.status = "scheduled"
            db.commit()
            publish_post_now(p.id, db=db)
            retried_count += 1

    return {"message": f"Successfully triggered retry for {retried_count} failed jobs."}


@router.get("/pending-approvals")
def get_admin_pending_approvals(
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    """Retrieve all pending approval requests for admin dashboard."""
    from app.api.routes.approvals import _format_approval_response
    from app.db.models.approval import ApprovalRequest
    requests = db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending").order_by(ApprovalRequest.created_at.desc()).all()
    return [_format_approval_response(r) for r in requests]

