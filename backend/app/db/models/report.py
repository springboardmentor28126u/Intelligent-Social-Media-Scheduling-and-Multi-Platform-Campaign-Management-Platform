import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Float
from app.db.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    report_type = Column(String(50), nullable=False)  # engagement, campaign, audience, publishing, platform_comparison
    format = Column(String(10), default="pdf", nullable=False)  # pdf, excel
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    platform = Column(String(50), default="all")

    file_url = Column(String(500), nullable=True)
    file_size = Column(Integer, default=0)
    status = Column(String(30), default="completed", nullable=False)  # pending, completed, failed
    
    summary_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
