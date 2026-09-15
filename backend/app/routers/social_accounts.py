import os
import secrets
import requests

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.database.postgres import SessionLocal
from app.models.social_account import SocialAccount
from app.core.security import get_current_user


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/social-accounts",
    tags=["Social Accounts"]
)


# =========================================================
# DATABASE
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# =========================================================
# LINKEDIN OAUTH LOGIN
# =========================================================

@router.get("/linkedin/login")
def linkedin_login(
    current_user_id: int = Depends(get_current_user)
):
    """
    Creates the LinkedIn OAuth authorization URL.
    """

    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI")

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Client ID is not configured"
        )

    if not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Redirect URI is not configured"
        )

    # Generate random OAuth state
    random_state = secrets.token_urlsafe(32)

    # Store SocialPilot user ID inside state
    state = f"{current_user_id}:{random_state}"

    # LinkedIn permissions
    scopes = "openid profile email w_member_social"

    # LinkedIn OAuth parameters
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": scopes
    }

    # Create LinkedIn authorization URL
    authorization_url = (
        "https://www.linkedin.com/oauth/v2/authorization?"
        + urlencode(params)
    )

    return {
        "authorization_url": authorization_url
    }


# =========================================================
# LINKEDIN OAUTH CALLBACK
# =========================================================

@router.get("/linkedin/callback")
def linkedin_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db)
):
    """
    LinkedIn redirects the user to this endpoint after
    authorization.

    Steps:
        1. Receive authorization code.
        2. Validate state.
        3. Exchange code for access token.
        4. Get LinkedIn user information.
        5. Save/update LinkedIn account.
        6. Redirect user back to React.
    """

    # =====================================================
    # CHECK LINKEDIN ERROR
    # =====================================================

    if error:
        message = error_description or error

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                f"&message={message}"
            )
        )


    # =====================================================
    # CHECK AUTHORIZATION CODE
    # =====================================================

    if not code:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=Authorization code was not provided"
            )
        )


    # =====================================================
    # CHECK STATE
    # =====================================================

    if not state:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=OAuth state was not provided"
            )
        )


    # =====================================================
    # GET USER ID FROM STATE
    # =====================================================

    try:
        user_id_text, random_state = state.split(":", 1)
        user_id = int(user_id_text)

    except (ValueError, AttributeError):
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=Invalid OAuth state"
            )
        )


    # =====================================================
    # GET LINKEDIN CONFIGURATION
    # =====================================================

    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
    redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI")


    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Client ID is not configured"
        )


    if not client_secret:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Client Secret is not configured"
        )


    if not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Redirect URI is not configured"
        )


    # =====================================================
    # EXCHANGE AUTHORIZATION CODE FOR ACCESS TOKEN
    # =====================================================

    token_url = (
        "https://www.linkedin.com/oauth/v2/accessToken"
    )

    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret
    }


    try:
        token_response = requests.post(
            token_url,
            data=token_data,
            timeout=30
        )

    except requests.RequestException as exc:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                f"&message=LinkedIn connection failed: {str(exc)}"
            )
        )


    # =====================================================
    # CHECK TOKEN RESPONSE
    # =====================================================

    if not token_response.ok:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=LinkedIn token exchange failed"
            )
        )


    token_json = token_response.json()

    access_token = token_json.get("access_token")


    if not access_token:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=LinkedIn did not return an access token"
            )
        )


    # =====================================================
    # GET LINKEDIN USER INFORMATION
    # =====================================================

    userinfo_url = (
        "https://api.linkedin.com/v2/userinfo"
    )

    headers = {
        "Authorization": f"Bearer {access_token}"
    }


    try:
        userinfo_response = requests.get(
            userinfo_url,
            headers=headers,
            timeout=30
        )

    except requests.RequestException as exc:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                f"&message=Could not retrieve LinkedIn profile: {str(exc)}"
            )
        )


    # =====================================================
    # CHECK USERINFO RESPONSE
    # =====================================================

    if not userinfo_response.ok:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=Could not retrieve LinkedIn profile"
            )
        )


    profile = userinfo_response.json()


    # =====================================================
    # GET LINKEDIN PROFILE DETAILS
    # =====================================================

    linkedin_id = profile.get("sub")
    linkedin_name = profile.get("name")
    linkedin_email = profile.get("email")


    if not linkedin_id:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?linkedin=error"
                "&message=LinkedIn member ID was not returned"
            )
        )


    # =====================================================
    # CHOOSE ACCOUNT USERNAME
    # =====================================================

    username = (
        linkedin_email
        or linkedin_name
        or linkedin_id
    )


    # =====================================================
    # CHECK IF LINKEDIN ACCOUNT ALREADY EXISTS
    # =====================================================

    existing_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "linkedin"
        )
        .first()
    )


    # =====================================================
    # UPDATE EXISTING LINKEDIN ACCOUNT
    # =====================================================

    if existing_account:

        existing_account.username = username
        existing_account.access_token = access_token

        db.commit()
        db.refresh(existing_account)

        account_id = existing_account.id


    # =====================================================
    # CREATE NEW LINKEDIN ACCOUNT
    # =====================================================

    else:

        new_account = SocialAccount(
            user_id=user_id,
            platform="linkedin",
            username=username,
            access_token=access_token
        )

        db.add(new_account)

        db.commit()
        db.refresh(new_account)

        account_id = new_account.id


    # =====================================================
    # REDIRECT BACK TO REACT
    # =====================================================

    return RedirectResponse(
        url=(
            "http://localhost:5173/social-accounts"
            f"?linkedin=connected&account_id={account_id}"
        )
    )


