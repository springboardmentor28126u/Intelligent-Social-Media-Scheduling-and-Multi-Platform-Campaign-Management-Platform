from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.schemas.user import UserOut, UserUpdate
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        current_user.hashed_password = get_password_hash(update_data.pop("password"))
    
    for key, val in update_data.items():
        setattr(current_user, key, val)
        
    db.commit()
    db.refresh(current_user)
    return current_user
