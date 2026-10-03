import random
import uuid
import secrets
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.db.models.social_account import SocialAccount, SocialPlatform
from app.schemas.social_account import (
    SocialAccountCreate, SocialAccountResponse, SocialPlatformResponse, ConnectDemoAccountRequest
)
from app.core.security import get_current_user, require_permission, create_oauth_state, verify_oauth_state
from app.services.providers import get_social_provider, get_oauth_provider, list_configured_platforms
from app.services.audit import log_audit_event
from app.services.notifications import (
    notify_admins_social_account_connected,
    notify_admins_social_account_disconnected
)
from app.core.config import settings


router = APIRouter(
    prefix="/social-accounts",
    tags=["Social Accounts"]
)


@router.get("/platforms", response_model=List[SocialPlatformResponse])
def list_platforms(db: Session = Depends(get_db)):
    """List all supported social platforms."""
    platforms = db.query(SocialPlatform).filter(SocialPlatform.is_active == True).all()
    if not platforms:
        # Seed default platforms on first call
        defaults = [
            SocialPlatform(code="facebook", name="Facebook", character_limit=63206, supports_media=True, supports_video=True, supports_carousel=True),
            SocialPlatform(code="instagram", name="Instagram", character_limit=2200, supports_media=True, supports_video=True, supports_carousel=True),
            SocialPlatform(code="linkedin", name="LinkedIn", character_limit=3000, supports_media=True, supports_video=True, supports_carousel=False),
            SocialPlatform(code="twitter", name="X / Twitter", character_limit=280, supports_media=True, supports_video=True, supports_carousel=False),
            SocialPlatform(code="youtube", name="YouTube", character_limit=5000, supports_media=True, supports_video=True, supports_carousel=False),
            SocialPlatform(code="pinterest", name="Pinterest", character_limit=500, supports_media=True, supports_video=False, supports_carousel=False)
        ]
        for p in defaults:
            db.add(p)
        db.commit()
        platforms = db.query(SocialPlatform).all()
    return platforms


@router.get("/configured-platforms")
def get_configured_platforms():
    """Return which platforms have real API credentials configured (for UI display)."""
    configured = list_configured_platforms()
    return {
        "configured": configured,
        "all_platforms": ["facebook", "instagram", "linkedin", "twitter", "youtube", "pinterest"],
        "note": "Platforms not in 'configured' will use demo mode"
    }


@router.get("", response_model=List[SocialAccountResponse])
def get_user_social_accounts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all social accounts connected by the current user with real post counts from DB."""
    from app.db.models.post import Post
    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == current_user["user_id"])
        .order_by(SocialAccount.created_at.desc())
        .all()
    )
    for acc in accounts:
        # Calculate real published posts count from SocialPilot database
        pub_count = db.query(Post).filter(
            Post.social_account_id == acc.id,
            Post.status == "published"
        ).count()
        acc.posts_count = pub_count
    return accounts


# ─────────────────────────────────────────────────────────────────────────────
# REAL OAUTH FLOW
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/oauth/{platform}/url")
def get_oauth_url(
    platform: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an OAuth authorization URL for the specified platform.
    
    The frontend should redirect the user to the returned 'auth_url'.
    After the user authorizes, the platform will redirect to the callback URL.
    """
    platform_key = platform.lower().strip()
    supported = ["facebook", "instagram", "linkedin", "twitter", "youtube", "pinterest"]
    
    if platform_key not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth not supported for '{platform_key}'. Supported: {supported}"
        )

    # Encode user_id in cryptographically secure HMAC state
    state = create_oauth_state(user_id=current_user["user_id"])
    redirect_uri = (
        (settings.LINKEDIN_REDIRECT_URI or f"{settings.BACKEND_URL}/api/linkedin/callback")
        if platform_key == "linkedin"
        else (
            (settings.INSTAGRAM_REDIRECT_URI or f"{settings.BACKEND_URL}/api/instagram/callback")
            if platform_key == "instagram"
            else (
                (settings.FACEBOOK_REDIRECT_URI or f"{settings.BACKEND_URL}/api/facebook/callback")
                if platform_key == "facebook"
                else f"{settings.BACKEND_URL}/social-accounts/oauth/{platform_key}/callback"
            )
        )
    )


    provider = get_oauth_provider(platform_key)
    auth_url = provider.get_auth_url(state=state, redirect_uri=redirect_uri)

    configured = bool(list_configured_platforms().__contains__(platform_key))
    
    return {
        "platform": platform_key,
        "auth_url": auth_url,
        "redirect_uri": redirect_uri,
        "is_real_oauth": configured,
        "note": None if configured else f"Demo mode: {platform_key} API credentials not configured. Set {platform_key.upper()}_CLIENT_ID and {platform_key.upper()}_CLIENT_SECRET in your .env file."
    }


