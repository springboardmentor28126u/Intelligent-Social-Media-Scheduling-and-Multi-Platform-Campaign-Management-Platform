from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    avatar_url: str | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    avatar_url: str | None = None


class TeamResponse(BaseModel):
    id: int
    uuid: str | None
    name: str
    slug: str
    description: str | None
    owner_id: int
    avatar_url: str | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class TeamMemberCreate(BaseModel):
    user_id: int
    role: str = "member"
    can_publish: bool = False
    can_approve: bool = False


class TeamMemberUpdate(BaseModel):
    role: str | None = None
    can_publish: bool | None = None
    can_approve: bool | None = None


class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    user_id: int
    role: str
    can_publish: bool | None
    can_approve: bool | None
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class TeamInvitationCreate(BaseModel):
    email: str
    role: str = "member"


class TeamInvitationResponse(BaseModel):
    id: int
    team_id: int
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)