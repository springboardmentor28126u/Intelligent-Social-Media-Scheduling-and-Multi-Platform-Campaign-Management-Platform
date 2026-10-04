from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "GENERAL"
    type: str = "info"
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    link: str | None = None
    metadata_json: dict | None = None
    actor_user_id: int | None = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class NotificationCountResponse(BaseModel):
    unread_count: int