# =========================================================
# YOUTUBE OAUTH LOGIN
# =========================================================

@router.get("/youtube/login")
def youtube_login(
    current_user_id: int = Depends(get_current_user)
):
    """
    Creates the Google OAuth authorization URL
    for connecting a YouTube channel.
    """

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")


    # =====================================================
    # CHECK GOOGLE CONFIGURATION
    # =====================================================

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured"
        )


    if not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Google Client Secret is not configured"
        )


    if not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Google Redirect URI is not configured"
        )


    # =====================================================
    # YOUTUBE PERMISSION
    # =====================================================

    scopes = [
        "https://www.googleapis.com/auth/youtube.upload"
    ]


    # =====================================================
    # CREATE GOOGLE OAUTH FLOW
    # =====================================================

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": (
                    "https://accounts.google.com/o/oauth2/auth"
                ),
                "token_uri": (
                    "https://oauth2.googleapis.com/token"
                ),
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=scopes,
    )


    flow.redirect_uri = redirect_uri


    # =====================================================
    # GENERATE OAUTH STATE
    # =====================================================

    random_state = secrets.token_urlsafe(32)

    state = f"{current_user_id}:{random_state}"


    # =====================================================
    # CREATE AUTHORIZATION URL
    # =====================================================

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )


    return {
        "authorization_url": authorization_url
    }


# =========================================================
# YOUTUBE OAUTH CALLBACK
# =========================================================

