from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class SocialAccountBase(BaseModel):
    platform: str
    account_name: str
    account_handle: str
    avatar_url: Optional[str] = None
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    growth_rate: Optional[str] = "+0%"
    is_connected: Optional[bool] = True
    token_status: Optional[str] = "Valid"

class SocialAccountCreate(SocialAccountBase):
    access_token: Optional[str] = "mock_token_key"

class SocialAccountConnectRequest(BaseModel):
    platform: str
    account_handle: Optional[str] = None
    account_name: Optional[str] = None

class SocialAccountOut(SocialAccountBase):
    id: int
    user_id: int
    connected_at: datetime
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True
