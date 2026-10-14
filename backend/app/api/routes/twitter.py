import uuid
import secrets
import random
import hashlib
import base64
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
from app.services.providers.twitter_provider import TwitterProvider
from app.services.audit import log_audit_event
from app.services.notifications import (
    notify_admins_social_account_connected,
    notify_admins_social_account_disconnected
)


router = APIRouter(
    prefix="/api/twitter",
    tags=["Twitter / X Integration"]
)

# Root-level callback router for /social-auth/twitter/callback and /social-accounts/oauth/twitter/callback
callback_router = APIRouter(tags=["Twitter OAuth Callback"])


class TwitterPublishRequest(BaseModel):
    content: str
    media_urls: Optional[List[str]] = None
    post_type: Optional[str] = "text"
    title: Optional[str] = None


@router.get("/connect")
def get_twitter_auth_url(
    current_user: dict = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """
    Generate Twitter/X OAuth 2.0 PKCE authorization URL with cryptographically secure state.
    The client should redirect the authenticated user to 'auth_url'.
    """
    # 1. Generate high-entropy PKCE code_verifier and code_challenge (S256)
    code_verifier = secrets.token_urlsafe(48)
    code_challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode("utf-8")).digest())
        .decode("utf-8")
        .rstrip("=")
    )

    # 2. Embed user_id and code_verifier securely into HMAC-signed state
    state = create_oauth_state(
        user_id=current_user["user_id"],
        extra_data={"code_verifier": code_verifier}
    )

    effective_redirect = (
        redirect_uri
        or getattr(settings, "TWITTER_REDIRECT_URI", None)
        or f"{settings.BACKEND_URL}/social-auth/twitter/callback"
    )

    is_configured = "twitter" in list_configured_platforms()

    provider = get_oauth_provider("twitter")
    try:
        if isinstance(provider, TwitterProvider):
            auth_url = provider.get_auth_url(
                state=state,
                redirect_uri=effective_redirect,
                code_challenge=code_challenge,
                code_challenge_method="S256"
            )
        else:
            auth_url = provider.get_auth_url(state=state, redirect_uri=effective_redirect)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "platform": "twitter",
        "auth_url": auth_url,
        "redirect_uri": effective_redirect,
        "state": state,
        "is_real_oauth": is_configured,
        "note": None if is_configured else "Twitter/X API credentials not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in .env for production OAuth."
    }