@router.get("/youtube/callback")
def youtube_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Google redirects the user here after YouTube authorization.

    Steps:
        1. Receive authorization code.
        2. Read SocialPilot user ID.
        3. Exchange code for tokens.
        4. Get YouTube channel information.
        5. Save credentials in PostgreSQL.
        6. Redirect back to React.
    """

    # =====================================================
    # CHECK GOOGLE ERROR
    # =====================================================

    if error:

        message = error_description or error

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": message
                })
            )
        )


    # =====================================================
    # CHECK AUTHORIZATION CODE
    # =====================================================

    if not code:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "Authorization code was not provided"
                })
            )
        )


    # =====================================================
    # CHECK STATE
    # =====================================================

    if not state:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "OAuth state was not provided"
                })
            )
        )


    # =====================================================
    # GET USER ID FROM STATE
    # =====================================================

    try:

        user_id_text, random_state = state.split(":", 1)

        user_id = int(user_id_text)

    except (ValueError, AttributeError):

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "Invalid OAuth state"
                })
            )
        )


    # =====================================================
    # GOOGLE CONFIGURATION
    # =====================================================

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")


    if not client_id:

        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured"
        )


    if not client_secret:

        raise HTTPException(
            status_code=500,
            detail="Google Client Secret is not configured"
        )


    if not redirect_uri:

        raise HTTPException(
            status_code=500,
            detail="Google Redirect URI is not configured"
        )


    # =====================================================
    # YOUTUBE PERMISSION
    # =====================================================

    scopes = [
        "https://www.googleapis.com/auth/youtube.upload"
    ]


    # =====================================================
    # CREATE GOOGLE OAUTH FLOW
    # =====================================================

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": (
                    "https://accounts.google.com/o/oauth2/auth"
                ),
                "token_uri": (
                    "https://oauth2.googleapis.com/token"
                ),
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=scopes,
        state=state,
    )


    flow.redirect_uri = redirect_uri


    # =====================================================
    # EXCHANGE CODE FOR TOKENS
    # =====================================================

    try:

        flow.fetch_token(
            code=code
        )

    except Exception as exc:

        # Print the REAL Google error in backend terminal
        print("========================================")
        print("YOUTUBE TOKEN EXCHANGE ERROR")
        print(str(exc))
        print("========================================")

        error_message = str(exc)

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": error_message
                })
            )
        )


    # =====================================================
    # GET CREDENTIALS
    # =====================================================

    credentials = flow.credentials

    access_token = credentials.token

    refresh_token = credentials.refresh_token


    # =====================================================
    # CHECK ACCESS TOKEN
    # =====================================================

    if not access_token:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "Google did not return an access token"
                })
            )
        )


    # =====================================================
    # CHECK REFRESH TOKEN
    # =====================================================

    if not refresh_token:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "Google did not return a refresh token"
                })
            )
        )


    # =====================================================
    # CONNECT TO YOUTUBE API
    # =====================================================

    try:

        youtube = build(
            "youtube",
            "v3",
            credentials=credentials
        )


        channel_response = (
            youtube.channels()
            .list(
                part="snippet",
                mine=True
            )
            .execute()
        )


    except Exception as exc:

        print("========================================")
        print("YOUTUBE API ERROR")
        print(str(exc))
        print("========================================")

        error_message = str(exc)

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": error_message
                })
            )
        )


    # =====================================================
    # CHECK CHANNEL
    # =====================================================

    channels = channel_response.get(
        "items",
        []
    )


    if not channels:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "No YouTube channel found"
                })
            )
        )


    channel = channels[0]

    channel_id = channel.get("id")


    channel_title = (
        channel.get("snippet", {})
        .get("title")
    )


    if not channel_id:

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts?"
                + urlencode({
                    "youtube": "error",
                    "message": "YouTube channel ID was not returned"
                })
            )
        )


    # =====================================================
    # ACCOUNT USERNAME
    # =====================================================

    username = (
        channel_title
        or channel_id
    )


    # =====================================================
    # CHECK EXISTING YOUTUBE ACCOUNT
    # =====================================================

    existing_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "youtube"
        )
        .first()
    )


    # =====================================================
    # UPDATE EXISTING YOUTUBE ACCOUNT
    # =====================================================

    if existing_account:

        existing_account.username = username

        existing_account.access_token = access_token

        existing_account.refresh_token = refresh_token

        existing_account.channel_id = channel_id

        db.commit()

        db.refresh(existing_account)

        account_id = existing_account.id


    # =====================================================
    # CREATE NEW YOUTUBE ACCOUNT
    # =====================================================

    else:

        new_account = SocialAccount(
            user_id=user_id,
            platform="youtube",
            username=username,
            access_token=access_token,
            refresh_token=refresh_token,
            channel_id=channel_id
        )

        db.add(new_account)

        db.commit()

        db.refresh(new_account)

        account_id = new_account.id


    # =====================================================
    # REDIRECT BACK TO REACT
    # =====================================================

    return RedirectResponse(
        url=(
            "http://localhost:5173/social-accounts"
            f"?youtube=connected&account_id={account_id}"
        )
    )


# =========================================================
# ADD SOCIAL ACCOUNT
# =========================================================

@router.post("/")
def add_social_account(
    platform: str,
    username: str,
    access_token: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    platform = platform.lower().strip()

    username = username.strip()


    # =====================================================
    # SUPPORTED PLATFORMS
    # =====================================================

    supported_platforms = [
        "instagram",
        "facebook",
        "linkedin",
        "twitter",
        "youtube"
    ]


    if platform not in supported_platforms:

        raise HTTPException(
            status_code=400,
            detail="Unsupported social media platform"
        )


    # =====================================================
    # CHECK USERNAME
    # =====================================================

    if not username:

        raise HTTPException(
            status_code=400,
            detail="Username cannot be empty"
        )


    # =====================================================
    # CREATE ACCOUNT
    # =====================================================

    social_account = SocialAccount(
        user_id=current_user_id,
        platform=platform,
        username=username,
        access_token=access_token
    )


    db.add(social_account)

    db.commit()

    db.refresh(social_account)


    return {
        "message": "Social account added successfully",
        "id": social_account.id,
        "platform": social_account.platform,
        "username": social_account.username
    }


# =========================================================
# GET SOCIAL ACCOUNTS
# =========================================================

@router.get("/")
def get_social_accounts(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    accounts = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == current_user_id
        )
        .all()
    )


    return [
        {
            "id": account.id,
            "platform": account.platform,
            "username": account.username,
            "connected": bool(account.access_token)
        }
        for account in accounts
    ]


# =========================================================
# CONNECT SOCIAL ACCOUNT MANUALLY
# =========================================================

@router.put("/{account_id}/connect")
def connect_social_account(
    account_id: int,
    access_token: str,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user_id
        )
        .first()
    )


    if not account:

        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )


    if not access_token.strip():

        raise HTTPException(
            status_code=400,
            detail="Access token cannot be empty"
        )


    account.access_token = access_token.strip()


    db.commit()

    db.refresh(account)


    return {
        "message": "Social account connected successfully",
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "connected": True
    }


# =========================================================
# DISCONNECT SOCIAL ACCOUNT
# =========================================================

@router.put("/{account_id}/disconnect")
def disconnect_social_account(
    account_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user_id
        )
        .first()
    )


    if not account:

        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )


    # =====================================================
    # REMOVE TOKENS
    # =====================================================

    account.access_token = None

    account.refresh_token = None


    db.commit()

    db.refresh(account)


    return {
        "message": "Social account disconnected successfully",
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "connected": False
    }


# =========================================================
# DELETE SOCIAL ACCOUNT
# =========================================================

@router.delete("/{account_id}")
def delete_social_account(
    account_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user_id
        )
        .first()
    )


    if not account:

        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )


    db.delete(account)

    db.commit()


    return {
        "message": "Social account deleted successfully"
    }