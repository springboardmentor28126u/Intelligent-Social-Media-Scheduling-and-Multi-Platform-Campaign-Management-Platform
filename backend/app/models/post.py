from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    
    # Content & Adaptations
    content = Column(Text, nullable=False)
    instagram_content = Column(Text, nullable=True)
    linkedin_content = Column(Text, nullable=True)
    twitter_content = Column(Text, nullable=True)
    facebook_content = Column(Text, nullable=True)
    youtube_content = Column(Text, nullable=True)
    pinterest_content = Column(Text, nullable=True)

    # Media and Platforms
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), default="image")  # image, video, carousel
    platforms = Column(String(255), nullable=False)  # comma-separated e.g. "instagram,facebook,linkedin"

    # Status: Draft, Scheduled, Published, Failed, Cancelled, Pending Approval
    status = Column(String(50), default="Draft", index=True)
    
    # Timing
    scheduled_at = Column(DateTime, nullable=True, index=True)
    published_at = Column(DateTime, nullable=True)
    
    # Engagement stats
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    reach_count = Column(Integer, default=0)

    # Metadata
    is_ai_generated = Column(Boolean, default=False)
    failure_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    author = relationship("User", back_populates="posts")
    campaign = relationship("Campaign", back_populates="posts")
