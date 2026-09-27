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
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
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
        autogenerate_code_verifier=False
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
                "http://localhost:5173/social-accounts"
                "?youtube=error"
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
                "?youtube=error"
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
                "?youtube=error"
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
                "?youtube=error"
                "&message=Invalid OAuth state"
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
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
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
        autogenerate_code_verifier=False
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
        print("========================================")
        print("YOUTUBE TOKEN EXCHANGE ERROR")
        print(str(exc))
        print("========================================")

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=YouTube token exchange failed"
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
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=Google did not return an access token"
            )
        )

    # =====================================================
    # CHECK REFRESH TOKEN
    # =====================================================

    if not refresh_token:
        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=Google did not return a refresh token"
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

        return RedirectResponse(
            url=(
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=Could not retrieve YouTube channel"
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
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=No YouTube channel found"
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
                "http://localhost:5173/social-accounts"
                "?youtube=error"
                "&message=YouTube channel ID was not returned"
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
# INSTAGRAM OAUTH LOGIN
# =========================================================

@router.get("/instagram/login")
def instagram_login(
    current_user_id: int = Depends(get_current_user)
):
    """
    Creates the Instagram OAuth authorization URL.

    Instagram Login is used to connect an Instagram
    professional account such as a Creator account.
    """

    instagram_app_id = os.getenv("INSTAGRAM_APP_ID")
    instagram_redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI")

    if not instagram_app_id:
        raise HTTPException(
            status_code=500,
            detail="Instagram App ID is not configured"
        )

    if not instagram_redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Instagram Redirect URI is not configured"
        )

    # Store the SocialPilot user ID in the OAuth state.
    # The random part prevents a completely predictable state value.
    random_state = secrets.token_urlsafe(32)
    state = f"{current_user_id}:{random_state}"

    # Instagram Login permissions required for publishing content.
    scopes = (
        "instagram_business_basic,"
        "instagram_business_content_publish"
    )

    params = {
        "client_id": instagram_app_id,
        "redirect_uri": instagram_redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "state": state,
    }

    authorization_url = (
        "https://www.instagram.com/oauth/authorize?"
        + urlencode(params)
    )

    return {
        "authorization_url": authorization_url
    }


# =========================================================
# INSTAGRAM OAUTH CALLBACK
# =========================================================

@router.get("/instagram/callback")
def instagram_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Instagram OAuth callback.

    Important Instagram token flow:

        1. Receive authorization code.
        2. Read SocialPilot user ID from state.
        3. Exchange authorization code for a short-lived token.
        4. Exchange that token for a long-lived Instagram token.
        5. Use the long-lived token to retrieve the Instagram account.
        6. Update the matching SocialAccount using the Instagram user ID.
        7. Save the long-lived token in PostgreSQL.
        8. Redirect back to React.

    The previous implementation stored the short-lived token directly.
    That caused the scheduled publisher to fail later with OAuth error 190
    after the token expired. This callback now stores the long-lived token.
    """

    FRONTEND_URL = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    ).rstrip("/") + "/social-accounts"

    # =====================================================
    # CHECK INSTAGRAM OAUTH ERROR
    # =====================================================

    if error:
        message = error_description or error

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                f"&message={urlencode({'message': message})[8:]}"
            )
        )

    # =====================================================
    # CHECK AUTHORIZATION CODE
    # =====================================================

    if not code:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Authorization%20code%20was%20not%20provided"
            )
        )

    # =====================================================
    # CHECK STATE
    # =====================================================

    if not state:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=OAuth%20state%20was%20not%20provided"
            )
        )

    # =====================================================
    # GET USER ID FROM STATE
    # =====================================================

    try:
        user_id_text, _random_state = state.split(":", 1)
        user_id = int(user_id_text)

    except (ValueError, AttributeError):
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Invalid%20OAuth%20state"
            )
        )

    # =====================================================
    # GET INSTAGRAM CONFIGURATION
    # =====================================================

    instagram_app_id = os.getenv("INSTAGRAM_APP_ID")
    instagram_app_secret = os.getenv("INSTAGRAM_APP_SECRET")
    instagram_redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI")

    if not instagram_app_id:
        raise HTTPException(
            status_code=500,
            detail="Instagram App ID is not configured"
        )

    if not instagram_app_secret:
        raise HTTPException(
            status_code=500,
            detail="Instagram App Secret is not configured"
        )

    if not instagram_redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Instagram Redirect URI is not configured"
        )

    # =====================================================
    # STEP 1: EXCHANGE AUTHORIZATION CODE FOR SHORT-LIVED TOKEN
    # =====================================================

    token_url = "https://api.instagram.com/oauth/access_token"

    token_data = {
        "client_id": instagram_app_id,
        "client_secret": instagram_app_secret,
        "grant_type": "authorization_code",
        "redirect_uri": instagram_redirect_uri,
        "code": code,
    }

    try:
        token_response = requests.post(
            token_url,
            data=token_data,
            timeout=30,
        )

    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20token%20request%20failed"
            )
        )

    if not token_response.ok:
        # Do not expose the complete provider response to the browser.
        try:
            error_data = token_response.json()
            print("Instagram token exchange failed:", error_data)
        except Exception:
            print("Instagram token exchange failed")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20token%20exchange%20failed"
            )
        )

    try:
        token_json = token_response.json()
    except Exception:
        token_json = {}

    short_lived_token = token_json.get("access_token")
    instagram_user_id = token_json.get("user_id")

    if not short_lived_token:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20did%20not%20return%20an%20access%20token"
            )
        )

    if not instagram_user_id:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20user%20ID%20was%20not%20returned"
            )
        )

    # =====================================================
    # STEP 2: EXCHANGE FOR LONG-LIVED INSTAGRAM TOKEN
    # =====================================================

    # IMPORTANT:
    # Do not save the short-lived token as the permanent SocialPilot token.
    # The scheduled publisher may run much later than the OAuth callback.
    long_lived_token_url = "https://graph.instagram.com/access_token"

    long_lived_params = {
        "grant_type": "ig_exchange_token",
        "client_secret": instagram_app_secret,
        "access_token": short_lived_token,
    }

    try:
        long_lived_response = requests.get(
            long_lived_token_url,
            params=long_lived_params,
            timeout=30,
        )

    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20long-lived%20token%20request%20failed"
            )
        )

    if not long_lived_response.ok:
        try:
            error_data = long_lived_response.json()
            print("Instagram long-lived token exchange failed:", error_data)
        except Exception:
            print("Instagram long-lived token exchange failed")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20long-lived%20token%20exchange%20failed"
            )
        )

    try:
        long_lived_data = long_lived_response.json()
    except Exception:
        long_lived_data = {}

    long_lived_token = long_lived_data.get("access_token")

    if not long_lived_token:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20long-lived%20token%20was%20not%20returned"
            )
        )

    # =====================================================
    # STEP 3: GET INSTAGRAM USER INFORMATION
    # =====================================================

    user_url = f"https://graph.instagram.com/{instagram_user_id}"

    user_params = {
        "fields": "id,username",
        "access_token": long_lived_token,
    }

    try:
        user_response = requests.get(
            user_url,
            params=user_params,
            timeout=30,
        )

    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Could%20not%20retrieve%20Instagram%20account"
            )
        )

    if not user_response.ok:
        try:
            error_data = user_response.json()
            print("Instagram user information error:", error_data)
        except Exception:
            print("Instagram user information request failed")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Could%20not%20retrieve%20Instagram%20account"
            )
        )

    try:
        instagram_data = user_response.json()
    except Exception:
        instagram_data = {}

    instagram_id = instagram_data.get("id")
    instagram_username = instagram_data.get("username")

    if not instagram_id:
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?instagram=error"
                "&message=Instagram%20account%20ID%20was%20not%20returned"
            )
        )

    username = instagram_username or str(instagram_id)

    # =====================================================
    # STEP 4: FIND THE CORRECT INSTAGRAM ACCOUNT
    # =====================================================

    # IMPORTANT:
    # Do NOT use only user_id + platform here.
    # Your database already contains multiple Instagram rows.
    # The old code could update stale account ID 1 instead of the
    # actual connected account ID 10/11.
    #
    # The Instagram user ID (channel_id) uniquely identifies the
    # Instagram account that was just authorized.
    existing_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == "instagram",
            SocialAccount.channel_id == str(instagram_id),
        )
        .first()
    )

    # =====================================================
    # STEP 5: UPDATE EXISTING ACCOUNT
    # =====================================================

    if existing_account:
        existing_account.username = username
        existing_account.access_token = long_lived_token
        existing_account.channel_id = str(instagram_id)

        db.commit()
        db.refresh(existing_account)

        account_id = existing_account.id

    # =====================================================
    # STEP 6: CREATE NEW ACCOUNT IF THIS INSTAGRAM ACCOUNT
    #         DOES NOT EXIST YET
    # =====================================================

    else:
        new_account = SocialAccount(
            user_id=user_id,
            platform="instagram",
            username=username,
            access_token=long_lived_token,
            channel_id=str(instagram_id),
        )

        db.add(new_account)
        db.commit()
        db.refresh(new_account)

        account_id = new_account.id

    print("Instagram account connected successfully")
    print("SocialPilot account ID:", account_id)
    print("Instagram username:", username)
    print("Instagram channel ID:", instagram_id)
    print("Long-lived token saved: True")

    # =====================================================
    # STEP 7: REDIRECT BACK TO REACT
    # =====================================================

    return RedirectResponse(
        url=(
            f"{FRONTEND_URL}"
            "?instagram=connected"
            f"&account_id={account_id}"
        )
    )


# =========================================================
# INSTAGRAM TOKEN REFRESH
# =========================================================

@router.post("/instagram/{account_id}/refresh")
def refresh_instagram_account_token(
    account_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh an Instagram long-lived access token.

    This endpoint is intended for a still-valid long-lived token.
    If the token has already expired, the user should reconnect
    Instagram through /instagram/login.
    """

    instagram_app_secret = os.getenv("INSTAGRAM_APP_SECRET")

    if not instagram_app_secret:
        raise HTTPException(
            status_code=500,
            detail="Instagram App Secret is not configured"
        )

    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user_id,
            SocialAccount.platform == "instagram",
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Instagram account not found"
        )

    if not account.access_token:
        raise HTTPException(
            status_code=400,
            detail="Instagram account does not have an access token"
        )

    refresh_url = "https://graph.instagram.com/refresh_access_token"

    refresh_params = {
        "grant_type": "ig_refresh_token",
        "access_token": account.access_token,
    }

    try:
        response = requests.get(
            refresh_url,
            params=refresh_params,
            timeout=30,
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Could not contact Instagram token refresh service"
        )

    if not response.ok:
        try:
            error_data = response.json()
            print("Instagram token refresh failed:", error_data)
        except Exception:
            print("Instagram token refresh failed")

        raise HTTPException(
            status_code=400,
            detail=(
                "Instagram token refresh failed. "
                "Reconnect the Instagram account if the token has expired."
            )
        )

    try:
        data = response.json()
    except Exception:
        data = {}

    new_access_token = data.get("access_token")

    if not new_access_token:
        raise HTTPException(
            status_code=400,
            detail="Instagram did not return a refreshed access token"
        )

    account.access_token = new_access_token

    db.commit()
    db.refresh(account)

    return {
        "message": "Instagram access token refreshed successfully",
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "channel_id": account.channel_id,
        "connected": True,
    }


