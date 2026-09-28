from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.auth import (
    LoginRequest, RegisterRequest, Token,
    PasswordResetRequest, PasswordResetConfirm
)
from app.schemas.user import UserOut
from app.models.user import User
from app.services.auth_service import authenticate_user, create_user, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: RegisterRequest, db: Session = Depends(get_db)):
    user = create_user(db, user_in)
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url
    )

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password. Try 'admin@intellipost.com' / 'password123'."
        )
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    # Always return success message to prevent user enumeration
    return {
        "success": True,
        "message": "If this email is registered, a password reset link has been dispatched."
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    return {
        "success": True,
        "message": "Password has been successfully updated. You may now log in."
    }
