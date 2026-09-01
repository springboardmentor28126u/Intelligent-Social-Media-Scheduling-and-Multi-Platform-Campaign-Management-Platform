from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class SocialPlatformResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    icon: Optional[str] = None
    character_limit: int
    supports_media: bool
    supports_video: bool
    supports_carousel: bool
    is_active: bool


class SocialAccountCreate(BaseModel):
    platform: str
    account_name: str
    account_handle: Optional[str] = None
    account_id: Optional[str] = None
    avatar_url: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    is_demo: Optional[bool] = False
    followers_count: Optional[int] = 0


class ConnectDemoAccountRequest(BaseModel):
    platform: str  # facebook, instagram, linkedin, twitter, youtube, pinterest
    account_name: Optional[str] = None
    account_handle: Optional[str] = None


class SocialAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: int
    team_id: Optional[int] = None
    platform: str
    account_name: str
    account_handle: Optional[str] = None
    account_id: Optional[str] = None
    avatar_url: Optional[str] = None
    followers_count: int
    following_count: int
    posts_count: int
    is_active: bool
    is_demo: bool
    created_at: datetime