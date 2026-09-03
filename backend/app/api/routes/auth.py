import uuid
import secrets
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
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
    GoogleTokenRequest,
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

try:
    import requests as _requests
    _requests_available = True
except ImportError:
    _requests_available = False


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


# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE OAUTH 2.0 LOGIN
# ─────────────────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google/url")
def get_google_auth_url(redirect_uri: Optional[str] = None):
    """
    Generate Google OAuth 2.0 authorization URL.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    callback_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI or f"{settings.BACKEND_URL}/auth/google/callback"
    state = secrets.token_urlsafe(16)

    if not client_id:
        return {
            "auth_url": None,
            "configured": False,
            "message": "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID in your environment variables."
        }

    scopes = "openid email profile"
    url = (
        f"{GOOGLE_AUTH_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={callback_uri}"
        f"&response_type=code"
        f"&scope={scopes.replace(' ', '%20')}"
        f"&state={state}"
        f"&access_type=offline"
        f"&prompt=select_account"
    )

    return {
        "auth_url": url,
        "state": state,
        "configured": True
    }


def _process_google_identity(google_user_info: dict, db: Session, request: Optional[Request] = None) -> dict:
    """
    Find or create a User from verified Google user info, generate JWT tokens,
    and return TokenResponse data.
    """
    email = (google_user_info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no verified email address")

    name = google_user_info.get("name") or google_user_info.get("given_name") or email.split("@")[0]
    picture = google_user_info.get("picture")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create new user
        role_name = "content_creator"
        role_obj = db.query(Role).filter(Role.name == role_name).first()

        # Random secure password for OAuth users (not used for OAuth login)
        random_pass = secrets.token_urlsafe(32)
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(random_pass),
            role=role_name,
            role_id=role_obj.id if role_obj else None,
            avatar_url=picture,
            company="My Brand",
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
            action="auth.google_register",
            module="auth",
            description=f"New user created via Google Login: {user.email}",
            ip_address=request.client.host if request and request.client else None
        )
    else:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended or deactivated"
            )

        # Update avatar if missing
        if picture and not user.avatar_url:
            user.avatar_url = picture
            db.commit()
            db.refresh(user)

        log_audit_event(
            db=db,
            user_id=user.id,
            user_email=user.email,
            action="auth.google_login",
            module="auth",
            description=f"User signed in with Google: {user.email}",
            ip_address=request.client.host if request and request.client else None
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


@router.get("/google/callback")
def google_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Google OAuth 2.0 callback endpoint.
    Exchanges code for Google tokens, provisions user, and redirects to frontend with JWT.
    """
    frontend_login_url = f"{settings.FRONTEND_URL}/login"

    if error:
        return RedirectResponse(
            url=f"{frontend_login_url}?error={error}&error_description={error_description or 'Google sign-in denied'}",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_login_url}?error=missing_code&error_description=No authorization code received from Google",
            status_code=302
        )

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = settings.GOOGLE_REDIRECT_URI or f"{settings.BACKEND_URL}/auth/google/callback"

    if not client_id or not client_secret:
        return RedirectResponse(
            url=f"{frontend_login_url}?error=unconfigured&error_description=Google OAuth credentials not configured on server",
            status_code=302
        )

    try:
        token_resp = _requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            },
            timeout=15
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        google_access_token = token_data.get("access_token")

        userinfo_resp = _requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
            timeout=15
        )
        userinfo_resp.raise_for_status()
        google_user_info = userinfo_resp.json()

        auth_result = _process_google_identity(google_user_info, db, request)
        access_tok = auth_result["access_token"]
        refresh_tok = auth_result["refresh_token"]

        return RedirectResponse(
            url=f"{frontend_login_url}?google_token={access_tok}&refresh_token={refresh_tok}",
            status_code=302
        )

    except Exception as e:
        return RedirectResponse(
            url=f"{frontend_login_url}?error=auth_failed&error_description={str(e)[:100]}",
            status_code=302
        )


@router.post("/google/token", response_model=TokenResponse)
def google_token_exchange(
    payload: GoogleTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Exchange Google authorization code or ID token directly for SocialPilot JWT.
    """
    if payload.id_token:
        # Validate ID token with Google's tokeninfo endpoint
        try:
            resp = _requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}",
                timeout=10
            )
            resp.raise_for_status()
            user_info = resp.json()
            return _process_google_identity(user_info, db, request)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Google ID token: {str(e)}")

    elif payload.code:
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        redirect_uri = payload.redirect_uri or settings.GOOGLE_REDIRECT_URI or f"{settings.BACKEND_URL}/auth/google/callback"

        if not client_id or not client_secret:
            raise HTTPException(
                status_code=400,
                detail="Google OAuth credentials are not configured on server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing)"
            )

        try:
            token_resp = _requests.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": payload.code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                timeout=15
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
            google_access_token = token_data.get("access_token")

            userinfo_resp = _requests.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {google_access_token}"},
                timeout=15
            )
            userinfo_resp.raise_for_status()
            google_user_info = userinfo_resp.json()

            return _process_google_identity(google_user_info, db, request)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail="Either 'code' or 'id_token' is required")