@router.get("/oauth/{platform}/callback")
def oauth_callback(
    platform: str,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth callback endpoint. Called by the social platform after user authorizes.
    Exchanges the authorization code for tokens and stores the account.
    Redirects back to the frontend accounts page.
    """
    platform_key = platform.lower().strip()
    frontend_accounts_url = f"{settings.FRONTEND_URL}/accounts"

    if error:
        err_msg = error_description or error
        return RedirectResponse(
            url=f"{frontend_accounts_url}?error={err_msg}&platform={platform_key}",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_accounts_url}?error=no_code&platform={platform_key}",
            status_code=302
        )

    # Extract user_id from verified cryptographic state
    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        return RedirectResponse(
            url=f"{frontend_accounts_url}?error=invalid_or_expired_state&platform={platform_key}",
            status_code=302
        )

    user_id = state_data["user_id"]

    try:
        redirect_uri = (
            (settings.LINKEDIN_REDIRECT_URI or f"{settings.BACKEND_URL}/api/linkedin/callback")
            if platform_key == "linkedin"
            else (
                (settings.INSTAGRAM_REDIRECT_URI or f"{settings.BACKEND_URL}/api/instagram/callback")
                if platform_key == "instagram"
                else (
                    (settings.FACEBOOK_REDIRECT_URI or f"{settings.BACKEND_URL}/api/facebook/callback")
                    if platform_key == "facebook"
                    else f"{settings.BACKEND_URL}/social-accounts/oauth/{platform_key}/callback"
                )
            )
        )
        provider = get_oauth_provider(platform_key)
        token_data = provider.exchange_code_for_token(code=code, redirect_uri=redirect_uri)

        target_account_id = token_data.get("account_id") or f"{platform_key}_{uuid.uuid4().hex[:8]}"

        # Check if account already exists for this user/platform/account_id
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform_key,
            SocialAccount.account_id == target_account_id
        ).first()

        is_demo = token_data.get("is_demo", False)

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            existing.refresh_token = token_data.get("refresh_token", existing.refresh_token)
            existing.account_name = token_data.get("account_name", existing.account_name)
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            existing.is_active = True
            existing.is_demo = is_demo
            db.commit()
            account_id = existing.id
        else:
            account = SocialAccount(
                user_id=user_id,
                platform=platform_key,
                account_name=token_data.get("account_name", f"{platform_key.title()} Account"),
                account_handle=token_data.get("account_handle", ""),
                account_id=target_account_id,
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
                followers_count=None,
                following_count=None,
                posts_count=0,
                is_active=True,
                is_demo=is_demo
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            account_id = account.id

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            notify_admins_social_account_connected(db=db, account=account, actor_user=user)

        log_audit_event(
            db=db,
            user_id=user_id,
            action="social_account.connected",
            module="social_accounts",
            description=f"Connected {platform_key.title()} account via OAuth (demo={is_demo})"
        )

        return RedirectResponse(
            url=f"{frontend_accounts_url}?connected={platform_key}&account_id={account_id}",
            status_code=302
        )

    except Exception as e:
        return RedirectResponse(
            url=f"{frontend_accounts_url}?error={str(e)[:100]}&platform={platform_key}",
            status_code=302
        )


# ─────────────────────────────────────────────────────────────────────────────
# DEMO CONNECT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/connect-demo", response_model=SocialAccountResponse, status_code=status.HTTP_201_CREATED)
def connect_demo_social_account(
    data: ConnectDemoAccountRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect a demo social account (for testing without real OAuth)."""
    platform_key = data.platform.lower().strip()
    provider = get_social_provider(platform_key, is_demo=True)
    
    token_data = provider.exchange_code_for_token("demo_code", "http://localhost:5173/oauth/callback")

    existing = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == platform_key
    ).first()

    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if existing:
        existing.is_active = True
        existing.account_name = data.account_name or token_data.get("account_name", existing.account_name)
        existing.account_handle = data.account_handle or token_data.get("account_handle", existing.account_handle)
        db.commit()
        db.refresh(existing)
        if user:
            notify_admins_social_account_connected(db=db, account=existing, actor_user=user)
        return existing

    account = SocialAccount(
        user_id=current_user["user_id"],
        platform=platform_key,
        account_name=data.account_name or token_data.get("account_name", f"{current_user['name']}'s {platform_key.title()}"),
        account_handle=data.account_handle or f"@{current_user['name'].lower().replace(' ', '_')}",
        account_id=token_data.get("account_id", f"{platform_key}_{uuid.uuid4().hex[:8]}"),
        avatar_url=token_data.get("avatar_url", f"https://api.dicebear.com/7.x/bottts/svg?seed={platform_key}"),
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        followers_count=0,
        following_count=0,
        posts_count=0,
        is_active=True,
        is_demo=True
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    if user:
        notify_admins_social_account_connected(db=db, account=account, actor_user=user)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="social_account.connected",
        module="social_accounts",
        description=f"Connected demo {platform_key.title()} account: {account.account_name}"
    )

    return account


