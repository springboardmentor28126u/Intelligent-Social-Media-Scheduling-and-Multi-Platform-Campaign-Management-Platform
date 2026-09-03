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


# ============================================================
# CRYPTOGRAPHIC OAUTH STATE GENERATION & VALIDATION
# ============================================================

def create_oauth_state(user_id: int, extra_data: Optional[Dict[str, str]] = None) -> str:
    """
    Generate a tamper-proof, time-stamped OAuth state string using HMAC-SHA256.
    Format: base64(json({user_id, timestamp, nonce, ...})).signature
    """
    import hmac
    import hashlib
    import json
    import secrets
    import base64
    import time

    payload = {
        "user_id": user_id,
        "ts": int(time.time()),
        "nonce": secrets.token_hex(8)
    }
    if extra_data:
        payload["extra"] = extra_data

    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")

    signature = hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()[:32]

    return f"{payload_b64}.{signature}"


def verify_oauth_state(state: str, max_age_seconds: int = 600) -> Optional[Dict]:
    """
    Verify the OAuth state signature, structure, and expiration (default 10 min).
    Also supports legacy 'user_id:random_string' format gracefully.
    Returns dictionary with 'user_id' and metadata if valid, None otherwise.
    """
    import hmac
    import hashlib
    import json
    import base64
    import time

    if not state or not isinstance(state, str):
        return None

    # Handle HMAC-signed state format: <payload_b64>.<signature>
    if "." in state:
        parts = state.split(".", 1)
        if len(parts) == 2:
            payload_b64, signature = parts
            expected_sig = hmac.new(
                settings.JWT_SECRET_KEY.encode("utf-8"),
                payload_b64.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()[:32]

            if hmac.compare_digest(signature, expected_sig):
                try:
                    # Fix padding for base64
                    rem = len(payload_b64) % 4
                    padded_b64 = payload_b64 + ("=" * (4 - rem) if rem > 0 else "")
                    data = json.loads(base64.urlsafe_b64decode(padded_b64).decode("utf-8"))
                    
                    # Verify timestamp expiry
                    ts = data.get("ts", 0)
                    now = int(time.time())
                    if (now - ts) <= max_age_seconds and data.get("user_id"):
                        return data
                except Exception:
                    pass

    # Fallback / compatibility: simple colon-separated state "user_id:nonce"
    if ":" in state:
        parts = state.split(":", 1)
        if len(parts) >= 1:
            try:
                user_id = int(parts[0])
                if user_id > 0:
                    return {"user_id": user_id, "ts": int(time.time()), "legacy": True}
            except (ValueError, TypeError):
                pass

    return None