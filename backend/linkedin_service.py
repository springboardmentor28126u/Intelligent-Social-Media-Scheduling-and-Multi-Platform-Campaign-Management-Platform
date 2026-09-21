import os
import secrets
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv


load_dotenv()


# ============================================================
# LINKEDIN CONFIGURATION
# ============================================================

LINKEDIN_CLIENT_ID = os.getenv(
    "LINKEDIN_CLIENT_ID"
)

LINKEDIN_CLIENT_SECRET = os.getenv(
    "LINKEDIN_CLIENT_SECRET"
)

LINKEDIN_REDIRECT_URI = os.getenv(
    "LINKEDIN_REDIRECT_URI"
)


# ============================================================
# LINKEDIN ENDPOINTS
# ============================================================

LINKEDIN_AUTH_URL = (
    "https://www.linkedin.com/oauth/v2/authorization"
)

LINKEDIN_TOKEN_URL = (
    "https://www.linkedin.com/oauth/v2/accessToken"
)

LINKEDIN_USERINFO_URL = (
    "https://api.linkedin.com/v2/userinfo"
)


# ============================================================
# CONFIGURATION
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
        raise RuntimeError(
            "Missing LinkedIn environment variables: "
            + ", ".join(missing)
        )


# ============================================================
# OAUTH STATE
# ============================================================

def create_linkedin_state():
    """
    Generate a cryptographically random OAuth state.
    """

    return secrets.token_urlsafe(32)


# ============================================================
# AUTHORIZATION URL
# ============================================================

def get_linkedin_authorization_url(
    state: str
):
    validate_linkedin_config()

    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "state": state,
        "scope": (
            "openid profile email "
            "w_member_social"
        ),
    }

    return (
        LINKEDIN_AUTH_URL
        + "?"
        + urlencode(params)
    )


# ============================================================
# TOKEN EXCHANGE
# ============================================================

def exchange_linkedin_code_for_token(
    code: str
):
    validate_linkedin_config()

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "client_id": LINKEDIN_CLIENT_ID,
        "client_secret": LINKEDIN_CLIENT_SECRET,
    }

    response = requests.post(
        LINKEDIN_TOKEN_URL,
        data=data,
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            "LinkedIn token exchange failed: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()


# ============================================================
# GET LINKEDIN MEMBER INFORMATION
# ============================================================

def get_linkedin_user_info(
    access_token: str
):
    response = requests.get(
        LINKEDIN_USERINFO_URL,
        headers={
            "Authorization":
                f"Bearer {access_token}",
        },
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            "LinkedIn user info request failed: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()