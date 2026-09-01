from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: List[PermissionResponse] = []
    created_at: datetime


class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    permission_ids: List[int] = []


class RolePermissionUpdate(BaseModel):
    permission_ids: List[int]
