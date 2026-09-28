from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class TeamMemberBase(BaseModel):
    name: str
    email: str
    role: str = "Content Creator"  # Admin, Marketing Team, Content Creator, Business User
    avatar_url: Optional[str] = None
    status: Optional[str] = "Active"  # Active, Invited, Inactive
    permissions: Optional[str] = "view,create,edit,publish"

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[str] = None

class TeamMemberInvite(BaseModel):
    email: str
    name: str
    role: str = "Content Creator"
    permissions: Optional[str] = "view,create,edit,publish"

class TeamMemberOut(TeamMemberBase):
    id: int
    team_id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TeamOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    members: List[TeamMemberOut] = []
    created_at: datetime

    class Config:
        from_attributes = True
