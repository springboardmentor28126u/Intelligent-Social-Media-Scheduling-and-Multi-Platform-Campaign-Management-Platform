from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict


class PostMediaCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    thumbnail_url: Optional[str] = None
    media_order: Optional[int] = 0


class PostMediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    thumbnail_url: Optional[str] = None
    media_order: int
    created_at: datetime


# ── Multi-Platform Target Schemas ────────────────────────────────────

class PostPlatformTargetCreate(BaseModel):
    """Specify which platform + connected account to publish to."""
    platform: str                           # facebook, instagram, linkedin, twitter, youtube, pinterest
    social_account_id: Optional[int] = None  # If None, system will pick user's first account for this platform


class PostPlatformTargetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    platform: str
    social_account_id: Optional[int] = None
    status: str                             # pending, publishing, published, failed, cancelled
    external_post_id: Optional[str] = None
    external_url: Optional[str] = None
    error_message: Optional[str] = None
    attempt_count: int
    max_attempts: int
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ── Post Create / Update ─────────────────────────────────────────────

class PostCreate(BaseModel):
    title: Optional[str] = None
    content: str
    platform: str  # primary platform (for backward compat) — facebook, instagram, linkedin, twitter, youtube, pinterest
    post_type: Optional[str] = "text"  # text, image, video, carousel, story, reel
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: Optional[str] = "draft"  # draft, scheduled, pending_approval, published
    approval_status: Optional[str] = "approved"  # pending, approved, rejected
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None
    social_account_id: Optional[int] = None
    tags: Optional[str] = None
    is_recurring: Optional[bool] = False
    recurrence_rule: Optional[str] = None  # daily, weekly, biweekly, monthly
    recurrence_end_date: Optional[datetime] = None
    media: Optional[List[PostMediaCreate]] = []
    # Multi-platform targets — when provided, overrides the single 'platform' field
    platforms: Optional[List[PostPlatformTargetCreate]] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    platform: Optional[str] = None
    post_type: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None
    social_account_id: Optional[int] = None
    tags: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    media: Optional[List[PostMediaCreate]] = None


class PostScheduleRequest(BaseModel):
    scheduled_at: datetime
    is_recurring: Optional[bool] = False
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    # Optional multi-platform overrides when scheduling
    platforms: Optional[List[PostPlatformTargetCreate]] = None


class PostRescheduleRequest(BaseModel):
    scheduled_at: datetime
    reason: Optional[str] = None


class PostApprovalAction(BaseModel):
    action: str  # approve, reject
    rejection_reason: Optional[str] = None


class ApprovalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    post_id: int
    requested_by: int
    reviewed_by: Optional[int] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    creator_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    post_title: Optional[str] = None
    post_content: Optional[str] = None
    post_platform: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class PostCalendarEvent(BaseModel):
    """Lightweight calendar event representation for the calendar view."""
    id: int
    uuid: str
    title: Optional[str] = None
    content: str
    platform: str
    post_type: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: str
    approval_status: Optional[str] = "approved"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    campaign_name: Optional[str] = None
    account_name: Optional[str] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    platform_targets: List[PostPlatformTargetResponse] = []


class QueueStatsResponse(BaseModel):
    """Publishing queue statistics."""
    scheduled_count: int
    failed_count: int
    queued_count: int
    published_today: int
    total_posts: int
    scheduler_running: bool
    next_check_seconds: int = 60


class PublishingLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    level: str
    event_name: str
    message: str
    response_payload: Optional[Dict[str, Any]] = None
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: int
    team_id: Optional[int] = None
    campaign_id: Optional[int] = None
    social_account_id: Optional[int] = None
    title: Optional[str] = None
    content: str
    platform: str
    post_type: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: str
    approval_status: Optional[str] = "approved"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    retry_count: int
    max_retries: int
    failure_reason: Optional[str] = None
    external_post_id: Optional[str] = None
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    likes_count: int
    comments_count: int
    shares_count: int
    clicks_count: int
    reach_count: int
    impressions_count: int
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    media: List[PostMediaResponse] = []
    platform_targets: List[PostPlatformTargetResponse] = []
    author_name: Optional[str] = None
    campaign_name: Optional[str] = None
    account_name: Optional[str] = None