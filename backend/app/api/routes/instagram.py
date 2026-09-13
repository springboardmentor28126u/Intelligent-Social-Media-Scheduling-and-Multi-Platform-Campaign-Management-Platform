import uuid
from typing import Optional, List
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
from app.services.providers.instagram_provider import InstagramProvider
from app.services.audit import log_audit_event
from app.services.notifications import (
    notify_admins_social_account_connected,
    notify_admins_social_account_disconnected
)
from app.db.models.user import User


router = APIRouter(
    prefix="/api/instagram",
    tags=["Instagram Integration"]
)


class InstagramVerifyRequest(BaseModel):
    access_token: Optional[str] = None
    user_id: Optional[str] = None


class InstagramConnectTokenRequest(BaseModel):
    access_token: Optional[str] = None
    user_id: Optional[str] = None
    account_name: Optional[str] = None
    account_handle: Optional[str] = None


class InstagramPublishRequest(BaseModel):
    content: str
    media_urls: Optional[List[str]] = None
    post_type: Optional[str] = "image"
    title: Optional[str] = None


@router.get("/connect")
def get_instagram_auth_url(
    current_user: dict = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """
    Generate Meta OAuth 2.0 authorization URL for Instagram Professional accounts.
    """
    state = create_oauth_state(user_id=current_user["user_id"])
    effective_redirect = (
        redirect_uri or
        settings.INSTAGRAM_REDIRECT_URI or
        f"{settings.BACKEND_URL}/api/instagram/callback"
    )

    is_configured = "instagram" in list_configured_platforms()

    provider = get_oauth_provider("instagram")
    try:
        auth_url = provider.get_auth_url(state=state, redirect_uri=effective_redirect)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "platform": "instagram",
        "auth_url": auth_url,
        "redirect_uri": effective_redirect,
        "state": state,
        "is_real_oauth": is_configured,
        "note": None if is_configured else "Instagram credentials not configured. Configure INSTAGRAM_APP_ID/INSTAGRAM_ACCESS_TOKEN in .env for production."
    }


@router.get("/callback")
def instagram_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth 2.0 callback endpoint invoked by Meta after user authorization.
    Exchanges authorization code for an access token, links the Instagram account.
    """
    frontend_redirect_url = f"{settings.FRONTEND_URL}/accounts"

    if error:
        err_msg = error_description or error
        if "user_cancelled" in err_msg.lower() or "access_denied" in err_msg.lower():
            err_msg = "Instagram authorization was denied by the user."
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={err_msg}&platform=instagram",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Missing+authorization+code&platform=instagram",
            status_code=302
        )

    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Invalid+or+expired+OAuth+state.+Please+try+connecting+again.&platform=instagram",
            status_code=302
        )

    user_id = state_data["user_id"]

    try:
        effective_redirect = (
            settings.INSTAGRAM_REDIRECT_URI or
            f"{settings.BACKEND_URL}/api/instagram/callback"
        )
        provider = get_oauth_provider("instagram")
        token_data = provider.exchange_code_for_token(code=code, redirect_uri=effective_redirect)

        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account_id_val = str(token_data.get("account_id") or "")
        if not account_id_val:
            raise ValueError("Meta did not return an Instagram Business Account ID.")

        account_name = token_data.get("account_name", "Instagram Professional")
        account_handle = token_data.get("account_handle") or f"@{account_name.lower().replace(' ', '_')}"

        # Upsert Instagram account in DB specifically for (user_id, platform, account_id)
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "instagram",
            SocialAccount.account_id == account_id_val
        ).first()

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            existing.refresh_token = token_data.get("refresh_token", existing.refresh_token)
            existing.token_expires_at = token_expires_at
            existing.account_name = account_name
            existing.account_handle = account_handle
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            existing.followers_count = token_data.get("followers_count", existing.followers_count)
            existing.is_active = True
            existing.is_demo = token_data.get("is_demo", False)
            db.commit()
            account_id = existing.id
            account_obj = existing
        else:
            account_obj = SocialAccount(
                user_id=user_id,
                platform="instagram",
                account_name=account_name,
                account_handle=account_handle,
                account_id=account_id_val,
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
                token_expires_at=token_expires_at,
                followers_count=token_data.get("followers_count", 0),
                posts_count=token_data.get("posts_count", 0),
                is_active=True,
                is_demo=token_data.get("is_demo", False)
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
            description=f"Connected Instagram account: {account_name} ({account_handle})"
        )

        return RedirectResponse(
            url=f"{frontend_redirect_url}?connected=instagram&account_id={account_id}",
            status_code=302
        )

    except Exception as e:
        import urllib.parse
        error_text = str(e).replace("\n", " ")
        safe_error = urllib.parse.quote_plus(error_text[:300])
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_error}&platform=instagram",
            status_code=302
        )


@router.post("/verify")
def verify_instagram_token(
    data: Optional[InstagramVerifyRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify Instagram account and token with Meta Graph API.
    Returns token health and basic profile information without leaking secrets.
    """
    provider = InstagramProvider()
    token_to_verify = data.access_token if (data and data.access_token) else None
    user_id_to_verify = data.user_id if (data and data.user_id) else None

    result = provider.verify_token(
        access_token=token_to_verify,
        user_id=user_id_to_verify
    )
    return result


