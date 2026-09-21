from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.campaign import Campaign

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Text,
    String,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.base import Base


class PostStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"


class Post(Base):
    __tablename__ = "posts"

    # =====================================
    # Primary Key
    # =====================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =====================================
    # User
    # =====================================

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # =====================================
    # Campaign
    # =====================================

    campaign_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "campaigns.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # =====================================
    # Post Content
    # =====================================

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    content_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="text",
    )

    # =====================================
    # Post Status
    # =====================================

    status: Mapped[PostStatus] = mapped_column(
        SQLEnum(
            PostStatus,
            name="post_status",
        ),
        nullable=False,
        default=PostStatus.DRAFT,
    )

    # =====================================
    # Platforms
    # =====================================

    platforms: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # =====================================
    # Scheduled Time
    # =====================================

    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # =====================================
    # Recurring Post
    # =====================================

    is_recurring: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    recurrence_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    recurrence_end_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # =====================================
    # Timestamps
    # =====================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # =====================================
    # Relationships
    # =====================================

    user: Mapped["User"] = relationship(
        "User",
        back_populates="posts",
    )

    campaign: Mapped["Campaign | None"] = relationship(
        "Campaign",
        back_populates="posts",
    )

    social_accounts: Mapped[
        list["PostSocialAccount"]
    ] = relationship(
        "PostSocialAccount",
        back_populates="post",
        cascade="all, delete-orphan",
    )

    publishing_logs: Mapped[
        list["PublishingLog"]
    ] = relationship(
        "PublishingLog",
        back_populates="post",
        cascade="all, delete-orphan",
    )

    # =====================================
    # Post Media
    # =====================================

    media: Mapped[list["PostMedia"]] = relationship(
        "PostMedia",
        back_populates="post",
        cascade="all, delete-orphan",
    )