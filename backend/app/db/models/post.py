import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, JSON, Float, Index
from sqlalchemy.orm import relationship
from app.db.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    platform = Column(String(50), nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    post_type = Column(String(30), default="text", nullable=False)  # text, image, video, carousel, story, reel
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)  # image, video
    
    status = Column(String(30), default="draft", nullable=False, index=True)  
    # statuses: draft, pending_approval, scheduled, publishing, published, failed, cancelled

    approval_status = Column(String(30), default="approved", nullable=False, index=True)
    # approval statuses: pending, approved, rejected

    scheduled_at = Column(DateTime, nullable=True, index=True)
    published_at = Column(DateTime, nullable=True)
    
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    failure_reason = Column(Text, nullable=True)
    external_post_id = Column(String(255), nullable=True)

    # Recurring configuration
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(50), nullable=True)  # daily, weekly, biweekly, monthly

    # Metrics snapshot
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    reach_count = Column(Integer, default=0)
    impressions_count = Column(Integer, default=0)

    tags = Column(String(255), nullable=True)  # Comma separated hashtags
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="posts")
    social_account = relationship("SocialAccount", back_populates="posts")
    campaign = relationship("Campaign", back_populates="posts")
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan", order_by="PostMedia.media_order")
    platform_targets = relationship("PostPlatformTarget", back_populates="post", cascade="all, delete-orphan")
    publishing_jobs = relationship("PublishingJob", back_populates="post", cascade="all, delete-orphan")
    publishing_logs = relationship("PublishingLog", back_populates="post", cascade="all, delete-orphan")
    approval_requests = relationship("ApprovalRequest", back_populates="post", cascade="all, delete-orphan", order_by="ApprovalRequest.created_at.desc()")


Index("idx_post_scheduler_status", Post.status, Post.scheduled_at)


class PostMedia(Base):
    __tablename__ = "post_media"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # image/jpeg, image/png, video/mp4, etc.
    file_size = Column(Integer, default=0)  # in bytes
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    media_order = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("Post", back_populates="media")


class PostPlatformTarget(Base):
    """
    Tracks per-platform publishing status for a single Post.
    One Post → many PostPlatformTarget rows (one per selected social account/platform).
    This enables independent status, retry, and external_post_id per platform.
    """
    __tablename__ = "post_platform_targets"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True)

    # Per-platform publishing state
    status = Column(String(30), default="pending", nullable=False, index=True)
    # statuses: pending, publishing, published, failed, cancelled

    external_post_id = Column(String(255), nullable=True)   # ID returned by the platform API
    external_url = Column(String(500), nullable=True)        # URL to the published content
    error_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("Post", back_populates="platform_targets")
    social_account = relationship("SocialAccount")


Index("idx_platform_target_status", PostPlatformTarget.post_id, PostPlatformTarget.status)


class PublishingJob(Base):
    __tablename__ = "publishing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    celery_task_id = Column(String(255), nullable=True, index=True)
    status = Column(String(30), default="queued", nullable=False)  # queued, processing, completed, failed
    attempts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    scheduled_time = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("Post", back_populates="publishing_jobs")


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    level = Column(String(20), default="info", nullable=False)  # info, warning, error, success
    event_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    response_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("Post", back_populates="publishing_logs")