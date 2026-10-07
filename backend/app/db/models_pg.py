# app/db/models_pg.py
#
# This file's ONE job: define the actual Postgres TABLES (SQLAlchemy ORM
# models) for Post and PublishingLog. Think of schemas.py (Pydantic) as
# "what shape of data comes in/out of the API", and this file as "what
# shape of data actually sits in the database" — they're related but
# separate, which is normal in FastAPI + SQLAlchemy projects.

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, Integer, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database_pg import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())

class SocialConnection(Base):
    """
    One row = one user's connection to one platform (e.g. their LinkedIn).
    Stores the OAuth token we need to post on their behalf.
    """
    __tablename__ = "social_connections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Same isolation pattern as every other table: filter by this always.
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)

    platform: Mapped[str] = mapped_column(String(30), nullable=False)  # e.g. "linkedin"

    # The user's ID on that platform (LinkedIn "sub"), needed to build the post author URN.
    platform_user_id: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)

    # Plain text for the demo. Encrypt before any real production use.
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # One connection per platform per user.
    __table_args__ = (
        UniqueConstraint("user_id", "platform", name="uq_social_user_platform"),
    )


class Post(Base):
    __tablename__ = "posts"

    # Same UUID-string style your Mongo auth already uses for user_id,
    # so isolation logic (WHERE user_id = ...) works identically.
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # No foreign key to a "users" table on purpose — your users live in
    # MongoDB, not Postgres. We just trust the UUID string coming from
    # your JWT's get_current_user() dependency, same as before.
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)

    post_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # A Postgres-native array column, e.g. ["facebook", "instagram"].
    # Stored as plain text values (not a Postgres ENUM type) to keep
    # migrations simple if you add new platforms later.
    platforms: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Kept as a plain string column (not a native Postgres ENUM type) —
    # validation of allowed values ("draft"/"scheduled"/etc.) happens in
    # Pydantic (schemas.py), which is easier to change later than a DB enum.
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")

    # New fields needed for Milestone 2 (weren't in Mongo version):
    campaign_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[str | None] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Speeds up the calendar endpoint (Step 5), which will filter by
    # user_id AND a scheduled_at date range together.
    __table_args__ = (
        Index("ix_posts_user_scheduled", "user_id", "scheduled_at"),
    )


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Not a strict SQLAlchemy ForeignKey to posts.id on purpose — keeps
    # this table safe to write to even in an edge case where the post
    # lookup races with a delete. We still always set it correctly in code.
    post_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)

    # "success" or "failed" — written by the mock publisher in Step 6.
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Same pattern as Post.user_id — no FK, just trust the JWT's user id.
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Array like Post.platforms, so one campaign can span multiple
    # platforms even though the brief lists "Platform" as one field.
    platforms: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Numeric-ish value kept as a plain float for now — no currency
    # handling needed since this is a mocked/simulated budget.
    budget: Mapped[float] = mapped_column(nullable=False, default=0.0)

    objectives: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "active"/"completed"/"paused" — validated in Pydantic, same as
    # Post.status, not as a DB-level enum.
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

class PostEngagement(Base):
    """
    One row per (post, platform) once the post is published.
    Mock numbers for now; real platform APIs can fill the same columns later.
    """
    __tablename__ = "post_engagement"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    post_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)

    likes: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)

    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)