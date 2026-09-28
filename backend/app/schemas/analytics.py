from typing import List, Dict, Any, Optional
from datetime import date
from pydantic import BaseModel

class DailyMetricOut(BaseModel):
    id: int
    platform: str
    metric_date: date
    impressions: int
    reach: int
    engagement: int
    clicks: int
    followers_gained: int
    engagement_rate: float

    class Config:
        from_attributes = True

class AnalyticsOverview(BaseModel):
    total_reach: int
    total_reach_growth: str
    total_engagement: int
    total_engagement_growth: str
    total_impressions: int
    total_impressions_growth: str
    total_clicks: int
    total_clicks_growth: str
    total_followers: int
    total_followers_growth: str
    engagement_rate_avg: float
    posts_scheduled: int
    posts_published: int
    active_campaigns: int

class PlatformPerformance(BaseModel):
    platform: str
    followers: int
    growth: str
    reach: int
    engagement: int
    shares: int
    color: str

class TrendDataPoint(BaseModel):
    date: str
    engagement: int
    reach: int
    impressions: int
    clicks: int

class TopPostItem(BaseModel):
    id: int
    content: str
    platforms: List[str]
    published_at: Optional[str]
    reach: int
    engagement: int
    engagement_rate: str
    media_url: Optional[str]
