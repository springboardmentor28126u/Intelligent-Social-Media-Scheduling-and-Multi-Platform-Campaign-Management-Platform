import urllib.parse
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post, PostPlatformTarget, PublishingLog
from app.core.security import get_current_user, create_oauth_state, verify_oauth_state
from app.core.config import settings
from app.services.providers import get_social_provider, get_oauth_provider, list_configured_platforms
from app.services.providers.facebook_provider import FacebookProvider
from app.services.audit import log_audit_event
from app.services.notifications import (
    notify_admins_social_account_connected,
    notify_admins_social_account_disconnected
)
from app.db.models.user import User


router = APIRouter(
    prefix="/api/facebook",
    tags=["Facebook Integration"]
)

# Direct root-level callback router for /social-auth/facebook/call
callback_router = APIRouter(tags=["Facebook OAuth Callback"])


class FacebookVerifyRequest(BaseModel):
    access_token: Optional[str] = None
    page_id: Optional[str] = None


class FacebookConnectTokenRequest(BaseModel):
    access_token: Optional[str] = None
    page_id: Optional[str] = None
    account_name: Optional[str] = None
    account_handle: Optional[str] = None


class FacebookConnectPageRequest(BaseModel):
    page_id: str
    page_name: str
    page_access_token: str
    avatar_url: Optional[str] = None
    followers_count: Optional[int] = 0


class FacebookPublishRequest(BaseModel):
    content: str
    media_urls: Optional[List[str]] = None
    post_type: Optional[str] = "text"
    title: Optional[str] = None


@router.get("/connect")
def get_facebook_auth_url(
    current_user: dict = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """
    Generate Meta OAuth 2.0 authorization URL for Facebook Page management.
    """
    state = create_oauth_state(user_id=current_user["user_id"])
    effective_redirect = (
        redirect_uri or
        settings.FACEBOOK_REDIRECT_URI or
        f"{settings.BACKEND_URL}/social-auth/facebook/call"
    )

    is_configured = "facebook" in list_configured_platforms()

    provider = FacebookProvider()
    try:
        auth_url = provider.get_auth_url(state=state, redirect_uri=effective_redirect)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "platform": "facebook",
        "auth_url": auth_url,
        "redirect_uri": effective_redirect,
        "state": state,
        "is_real_oauth": is_configured,
        "note": None if is_configured else "Facebook API credentials not configured. Set FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET in .env for production."
    }


