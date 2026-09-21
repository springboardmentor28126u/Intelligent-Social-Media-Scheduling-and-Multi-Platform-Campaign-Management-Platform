from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database.base import Base


class CampaignPerformanceHistory(Base):
    __tablename__ = "campaign_performance_history"

    id = Column(Integer, primary_key=True, index=True)

    campaign_id = Column(
        Integer,
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    reach = Column(Integer, nullable=True)

    engagement = Column(Float, nullable=True)

    clicks = Column(Integer, nullable=True)

    roi = Column(Float, nullable=True)

    campaign = relationship(
        "Campaign",
        back_populates="performance_history",
    )