from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
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
