import os
import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
import models, auth

router = APIRouter(prefix="/auth/x", tags=["x"])

CLIENT_ID = os.getenv("X_CLIENT_ID")
CLIENT_SECRET = os.getenv("X_CLIENT_SECRET")
REDIRECT_URI = os.getenv("X_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"
TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
ME_URL = "https://api.twitter.com/2/users/me"

# Free tier: OAuth login + basic profile read only. No posting or tweet-level
# analytics until upgraded to a paid tier — see refresh_x_token in
# publishers.py for the note on why we still track expiry despite that.
SCOPES = "tweet.read users.read offline.access"

STATE_EXPIRE_MINUTES = 10


def _make_code_verifier():
    return base64.urlsafe_b64encode(secrets.token_bytes(40)).rstrip(b"=").decode()


def _make_code_challenge(verifier: str):
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


@router.get("/login")
def x_login(token: str):
    if not CLIENT_ID or not REDIRECT_URI:
        raise HTTPException(500, "X app is not configured (missing env vars)")

    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    code_verifier = _make_code_verifier()
    code_challenge = _make_code_challenge(code_verifier)

    # PKCE needs the verifier again at the callback, but there's no
    # server-side session to stash it in between the redirect and the
    # callback — so it rides along inside a short-lived signed state token,
    # alongside the app user's identity (same role "state" plays in the
    # other OAuth routes, just carrying one extra field here).
    state = auth.jwt.encode(
        {
            "sub": email,
            "code_verifier": code_verifier,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=STATE_EXPIRE_MINUTES),
        },
        auth.SECRET_KEY,
        algorithm=auth.ALGORITHM,
    )

    params = httpx.QueryParams(
        {
            "response_type": "code",
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
    )
    return RedirectResponse(f"{AUTHORIZE_URL}?{params}")


@router.get("/callback")
async def x_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        payload = auth.jwt.decode(state, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
        code_verifier = payload.get("code_verifier")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not code_verifier:
        raise HTTPException(status_code=401, detail="Missing PKCE verifier in session")

    app_user = db.query(models.User).filter(models.User.email == email).first()
    if not app_user:
        raise HTTPException(404, "App user not found")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "code_verifier": code_verifier,
                "client_id": CLIENT_ID,
            },
            auth=(CLIENT_ID, CLIENT_SECRET),  # confidential client
        )
        if r.status_code != 200:
            raise HTTPException(400, f"X token exchange failed: {r.text}")
        tokens = r.json()

        r = await client.get(
            ME_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Failed to fetch X profile: {r.text}")
        profile = r.json()["data"]

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 7200))

    account = (
        db.query(models.SocialAccount)
        .filter(
            models.SocialAccount.user_id == app_user.id,
            models.SocialAccount.platform == "X",
            models.SocialAccount.platform_user_id == str(profile["id"]),
        )
        .first()
    )
    if not account:
        account = models.SocialAccount(
            user_id=app_user.id,
            platform="X",
            platform_user_id=str(profile["id"]),
        )
        db.add(account)

    account.account_name = profile.get("username", "X User")
    account.access_token = tokens["access_token"]
    account.refresh_token = tokens.get("refresh_token")
    account.token_expires_at = expires_at
    account.status = "connected"
    db.commit()
    return RedirectResponse(f"{FRONTEND_URL}/app/accounts?x=connected")