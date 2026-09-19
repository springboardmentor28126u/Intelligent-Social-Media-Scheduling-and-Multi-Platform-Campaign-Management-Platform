from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class MetricDataPoint(BaseModel):
    date: str
    reach: int = 0
    impressions: int = 0
    engagement: int = 0
    clicks: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    followers: Optional[int] = None
    instagram_engagement: Optional[int] = 0
    linkedin_engagement: Optional[int] = 0
    facebook_engagement: Optional[int] = 0
    x_engagement: Optional[int] = 0
    twitter_engagement: Optional[int] = 0
    pinterest_engagement: Optional[int] = 0
    youtube_engagement: Optional[int] = 0


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
    total_followers: Optional[int] = None
    reach_growth_pct: Optional[float] = None
    engagement_growth_pct: Optional[float] = None
    followers_growth_pct: Optional[float] = None
    posts_growth_pct: Optional[float] = None
    clicks_growth_pct: Optional[float] = None
    timeline: List[MetricDataPoint]
    platforms: List[PlatformDistribution]
    demographics_age: List[DemographicItem] = []
    demographics_gender: List[DemographicItem] = []
    demographics_location: List[DemographicItem] = []
