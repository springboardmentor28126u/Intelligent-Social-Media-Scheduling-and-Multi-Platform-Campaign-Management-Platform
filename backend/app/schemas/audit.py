from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    module: str
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str
    created_at: datetime


class AdminDashboardResponse(BaseModel):
    total_users: int
    active_teams: int
    connected_accounts: int
    total_posts: int
    published_posts: int
    scheduled_posts: int
    failed_posts: int
    total_campaigns: int
    recent_logs: List[AuditLogResponse]
    system_status: Dict[str, Any]
