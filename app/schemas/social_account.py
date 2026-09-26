from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SocialAccountCreate(BaseModel):
    platform: str
    account_name: str
    platform_user_id: Optional[str] = None


class SocialAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class SocialAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    platform: str
    account_name: str
    platform_user_id: Optional[str] = None
    status: str
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime