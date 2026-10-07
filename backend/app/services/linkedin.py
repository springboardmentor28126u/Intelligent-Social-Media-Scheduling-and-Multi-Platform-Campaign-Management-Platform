# app/services/linkedin.py
#
# ONE job: everything that talks to LinkedIn's OAuth + userinfo endpoints,
# plus signing/verifying the "state" value that protects the OAuth flow.

import base64
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from app.core.config import settings

AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
SCOPES = "openid profile w_member_social"
STATE_TTL_SECONDS = 600  # state is valid for 10 minutes


def _sign(payload: str) -> str:
    # HMAC signature using your existing SECRET_KEY so nobody can forge a state
    return hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_state(user_id: str) -> str:
    """Packs user_id + expiry + signature into one URL-safe string."""
    expires = int(time.time()) + STATE_TTL_SECONDS
    payload = f"{user_id}:{expires}"
    raw = f"{payload}:{_sign(payload)}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def verify_state(state: str) -> str | None:
    """Returns the user_id if the state is genuine and not expired, else None."""
    try:
        raw = base64.urlsafe_b64decode(state.encode()).decode()
        user_id, expires, sig = raw.rsplit(":", 2)
        if not hmac.compare_digest(sig, _sign(f"{user_id}:{expires}")):
            return None
        if int(expires) < time.time():
            return None
        return user_id
    except Exception:
        return None


def build_auth_url(state: str) -> str:
    """The LinkedIn consent-screen URL the user is sent to."""
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "state": state,
        "scope": SCOPES,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> tuple[str, datetime]:
    """Swaps the one-time code for an access token. Returns (token, expires_at)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(data["expires_in"]))
    return data["access_token"], expires_at


async def fetch_profile(access_token: str) -> dict:
    """Gets the member's id ("sub") and name using the OpenID userinfo endpoint."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()

# --- Real publishing ---------------------------------------------------

POST_URL = "https://api.linkedin.com/v2/ugcPosts"
# "CONNECTIONS" = only your connections see test posts. Change to "PUBLIC" for the demo if you want.
POST_VISIBILITY = "CONNECTIONS"


async def publish_text_post(
    access_token: str, member_id: str, content: str
) -> tuple[bool, str]:
    """Publishes a text post to the member's own profile. Returns (success, message)."""
    body = {
        "author": f"urn:li:person:{member_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": POST_VISIBILITY},
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                POST_URL,
                json=body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
    except Exception as exc:
        return False, f"[LinkedIn] Network error: {exc}"

    if resp.status_code == 201:
        return True, "[LinkedIn] Posted successfully."
    # Truncate the body so logs stay readable
    return False, f"[LinkedIn] API error {resp.status_code}: {resp.text[:200]}"