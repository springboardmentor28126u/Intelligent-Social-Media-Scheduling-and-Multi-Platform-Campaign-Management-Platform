from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.rbac import Role, Permission, RolePermission
from app.schemas.rbac import RoleResponse, PermissionResponse, RolePermissionUpdate
from app.core.security import require_roles, require_permission, ROLE_DEFAULT_PERMISSIONS


router = APIRouter(
    prefix="/roles",
    tags=["RBAC & Permissions"]
)


@router.get("", response_model=List[RoleResponse])
def list_roles(
    current_user: dict = Depends(require_permission("roles.read")),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()
    results = []
    for r in roles:
        role_data = RoleResponse(
            id=r.id,
            name=r.name,
            display_name=r.display_name,
            description=r.description,
            created_at=r.created_at,
            permissions=[PermissionResponse.model_validate(p) for p in r.permissions]
        )
        results.append(role_data)
    return results


@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    current_user: dict = Depends(require_permission("roles.read")),
    db: Session = Depends(get_db)
):
    permissions = db.query(Permission).order_by(Permission.module, Permission.name).all()
    return [PermissionResponse.model_validate(p) for p in permissions]


@router.put("/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    data: RolePermissionUpdate,
    current_user: dict = Depends(require_roles("administrator")),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Clear existing permissions
    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    
    # Assign new permissions
    for pid in data.permission_ids:
        perm = db.query(Permission).filter(Permission.id == pid).first()
        if perm:
            rp = RolePermission(role_id=role.id, permission_id=perm.id)
            db.add(rp)

    db.commit()
    return {"message": f"Updated permissions for role {role.name}"}
