from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class PostBase(BaseModel):
    content: str
    platforms: str  # comma separated e.g. "instagram,facebook,linkedin"
    media_url: Optional[str] = None
    media_type: Optional[str] = "image"
    campaign_id: Optional[int] = None
    
    # Platform-specific adaptations
    instagram_content: Optional[str] = None
    linkedin_content: Optional[str] = None
    twitter_content: Optional[str] = None
    facebook_content: Optional[str] = None
    youtube_content: Optional[str] = None
    pinterest_content: Optional[str] = None
    
    status: Optional[str] = "Draft"  # Draft, Scheduled, Published, Failed, Cancelled, Pending Approval
    scheduled_at: Optional[datetime] = None
    is_ai_generated: Optional[bool] = False

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    content: Optional[str] = None
    platforms: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    campaign_id: Optional[int] = None
    instagram_content: Optional[str] = None
    linkedin_content: Optional[str] = None
    twitter_content: Optional[str] = None
    facebook_content: Optional[str] = None
    youtube_content: Optional[str] = None
    pinterest_content: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_ai_generated: Optional[bool] = None

class PostScheduleRequest(BaseModel):
    scheduled_at: datetime

class PostOut(PostBase):
    id: int
    user_id: int
    published_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    clicks_count: int = 0
    reach_count: int = 0
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CalendarPostItem(BaseModel):
    id: int
    content: str
    platforms: List[str]
    status: str
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    media_url: Optional[str]
