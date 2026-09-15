from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.social_account import SocialAccount
from app.models.user import User
from app.services.oauth_service import oauth_service
from app.services.oauth_state import (
    create_oauth_state,
    get_user_id_from_state,
)


router = APIRouter(
    prefix="/social-auth",
    tags=["Social Authentication"],
)


# =====================================
# Start OAuth Authorization
# =====================================

@router.get("/{platform}/authorize")
def authorize_platform(
    platform: str,
    current_user: User = Depends(get_current_user),
):
    try:
        # Create our application's OAuth state.
        state = create_oauth_state(current_user.id)

        # Send the SAME state to the platform integration.
        result = oauth_service.get_authorization_url(
            platform=platform,
            state=state,
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =====================================
# OAuth Callback
# =====================================

@router.get("/{platform}/callback")
def oauth_callback(
    platform: str,
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # =====================================
    # Validate OAuth state
    # =====================================

    if not state:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{platform.title()} did not return OAuth state. "
                "The authorization callback must include state."
            ),
        )

    # Convert our OAuth state back to the user ID.
    user_id = get_user_id_from_state(state)

    if user_id is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state",
        )

    try:
        # =====================================
        # Exchange authorization code for token
        # =====================================

        # IMPORTANT:
        # For X/Twitter, the exact same state is required
        # so the stored PKCE code_verifier can be retrieved.
        result = oauth_service.exchange_code_for_token(
            platform=platform,
            code=code,
            state=state,
        )

        # =====================================
        # Get OAuth Profile Information
        # =====================================

        profile = result.get("profile", {})

        platform_user_id = profile.get("sub")

        account_name = (
            profile.get("name")
            or profile.get("username")
            or f"{platform.title()} Account"
        )

        # =====================================
        # Calculate Token Expiration Time
        # =====================================

        expires_in = result.get("expires_in")

        token_expires_at = None

        if expires_in:
            token_expires_at = (
                datetime.now(timezone.utc)
                + timedelta(seconds=int(expires_in))
            )

        # =====================================
        # Check for Existing Account
        # =====================================

        existing_account = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == platform.lower(),
                SocialAccount.platform_user_id == platform_user_id,
            )
            .first()
        )

        # =====================================
        # Reconnect Existing Account
        # =====================================

        if existing_account:
            existing_account.access_token = result.get(
                "access_token"
            )

            existing_account.refresh_token = result.get(
                "refresh_token"
            )

            existing_account.token_expires_at = (
                token_expires_at
            )

            existing_account.account_name = account_name

            existing_account.status = "connected"

            existing_account.is_active = True

            db.commit()
            db.refresh(existing_account)

            return {
                "message": (
                    f"{platform.title()} account "
                    "reconnected successfully"
                ),
                "account_id": existing_account.id,
                "account_name": existing_account.account_name,
                "platform": existing_account.platform,
                "token_expires_at": (
                    existing_account.token_expires_at
                ),
            }

        # =====================================
        # Create New Social Account
        # =====================================

        new_account = SocialAccount(
            user_id=user_id,
            platform=platform.lower(),
            account_name=account_name,
            platform_user_id=platform_user_id,
            access_token=result.get("access_token"),
            refresh_token=result.get("refresh_token"),
            token_expires_at=token_expires_at,
            status="connected",
            is_active=True,
        )

        db.add(new_account)

        db.commit()

        db.refresh(new_account)

        return {
            "message": (
                f"{platform.title()} account "
                "connected successfully"
            ),
            "account_id": new_account.id,
            "account_name": new_account.account_name,
            "platform": new_account.platform,
            "token_expires_at": (
                new_account.token_expires_at
            ),
        }

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"OAuth callback failed: {str(error)}",
        )