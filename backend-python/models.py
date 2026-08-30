from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
)

from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# USER MODEL
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
        default=datetime.utcnow
    )

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


# ============================================================
# DATASET MODEL
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
# SCENARIO MODEL
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
# SIMULATION RESULT MODEL
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
# CHAT MESSAGE MODEL
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
# SOCIAL ACCOUNT MODEL
# ============================================================

class SocialAccount(Base):
    __tablename__ = "social_accounts"

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

    platform = Column(
        String(50),
        nullable=False
    )

    account_name = Column(
        String(150),
        nullable=False
    )

    access_token = Column(
        String(500),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    connected_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="social_accounts"
    )