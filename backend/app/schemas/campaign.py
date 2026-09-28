from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    platforms: str  # comma separated
    start_date: datetime
    end_date: datetime
    budget: Optional[float] = 0.0
    objective: Optional[str] = "Increase Brand Awareness"
    status: Optional[str] = "Active"  # Active, Scheduled, Completed, Paused
    target_reach: Optional[int] = 50000
    target_engagement: Optional[int] = 10000

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    platforms: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    objective: Optional[str] = None
    status: Optional[str] = None
    progress_percent: Optional[int] = None
    target_reach: Optional[int] = None
    actual_reach: Optional[int] = None
    target_engagement: Optional[int] = None
    actual_engagement: Optional[int] = None

class CampaignOut(CampaignBase):
    id: int
    user_id: int
    progress_percent: int
    actual_reach: int
    actual_engagement: int
    posts_count: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
