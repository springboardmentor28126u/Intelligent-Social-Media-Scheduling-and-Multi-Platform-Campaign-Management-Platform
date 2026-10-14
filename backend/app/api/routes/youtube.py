import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post, PostPlatformTarget, PublishingLog
from app.core.security import get_current_user, create_oauth_state, verify_oauth_state
from app.core.config import settings
from app.services.providers import get_social_provider, get_oauth_provider, list_configured_platforms
from app.services.providers.youtube_provider import YouTubeProvider
from app.services.audit import log_audit_event
from app.services.notifications import (
    notify_admins_social_account_connected,
    notify_admins_social_account_disconnected
)


router = APIRouter(
    prefix="/api/youtube",
    tags=["YouTube Integration"]
)

# Root-level callback router for /social-auth/youtube/callback and /social-accounts/oauth/youtube/callback
callback_router = APIRouter(tags=["YouTube OAuth Callback"])


class YouTubePublishRequest(BaseModel):
    content: str
    media_urls: Optional[List[str]] = None
    post_type: Optional[str] = "video"
    title: Optional[str] = None
    privacy: Optional[str] = "public"


@router.get("/connect")
def get_youtube_auth_url(
    current_user: dict = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """
    Generate Google OAuth 2.0 authorization URL for YouTube with cryptographically secure state.
    The client should redirect the authenticated user to 'auth_url'.
    """
    state = create_oauth_state(user_id=current_user["user_id"])
    effective_redirect = (
        redirect_uri
        or getattr(settings, "YOUTUBE_REDIRECT_URI", None)
        or f"{settings.BACKEND_URL}/social-auth/youtube/callback"
    )

    is_configured = "youtube" in list_configured_platforms()

    provider = get_oauth_provider("youtube")
    try:
        auth_url = provider.get_auth_url(state=state, redirect_uri=effective_redirect)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "platform": "youtube",
        "auth_url": auth_url,
        "redirect_uri": effective_redirect,
        "state": state,
        "is_real_oauth": is_configured,
        "note": None if is_configured else "YouTube API credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env for production OAuth."
    }


