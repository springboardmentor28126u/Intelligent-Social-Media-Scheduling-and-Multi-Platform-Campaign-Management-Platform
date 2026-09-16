# app/db/models_pg.py
#
# This file's ONE job: define the actual Postgres TABLES (SQLAlchemy ORM
# models) for Post and PublishingLog. Think of schemas.py (Pydantic) as
# "what shape of data comes in/out of the API", and this file as "what
# shape of data actually sits in the database" — they're related but
# separate, which is normal in FastAPI + SQLAlchemy projects.

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, Integer, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database_pg import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


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