from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.core.security import get_current_user, require_roles, require_permission, ROLE_DEFAULT_PERMISSIONS
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/users",
    tags=["Users Management"]
)


@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    results = []
    for u in users:
        res = UserResponse.model_validate(u)
        res.permissions = ROLE_DEFAULT_PERMISSIONS.get(u.role, [])
        results.append(res)
    return results


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["user_id"] != user_id and current_user["role"] != "administrator":
        raise HTTPException(status_code=403, detail="Cannot access other users' profile")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    res = UserResponse.model_validate(user)
    res.permissions = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    return res


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_admin = current_user["role"] == "administrator"
    if current_user["user_id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Cannot edit this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if update_data.name is not None:
        user.name = update_data.name
    if update_data.job_title is not None:
        user.job_title = update_data.job_title
    if update_data.company is not None:
        user.company = update_data.company
    if update_data.bio is not None:
        user.bio = update_data.bio
    if update_data.avatar_url is not None:
        user.avatar_url = update_data.avatar_url
    if update_data.timezone is not None:
        user.timezone = update_data.timezone

    role_changed = False
    # Only admin can change roles or active status
    if is_admin:
        if update_data.role is not None and update_data.role in ROLE_DEFAULT_PERMISSIONS and update_data.role != user.role:
            old_role = user.role
            user.role = update_data.role
            role_changed = True
            log_audit_event(
                db=db,
                user_id=current_user["user_id"],
                action="user.role_changed",
                module="rbac",
                description=f"Role changed for user {user.email} from {old_role} to {update_data.role}"
            )
        if update_data.is_active is not None:
            user.is_active = update_data.is_active

    db.commit()
    db.refresh(user)

    if not role_changed:
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="user.update",
            module="users",
            description=f"Updated profile for user {user.email}"
        )

    res = UserResponse.model_validate(user)
    res.permissions = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    return res


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: dict = Depends(require_permission("users.delete")),
    db: Session = Depends(get_db)
):
    if current_user["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="user.delete",
        module="users",
        description=f"Deleted user #{user_id} ({user.email})"
    )
    return None