# =========================================================
# FACEBOOK OAUTH LOGIN
# =========================================================

@router.get("/facebook/login")
def facebook_login(
    current_user_id: int = Depends(get_current_user)
):
    """
    Creates the Facebook OAuth authorization URL.

    Facebook configuration uses:
        - Facebook App ID
        - Facebook Configuration ID
        - Facebook Redirect URI

    The SocialPilot user ID is included in OAuth state.
    """

    facebook_app_id = os.getenv("FACEBOOK_APP_ID")
    facebook_config_id = os.getenv("FACEBOOK_CONFIG_ID")
    facebook_redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")

    # =====================================================
    # CHECK FACEBOOK CONFIGURATION
    # =====================================================

    if not facebook_app_id:
        raise HTTPException(
            status_code=500,
            detail="Facebook App ID is not configured"
        )

    if not facebook_config_id:
        raise HTTPException(
            status_code=500,
            detail="Facebook Configuration ID is not configured"
        )

    if not facebook_redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="Facebook Redirect URI is not configured"
        )

    # =====================================================
    # GENERATE OAUTH STATE
    # =====================================================

    random_state = secrets.token_urlsafe(32)

    state = f"{current_user_id}:{random_state}"

    # =====================================================
    # FACEBOOK OAUTH PARAMETERS
    # =====================================================

    params = {
        "client_id": facebook_app_id,
        "redirect_uri": facebook_redirect_uri,
        "config_id": facebook_config_id,
        "response_type": "code",
        "state": state,
        "scope": os.getenv(
            "FACEBOOK_SCOPES",
            "pages_show_list,pages_read_engagement,pages_manage_posts"
        )
    }

    # =====================================================
    # CREATE FACEBOOK AUTHORIZATION URL
    # =====================================================

    authorization_url = (
        "https://www.facebook.com/v23.0/dialog/oauth?"
        + urlencode(params)
    )

    return {
        "authorization_url": authorization_url
    }


