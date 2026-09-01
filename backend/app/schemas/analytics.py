from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class MetricDataPoint(BaseModel):
    date: str
    reach: int
    impressions: int
    engagement: int
    clicks: int
    likes: int
    comments: int
    shares: int
    followers: int


class PlatformDistribution(BaseModel):
    platform: str
    count: int
    engagement: int
    reach: int
    percentage: float


class DemographicItem(BaseModel):
    label: str
    value: float


class AnalyticsOverviewResponse(BaseModel):
    total_posts: int
    scheduled_posts: int
    total_reach: int
    total_impressions: int
    total_engagement: int
    average_engagement_rate: float
    total_clicks: int
    total_followers: int
    reach_growth_pct: float
    engagement_growth_pct: float
    followers_growth_pct: float
    timeline: List[MetricDataPoint]
    platforms: List[PlatformDistribution]
    demographics_age: List[DemographicItem]
    demographics_gender: List[DemographicItem]
    demographics_location: List[DemographicItem]
