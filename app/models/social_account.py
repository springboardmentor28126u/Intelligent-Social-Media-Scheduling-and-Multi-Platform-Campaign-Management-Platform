from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import Base


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    platform = Column(
        String(50),
        nullable=False,
    )

    account_name = Column(
        String(255),
        nullable=False,
    )

    platform_user_id = Column(
        String(255),
        nullable=True,
    )

    access_token = Column(
        String,
        nullable=True,
    )

    refresh_token = Column(
        String,
        nullable=True,
    )

    token_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="connected",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    last_synced_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship with User
    user = relationship(
        "User",
        back_populates="social_accounts",
    )

    # Relationship with PostSocialAccount
    posts = relationship(
        "PostSocialAccount",
        back_populates="social_account",
        cascade="all, delete-orphan",
    )

    # Relationship with PublishingLog
    publishing_logs = relationship(
        "PublishingLog",
        back_populates="social_account",
        cascade="all, delete-orphan",
    )