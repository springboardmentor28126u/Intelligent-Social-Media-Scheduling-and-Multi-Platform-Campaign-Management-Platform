import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


class SocialPlatform(Base):
    __tablename__ = "social_platforms"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    name = Column(String(100), nullable=False)
    icon = Column(String(100), nullable=True)
    character_limit = Column(Integer, default=2200)
    supports_media = Column(Boolean, default=True)
    supports_video = Column(Boolean, default=True)
    supports_carousel = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    
    platform = Column(String(50), nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    account_name = Column(String(150), nullable=False)
    account_handle = Column(String(150), nullable=True)
    account_id = Column(String(150), nullable=True)  # Social network unique user/page ID
    avatar_url = Column(String(500), nullable=True)
    
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    posts_count = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    is_demo = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="social_accounts")
    posts = relationship("Post", back_populates="social_account")