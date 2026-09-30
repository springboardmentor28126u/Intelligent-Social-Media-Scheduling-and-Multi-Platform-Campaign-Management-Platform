from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from models import CampaignStatus

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "Content Creator"
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str

class SocialAccountCreate(BaseModel):
    platform: str
    account_name: str
class SocialAccountOut(BaseModel):
    id: int
    platform: str
    account_name: str
    status: str
    class Config:
        from_attributes = True
class PostPlatformOut(BaseModel):
    id: int
    social_account_id: int
    platform: str
    status: str
    published_at: Optional[datetime] = None
    external_post_id: Optional[str] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True
class PostCreate(BaseModel):
    title: Optional[str] = None
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_time: Optional[datetime] = None
    social_account_ids: List[int] = []
    action: str = "schedule"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    post_as_short: bool = False
    campaign_id: Optional[int] = None
class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    scheduled_time: Optional[datetime] = None
    social_account_ids: Optional[List[int]] = None
    action: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    post_as_short: Optional[bool] = None
    campaign_id: Optional[int] = None
class PostOut(BaseModel):
    id: int
    title: Optional[str] = None
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_time: Optional[datetime] = None
    status: str
    created_at: datetime
    is_recurring: Optional[bool] = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    post_as_short: Optional[bool] = False
    campaign_id: Optional[int] = None
    platform_posts: List[PostPlatformOut] = []
    class Config:
        from_attributes = True

class PublishLogOut(BaseModel):
    id: int
    platform: str
    event: str
    message: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[CampaignStatus] = CampaignStatus.draft

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[CampaignStatus] = None

class CampaignOut(CampaignBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    related_post_id: Optional[int] = None
    related_campaign_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int
    total: int
