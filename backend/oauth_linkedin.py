import os
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from models import User, SocialAccount
from auth import create_access_token, decode_access_token, get_current_user


router = APIRouter()


# ============================================================
# LINKEDIN CONFIGURATION
# ============================================================

LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)


# LinkedIn OAuth endpoints
AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"


# IMPORTANT:
# OIDC scopes = login/profile information
# w_member_social = permission to post on behalf of member
LINKEDIN_SCOPES = "openid profile email w_member_social"


# ============================================================
# CONFIGURATION CHECK
# ============================================================

def validate_linkedin_config():
    missing = []

    if not LINKEDIN_CLIENT_ID:
        missing.append("LINKEDIN_CLIENT_ID")

    if not LINKEDIN_CLIENT_SECRET:
        missing.append("LINKEDIN_CLIENT_SECRET")

    if not LINKEDIN_REDIRECT_URI:
        missing.append("LINKEDIN_REDIRECT_URI")

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing LinkedIn configuration: {', '.join(missing)}"
        )


# ============================================================
# STEP 1
# FRONTEND REQUESTS LINKEDIN AUTHORIZATION URL
# ============================================================

@router.get("/oauth/linkedin/authorize-url")
def get_linkedin_authorize_url(
    current_user: User = Depends(get_current_user)
):
    """
    Generate a LinkedIn OAuth authorization URL
    for the currently logged-in SocialPilot user.
    """

    validate_linkedin_config()

    # Create a signed state token containing the SocialPilot user ID.
    #
    # LinkedIn sends this state back to our callback.
    # We can then identify which SocialPilot user
    # started the OAuth process.
    state = create_access_token(
        {
            "user_id": current_user.id,
            "purpose": "linkedin_oauth",
        }
    )

    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "scope": LINKEDIN_SCOPES,
        "state": state,
    }

    authorization_url = (
        f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    )

    return {
        "url": authorization_url
    }


# ============================================================
# STEP 2
# LINKEDIN REDIRECTS USER BACK TO OUR CALLBACK
# ============================================================

@router.get("/oauth/linkedin/callback")
async def linkedin_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    LinkedIn redirects the browser here after authorization.

    Flow:

    LinkedIn
        ↓
    authorization code
        ↓
    exchange code for access token
        ↓
    retrieve LinkedIn profile
        ↓
    save/update SocialAccount
        ↓
    redirect to dashboard
    """

    validate_linkedin_config()

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    # --------------------------------------------------------
    # USER DENIED LINKEDIN AUTHORIZATION
    # --------------------------------------------------------

    if error:
        error_description = request.query_params.get(
            "error_description",
            "LinkedIn authorization was denied"
        )

        print(
            "[LinkedIn] Authorization denied:",
            error,
            error_description
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=denied"
        )

    # --------------------------------------------------------
    # REQUIRED PARAMETERS
    # --------------------------------------------------------

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing LinkedIn authorization code or state"
        )

    # --------------------------------------------------------
    # VALIDATE STATE
    # --------------------------------------------------------

    payload = decode_access_token(state)

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired LinkedIn OAuth state"
        )

    if payload.get("purpose") != "linkedin_oauth":
        raise HTTPException(
            status_code=400,
            detail="Invalid LinkedIn OAuth state purpose"
        )

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn OAuth state does not contain a user ID"
        )

    # --------------------------------------------------------
    # MAKE SURE SOCIALPILOT USER STILL EXISTS
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="SocialPilot user not found"
        )

    # ========================================================
    # STEP 3
    # EXCHANGE AUTHORIZATION CODE FOR ACCESS TOKEN
    # ========================================================

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:

            token_response = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": LINKEDIN_REDIRECT_URI,
                    "client_id": LINKEDIN_CLIENT_ID,
                    "client_secret": LINKEDIN_CLIENT_SECRET,
                },
                headers={
                    "Content-Type": (
                        "application/x-www-form-urlencoded"
                    )
                },
            )

    except httpx.RequestError as exc:
        print("[LinkedIn] Token request failed:", exc)

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    if token_response.status_code != 200:
        print(
            "[LinkedIn] Token exchange failed:",
            token_response.status_code,
            token_response.text
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    token_data = token_response.json()

    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")

    if not access_token:
        print("[LinkedIn] No access token returned")

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    # --------------------------------------------------------
    # CALCULATE TOKEN EXPIRY
    # --------------------------------------------------------

    token_expires_at = None

    if expires_in:
        try:
            token_expires_at = (
                datetime.now(timezone.utc)
                + timedelta(seconds=int(expires_in))
            )
        except (ValueError, TypeError):
            token_expires_at = None

    # ========================================================
    # STEP 4
    # GET LINKEDIN MEMBER PROFILE
    # ========================================================

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:

            profile_response = await client.get(
                USERINFO_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
            )

    except httpx.RequestError as exc:
        print("[LinkedIn] Profile request failed:", exc)

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    if profile_response.status_code != 200:
        print(
            "[LinkedIn] Profile request failed:",
            profile_response.status_code,
            profile_response.text
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    profile_data = profile_response.json()

    # OIDC provides "sub" as the LinkedIn member identifier.
    linkedin_user_id = profile_data.get("sub")

    display_name = profile_data.get(
        "name",
        "LinkedIn Account"
    )

    if not linkedin_user_id:
        print(
            "[LinkedIn] LinkedIn profile did not return member ID"
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    # ========================================================
    # STEP 5
    # SAVE LINKEDIN ACCOUNT
    # ========================================================

    existing = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == user.id,
            SocialAccount.platform == "linkedin"
        )
        .first()
    )

    if existing:

        existing.account_name = display_name
        existing.platform_user_id = linkedin_user_id
        existing.access_token = access_token
        existing.token_expires_at = token_expires_at
        existing.status = "connected"
        existing.is_active = True
        existing.last_synced_at = datetime.utcnow()

        print(
            f"[LinkedIn] Updated account for user {user.id}"
        )

    else:

        new_account = SocialAccount(
            user_id=user.id,
            platform="linkedin",
            account_name=display_name,
            platform_user_id=linkedin_user_id,
            access_token=access_token,
            refresh_token=None,
            token_expires_at=token_expires_at,
            status="connected",
            is_active=True,
            last_synced_at=datetime.utcnow(),
        )

        db.add(new_account)

        print(
            f"[LinkedIn] Connected new account for user {user.id}"
        )

    # ========================================================
    # STEP 6
    # SAVE DATABASE CHANGES
    # ========================================================

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "[LinkedIn] Database save failed:",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/dashboard?linkedin=error"
        )

    # ========================================================
    # STEP 7
    # RETURN USER TO SOCIALPILOT
    # ========================================================

    return RedirectResponse(
        f"{FRONTEND_URL}/dashboard?linkedin=connected"
    )