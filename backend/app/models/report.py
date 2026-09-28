from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    report_type = Column(String(50), nullable=False)  # engagement, campaign, audience_growth, publishing, platform_comparison
    date_range = Column(String(50), default="last_30_days")
    platforms = Column(String(255), default="all")
    format = Column(String(20), default="PDF")  # PDF, Excel, CSV
    summary_data = Column(Text, nullable=True)  # JSON serialized preview summary
    file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
