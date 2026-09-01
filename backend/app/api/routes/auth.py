import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.db.models.rbac import Role
from app.schemas.user import (
    UserRegister,
    UserLogin,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UserResponse,
    TokenResponse,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    get_current_user,
    ROLE_DEFAULT_PERMISSIONS
)
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered"
        )

    # Validate role or default to content_creator
    role_name = user_data.role if user_data.role in ROLE_DEFAULT_PERMISSIONS else "content_creator"
    role_obj = db.query(Role).filter(Role.name == role_name).first()

    user = User(
        name=user_data.name,
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        role=role_name,
        role_id=role_obj.id if role_obj else None,
        company=user_data.company,
        is_active=True,
        is_verified=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="auth.register",
        module="auth",
        description=f"New user registered: {user.email} as {user.role}",
        ip_address=request.client.host if request.client else None
    )

    permissions = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    res = UserResponse.model_validate(user)
    res.permissions = permissions
    return res


@router.post("/login", response_model=TokenResponse)
def login(
    user_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended or deactivated"
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "email": user.email
    })

    log_audit_event(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="auth.login",
        module="auth",
        description=f"User logged in: {user.email}",
        ip_address=request.client.host if request.client else None
    )

    permissions = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    user_res = UserResponse.model_validate(user)
    user_res.permissions = permissions

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 86400,
        "user": user_res
    }


@router.post("/refresh")
def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    from jose import jwt, JWTError
    from app.core.config import settings
    
    try:
        data = jwt.decode(payload.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        user_id = int(data.get("sub"))
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        new_access_token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        })

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": 86400
        }
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: dict = Depends(get_current_user)
):
    user = current_user["user_obj"]
    res = UserResponse.model_validate(user)
    res.permissions = current_user.get("permissions", [])
    return res


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        # Return success anyway for security timing protection
        return {"message": "If this email exists, a password reset link has been dispatched."}

    token = uuid.uuid4().hex
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=2)
    db.commit()

    return {
        "message": "Password reset token generated successfully",
        "demo_reset_token": token  # Included for demo convenience
    }


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(
        User.reset_token == data.token,
        User.reset_token_expires > now
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = current_user["user_obj"]
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}