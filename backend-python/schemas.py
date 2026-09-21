from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class SocialAccountCreate(BaseModel):
    platform: str
    username: str


class CampaignCreate(BaseModel):
    campaign_name: str
    description: Optional[str] = None
    status: str = "draft"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class PostCreate(BaseModel):
    campaign_id: int
    account_id: int
    content: str
    media_url: Optional[str] = None
    scheduled_time: Optional[str] = None