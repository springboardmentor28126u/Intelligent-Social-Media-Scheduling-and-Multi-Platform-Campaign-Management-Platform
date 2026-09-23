from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class ReportGenerateRequest(BaseModel):
    title: str
    report_type: str = "engagement"  # engagement, campaign, audience, publishing, platform_comparison
    format: str = "pdf"  # pdf, excel
    platform: Optional[str] = "all"
    campaign_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: int
    title: str
    report_type: str
    format: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    platform: str
    file_url: Optional[str] = None
    file_size: int
    status: str
    summary_data: Optional[Dict[str, Any]] = None
    created_at: datetime
