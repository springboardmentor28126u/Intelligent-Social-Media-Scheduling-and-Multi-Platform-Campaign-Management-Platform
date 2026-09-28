from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class NotificationBase(BaseModel):
    title: str
    message: str
    category: Optional[str] = "Publishing"  # Publishing, Campaigns, Approvals, Alerts, System
    type: Optional[str] = "info"  # success, warning, error, info
    action_url: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationOut(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
