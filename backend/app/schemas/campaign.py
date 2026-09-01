from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    platform: str = "All Platforms"
    status: Optional[str] = "active"  # draft, active, paused, completed
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    objectives: Optional[str] = "Brand Awareness"
    target_audience: Optional[str] = None
    target_reach: Optional[int] = 50000
    target_engagement: Optional[float] = 5.0
    target_clicks: Optional[int] = 2000
    color: Optional[str] = "#2563eb"
    tags: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    spent: Optional[float] = None
    currency: Optional[str] = None
    objectives: Optional[str] = None
    target_audience: Optional[str] = None
    target_reach: Optional[int] = None
    target_engagement: Optional[float] = None
    target_clicks: Optional[int] = None
    color: Optional[str] = None
    tags: Optional[str] = None


class CampaignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: int
    team_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    platform: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: float
    spent: float
    currency: str
    objectives: Optional[str] = None
    target_audience: Optional[str] = None
    target_reach: int
    target_engagement: float
    target_clicks: int
    actual_reach: int
    actual_engagement: float
    actual_clicks: int
    roi: float
    color: str
    tags: Optional[str] = None
    posts_count: int = 0
    progress_percentage: int = 0
    created_at: datetime