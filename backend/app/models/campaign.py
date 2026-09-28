from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    platforms = Column(String(255), nullable=False)  # "instagram,facebook,linkedin"
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    budget = Column(Float, default=0.0)
    objective = Column(String(100), default="Increase Brand Awareness")
    
    # Status: Active, Scheduled, Completed, Paused
    status = Column(String(50), default="Active")
    progress_percent = Column(Integer, default=0)
    
    target_reach = Column(Integer, default=50000)
    actual_reach = Column(Integer, default=0)
    target_engagement = Column(Integer, default=10000)
    actual_engagement = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("User", back_populates="campaigns")
    posts = relationship("Post", back_populates="campaign")