@router.get("/callback")
@callback_router.get("/social-auth/youtube/callback")
@callback_router.get("/social-accounts/oauth/youtube/callback")
@callback_router.get("/api/youtube/callback")
def youtube_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth 2.0 callback endpoint invoked by Google/YouTube after user authorization.
    Exchanges authorization code for tokens, retrieves channel info,
    and links the YouTube account to the authenticated SocialPilot user.
    """
    frontend_redirect_url = f"{settings.FRONTEND_URL}/accounts"

    # 1. Handle user cancellation or Google OAuth errors
    if error:
        err_msg = error_description or error
        if "access_denied" in err_msg.lower() or "user_cancelled" in err_msg.lower():
            err_msg = "YouTube authorization was denied by the user."
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={err_msg}&platform=youtube",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Missing+authorization+code&platform=youtube",
            status_code=302
        )

    # 2. Cryptographic state verification (CSRF & expiry protection)
    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Invalid+or+expired+OAuth+state.+Please+try+connecting+again.&platform=youtube",
            status_code=302
        )

    user_id = state_data["user_id"]

    try:
        redirect_uri = (
            getattr(settings, "YOUTUBE_REDIRECT_URI", None)
            or f"{settings.BACKEND_URL}/social-auth/youtube/callback"
        )
        provider = get_oauth_provider("youtube")
        token_data = provider.exchange_code_for_token(code=code, redirect_uri=redirect_uri)

        expires_in = token_data.get("expires_in", 3600)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account_name = token_data.get("account_name", "YouTube Channel")
        account_handle = token_data.get("account_handle") or "@youtube_channel"
        account_id_val = str(token_data.get("account_id") or f"UC_{uuid.uuid4().hex[:12]}")
        is_demo = token_data.get("is_demo", False)

        # 3. Upsert real YouTube account in DB for the specific authenticated user
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "youtube"
        ).first()

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            if token_data.get("refresh_token"):
                existing.refresh_token = token_data.get("refresh_token")
            existing.token_expires_at = token_expires_at
            existing.account_name = account_name
            existing.account_handle = account_handle
            existing.account_id = account_id_val
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            if token_data.get("followers_count") is not None:
                existing.followers_count = token_data["followers_count"]
            existing.is_active = True
            existing.is_demo = is_demo
            db.commit()
            account = existing
        else:
            account = SocialAccount(
                user_id=user_id,
                platform="youtube",
                account_name=account_name,
                account_handle=account_handle,
                account_id=account_id_val,
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
                token_expires_at=token_expires_at,
                followers_count=token_data.get("followers_count", 0),
                following_count=0,
                posts_count=token_data.get("posts_count", 0),
                is_active=True,
                is_demo=is_demo
            )
            db.add(account)
            db.commit()
            db.refresh(account)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            notify_admins_social_account_connected(db=db, account=account, actor_user=user)

        log_audit_event(
            db=db,
            user_id=user_id,
            action="social_account.connected",
            module="social_accounts",
            description=f"Connected YouTube channel via OAuth: {account_name} ({account_handle})"
        )

        return RedirectResponse(
            url=f"{frontend_redirect_url}?connected=youtube&account_id={account.id}",
            status_code=302
        )

    except Exception as e:
        error_text = str(e)
        safe_error = error_text.split("\n")[0][:150]
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_error}&platform=youtube",
            status_code=302
        )


@router.get("/status")
def get_youtube_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current YouTube connection status, channel information, and token health for the authenticated user.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "youtube",
        SocialAccount.is_active == True
    ).first()

    if not account:
        return {
            "connected": False,
            "platform": "youtube",
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
        "platform": "youtube",
        "health": "expired" if expired else "healthy",
        "account": {
            "id": account.id,
            "account_name": account.account_name,
            "account_handle": account.account_handle,
            "account_id": account.account_id,
            "avatar_url": account.avatar_url,
            "followers_count": account.followers_count,
            "posts_count": account.posts_count,
            "is_demo": account.is_demo,
            "is_token_expired": expired,
            "token_expires_at": account.token_expires_at.isoformat() if account.token_expires_at else None,
            "created_at": account.created_at.isoformat() if account.created_at else None
        }
    }


@router.post("/disconnect")
@router.get("/disconnect")
def disconnect_youtube(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/remove all active YouTube accounts for the current user.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "youtube"
    ).all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected YouTube account found."
        )

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    for acc in accounts:
        if user:
            notify_admins_social_account_disconnected(
                db=db,
                platform="youtube",
                account_name=acc.account_name,
                actor_user=user,
                account_id=acc.id
            )
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected YouTube channel: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {
        "success": True,
        "message": "YouTube account disconnected successfully."
    }


@router.post("/publish")
def publish_to_youtube(
    data: YouTubePublishRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately publish a video to YouTube for the authenticated user.
    Records the post in SocialPilot, updates status and logs.
    """
    if not data.media_urls or len(data.media_urls) == 0:
        raise HTTPException(
            status_code=400,
            detail="YouTube requires a video attachment. Please attach a video file to publish to YouTube."
        )

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "youtube",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active YouTube account connected. Please connect YouTube first."
        )

    # 1. Create Post record
    post = Post(
        user_id=current_user["user_id"],
        social_account_id=account.id,
        title=data.title or "YouTube Video",
        content=data.content or "",
        platform="youtube",
        post_type=data.post_type or "video",
        status="publishing",
        scheduled_at=None,
        published_at=None
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # 2. Create PostPlatformTarget record
    target = PostPlatformTarget(
        post_id=post.id,
        platform="youtube",
        social_account_id=account.id,
        status="publishing",
        attempt_count=1
    )
    db.add(target)
    db.commit()

    # 3. Publish via Provider
    provider = get_social_provider("youtube", is_demo=account.is_demo)
    result = provider.publish_post(
        access_token=account.access_token,
        content=post.content,
        media_urls=data.media_urls,
        post_type=post.post_type,
        options={
            "title": data.title or post.title,
            "description": data.content,
            "privacy": data.privacy or "public"
        }
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
            social_account_id=account.id,
            status="SUCCESS",
            level="success",
            event_name="youtube.published",
            message="Published video to YouTube successfully",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.published",
            module="posts",
            description=f"Published video to YouTube (ID: {result.external_id})"
        )

        return {
            "success": True,
            "post_id": post.id,
            "external_id": result.external_id,
            "url": result.url,
            "platform": "youtube",
            "published_at": now.isoformat()
        }
    else:
        post.status = "failed"
        post.failure_reason = result.error_message

        target.status = "failed"
        target.error_message = result.error_message

        pub_log = PublishingLog(
            post_id=post.id,
            social_account_id=account.id,
            status="FAILED",
            level="error",
            event_name="youtube.failed",
            message=f"Failed to publish to YouTube: {result.error_message}",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube Publishing Error: {result.error_message}"
        )


@router.post("/sync")
def sync_youtube_account(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync YouTube channel metrics (subscribers, video count, total views) and update database.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "youtube",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected YouTube account found."
        )

    # Calculate real published posts count from SocialPilot database
    published_count = db.query(Post).filter(
        Post.social_account_id == account.id,
        Post.status == "published"
    ).count()
    account.posts_count = published_count

    # Sync metrics from provider
    provider = get_social_provider("youtube", is_demo=account.is_demo)
    metrics = provider.get_account_metrics(account.access_token, account.account_id or "")
    if metrics.get("subscribers") is not None and metrics["subscribers"] > 0:
        account.followers_count = metrics["subscribers"]

    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "message": "YouTube channel metrics synced successfully.",
        "account": {
            "id": account.id,
            "account_name": account.account_name,
            "followers_count": account.followers_count,
            "posts_count": account.posts_count,
            "metrics": metrics
        }
    }