@router.get("/callback")
@callback_router.get("/social-auth/facebook/call")
def facebook_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    error_reason: Optional[str] = Query(None),
    error_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth 2.0 callback endpoint invoked by Meta after user authorization.
    Exchanges code for user access token and links the user's primary Facebook Page.
    Handles user cancellations, expired codes, invalid states, and API errors.
    """
    frontend_redirect_url = f"{settings.FRONTEND_URL}/accounts"

    # 1. Handle user cancellation or Meta OAuth error responses
    if error or error_reason or error_description:
        err_msg = error_description or error_reason or error or "Facebook authorization failed"
        err_msg_lower = err_msg.lower()
        if "user_cancelled" in err_msg_lower or "access_denied" in err_msg_lower or "user_denied" in err_msg_lower:
            user_msg = "Facebook authorization was cancelled by the user."
        elif "permissions" in err_msg_lower:
            user_msg = "Required Facebook permissions were not granted."
        else:
            user_msg = f"Facebook error: {err_msg}"

        safe_err = urllib.parse.quote_plus(user_msg[:200])
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_err}&platform=facebook",
            status_code=302
        )

    # 2. Check for missing authorization code
    if not code:
        safe_err = urllib.parse.quote_plus("Missing authorization code from Facebook.")
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_err}&platform=facebook",
            status_code=302
        )

    # 3. Cryptographic state verification (CSRF & timeout protection)
    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        safe_err = urllib.parse.quote_plus("Invalid or expired OAuth state. Please try connecting again.")
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_err}&platform=facebook",
            status_code=302
        )

    user_id = state_data["user_id"]

    try:
        effective_redirect = (
            settings.FACEBOOK_REDIRECT_URI or
            f"{settings.BACKEND_URL}/social-auth/facebook/call"
        )
        provider = FacebookProvider()
        token_data = provider.exchange_code_for_token(code=code, redirect_uri=effective_redirect)

        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account_name = token_data.get("account_name", "Facebook Page")
        account_handle = token_data.get("account_handle") or f"@{account_name.lower().replace(' ', '_')}"
        account_id_val = str(token_data.get("account_id") or f"fb_page_{uuid.uuid4().hex[:8]}")

        # Upsert Facebook account in DB for the specific user and page
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "facebook",
            SocialAccount.account_id == account_id_val
        ).first()

        if not existing:
            existing = db.query(SocialAccount).filter(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == "facebook"
            ).first()

        metadata = {
            "available_pages": token_data.get("available_pages", []),
            "has_pages": token_data.get("has_pages", True)
        }

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            existing.refresh_token = token_data.get("user_access_token", existing.refresh_token)
            existing.token_expires_at = token_expires_at
            existing.account_name = account_name
            existing.account_handle = account_handle
            existing.account_id = account_id_val
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            existing.followers_count = token_data.get("followers_count", existing.followers_count)
            existing.is_active = True
            existing.is_demo = token_data.get("is_demo", False)
            existing.metadata_json = metadata
            db.commit()
            account_id = existing.id
            account_obj = existing
        else:
            account_obj = SocialAccount(
                user_id=user_id,
                platform="facebook",
                account_name=account_name,
                account_handle=account_handle,
                account_id=account_id_val,
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("user_access_token"),
                token_expires_at=token_expires_at,
                followers_count=token_data.get("followers_count", 0),
                posts_count=0,
                is_active=True,
                is_demo=token_data.get("is_demo", False),
                metadata_json=metadata
            )
            db.add(account_obj)
            db.commit()
            db.refresh(account_obj)
            account_id = account_obj.id

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            notify_admins_social_account_connected(db=db, account=account_obj, actor_user=user)

        log_audit_event(
            db=db,
            user_id=user_id,
            action="social_account.connected",
            module="social_accounts",
            description=f"Connected Facebook Page: {account_name} ({account_handle})"
        )

        return RedirectResponse(
            url=f"{frontend_redirect_url}?connected=facebook&account_id={account_id}",
            status_code=302
        )

    except Exception as e:
        error_text = str(e).replace("\n", " ")
        safe_error = urllib.parse.quote_plus(error_text[:200])
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_error}&platform=facebook",
            status_code=302
        )


@router.get("/pages")
def get_user_facebook_pages(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all Facebook Pages available for the authenticated user.
    Uses stored user token from SocialAccount metadata or queries Meta Graph API directly.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "facebook",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Facebook account found. Authorize Facebook first."
        )

    # Check cached pages in metadata
    metadata = account.metadata_json or {}
    pages = metadata.get("available_pages", [])

    if not pages:
        provider = FacebookProvider()
        # Try refreshing pages from user token
        user_token = account.refresh_token or account.access_token
        pages = provider.get_user_pages(user_token)

    return {
        "pages": pages,
        "current_page_id": account.account_id,
        "current_page_name": account.account_name
    }


@router.post("/connect-page")
def select_facebook_page(
    data: FacebookConnectPageRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Switch or connect a specific Facebook Page from the user's available pages.
    """
    user_id = current_user["user_id"]
    existing = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "facebook"
    ).first()

    handle = f"@{data.page_name.lower().replace(' ', '_')}"
    token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)

    if existing:
        existing.account_id = data.page_id
        existing.account_name = data.page_name
        existing.account_handle = handle
        existing.access_token = data.page_access_token
        if data.avatar_url:
            existing.avatar_url = data.avatar_url
        if data.followers_count is not None:
            existing.followers_count = data.followers_count
        existing.is_active = True
        existing.token_expires_at = token_expires_at
        db.commit()
        account_obj = existing
    else:
        account_obj = SocialAccount(
            user_id=user_id,
            platform="facebook",
            account_name=data.page_name,
            account_handle=handle,
            account_id=data.page_id,
            avatar_url=data.avatar_url,
            access_token=data.page_access_token,
            followers_count=data.followers_count or 0,
            is_active=True,
            is_demo=False,
            token_expires_at=token_expires_at
        )
        db.add(account_obj)
        db.commit()
        db.refresh(account_obj)

    log_audit_event(
        db=db,
        user_id=user_id,
        action="social_account.connected",
        module="social_accounts",
        description=f"Connected Facebook Page: {data.page_name} ({data.page_id})"
    )

    return {
        "success": True,
        "message": f"Connected Facebook Page: {data.page_name}",
        "account": {
            "id": account_obj.id,
            "platform": "facebook",
            "account_name": account_obj.account_name,
            "account_handle": account_obj.account_handle,
            "account_id": account_obj.account_id,
            "avatar_url": account_obj.avatar_url,
            "followers_count": account_obj.followers_count
        }
    }