@router.get("/callback")
@callback_router.get("/social-auth/twitter/callback")
@callback_router.get("/social-accounts/oauth/twitter/callback")
@callback_router.get("/api/twitter/callback")
def twitter_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth 2.0 PKCE callback endpoint invoked by Twitter/X after user authorization.
    Exchanges authorization code for an access token, fetches profile details & metrics,
    and links the Twitter/X account to the authenticated SocialPilot user.
    """
    frontend_redirect_url = f"{settings.FRONTEND_URL}/accounts"

    # 1. Handle user cancellation or Twitter OAuth errors
    if error:
        err_msg = error_description or error
        if "access_denied" in err_msg.lower() or "user_cancelled" in err_msg.lower():
            err_msg = "Twitter authorization was denied by the user."
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={err_msg}&platform=twitter",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Missing+authorization+code&platform=twitter",
            status_code=302
        )

    # 2. Cryptographic state verification (CSRF & expiry protection)
    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Invalid+or+expired+OAuth+state.+Please+try+connecting+again.&platform=twitter",
            status_code=302
        )

    user_id = state_data["user_id"]
    code_verifier = state_data.get("extra", {}).get("code_verifier", "challenge")

    try:
        redirect_uri = (
            getattr(settings, "TWITTER_REDIRECT_URI", None)
            or f"{settings.BACKEND_URL}/social-auth/twitter/callback"
        )
        provider = get_oauth_provider("twitter")

        if isinstance(provider, TwitterProvider):
            token_data = provider.exchange_code_for_token(
                code=code,
                redirect_uri=redirect_uri,
                code_verifier=code_verifier
            )
        else:
            token_data = provider.exchange_code_for_token(code=code, redirect_uri=redirect_uri)

        expires_in = token_data.get("expires_in", 7200)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account_name = token_data.get("account_name", "Twitter User")
        account_handle = token_data.get("account_handle") or "@twitter_user"
        account_id_val = str(token_data.get("account_id") or f"tw_{uuid.uuid4().hex[:8]}")
        is_demo = token_data.get("is_demo", False)

        # 3. Upsert real Twitter account in DB for the specific authenticated user
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "twitter"
        ).first()

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            existing.refresh_token = token_data.get("refresh_token", existing.refresh_token)
            existing.token_expires_at = token_expires_at
            existing.account_name = account_name
            existing.account_handle = account_handle
            existing.account_id = account_id_val
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            if token_data.get("followers_count") is not None:
                existing.followers_count = token_data["followers_count"]
            if token_data.get("following_count") is not None:
                existing.following_count = token_data["following_count"]
            existing.is_active = True
            existing.is_demo = is_demo
            db.commit()
            account = existing
        else:
            account = SocialAccount(
                user_id=user_id,
                platform="twitter",
                account_name=account_name,
                account_handle=account_handle,
                account_id=account_id_val,
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
                token_expires_at=token_expires_at,
                followers_count=token_data.get("followers_count", 0),
                following_count=token_data.get("following_count", 0),
                posts_count=0,
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
            description=f"Connected Twitter/X account via OAuth: {account_name} ({account_handle})"
        )

        return RedirectResponse(
            url=f"{frontend_redirect_url}?connected=twitter&account_id={account.id}",
            status_code=302
        )

    except Exception as e:
        error_text = str(e)
        safe_error = error_text.split("\n")[0][:150]
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_error}&platform=twitter",
            status_code=302
        )


@router.get("/status")
def get_twitter_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current Twitter connection status, account information, and token health for the authenticated user.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "twitter",
        SocialAccount.is_active == True
    ).first()

    if not account:
        return {
            "connected": False,
            "platform": "twitter",
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
        "platform": "twitter",
        "health": "expired" if expired else "healthy",
        "account": {
            "id": account.id,
            "account_name": account.account_name,
            "account_handle": account.account_handle,
            "account_id": account.account_id,
            "avatar_url": account.avatar_url,
            "followers_count": account.followers_count,
            "following_count": account.following_count,
            "posts_count": account.posts_count,
            "is_demo": account.is_demo,
            "is_token_expired": expired,
            "token_expires_at": account.token_expires_at.isoformat() if account.token_expires_at else None,
            "created_at": account.created_at.isoformat() if account.created_at else None
        }
    }


@router.post("/disconnect")
def disconnect_twitter(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/remove all active Twitter accounts for the current user.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "twitter"
    ).all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Twitter/X account found."
        )

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    for acc in accounts:
        if user:
            notify_admins_social_account_disconnected(
                db=db,
                platform="twitter",
                account_name=acc.account_name,
                actor_user=user,
                account_id=acc.id
            )
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected Twitter/X account: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {
        "success": True,
        "message": "Twitter/X account disconnected successfully."
    }


@router.post("/publish")
def publish_to_twitter(
    data: TwitterPublishRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately publish a tweet to Twitter/X for the authenticated user.
    Records the post in SocialPilot, updates status and logs.
    """
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Tweet content cannot be empty.")

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "twitter",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Twitter/X account connected. Please connect Twitter first."
        )

    # 1. Create Post record
    post = Post(
        user_id=current_user["user_id"],
        social_account_id=account.id,
        title=data.title or "Twitter Tweet",
        content=data.content,
        platform="twitter",
        post_type=data.post_type or "text",
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
        platform="twitter",
        social_account_id=account.id,
        status="publishing",
        attempt_count=1
    )
    db.add(target)
    db.commit()

    # 3. Publish via Provider
    provider = get_social_provider("twitter", is_demo=account.is_demo)
    result = provider.publish_post(
        access_token=account.access_token,
        content=post.content,
        media_urls=data.media_urls,
        post_type=post.post_type
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
            event_name="twitter.published",
            message="Published tweet to Twitter/X successfully",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.published",
            module="posts",
            description=f"Published tweet to Twitter/X (ID: {result.external_id})"
        )

        return {
            "success": True,
            "post_id": post.id,
            "external_id": result.external_id,
            "url": result.url,
            "platform": "twitter",
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
            event_name="twitter.failed",
            message=f"Failed to publish to Twitter/X: {result.error_message}",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Twitter Publishing Error: {result.error_message}"
        )


@router.post("/sync")
def sync_twitter_account(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync Twitter metrics (followers, following, tweets) and database published post count.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "twitter",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Twitter/X account found."
        )

    # Calculate real published posts count
    published_count = db.query(Post).filter(
        Post.social_account_id == account.id,
        Post.status == "published"
    ).count()
    account.posts_count = published_count

    # Sync metrics from provider
    provider = get_social_provider("twitter", is_demo=account.is_demo)
    metrics = provider.get_account_metrics(account.access_token, account.account_id or "")
    if metrics.get("followers") is not None and metrics["followers"] > 0:
        account.followers_count = metrics["followers"]
    if metrics.get("following") is not None and metrics["following"] > 0:
        account.following_count = metrics["following"]

    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "message": "Twitter metrics synced successfully.",
        "account": {
            "id": account.id,
            "account_name": account.account_name,
            "followers_count": account.followers_count,
            "following_count": account.following_count,
            "posts_count": account.posts_count
        }
    }
