from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db

# Default RBAC Role to Permissions Mapping
ROLE_DEFAULT_PERMISSIONS: Dict[str, List[str]] = {
    "administrator": [
        "users.create", "users.read", "users.update", "users.delete",
        "teams.create", "teams.read", "teams.update", "teams.delete", "teams.manage",
        "roles.read", "roles.manage",
        "posts.create", "posts.read", "posts.update", "posts.delete", "posts.publish", "posts.schedule", "posts.approve",
        "campaigns.create", "campaigns.read", "campaigns.manage", "campaigns.delete",
        "social_accounts.connect", "social_accounts.read", "social_accounts.manage",
        "analytics.read", "reports.generate", "reports.export",
        "settings.manage", "audit.read", "system.monitor"
    ],
    "business_user": [
        "teams.read", "teams.manage",
        "posts.read", "posts.approve", "posts.publish",
        "campaigns.create", "campaigns.read", "campaigns.manage",
        "social_accounts.connect", "social_accounts.read", "social_accounts.manage",
        "analytics.read", "reports.generate", "reports.export",
        "profile.manage"
    ],
    "marketing_team": [
        "teams.read",
        "posts.create", "posts.read", "posts.update", "posts.delete", "posts.publish", "posts.schedule",
        "campaigns.create", "campaigns.read", "campaigns.manage",
        "social_accounts.read", "social_accounts.connect",
        "analytics.read", "reports.generate", "reports.export",
        "media.upload", "queue.manage"
    ],
    "content_creator": [
        "posts.create", "posts.read", "posts.update", "posts.submit_approval",
        "calendar.read", "media.upload", "social_accounts.read"
    ]
}


# ============================================================
# PASSWORD HASHING & VERIFICATION
# ============================================================

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password must be 72 bytes or fewer")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ============================================================
# JWT TOKEN HANDLING
# ============================================================

def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=(expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_days: Optional[int] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=(expires_days or settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ============================================================
# HTTP BEARER AUTHENTICATION & DEPENDENCIES
# ============================================================

security = HTTPBearer(auto_error=True)


def get_current_user_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type, access token required"
            )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject"
            )
        return payload
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def get_current_user(
    payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    from app.db.models.user import User
    
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Resolve permissions for user role
    role_perms = ROLE_DEFAULT_PERMISSIONS.get(user.role, [])
    
    return {
        "user_id": user.id,
        "uuid": user.uuid,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company": user.company,
        "permissions": role_perms,
        "user_obj": user
    }


def require_roles(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles and "administrator" not in [user_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires one of roles {allowed_roles}"
            )
        return current_user
    return role_checker


def require_permission(permission_code: str):
    def permission_checker(current_user: dict = Depends(get_current_user)):
        user_perms = current_user.get("permissions", [])
        user_role = current_user.get("role")
        
        # Administrator has universal access
        if user_role == "administrator":
            return current_user
            
        if permission_code not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: permission '{permission_code}' required"
            )
        return current_user
    return permission_checker