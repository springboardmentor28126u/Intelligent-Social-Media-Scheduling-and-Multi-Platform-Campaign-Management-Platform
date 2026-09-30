import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
import models, auth

router = APIRouter(prefix="/auth/facebook", tags=["facebook"])

APP_ID = os.getenv("FACEBOOK_APP_ID")
APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI")
CONFIG_ID = os.getenv("FACEBOOK_CONFIG_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
print(f"[DEBUG] FACEBOOK_APP_ID={APP_ID!r} FACEBOOK_APP_SECRET={'set' if APP_SECRET else 'MISSING'} REDIRECT_URI={REDIRECT_URI!r} CONFIG_ID={CONFIG_ID!r}")
GRAPH = "https://graph.facebook.com/v22.0"

@router.get("/login")
def facebook_login(token: str):
    if not APP_ID or not REDIRECT_URI or not CONFIG_ID:
        raise HTTPException(500, "Facebook app is not configured (missing env vars)")

    params = httpx.QueryParams(
        {
            "client_id": APP_ID,
            "redirect_uri": REDIRECT_URI,
            "config_id": CONFIG_ID,
            "response_type": "code",
            "override_default_response_type": "true",
            "state": token,
        }
    )
    return RedirectResponse(f"https://www.facebook.com/v22.0/dialog/oauth?{params}")


@router.get("/callback")
async def facebook_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        payload = auth.jwt.decode(state, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    app_user = db.query(models.User).filter(models.User.email == email).first()
    if not app_user:
        raise HTTPException(404, "App user not found")

    async with httpx.AsyncClient() as client:
        # Step 1: exchange code for a short-lived user token
        r = await client.get(
            f"{GRAPH}/oauth/access_token",
            params={
                "client_id": APP_ID,
                "client_secret": APP_SECRET,
                "redirect_uri": REDIRECT_URI,
                "code": code,
            },
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Facebook token exchange failed: {r.text}")
        short_lived = r.json()

        # Step 2: exchange for a long-lived user token (~60 days)
        r = await client.get(
            f"{GRAPH}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": APP_ID,
                "client_secret": APP_SECRET,
                "fb_exchange_token": short_lived["access_token"],
            },
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Facebook long-lived token exchange failed: {r.text}")
        long_lived_user_token = r.json()["access_token"]

        # Step 3: list Pages the user manages, with per-page access tokens.
        # Page tokens derived from a long-lived user token do not expire on
        # their own (they remain valid as long as the user keeps their role
        # and doesn't revoke access), so no expiry tracking is needed here.
        r = await client.get(
            f"{GRAPH}/me/accounts",
            params={"access_token": long_lived_user_token},
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Failed to list Facebook Pages: {r.text}")
        pages = r.json().get("data", [])

    if not pages:
        raise HTTPException(400, "No Facebook Pages found for this account. You need to manage at least one Page.")

    for page in pages:
        account = (
            db.query(models.SocialAccount)
            .filter(
                models.SocialAccount.user_id == app_user.id,
                models.SocialAccount.platform == "Facebook",
                models.SocialAccount.platform_user_id == str(page["id"]),
            )
            .first()
        )
        if not account:
            account = models.SocialAccount(
                user_id=app_user.id,
                platform="Facebook",
                platform_user_id=str(page["id"]),
            )
            db.add(account)

        account.account_name = page.get("name", "Facebook Page")
        account.access_token = page["access_token"]
        account.token_expires_at = None
        account.status = "connected"

    db.commit()

    return RedirectResponse(f"{FRONTEND_URL}/app/accounts?facebook=connected")