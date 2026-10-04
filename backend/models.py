from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Float, DateTime, Text, JSON
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Content Creator")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    preferences = Column(JSON, nullable=True, default=dict)
    is_active = Column(Boolean, default=True)

    social_accounts = relationship("SocialAccount", back_populates="owner")
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="owner")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    media = relationship("Media", back_populates="user", cascade="all, delete-orphan")


class Media(Base):
    __tablename__ = "media"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # 'image' or 'video'
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="media")


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    category = Column(String, default="general")
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())



class SocialAccount(Base):
    __tablename__ = "social_accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    platform_user_id = Column(String, nullable=True)
    status = Column(String, default="connected")

    owner = relationship("User", back_populates="social_accounts")
    platform_posts = relationship("PostPlatform", back_populates="social_account")


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    completed = "completed"


class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    budget = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.draft, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="campaigns")
    posts = relationship("Post", back_populates="campaign")


class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    media_urls = Column(JSON, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="draft")
    created_at = Column(DateTime(timezone=True), server_default="now()")
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String, nullable=True)
    recurrence_end_date = Column(DateTime(timezone=True), nullable=True)
    post_as_short = Column(Boolean, default=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)

    user = relationship("User", back_populates="posts")
    platform_posts = relationship("PostPlatform", back_populates="post", cascade="all, delete-orphan")
    logs = relationship("PublishLog", back_populates="post", cascade="all, delete-orphan")
    campaign = relationship("Campaign", back_populates="posts")


class PostPlatform(Base):
    __tablename__ = "post_platforms"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id"), nullable=False)
    platform = Column(String, nullable=False)
    status = Column(String, default="pending")
    published_at = Column(DateTime(timezone=True), nullable=True)
    external_post_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)

    post = relationship("Post", back_populates="platform_posts")
    social_account = relationship("SocialAccount", back_populates="platform_posts")


class PublishLog(Base):
    __tablename__ = "publish_logs"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    platform = Column(String, nullable=False)
    event = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")

    post = relationship("Post", back_populates="logs")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    related_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
    post = relationship("Post")
    campaign = relationship("Campaign")