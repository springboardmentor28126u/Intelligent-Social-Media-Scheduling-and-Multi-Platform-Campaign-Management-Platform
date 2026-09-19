import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    platform = Column(String(100), nullable=False)  # All Platforms, Instagram + Facebook, etc.
    status = Column(String(30), default="active", nullable=False)  # draft, active, paused, completed
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    budget = Column(Float, default=0.0)
    spent = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")

    objectives = Column(String(255), nullable=True)  # Brand Awareness, Lead Generation, Conversions, Engagement
    target_audience = Column(String(255), nullable=True)
    
    # Target Goals vs Actuals
    target_reach = Column(Integer, default=50000)
    target_engagement = Column(Float, default=5.0)  # in %
    target_clicks = Column(Integer, default=2000)
    
    actual_reach = Column(Integer, default=0)
    actual_engagement = Column(Float, default=0.0)
    actual_clicks = Column(Integer, default=0)
    roi = Column(Float, default=0.0)  # e.g., 2.4x
    
    color = Column(String(30), default="#2563eb")
    tags = Column(String(255), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="campaigns")
    posts = relationship("Post", secondary="campaign_posts", backref="campaigns")


class CampaignPost(Base):
    __tablename__ = "campaign_posts"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))