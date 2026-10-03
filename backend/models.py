from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    JSON,
)

from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

from database import Base


# ============================================================
# ENUMS
# ============================================================

class SystemRole(PyEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class PostStatus(PyEnum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    PUBLISHING = "PUBLISHING"


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(50),
        nullable=False,
        default="content_creator"
    )

    system_role = Column(
        PGEnum(
            SystemRole,
            name="system_role",
            create_type=False
        ),
        nullable=False,
        default=SystemRole.USER
    )

    reset_token = Column(
        String(255),
        nullable=True
    )

    reset_token_expiry = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    datasets = relationship(
        "Dataset",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    scenarios = relationship(
        "Scenario",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    chat_messages = relationship(
        "ChatMessage",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    social_accounts = relationship(
        "SocialAccount",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    posts = relationship(
        "Post",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    campaigns = relationship(
        "Campaign",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# ============================================================
# DATASET
# ============================================================

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    filename = Column(
        String(255),
        nullable=False
    )

    dataset_type = Column(
        String(100),
        nullable=True
    )

    row_count = Column(
        Integer,
        default=0
    )

    column_count = Column(
        Integer,
        default=0
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="datasets"
    )

    scenarios = relationship(
        "Scenario",
        back_populates="dataset",
        cascade="all, delete-orphan"
    )


# ============================================================
# SCENARIO
# ============================================================

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    dataset_id = Column(
        Integer,
        ForeignKey("datasets.id"),
        nullable=True
    )

    name = Column(
        String(200),
        nullable=False
    )

    question = Column(
        Text,
        nullable=False
    )

    decision_type = Column(
        String(100),
        nullable=True
    )

    variable = Column(
        String(100),
        nullable=True
    )

    direction = Column(
        String(50),
        nullable=True
    )

    magnitude = Column(
        Float,
        nullable=True
    )

    risk_score = Column(
        Float,
        nullable=True
    )

    confidence = Column(
        Float,
        nullable=True
    )

    recommendation = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="scenarios"
    )

    dataset = relationship(
        "Dataset",
        back_populates="scenarios"
    )

    simulation_results = relationship(
        "SimulationResult",
        back_populates="scenario",
        cascade="all, delete-orphan"
    )

    chat_messages = relationship(
        "ChatMessage",
        back_populates="scenario"
    )


# ============================================================
# SIMULATION RESULT
# ============================================================

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    scenario_id = Column(
        Integer,
        ForeignKey("scenarios.id"),
        nullable=False
    )

    metric_name = Column(
        String(100),
        nullable=False
    )

    baseline_value = Column(
        Float,
        nullable=True
    )

    predicted_value = Column(
        Float,
        nullable=True
    )

    delta = Column(
        Float,
        nullable=True
    )

    delta_percentage = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    scenario = relationship(
        "Scenario",
        back_populates="simulation_results"
    )


# ============================================================
# CHAT MESSAGE
# ============================================================

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    scenario_id = Column(
        Integer,
        ForeignKey("scenarios.id"),
        nullable=True
    )

    role = Column(
        String(50),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="chat_messages"
    )

    scenario = relationship(
        "Scenario",
        back_populates="chat_messages"
    )


# ============================================================
# SOCIAL ACCOUNT
# ============================================================

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(
        Integer,
        primary_key=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    platform = Column(
        String(50),
        nullable=False
    )

    account_name = Column(
        String(255),
        nullable=False
    )

    platform_user_id = Column(
        String(255),
        nullable=True
    )

    access_token = Column(
        Text,
        nullable=True
    )

    refresh_token = Column(
        Text,
        nullable=True
    )

    credentials = Column(
        Text,
        nullable=True
    )

    token_expires_at = Column(
        DateTime,
        nullable=True
    )

    status = Column(
        String(50),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    last_synced_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="social_accounts"
    )


# ============================================================
# POST
# ============================================================

class Post(Base):
    __tablename__ = "posts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    platforms = Column(
        JSON,
        nullable=False
    )

    content_type = Column(
        String(50),
        nullable=False,
        default="text"
    )

    media_url = Column(
        Text,
        nullable=True
    )

    status = Column(
        PGEnum(
            PostStatus,
            name="post_status",
            create_type=False
        ),
        nullable=False,
        default=PostStatus.DRAFT
    )

    scheduled_at = Column(
        DateTime,
        nullable=True
    )

    # --------------------------------------------------------
    # Milestone 3
    # --------------------------------------------------------

    campaign_id = Column(
        Integer,
        ForeignKey(
            "campaigns.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="posts"
    )

    campaign = relationship(
        "Campaign",
        back_populates="posts"
    )


# ============================================================
# CAMPAIGN
# ============================================================

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    platform = Column(
        String(100),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="draft"
    )

    start_date = Column(
        DateTime,
        nullable=True
    )

    end_date = Column(
        DateTime,
        nullable=True
    )

    budget = Column(
        Float,
        nullable=True
    )

    spent = Column(
        Float,
        nullable=True
    )

    currency = Column(
        String(10),
        nullable=True
    )

    objectives = Column(
        String(255),
        nullable=True
    )

    target_audience = Column(
        String(255),
        nullable=True
    )

    target_reach = Column(
        Integer,
        nullable=True
    )

    target_engagement = Column(
        Float,
        nullable=True
    )

    target_clicks = Column(
        Integer,
        nullable=True
    )

    actual_reach = Column(
        Integer,
        nullable=True
    )

    actual_engagement = Column(
        Float,
        nullable=True
    )

    actual_clicks = Column(
        Integer,
        nullable=True
    )

    roi = Column(
        Float,
        nullable=True
    )

    color = Column(
        String(30),
        nullable=True
    )

    tags = Column(
        String(255),
        nullable=True
    )

    metadata_json = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="campaigns"
    )

    posts = relationship(
        "Post",
        back_populates="campaign"
    )

    performance_history = relationship(
        "CampaignPerformanceHistory",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )


# ============================================================
# CAMPAIGN PERFORMANCE HISTORY
# ============================================================

class CampaignPerformanceHistory(Base):
    __tablename__ = "campaign_performance_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    campaign_id = Column(
        Integer,
        ForeignKey(
            "campaigns.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    reach = Column(
        Integer,
        nullable=True
    )

    engagement = Column(
        Float,
        nullable=True
    )

    clicks = Column(
        Integer,
        nullable=True
    )

    roi = Column(
        Float,
        nullable=True
    )

    campaign = relationship(
        "Campaign",
        back_populates="performance_history"
    )