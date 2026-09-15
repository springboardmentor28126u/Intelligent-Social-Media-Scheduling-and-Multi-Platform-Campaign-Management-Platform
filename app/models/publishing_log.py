from datetime import datetime
from enum import Enum

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class PublishingLogStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    DELETED = "DELETED"


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    social_account_id: Mapped[int] = mapped_column(
        ForeignKey(
            "social_accounts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[PublishingLogStatus] = mapped_column(
        SQLEnum(
            PublishingLogStatus,
            name="publishing_log_status",
        ),
        nullable=False,
    )

    message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    platform_response: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    post: Mapped["Post"] = relationship(
        "Post",
        back_populates="publishing_logs",
    )

    social_account: Mapped["SocialAccount"] = relationship(
        "SocialAccount",
        back_populates="publishing_logs",
    )