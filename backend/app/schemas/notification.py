from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: int
    actor_user_id: Optional[int] = None
    actor_name: Optional[str] = None
    title: str
    message: str
    type: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[list[int]] = None
    mark_all: Optional[bool] = False
