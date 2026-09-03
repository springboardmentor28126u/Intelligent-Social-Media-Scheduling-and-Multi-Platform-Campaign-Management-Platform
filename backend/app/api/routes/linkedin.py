import uuid
import secrets
import random
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
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/api/linkedin",
    tags=["LinkedIn Integration"]
)


class LinkedInPublishRequest(BaseModel):
    content: str
    media_urls: Optional[List[str]] = None
    post_type: Optional[str] = "text"
    title: Optional[str] = None


@router.get("/connect")
def get_linkedin_auth_url(
    current_user: dict = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """
    Generate LinkedIn OAuth 2.0 authorization URL with cryptographically secure state.
    The client should redirect the authenticated user to 'auth_url'.
    """
    state = create_oauth_state(user_id=current_user["user_id"])
    effective_redirect = redirect_uri or settings.LINKEDIN_REDIRECT_URI or "http://localhost:8000/api/linkedin/callback"

    is_configured = "linkedin" in list_configured_platforms()
    if not is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LinkedIn integration is not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env"
        )

    provider = get_oauth_provider("linkedin")
    try:
        auth_url = provider.get_auth_url(state=state, redirect_uri=effective_redirect)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "platform": "linkedin",
        "auth_url": auth_url,
        "redirect_uri": effective_redirect,
        "state": state,
        "is_real_oauth": True,
        "note": None
    }


@router.get("/callback")
def linkedin_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth 2.0 callback endpoint invoked by LinkedIn after user authorization.
    Exchanges authorization code for an access token, fetches profile details,
    and links the LinkedIn account to the authenticated SocialPilot user.
    """
    frontend_redirect_url = f"{settings.FRONTEND_URL}/accounts"

    # 1. Handle user cancellation or LinkedIn OAuth errors
    if error:
        err_msg = error_description or error
        if "user_cancelled" in err_msg.lower() or "access_denied" in err_msg.lower():
            err_msg = "LinkedIn authorization was denied by the user."
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={err_msg}&platform=linkedin",
            status_code=302
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Missing+authorization+code&platform=linkedin",
            status_code=302
        )

    # 2. Cryptographic state verification (CSRF & expiry protection)
    state_data = verify_oauth_state(state) if state else None
    if not state_data or not state_data.get("user_id"):
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error=Invalid+or+expired+OAuth+state.+Please+try+connecting+again.&platform=linkedin",
            status_code=302
        )

    user_id = state_data["user_id"]

    try:
        redirect_uri = settings.LINKEDIN_REDIRECT_URI or "http://localhost:8000/api/linkedin/callback"
        provider = get_oauth_provider("linkedin")
        token_data = provider.exchange_code_for_token(code=code, redirect_uri=redirect_uri)

        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # 3. Upsert real LinkedIn account in DB
        existing = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "linkedin"
        ).first()

        account_name = token_data.get("account_name", "LinkedIn Member")
        account_handle = token_data.get("account_handle") or account_name
        account_id_val = token_data.get("account_id")

        if existing:
            existing.access_token = token_data.get("access_token", existing.access_token)
            existing.refresh_token = token_data.get("refresh_token", existing.refresh_token)
            existing.token_expires_at = token_expires_at
            existing.account_name = account_name
            existing.account_handle = account_handle
            if account_id_val:
                existing.account_id = account_id_val
            existing.avatar_url = token_data.get("avatar_url", existing.avatar_url)
            existing.is_active = True
            existing.is_demo = False
            db.commit()
            account_id = existing.id
        else:
            account = SocialAccount(
                user_id=user_id,
                platform="linkedin",
                account_name=account_name,
                account_handle=account_handle,
                account_id=account_id_val or f"urn:li:person:{uuid.uuid4().hex[:12]}",
                avatar_url=token_data.get("avatar_url"),
                access_token=token_data.get("access_token", ""),
                refresh_token=token_data.get("refresh_token"),
                token_expires_at=token_expires_at,
                followers_count=0,
                is_active=True,
                is_demo=False
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            account_id = account.id

        log_audit_event(
            db=db,
            user_id=user_id,
            action="social_account.connected",
            module="social_accounts",
            description=f"Connected real LinkedIn account via OAuth: {account_name}"
        )

        return RedirectResponse(
            url=f"{frontend_redirect_url}?connected=linkedin&account_id={account_id}",
            status_code=302
        )

    except Exception as e:
        error_text = str(e)
        # Avoid leaking internal system traces in frontend query string
        safe_error = error_text.split("\n")[0][:150]
        return RedirectResponse(
            url=f"{frontend_redirect_url}?error={safe_error}&platform=linkedin",
            status_code=302
        )


@router.get("/status")
def get_linkedin_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return current LinkedIn connection status, account information, and token health.
    """
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "linkedin",
        SocialAccount.is_active == True
    ).first()

    if not account:
        return {
            "connected": False,
            "platform": "linkedin",
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
        "platform": "linkedin",
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
def disconnect_linkedin(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/remove all active LinkedIn accounts for the current user.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "linkedin"
    ).all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected LinkedIn account found."
        )

    for acc in accounts:
        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="social_account.disconnected",
            module="social_accounts",
            description=f"Disconnected LinkedIn account: {acc.account_name}"
        )
        db.delete(acc)
    db.commit()

    return {
        "success": True,
        "message": "LinkedIn account disconnected successfully."
    }


@router.post("/publish")
def publish_to_linkedin(
    data: LinkedInPublishRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately publish a post to LinkedIn for the authenticated user.
    Records the post in SocialPilot and updates status and logs.
    """
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Post content cannot be empty.")

    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user["user_id"],
        SocialAccount.platform == "linkedin",
        SocialAccount.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active LinkedIn account connected. Please connect LinkedIn first."
        )

    # 1. Create Post row
    post = Post(
        user_id=current_user["user_id"],
        social_account_id=account.id,
        title=data.title or "LinkedIn Post",
        content=data.content,
        platform="linkedin",
        post_type=data.post_type or "text",
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
        platform="linkedin",
        social_account_id=account.id,
        status="publishing",
        attempt_count=1
    )
    db.add(target)
    db.commit()

    # 3. Publish via Provider
    provider = get_social_provider("linkedin", is_demo=account.is_demo)
    result = provider.publish_post(
        access_token=account.access_token,
        content=post.content,
        media_urls=data.media_urls,
        post_type=post.post_type,
        options={"author_urn": account.account_id}
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
            event_name="linkedin.published",
            message="Published to LinkedIn successfully",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        log_audit_event(
            db=db,
            user_id=current_user["user_id"],
            action="post.published",
            module="posts",
            description=f"Published post to LinkedIn (ID: {result.external_id})"
        )

        return {
            "success": True,
            "post_id": post.id,
            "external_id": result.external_id,
            "url": result.url,
            "platform": "linkedin",
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
            event_name="linkedin.failed",
            message=f"Failed to publish to LinkedIn: {result.error_message}",
            response_payload=result.to_dict()
        )
        db.add(pub_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LinkedIn Publishing Error: {result.error_message}"
        )
