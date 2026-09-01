from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    user_email: str
    user_avatar: Optional[str] = None
    role: str
    can_publish: bool
    can_approve: bool
    created_at: datetime


class TeamInvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    name: str
    slug: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    owner_id: int
    members_count: int = 0
    members: List[TeamMemberResponse] = []
    created_at: datetime


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"  # manager, member
