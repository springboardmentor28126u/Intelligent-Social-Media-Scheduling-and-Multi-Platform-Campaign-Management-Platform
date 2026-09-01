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
    social_account_ids: List[int]
class PostOut(BaseModel):
    id: int
    title: Optional[str] = None
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_time: Optional[datetime] = None
    status: str
    created_at: datetime
    platform_posts: List[PostPlatformOut] = []
    class Config:
        from_attributes = True