# =========================================================
# FACEBOOK OAUTH CALLBACK
# =========================================================

@router.get("/facebook/callback")
def facebook_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Facebook OAuth callback.

    Flow:
        1. Receive Facebook authorization code.
        2. Read SocialPilot user ID from OAuth state.
        3. Exchange code for Facebook user access token.
        4. Get Facebook Pages.
        5. Get Page access token.
        6. Save/update Facebook Page in PostgreSQL.
        7. Redirect back to React.

    Debug logging is included, but access tokens and OAuth codes are never printed.
    """

    FRONTEND_URL = "http://localhost:5173/social-accounts"

    print("\\n========================================")
    print("FACEBOOK CALLBACK STARTED")
    print("========================================")

    # =====================================================
    # CHECK FACEBOOK ERROR
    # =====================================================

    if error:
        message = error_description or error

        print("FACEBOOK OAUTH ERROR")
        print("Error:", error)
        print("Description:", error_description)

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}?facebook=error&"
                f"message={urlencode({'message': message})[8:]}"
            )
        )

    # =====================================================
    # CHECK AUTHORIZATION CODE
    # =====================================================

    if not code:
        print("ERROR: Facebook authorization code was not received")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Authorization code was not provided"
            )
        )

    print("Facebook authorization code received")

    # =====================================================
    # CHECK STATE
    # =====================================================

    if not state:
        print("ERROR: OAuth state was not received")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=OAuth state was not provided"
            )
        )

    print("OAuth state received")

    # =====================================================
    # GET USER ID FROM STATE
    # =====================================================

    try:
        user_id_text, random_state = state.split(":", 1)
        user_id = int(user_id_text)

    except (ValueError, AttributeError) as exc:
        print("ERROR: Invalid OAuth state")
        print(str(exc))

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Invalid OAuth state"
            )
        )

    print("SocialPilot User ID:", user_id)

    # =====================================================
    # GET FACEBOOK CONFIGURATION
    # =====================================================

    facebook_app_id = os.getenv("FACEBOOK_APP_ID")
    facebook_app_secret = os.getenv("FACEBOOK_APP_SECRET")
    facebook_redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")

    facebook_api_version = os.getenv(
        "FACEBOOK_GRAPH_API_VERSION",
        "v23.0"
    )

    print("Facebook API Version:", facebook_api_version)
    print("Facebook Redirect URI:", facebook_redirect_uri)

    if not facebook_app_id:
        print("ERROR: FACEBOOK_APP_ID is missing")
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook App ID is not configured"
            )
        )

    if not facebook_app_secret:
        print("ERROR: FACEBOOK_APP_SECRET is missing")
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook App Secret is not configured"
            )
        )

    if not facebook_redirect_uri:
        print("ERROR: FACEBOOK_REDIRECT_URI is missing")
        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook Redirect URI is not configured"
            )
        )

    # =====================================================
    # EXCHANGE AUTHORIZATION CODE FOR USER ACCESS TOKEN
    # =====================================================

    token_url = (
        f"https://graph.facebook.com/"
        f"{facebook_api_version}/oauth/access_token"
    )

    token_params = {
        "client_id": facebook_app_id,
        "client_secret": facebook_app_secret,
        "redirect_uri": facebook_redirect_uri,
        "code": code
    }

    print("\\n----------------------------------------")
    print("STEP 1: EXCHANGING FACEBOOK CODE")
    print("----------------------------------------")

    try:
        token_response = requests.get(
            token_url,
            params=token_params,
            timeout=30
        )

    except requests.RequestException as exc:
        print("FACEBOOK TOKEN REQUEST FAILED")
        print(str(exc))

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook token request failed"
            )
        )

    print("Facebook token response status:", token_response.status_code)

    if not token_response.ok:
        print("FACEBOOK TOKEN EXCHANGE FAILED")
        print("Status:", token_response.status_code)
        fb_error = {}

        try:
            error_json = token_response.json()
            fb_error = error_json.get("error", {})
            print("Facebook error type:", fb_error.get("type"))
            print("Facebook error message:", fb_error.get("message"))
            print("Facebook error code:", fb_error.get("code"))

        except Exception:
            print("Facebook returned a non-JSON error response")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                f"&message={urlencode({'message': 'Facebook token exchange failed: ' + str(fb_error.get('message') or 'unknown Meta error')})[8:]}"
            )
        )

    try:
        token_data = token_response.json()
    except Exception:
        token_data = {}

    user_access_token = token_data.get("access_token")

    if not user_access_token:
        print("ERROR: Facebook did not return a user access token")
        print("Returned fields:", list(token_data.keys()))

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook user access token was not received"
            )
        )

    print("SUCCESS: Facebook user access token received")

    # =====================================================
    # GET FACEBOOK PAGES
    # =====================================================

    pages_url = (
        f"https://graph.facebook.com/"
        f"{facebook_api_version}/me/accounts"
    )

    pages_params = {
        "fields": "id,name,access_token,tasks",
        "access_token": user_access_token
    }

    print("\\n----------------------------------------")
    print("STEP 2: GETTING FACEBOOK PAGES")
    print("----------------------------------------")

    try:
        pages_response = requests.get(
            pages_url,
            params=pages_params,
            timeout=30
        )

    except requests.RequestException as exc:
        print("FACEBOOK PAGES REQUEST FAILED")
        print(str(exc))

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Could not retrieve Facebook Pages"
            )
        )

    print("Facebook Pages response status:", pages_response.status_code)

    if not pages_response.ok:
        print("FACEBOOK PAGES API FAILED")
        fb_error = {}

        try:
            error_json = pages_response.json()
            fb_error = error_json.get("error", {})
            print("Facebook Pages error type:", fb_error.get("type"))
            print("Facebook Pages error message:", fb_error.get("message"))
            print("Facebook Pages error code:", fb_error.get("code"))

        except Exception:
            print("Facebook returned a non-JSON Pages error")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                f"&message={urlencode({'message': 'Unable to retrieve Facebook Pages: ' + str(fb_error.get('message') or 'unknown Meta error')})[8:]}"
            )
        )

    try:
        pages_data = pages_response.json()
    except Exception:
        pages_data = {}

    pages = pages_data.get("data", [])

    print("Number of Facebook Pages found:", len(pages))

    # =====================================================
    # CHECK FACEBOOK PAGES
    # =====================================================

    if not pages:
        print("ERROR: No Facebook Pages were returned")
        print("Possible cause: Facebook account has no eligible Page")
        print("Possible cause: required Page permissions were not granted")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=No Facebook Pages were found"
            )
        )

    # =====================================================
    # SELECT FIRST PAGE
    # =====================================================

    page = pages[0]

    page_id = page.get("id")
    page_name = page.get("name")
    page_access_token = page.get("access_token")

    print("\\n----------------------------------------")
    print("STEP 3: FACEBOOK PAGE INFORMATION")
    print("----------------------------------------")

    print("Page Name:", page_name)
    print("Page ID:", page_id)
    print("Page Access Token received:", bool(page_access_token))

    if not page_id:
        print("ERROR: Facebook Page ID was not received")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook Page ID was not received"
            )
        )

    if not page_access_token:
        print("ERROR: Facebook Page access token was not received")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Facebook Page access token was not received"
            )
        )

    # =====================================================
    # SAVE FACEBOOK ACCOUNT
    # =====================================================

    print("\\n----------------------------------------")
    print("STEP 4: SAVING FACEBOOK ACCOUNT")
    print("----------------------------------------")

    try:
        existing_account = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == "facebook"
            )
            .first()
        )

        if existing_account:
            print("Existing Facebook account found")
            print("Updating existing account ID:", existing_account.id)

            existing_account.username = page_name or "Facebook Page"
            existing_account.access_token = page_access_token
            existing_account.page_id = page_id

            db.commit()
            db.refresh(existing_account)

            account_id = existing_account.id

        else:
            print("No existing Facebook account found")
            print("Creating new Facebook account")

            new_account = SocialAccount(
                user_id=user_id,
                platform="facebook",
                username=page_name or "Facebook Page",
                access_token=page_access_token,
                page_id=page_id
            )

            db.add(new_account)
            db.commit()
            db.refresh(new_account)

            account_id = new_account.id

        print("SUCCESS: Facebook account saved")
        print("Account ID:", account_id)

    except Exception as exc:
        db.rollback()

        print("\\n========================================")
        print("FACEBOOK DATABASE ERROR")
        print("========================================")
        print(type(exc).__name__)
        print(str(exc))
        print("========================================")

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}"
                "?facebook=error"
                "&message=Could not save Facebook account"
            )
        )

    # =====================================================
    # REDIRECT BACK TO REACT
    # =====================================================

    print("\\n========================================")
    print("FACEBOOK CONNECTION SUCCESSFUL")
    print("Redirecting to SocialPilot")
    print("========================================")

    return RedirectResponse(
        url=(
            f"{FRONTEND_URL}"
            f"?facebook=connected"
            f"&account_id={account_id}"
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
            "channel_id": account.channel_id,
            "page_id": account.page_id,
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