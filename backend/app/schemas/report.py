from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel

class ReportGenerateRequest(BaseModel):
    title: str
    report_type: str  # engagement, campaign, audience_growth, publishing, platform_comparison
    date_range: str = "last_30_days"
    platforms: str = "all"
    format: str = "PDF"  # PDF, CSV, Excel

class ReportOut(BaseModel):
    id: int
    user_id: int
    title: str
    report_type: str
    date_range: str
    platforms: str
    format: str
    summary_data: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportSummaryData(BaseModel):
    total_posts: int
    total_reach: int
    total_engagement: int
    avg_engagement_rate: float
    top_platform: str
    top_performing_post: str
    growth_metric: str
