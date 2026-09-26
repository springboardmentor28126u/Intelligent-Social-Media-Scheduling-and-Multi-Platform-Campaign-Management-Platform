import os
from dotenv import load_dotenv
import httpx
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, auth

load_dotenv()
router = APIRouter()
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REDIRECT_URI = os.getenv("YOUTUBE_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CHANNEL_URL = "https://www.googleapis.com/youtube/v3/channels"
@router.get("/auth/youtube/login")
def youtube_login(token: str):
    params = {
        "response_type": "code",
        "client_id": YOUTUBE_CLIENT_ID,
        "redirect_uri": YOUTUBE_REDIRECT_URI,
        "scope": "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
        "access_type": "offline",
        "prompt": "consent",
        "state": token,
    }
    query = urlencode(params)
    return RedirectResponse(f"{AUTHORIZATION_URL}?{query}")
@router.get("/auth/youtube/callback")
async def youtube_callback(request: Request, db: Session = Depends(get_db)):
    params = request.query_params
    error = params.get("error")
    code = params.get("code")
    state = params.get("state")
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/app/accounts?youtube_error={error}")
    if not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}/app/accounts?youtube_error=missing_code")
    try:
        payload = auth.jwt.decode(state, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": YOUTUBE_REDIRECT_URI,
                "client_id": YOUTUBE_CLIENT_ID,
                "client_secret": YOUTUBE_CLIENT_SECRET,
            },
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}/app/accounts?youtube_error=token_failed")
        channel_response = await client.get(
            CHANNEL_URL,
            params={"part": "snippet", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        channel_data = channel_response.json()
        items = channel_data.get("items", [])
        channel_name = items[0]["snippet"]["title"] if items else "YouTube Channel"
        channel_id = items[0]["id"] if items else None
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    existing = db.query(models.SocialAccount).filter(
        models.SocialAccount.user_id == user.id,
        models.SocialAccount.platform == "YouTube"
    ).first()
    if existing:
        existing.access_token = access_token
        if refresh_token:
            existing.refresh_token = refresh_token
        existing.token_expires_at = token_expires_at
        existing.account_name = channel_name
        existing.platform_user_id = channel_id
        existing.status = "connected"
    else:
        new_account = models.SocialAccount(
            user_id=user.id,
            platform="YouTube",
            account_name=channel_name,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            platform_user_id=channel_id,
            status="connected"
        )
        db.add(new_account)
    db.commit()
    return RedirectResponse(f"{FRONTEND_URL}/app/accounts?youtube=connected")
