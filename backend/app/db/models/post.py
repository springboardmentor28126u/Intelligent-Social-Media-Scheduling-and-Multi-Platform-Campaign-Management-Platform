import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, JSON, Index
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.db.database import Base


class PostStatusType(TypeDecorator):
    """
    Transparently handles PostgreSQL post_status ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PUBLISHING')
    and SQLite String while maintaining lowercase Python/JSON string compatibility.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                PG_ENUM("DRAFT", "SCHEDULED", "PUBLISHED", "FAILED", "PUBLISHING", name="post_status", create_type=False)
            )
        return dialect.type_descriptor(String(30))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        val_str = getattr(value, "value", value)
        return str(val_str).upper()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        val_str = getattr(value, "value", value)
        return str(val_str).lower()


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(PostStatusType, default="draft", nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    platforms = Column(JSON, nullable=True)
    content_type = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", back_populates="posts")
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan")
    platform_targets = relationship("PostPlatformTarget", back_populates="post", cascade="all, delete-orphan")
    publishing_jobs = relationship("PublishingJob", back_populates="post", cascade="all, delete-orphan")
    publishing_logs = relationship("PublishingLog", back_populates="post", cascade="all, delete-orphan")
    approval_requests = relationship("ApprovalRequest", back_populates="post", cascade="all, delete-orphan", order_by="ApprovalRequest.created_at.desc()")

    def __init__(self, **kwargs):
        if "content_type" not in kwargs or not kwargs["content_type"]:
            kwargs["content_type"] = kwargs.get("post_type") or "text"
        if "platforms" not in kwargs or not kwargs["platforms"]:
            plat = kwargs.get("platform") or "instagram"
            kwargs["platforms"] = [plat] if isinstance(plat, str) else list(plat)
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        if "updated_at" not in kwargs or not kwargs["updated_at"]:
            kwargs["updated_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)

    # Dynamic properties for schema compatibility
    @property
    def uuid(self):
        return getattr(self, "_uuid", None) or f"post-{self.id}"

    @uuid.setter
    def uuid(self, val):
        self._uuid = val

    @property
    def title(self):
        return getattr(self, "_title", None) or ((self.content[:30] + "...") if self.content else "Untitled Post")

    @title.setter
    def title(self, val):
        self._title = val

    @property
    def platform(self):
        if hasattr(self, "_platform") and self._platform:
            return self._platform
        if isinstance(self.platforms, list) and len(self.platforms) > 0:
            return self.platforms[0]
        return "instagram"

    @platform.setter
    def platform(self, val):
        self._platform = val
        if val:
            self.platforms = [val]

    @property
    def post_type(self):
        return getattr(self, "_post_type", None) or self.content_type or "text"

    @post_type.setter
    def post_type(self, val):
        self._post_type = val
        self.content_type = val

    @property
    def media_url(self):
        if hasattr(self, "_media_url") and self._media_url:
            return self._media_url
        if hasattr(self, "media") and self.media:
            return getattr(self.media[0], "file_url", None) or getattr(self.media[0], "file_path", None)
        return None

    @media_url.setter
    def media_url(self, val):
        self._media_url = val

    @property
    def media_type(self):
        if hasattr(self, "_media_type") and self._media_type:
            return self._media_type
        if hasattr(self, "media") and self.media:
            return getattr(self.media[0], "media_type", None)
        return None

    @media_type.setter
    def media_type(self, val):
        self._media_type = val

    @property
    def approval_status(self):
        return getattr(self, "_approval_status", None) or "approved"

    @approval_status.setter
    def approval_status(self, val):
        self._approval_status = val

    @property
    def published_at(self):
        if hasattr(self, "_published_at") and self._published_at:
            return self._published_at
        if self.status and str(self.status).lower() == "published":
            return self.updated_at
        return None

    @published_at.setter
    def published_at(self, val):
        self._published_at = val

    @property
    def retry_count(self):
        return getattr(self, "_retry_count", 0)

    @retry_count.setter
    def retry_count(self, val):
        self._retry_count = val

    @property
    def max_retries(self):
        return getattr(self, "_max_retries", 3)

    @max_retries.setter
    def max_retries(self, val):
        self._max_retries = val

    @property
    def failure_reason(self):
        return getattr(self, "_failure_reason", None)

    @failure_reason.setter
    def failure_reason(self, val):
        self._failure_reason = val

    @property
    def external_post_id(self):
        return getattr(self, "_external_post_id", None)

    @external_post_id.setter
    def external_post_id(self, val):
        self._external_post_id = val

    @property
    def is_recurring(self):
        return getattr(self, "_is_recurring", False)

    @is_recurring.setter
    def is_recurring(self, val):
        self._is_recurring = val

    @property
    def recurrence_rule(self):
        return getattr(self, "_recurrence_rule", None)

    @recurrence_rule.setter
    def recurrence_rule(self, val):
        self._recurrence_rule = val

    @property
    def likes_count(self):
        return getattr(self, "_likes_count", 0)

    @likes_count.setter
    def likes_count(self, val):
        self._likes_count = val

    @property
    def comments_count(self):
        return getattr(self, "_comments_count", 0)

    @comments_count.setter
    def comments_count(self, val):
        self._comments_count = val

    @property
    def shares_count(self):
        return getattr(self, "_shares_count", 0)

    @shares_count.setter
    def shares_count(self, val):
        self._shares_count = val

    @property
    def clicks_count(self):
        return getattr(self, "_clicks_count", 0)

    @clicks_count.setter
    def clicks_count(self, val):
        self._clicks_count = val

    @property
    def reach_count(self):
        return getattr(self, "_reach_count", 0)

    @reach_count.setter
    def reach_count(self, val):
        self._reach_count = val

    @property
    def impressions_count(self):
        return getattr(self, "_impressions_count", 0)

    @impressions_count.setter
    def impressions_count(self, val):
        self._impressions_count = val

    @property
    def tags(self):
        return getattr(self, "_tags", None)

    @tags.setter
    def tags(self, val):
        self._tags = val

    @property
    def metadata_json(self):
        return getattr(self, "_metadata_json", None)

    @metadata_json.setter
    def metadata_json(self, val):
        self._metadata_json = val

    @property
    def team_id(self):
        return getattr(self, "_team_id", None)

    @team_id.setter
    def team_id(self, val):
        self._team_id = val

    @property
    def campaign_id(self):
        return getattr(self, "_campaign_id", None)

    @campaign_id.setter
    def campaign_id(self, val):
        self._campaign_id = val

    @property
    def social_account_id(self):
        return getattr(self, "_social_account_id", None)

    @social_account_id.setter
    def social_account_id(self, val):
        self._social_account_id = val

    @property
    def campaign(self):
        return getattr(self, "_campaign", None)

    @campaign.setter
    def campaign(self, val):
        self._campaign = val

    @property
    def social_account(self):
        return getattr(self, "_social_account", None)

    @social_account.setter
    def social_account(self, val):
        self._social_account = val


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
    media_type = Column(MediaTypeDecorator, default="IMAGE", nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    post = relationship("Post", back_populates="media")

    def __init__(self, **kwargs):
        if "file_path" not in kwargs and "file_url" in kwargs:
            kwargs["file_path"] = kwargs.get("file_url")
        if "file_name" not in kwargs or not kwargs["file_name"]:
            fp = kwargs.get("file_path") or kwargs.get("file_url") or "media.jpg"
            kwargs["file_name"] = os.path.basename(str(fp))
        if "media_type" not in kwargs or not kwargs["media_type"]:
            ft = str(kwargs.get("file_type") or kwargs.get("mime_type") or "image").upper()
            kwargs["media_type"] = "VIDEO" if ("VIDEO" in ft or "MP4" in ft) else "IMAGE"
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def file_url(self):
        return getattr(self, "_file_url", None) or self.file_path

    @file_url.setter
    def file_url(self, val):
        self._file_url = val
        self.file_path = val

    @property
    def file_type(self):
        return getattr(self, "_file_type", None) or self.mime_type or str(self.media_type or "image")

    @file_type.setter
    def file_type(self, val):
        self._file_type = val
        if val and not self.mime_type:
            self.mime_type = val

    @property
    def thumbnail_url(self):
        return getattr(self, "_thumbnail_url", None) or self.file_path

    @thumbnail_url.setter
    def thumbnail_url(self, val):
        self._thumbnail_url = val

    @property
    def media_order(self):
        return getattr(self, "_media_order", 0)

    @media_order.setter
    def media_order(self, val):
        self._media_order = val

    @property
    def metadata_json(self):
        return getattr(self, "_metadata_json", None)

    @metadata_json.setter
    def metadata_json(self, val):
        self._metadata_json = val


class PostPlatformTarget(Base):
    """
    Tracks per-platform publishing status for a single Post.
    One Post → many PostPlatformTarget rows (one per selected social account/platform).
    """
    __tablename__ = "post_platform_targets"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True)

    status = Column(String(30), default="pending", nullable=False, index=True)

    external_post_id = Column(String(255), nullable=True)
    external_url = Column(String(500), nullable=True)
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
    status = Column(String(30), default="queued", nullable=False)
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
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=False)
    status = Column(PublishingLogStatusType, default="SUCCESS", nullable=False)
    message = Column(Text, nullable=True)
    platform_response = Column(Text, nullable=True)
    level = Column(String(20), default="info", nullable=True)
    event_name = Column(String(100), nullable=True)
    response_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    post = relationship("Post", back_populates="publishing_logs")

    def __init__(self, **kwargs):
        if "status" not in kwargs or not kwargs["status"]:
            level_val = kwargs.get("level", "info").lower()
            kwargs["status"] = "FAILED" if level_val == "error" else "SUCCESS"
        if "created_at" not in kwargs or not kwargs["created_at"]:
            kwargs["created_at"] = datetime.now(timezone.utc)
        for k, v in kwargs.items():
            setattr(self, k, v)