@router.post("/connect-token")
def connect_facebook_with_token(
    data: Optional[FacebookConnectTokenRequest] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect a Facebook Page directly using a Page Access Token and Page ID.
    """
    user_id = current_user["user_id"]
    provider = FacebookProvider()

    token = (data.access_token if (data and data.access_token) else None)
    page_id = (data.page_id if (data and data.page_id) else None)

    if not token:
        # Fall back to demo provider token if nothing configured
        token = f"fb_mock_page_token_{uuid.uuid4().hex[:16]}"
        page_id = page_id or f"fb_page_{uuid.uuid4().hex[:8]}"

    verif = provider.verify_token(access_token=token, page_id=page_id)
    page_info = verif.get("account") or {}

    page_name = (
        (data.account_name if (data and data.account_name) else None) or
        page_info.get("name") or
        "Facebook Page"
    )

    handle = (
        (data.account_handle if (data and data.account_handle) else None) or
        f"@{page_name.lower().replace(' ', '_')}"
    )

    final_page_id = str(page_info.get("id") or page_id or f"fb_page_{uuid.uuid4().hex[:8]}")
    avatar_url = page_info.get("profile_picture_url")
    followers_count = page_info.get("followers_count", 0)

    token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)
    is_demo = verif.get("is_demo", False) or token.startswith("fb_mock") or token.startswith("demo")

    existing = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "facebook"
    ).first()

    if existing:
        existing.access_token = token
        existing.token_expires_at = token_expires_at
        existing.account_name = page_name
        existing.account_handle = handle
        existing.account_id = final_page_id
        if avatar_url:
            existing.avatar_url = avatar_url
        existing.followers_count = followers_count
        existing.is_active = True
        existing.is_demo = is_demo
        db.commit()
        account_obj = existing
    else:
        account_obj = SocialAccount(
            user_id=user_id,
            platform="facebook",
            account_name=page_name,
            account_handle=handle,
            account_id=final_page_id,
            avatar_url=avatar_url,
            access_token=token,
            token_expires_at=token_expires_at,
            followers_count=followers_count,
            posts_count=0,
            is_active=True,
            is_demo=is_demo
        )
        db.add(account_obj)
        db.commit()
        db.refresh(account_obj)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        notify_admins_social_account_connected(db=db, account=account_obj, actor_user=user)

    log_audit_event(
        db=db,
        user_id=user_id,
        action="social_account.connected",
        module="social_accounts",
        description=f"Connected Facebook Page: {page_name} ({handle})"
    )

    return {
        "success": True,
        "message": f"Successfully connected Facebook Page {page_name}",
        "account": {
            "id": account_obj.id,
            "platform": "facebook",
            "account_name": account_obj.account_name,
            "account_handle": account_obj.account_handle,
            "account_id": account_obj.account_id,
            "avatar_url": account_obj.avatar_url,
            "followers_count": account_obj.followers_count,
            "is_demo": account_obj.is_demo
        }
    }


@router.get("/status")
def get_facebook_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current Facebook Page connection status, Page info, and token health.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "facebook",
        SocialAccount.is_active == True
    ).first()

    if not account:
        return {
            "connected": False,
            "platform": "facebook",
            "account": None,
            "health": "not_connected"
        }

    now = datetime.now(timezone.utc)
    token_expires_at = account.token_expires_at
    if token_expires_at and token_expires_at.tzinfo is None:
        token_expires_at = token_expires_at.replace(tzinfo=timezone.utc)
    expired = bool(token_expires_at and token_expires_at < now)

    return {
        "connected": True,
        "platform": "facebook",
        "health": "expired" if expired else "healthy",
        "account": {
            "id": account.id,
            "account_name": account.account_name,
            "account_handle": account.account_handle,
            "account_id": account.account_id,
            "avatar_url": account.avatar_url,
            "followers_count": account.followers_count,
            "is_demo": account.is_demo,
            "is_token_expired": expired,
            "token_expires_at": account.token_expires_at.isoformat() if account.token_expires_at else None,
            "created_at": account.created_at.isoformat() if account.created_at else None
        }
    }


@router.delete("/disconnect")
@router.post("/disconnect")
def disconnect_facebook(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/remove all active Facebook Page connections for the current user.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "facebook"
    ).all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Facebook account found."
        )

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    for acc in accounts:
        if user:
            notify_admins_social_account_disconnected(
                db=db,
                platform="facebook",
                account_name=acc.account_name,
                actor_user=user,
                account_id=acc.id
            )
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected Facebook Page: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {
        "success": True,
        "message": "Facebook Page disconnected successfully."
    }


@router.post("/verify")
def verify_facebook_token(
    data: Optional[FacebookVerifyRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify Facebook Page token against Meta Graph API.
    """
    provider = FacebookProvider()
    token = data.access_token if (data and data.access_token) else None
    page_id = data.page_id if (data and data.page_id) else None

    result = provider.verify_token(access_token=token, page_id=page_id)
    return result


@router.post("/publish")
def publish_to_facebook(
    data: FacebookPublishRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately publish a post to the connected Facebook Page for the authenticated user.
    """
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Post content cannot be empty.")

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "facebook",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Facebook Page connected. Please connect Facebook first."
        )

    # 1. Create Post row
    post = Post(
        user_id=current_user["user_id"],
        social_account_id=account.id,
        title=data.title or "Facebook Post",
        content=data.content,
        platform="facebook",
        post_type=data.post_type or ("image" if data.media_urls else "text"),
        media_url=data.media_urls[0] if data.media_urls else None,
        media_type="image" if (data.media_urls and (data.post_type or "image") != "video") else ("video" if data.post_type == "video" else None),
        status="publishing",
        scheduled_at=None,
        published_at=None
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # 2. Create Target row
    target = PostPlatformTarget(
        post_id=post.id,
        platform="facebook",
        social_account_id=account.id,
        status="publishing",
        attempt_count=1
    )
    db.add(target)
    db.commit()

    # 3. Publish via Provider
    provider = get_social_provider("facebook", is_demo=account.is_demo)
    result = provider.publish_post(
        access_token=account.access_token,
        content=post.content,
        media_urls=data.media_urls,
        post_type=post.post_type,
        options={"page_id": account.account_id}
    )

    now = datetime.now(timezone.utc)

    if result.success:
        post.status = "published"
        post.published_at = now
        post.external_post_id = result.external_id

        target.status = "published"
        target.published_at = now
        target.external_post_id = result.external_id
        target.external_url = result.url

        pub_log = PublishingLog(
            post_id=post.id,
            level="success",
            event_name="facebook.published",
            message="Published to Facebook Page successfully",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.published",
            module="posts",
            description=f"Published post to Facebook Page (ID: {result.external_id})"
        )

        return {
            "success": True,
            "post_id": post.id,
            "external_id": result.external_id,
            "url": result.url,
            "platform": "facebook",
            "published_at": now.isoformat()
        }
    else:
        post.status = "failed"
        post.failure_reason = result.error_message

        target.status = "failed"
        target.error_message = result.error_message

        pub_log = PublishingLog(
            post_id=post.id,
            level="error",
            event_name="facebook.failed",
            message=f"Failed to publish to Facebook Page: {result.error_message}",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Facebook Publishing Error: {result.error_message}"
        )
