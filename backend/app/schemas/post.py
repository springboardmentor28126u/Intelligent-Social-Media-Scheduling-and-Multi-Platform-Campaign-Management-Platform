from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


PostStatus = Literal[
    "DRAFT",
    "SCHEDULED",
    "PUBLISHING",
    "PUBLISHED",
    "FAILED",
    "CANCELLED",
    "draft",
    "scheduled",
    "publishing",
    "published",
    "failed",
    "cancelled",
]


class PostCreate(BaseModel):
    campaign_id: int
    social_account_id: int
    content: str = Field(..., min_length=1)
    media_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[PostStatus] = None

    @validator("content")
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Post content cannot be empty")
        return value


class PostUpdate(BaseModel):
    content: Optional[str] = None
    media_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[PostStatus] = None

    @validator("content")
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Post content cannot be empty")
        return value


class PostResponse(BaseModel):
    id: int
    campaign_id: Optional[int] = None
    social_account_id: Optional[int] = None
    content: str
    media_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: str
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True