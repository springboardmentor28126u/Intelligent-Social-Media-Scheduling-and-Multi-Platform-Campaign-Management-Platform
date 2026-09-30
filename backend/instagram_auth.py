import os
import urllib.parse
from datetime import datetime, timedelta, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, auth
router = APIRouter(prefix="/auth/instagram", tags=["instagram"])

APP_ID = os.getenv("INSTAGRAM_APP_ID")
APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET")
REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
 
GRAPH = "https://graph.instagram.com/v22.0"
SCOPES = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights"
 
 
@router.get("/login")
def instagram_login(token: str):
    if not APP_ID or not REDIRECT_URI:
        raise HTTPException(500, "Instagram app is not configured (missing env vars)")
 
    params = {
        "client_id": APP_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": token,
    }
    url = "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)
 
 
@router.get("/callback")
async def instagram_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        payload = auth.jwt.decode(state, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
 
    app_user = db.query(models.User).filter(models.User.email == email).first()
    if not app_user:
        raise HTTPException(404, "App user not found")
 
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": APP_ID,
                "client_secret": APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": REDIRECT_URI,
                "code": code,
            },
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Instagram token exchange failed: {r.text}")
        short = r.json()
 
        r = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": APP_SECRET,
                "access_token": short["access_token"],
            },
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Long-lived token exchange failed: {r.text}")
        long_lived = r.json()
 
        r = await client.get(
            f"{GRAPH}/me",
            params={
                "fields": "user_id,username,account_type",
                "access_token": long_lived["access_token"],
            },
        )
        r.raise_for_status()
        profile = r.json()
 
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=long_lived.get("expires_in", 5184000)
    )
 
    account = (
        db.query(models.SocialAccount)
        .filter(
            models.SocialAccount.user_id == app_user.id,
            models.SocialAccount.platform == "Instagram",
            models.SocialAccount.platform_user_id == str(profile["user_id"]),
        )
        .first()
    )
    if not account:
        account = models.SocialAccount(
            user_id=app_user.id,
            platform="Instagram",
            platform_user_id=str(profile["user_id"]),
        )
        db.add(account)
 
    account.account_name = profile.get("username", "Instagram User")
    account.access_token = long_lived["access_token"]
    account.token_expires_at = expires_at
    account.status = "connected"
 
    db.commit()
 
    return RedirectResponse(f"{FRONTEND_URL}/app/accounts?instagram=connected")
 
 
async def refresh_instagram_token(account: models.SocialAccount, db: Session):
    """Refresh an Instagram long-lived token if it's within 7 days of expiring.
 
    Instagram long-lived tokens last ~60 days and must be refreshed *before*
    they expire (this endpoint rejects an already-expired token), so we
    proactively refresh once there's less than 7 days of validity left.
    """
    if account.token_expires_at and account.token_expires_at > datetime.now(timezone.utc) + timedelta(days=7):
        return account.access_token  # still valid, no need to refresh
 
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://graph.instagram.com/refresh_access_token",
            params={
                "grant_type": "ig_refresh_token",
                "access_token": account.access_token,
            },
        )
    resp.raise_for_status()
    data = resp.json()
 
    account.access_token = data["access_token"]
    account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])
    db.commit()
    return account.access_token
 
