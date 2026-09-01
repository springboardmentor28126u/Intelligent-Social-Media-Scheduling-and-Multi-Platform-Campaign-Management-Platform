from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Date
from app.db.database import Base


class AnalyticsMetric(Base):
    __tablename__ = "analytics_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    platform = Column(String(50), nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest, all
    
    date = Column(Date, nullable=False, index=True)
    
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)  # in %
    clicks = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    followers_count = Column(Integer, default=0)
    followers_growth = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AudienceMetric(Base):
    __tablename__ = "audience_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    age_group = Column(String(50), nullable=True)  # 18-24, 25-34, 35-44, 45-54, 55+
    gender = Column(String(20), nullable=True)  # male, female, other
    percentage = Column(Float, default=0.0)
    
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
