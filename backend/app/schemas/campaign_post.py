from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


CampaignPostStatus = Literal["draft", "scheduled", "published", "failed"]


class CampaignPostCreate(BaseModel):
    content: str = Field(..., min_length=1)
    social_account_id: int
    scheduled_at: Optional[datetime] = None
    media_url: Optional[str] = None
    media_type: Optional[Literal["image", "video"]] = None
    media_filename: Optional[str] = None
    status: Literal["draft", "scheduled"] = "draft"

    @validator("content")
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Post content cannot be empty")
        return value


class CampaignPostResponse(BaseModel):
    id: int
    campaign_id: int
    user_id: int
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    media_filename: Optional[str] = None
    social_account_id: Optional[int] = None
    platform: Optional[str] = None
    username: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: CampaignPostStatus