@router.post("", response_model=SocialAccountResponse, status_code=status.HTTP_201_CREATED)
def create_custom_social_account(
    account_data: SocialAccountCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually add a social account with a known access token."""
    account = SocialAccount(
        user_id=current_user["user_id"],
        platform=account_data.platform.lower(),
        account_name=account_data.account_name,
        account_handle=account_data.account_handle,
        account_id=account_data.account_id,
        avatar_url=account_data.avatar_url,
        access_token=account_data.access_token,
        refresh_token=account_data.refresh_token,
        followers_count=account_data.followers_count or 0,
        is_active=True,
        is_demo=account_data.is_demo or False
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_social_account_connected(db=db, account=account, actor_user=user)

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_social_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect/delete a social account."""
    query = db.query(SocialAccount).filter(SocialAccount.id == account_id)
    if current_user.get("role") not in ["administrator", "admin", "superadmin", "owner", "workspace_admin"]:
        query = query.filter(SocialAccount.user_id == current_user["user_id"])

    account = query.first()

    if not account:
        raise HTTPException(status_code=404, detail="Social account not found")

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        notify_admins_social_account_disconnected(
            db=db,
            platform=account.platform,
            account_name=account.account_name,
            actor_user=user,
            account_id=account.id
        )

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="social_account.disconnected",
        module="social_accounts",
        description=f"Disconnected {account.platform.title()} account: {account.account_name}"
    )

    db.delete(account)
    db.commit()
    return None


@router.post("/{account_id}/sync")
def sync_social_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync account metrics from the social platform and SocialPilot database."""
    from app.db.models.post import Post
    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user["user_id"]
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Social account not found")

    # 1. Update published posts count from SocialPilot database records
    published_count = db.query(Post).filter(
        Post.social_account_id == account.id,
        Post.status == "published"
    ).count()
    account.posts_count = published_count

    # 2. Query provider for platform metrics (if supported by permissions)
    provider = get_social_provider(account.platform, is_demo=account.is_demo)
    metrics = provider.get_account_metrics(account.access_token, account.account_id or "")
    
    if metrics.get("followers") is not None:
        account.followers_count = metrics["followers"]
    if metrics.get("following") is not None:
        account.following_count = metrics["following"]
        
    db.commit()
    db.refresh(account)
    return {
        "message": "Account synced successfully",
        "account_id": account.id,
        "posts_count": account.posts_count,
        "followers_count": account.followers_count,
        "metrics": metrics
    }


@router.get("/{account_id}/status")
def get_account_status(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check account connection health, token expiry, and permissions."""
    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user["user_id"]
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Social account not found")

    now = datetime.now(timezone.utc)
    expired = bool(account.token_expires_at and account.token_expires_at < now)

    return {
        "account_id": account.id,
        "platform": account.platform,
        "account_name": account.account_name,
        "account_handle": account.account_handle,
        "is_active": account.is_active,
        "is_demo": account.is_demo,
        "is_token_expired": expired,
        "token_expires_at": account.token_expires_at.isoformat() if account.token_expires_at else None,
        "followers_count": account.followers_count,
        "connection_health": "expired" if expired else "healthy" if account.is_active else "disconnected"
    }


@router.post("/disconnect/{platform}")
def disconnect_platform(
    platform: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect any active account for the specified platform."""
    platform_key = platform.lower().strip()
    accounts = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.platform == platform_key,
            SocialAccount.user_id == current_user["user_id"]
        )
        .all()
    )
    if not accounts:
        raise HTTPException(status_code=404, detail=f"No connected {platform_key.title()} account found")

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    for acc in accounts:
        if user:
            notify_admins_social_account_disconnected(
                db=db,
                platform=acc.platform,
                account_name=acc.account_name,
                actor_user=user,
                account_id=acc.id
            )
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected {platform_key.title()} account: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {"message": f"Successfully disconnected {platform_key.title()} account(s)"}