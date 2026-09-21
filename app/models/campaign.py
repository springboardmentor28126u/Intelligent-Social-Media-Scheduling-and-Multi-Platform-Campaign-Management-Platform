from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship

from app.database.base import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    # =====================================
    # Primary Key
    # =====================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =====================================
    # Campaign Identity
    # =====================================

    uuid = Column(
        String(36),
        nullable=True,
        unique=True,
        index=True,
    )

    # =====================================
    # Ownership
    # =====================================

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    team_id = Column(
        Integer,
        nullable=True,
    )

    # =====================================
    # Campaign Details
    # =====================================

    name = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    platform = Column(
        String(100),
        nullable=False,
    )

    status = Column(
        String(30),
        nullable=False,
    )

    # =====================================
    # Campaign Schedule
    # =====================================

    start_date = Column(
        DateTime,
        nullable=True,
    )

    end_date = Column(
        DateTime,
        nullable=True,
    )

    # =====================================
    # Budget
    # =====================================

    budget = Column(
        Float,
        nullable=True,
    )

    spent = Column(
        Float,
        nullable=True,
    )

    currency = Column(
        String(10),
        nullable=True,
    )

    # =====================================
    # Objectives & Target Metrics
    # =====================================

    objectives = Column(
        String(255),
        nullable=True,
    )

    target_audience = Column(
        String(255),
        nullable=True,
    )

    target_reach = Column(
        Integer,
        nullable=True,
    )

    target_engagement = Column(
        Float,
        nullable=True,
    )

    target_clicks = Column(
        Integer,
        nullable=True,
    )

    # =====================================
    # Actual Performance
    # =====================================

    actual_reach = Column(
        Integer,
        nullable=True,
    )

    actual_engagement = Column(
        Float,
        nullable=True,
    )

    actual_clicks = Column(
        Integer,
        nullable=True,
    )

    roi = Column(
        Float,
        nullable=True,
    )

    # =====================================
    # Display & Metadata
    # =====================================

    color = Column(
        String(30),
        nullable=True,
    )

    tags = Column(
        String(255),
        nullable=True,
    )

    metadata_json = Column(
        JSON,
        nullable=True,
    )

    # =====================================
    # Timestamps
    # =====================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=True,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True,
    )

    # =====================================
    # Relationships
    # =====================================

    posts = relationship(
        "Post",
        back_populates="campaign",
    )

    performance_history = relationship(
        "CampaignPerformanceHistory",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )