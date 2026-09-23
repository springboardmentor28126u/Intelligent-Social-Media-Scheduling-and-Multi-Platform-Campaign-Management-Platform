from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    platform: str = "All Platforms"
    status: Optional[str] = "active"  # draft, scheduled, active, completed, paused
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = 0.0
    spent: Optional[float] = 0.0
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


class CampaignStatusUpdate(BaseModel):
    status: str  # draft, scheduled, active, completed, paused


class CampaignPostAddRequest(BaseModel):
    post_id: Optional[int] = None
    post_ids: Optional[List[int]] = None


class CampaignStatsResponse(BaseModel):
    campaign_id: int
    name: str
    status: str
    total_posts: int = 0
    draft_posts: int = 0
    scheduled_posts: int = 0
    published_posts: int = 0
    failed_posts: int = 0
    
    reach: int = 0
    impressions: int = 0
    engagement: int = 0
    engagement_rate: float = 0.0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    
    budget: float = 0.0
    spent: float = 0.0
    remaining_budget: float = 0.0
    cost_per_engagement: Optional[float] = None
    cost_per_click: Optional[float] = None
    roi: Optional[float] = None
    roi_status: str = "Real database metrics"


class CampaignComparisonMetric(BaseModel):
    metric_key: str
    label: str
    unit: str = ""
    values: Dict[str, Any]


class CampaignComparisonResponse(BaseModel):
    campaign_ids: List[int]
    campaigns: List[Dict[str, Any]]
    metrics: List[CampaignComparisonMetric]


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
    
    # Real aggregated actuals
    actual_reach: int
    actual_impressions: int = 0
    actual_engagement: float
    actual_clicks: int
    actual_likes: int = 0
    actual_comments: int = 0
    actual_shares: int = 0
    
    roi: float
    roi_formula: Optional[str] = None
    color: str
    tags: Optional[str] = None
    
    # Real post counts breakdown
    posts_count: int = 0
    draft_posts_count: int = 0
    scheduled_posts_count: int = 0
    published_posts_count: int = 0
    failed_posts_count: int = 0
    
    progress_percentage: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None