@router.post("/connect-token")
def connect_instagram_with_token(
    data: Optional[InstagramConnectTokenRequest] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect an Instagram account directly using a verified access token.
    """
    user_id = current_user["user_id"]
    provider = InstagramProvider()

    token = (data.access_token if (data and data.access_token) else None)
    ig_user_id = (data.user_id if (data and data.user_id) else None)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instagram access token is required."
        )

    # Verify and fetch real metadata
    verif = provider.verify_token(access_token=token, user_id=ig_user_id)
    account_info = verif.get("account") or {}

    account_name = (
        (data.account_name if (data and data.account_name) else None) or
        account_info.get("name") or
        account_info.get("username") or
        "Instagram Professional"
    )

    handle = (
        (data.account_handle if (data and data.account_handle) else None) or
        (f"@{account_info['username']}" if account_info.get("username") else None) or
        f"@{account_name.lower().replace(' ', '_')}"
    )

    final_account_id = str(account_info.get("id") or ig_user_id or f"ig_{uuid.uuid4().hex[:10]}")
    avatar_url = account_info.get("profile_picture_url")
    followers_count = account_info.get("followers_count", 0)

    token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)

    existing = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == "instagram",
        SocialAccount.account_id == final_account_id
    ).first()

    is_demo = verif.get("is_demo", False) or token.startswith("ig_mock") or token.startswith("demo")

    if existing:
        existing.access_token = token or existing.access_token
        existing.token_expires_at = token_expires_at
        existing.account_name = account_name
        existing.account_handle = handle
        existing.account_id = final_account_id
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
            platform="instagram",
            account_name=account_name,
            account_handle=handle,
            account_id=final_account_id,
            avatar_url=avatar_url,
            access_token=token or "demo_token",
            refresh_token=None,
            token_expires_at=token_expires_at,
            followers_count=followers_count,
            posts_count=account_info.get("media_count", 0),
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
        description=f"Connected Instagram account: {account_name} ({handle})"
    )

    return {
        "success": True,
        "message": f"Successfully connected Instagram account {handle}",
        "account": {
            "id": account_obj.id,
            "platform": "instagram",
            "account_name": account_obj.account_name,
            "account_handle": account_obj.account_handle,
            "account_id": account_obj.account_id,
            "avatar_url": account_obj.avatar_url,
            "followers_count": account_obj.followers_count,
            "is_demo": account_obj.is_demo
        }
    }


@router.get("/status")
def get_instagram_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current Instagram connection status, account information, and token health.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "instagram",
        SocialAccount.is_active == True
    ).first()

    if not account:
        return {
            "connected": False,
            "platform": "instagram",
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
        "platform": "instagram",
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


@router.post("/disconnect")
def disconnect_instagram(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/remove all active Instagram accounts for the current user.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "instagram"
    ).all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Instagram account found."
        )

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    for acc in accounts:
        if user:
            notify_admins_social_account_disconnected(
                db=db,
                platform="instagram",
                account_name=acc.account_name,
                actor_user=user,
                account_id=acc.id
            )
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected Instagram account: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {
        "success": True,
        "message": "Instagram account disconnected successfully."
    }


@router.post("/publish")
def publish_to_instagram(
    data: InstagramPublishRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately publish a post to Instagram for the authenticated user.
    """
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Post content cannot be empty.")

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "instagram",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Instagram account connected. Please connect Instagram first."
        )

    if not data.media_urls or len(data.media_urls) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instagram requires at least one media URL (image or video)."
        )

    # 1. Create Post row
    post = Post(
        user_id=current_user["user_id"],
        social_account_id=account.id,
        title=data.title or "Instagram Post",
        content=data.content,
        platform="instagram",
        post_type=data.post_type or "image",
        media_url=data.media_urls[0] if data.media_urls else None,
        media_type="video" if (data.post_type == "video") else "image",
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
        platform="instagram",
        social_account_id=account.id,
        status="publishing",
        attempt_count=1
    )
    db.add(target)
    db.commit()

    # 3. Publish via Provider
    provider = get_social_provider("instagram", is_demo=account.is_demo)
    result = provider.publish_post(
        access_token=account.access_token,
        content=post.content,
        media_urls=data.media_urls,
        post_type=post.post_type,
        options={"ig_account_id": account.account_id}
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
            event_name="instagram.published",
            message="Published to Instagram successfully",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.published",
            module="posts",
            description=f"Published post to Instagram (ID: {result.external_id})"
        )

        return {
            "success": True,
            "post_id": post.id,
            "external_id": result.external_id,
            "url": result.url,
            "platform": "instagram",
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
            event_name="instagram.failed",
            message=f"Failed to publish to Instagram: {result.error_message}",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram Publishing Error: {result.error_message}"
        )
