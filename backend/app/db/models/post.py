import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, JSON, Index
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.db.database import Base


class PostStatusType(TypeDecorator):
    """
    Transparently handles PostgreSQL post_status ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PUBLISHING', 'PENDING_APPROVAL')
    and SQLite String while maintaining lowercase Python/JSON string compatibility.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                PG_ENUM("DRAFT", "SCHEDULED", "PUBLISHED", "FAILED", "PUBLISHING", "PENDING_APPROVAL", name="post_status", create_type=False)
            )
        return dialect.type_descriptor(String(30))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        val_str = getattr(value, "value", value)
        return str(val_str).lower()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        val_str = getattr(value, "value", value)
        return str(val_str).lower()


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    platform = Column(String(50), default="instagram", nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    post_type = Column(String(30), default="text", nullable=False)  # text, image, video, carousel, story, reel
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)  # image, video
    
    status = Column(PostStatusType, default="draft", nullable=False, index=True)  
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

    def __init__(self, **kwargs):
        if "platforms" in kwargs and kwargs["platforms"]:
            plats = kwargs.pop("platforms")
            if isinstance(plats, list) and len(plats) > 0:
                kwargs["platform"] = str(plats[0])
            elif isinstance(plats, str):
                kwargs["platform"] = str(plats)
        if "content_type" in kwargs and kwargs["content_type"]:
            kwargs["post_type"] = kwargs.pop("content_type")
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        if "updated_at" not in kwargs or not kwargs["updated_at"]:
            kwargs["updated_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def platforms(self):
        return [self.platform] if self.platform else ["instagram"]

    @platforms.setter
    def platforms(self, val):
        if isinstance(val, list) and len(val) > 0:
            self.platform = str(val[0])
        elif isinstance(val, str):
            self.platform = str(val)

    @property
    def content_type(self):
        return self.post_type or "text"

    @content_type.setter
    def content_type(self, val):
        self.post_type = str(val) if val else "text"


Index("idx_post_scheduler_status", Post.status, Post.scheduled_at)


class MediaTypeDecorator(TypeDecorator):
    """
    Transparently handles PostgreSQL media_type ENUM ('IMAGE', 'VIDEO')
    and SQLite String while mapping mime types or lowercase strings ('image', 'video', 'image/jpeg', 'video/mp4') to 'IMAGE' / 'VIDEO'.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                PG_ENUM("IMAGE", "VIDEO", name="media_type", create_type=False)
            )
        return dialect.type_descriptor(String(50))

    def process_bind_param(self, value, dialect):
        if value is None:
            return "IMAGE"
        val_str = str(getattr(value, "value", value)).upper()
        if "VIDEO" in val_str or "MP4" in val_str or "MOV" in val_str:
            return "VIDEO"
        return "IMAGE"

    def process_result_value(self, value, dialect):
        if value is None:
            return "image"
        val_str = str(getattr(value, "value", value)).lower()
        return val_str


class PostMedia(Base):
    __tablename__ = "post_media"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), default="image/jpeg", nullable=False)  # image/jpeg, image/png, video/mp4, etc.
    file_size = Column(Integer, default=0)  # in bytes
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    media_order = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    post = relationship("Post", back_populates="media")

    def __init__(self, **kwargs):
        if "file_path" in kwargs and not kwargs.get("file_url"):
            kwargs["file_url"] = kwargs.pop("file_path")
        elif "file_path" in kwargs:
            kwargs.pop("file_path")
        if "mime_type" in kwargs and not kwargs.get("file_type"):
            kwargs["file_type"] = kwargs.pop("mime_type")
        elif "mime_type" in kwargs:
            kwargs.pop("mime_type")
        if "media_type" in kwargs and not kwargs.get("file_type"):
            kwargs["file_type"] = kwargs.pop("media_type")
        elif "media_type" in kwargs:
            kwargs.pop("media_type")
        if "file_name" not in kwargs or not kwargs["file_name"]:
            fp = kwargs.get("file_url") or "media.jpg"
            kwargs["file_name"] = os.path.basename(str(fp))
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def file_path(self):
        return self.file_url

    @file_path.setter
    def file_path(self, val):
        self.file_url = val

    @property
    def media_type(self):
        return self.file_type

    @media_type.setter
    def media_type(self, val):
        self.file_type = val

    @property
    def mime_type(self):
        return self.file_type

    @mime_type.setter
    def mime_type(self, val):
        self.file_type = val


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


class PublishingLogStatusType(TypeDecorator):
    """
    Transparently handles PostgreSQL publishing_log_status ENUM ('SUCCESS', 'FAILED', 'DELETED')
    and SQLite String while mapping 'success'/'published' -> 'SUCCESS', 'error'/'failed' -> 'FAILED'.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                PG_ENUM("SUCCESS", "FAILED", "DELETED", name="publishing_log_status", create_type=False)
            )
        return dialect.type_descriptor(String(30))

    def process_bind_param(self, value, dialect):
        if not value:
            return "SUCCESS"
        val_str = str(getattr(value, "value", value)).upper()
        if val_str in ("SUCCESS", "PUBLISHED", "OK", "INFO"):
            return "SUCCESS"
        elif val_str in ("FAILED", "ERROR", "FAILURE"):
            return "FAILED"
        elif val_str in ("DELETED", "CANCELLED"):
            return "DELETED"
        return "SUCCESS"

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        val_str = getattr(value, "value", value)
        return str(val_str).lower()


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    level = Column(String(20), default="info", nullable=False)  # info, warning, error, success
    event_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    response_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    post = relationship("Post", back_populates="publishing_logs")

    def __init__(self, **kwargs):
        # Ignore legacy kwargs gracefully if passed
        kwargs.pop("social_account_id", None)
        kwargs.pop("platform_response", None)
        kwargs.pop("status", None)
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)