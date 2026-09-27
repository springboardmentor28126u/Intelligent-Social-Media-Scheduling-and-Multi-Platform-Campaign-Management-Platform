from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


CampaignStatus = Literal[
    "Draft",
    "Scheduled",
    "Active",
    "Paused",
    "Completed",
    "Archived",
]


class CampaignFields(BaseModel):
    name: str = Field(..., max_length=150)
    description: Optional[str] = None
    objective: Optional[str] = None
    status: CampaignStatus = "Draft"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_audience: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    social_account_ids: list[int] = Field(default_factory=list)

    @validator("name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Campaign name cannot be empty")
        return value

    @validator("objective", "description", "target_audience")
    def validate_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Text fields cannot be empty")
        return value

    @validator("end_date")
    def validate_date_range(cls, value: Optional[date], values: dict) -> Optional[date]:
        start_date = values.get("start_date")
        if value is not None and start_date is not None and value < start_date:
            raise ValueError("End date must be on or after start date")
        return value


class CampaignCreate(CampaignFields):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    objective: Optional[str] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_audience: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)

    @validator("name")
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Campaign name cannot be empty")
        return value

    @validator("objective", "description", "target_audience")
    def validate_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Text fields cannot be empty")
        return value

    @validator("end_date")
    def validate_date_range(cls, value: Optional[date], values: dict) -> Optional[date]:
        start_date = values.get("start_date")
        if value is not None and start_date is not None and value < start_date:
            raise ValueError("End date must be on or after start date")
        return value


class CampaignResponse(CampaignFields):
    id: int
    user_id: int
    status: CampaignStatus
    total_posts: int = 0
    scheduled_posts: int = 0
    published_posts: int = 0
    failed_posts: int = 0
    workflow: list[str] = Field(default_factory=lambda: ["Draft", "Scheduled", "Active", "Completed"])
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignReportResponse(BaseModel):
    campaign_id: int
    campaign_name: str
    campaign_duration: str
    status: CampaignStatus
    total_posts: int
    published_posts: int
    failed_posts: int
    engagement: int
    reach: int
    impressions: int = 0
    new_followers: int = 0
    total_followers: int = 0
    follower_growth: int = 0
    growth_percentage: float = 0.0
    audience_growth: int = 0
    performance: float
    audience_timeline: list[dict] = Field(default_factory=list)
    top_performing_content: list[dict] = Field(default_factory=list)
    report_text: str

    class Config:
        from_attributes = True