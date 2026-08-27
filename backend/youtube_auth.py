import os
import httpx
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, auth

router = APIRouter()

YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REDIRECT_URI = os.getenv("YOUTUBE_REDIRECT_URI")

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
async def youtube_callback(code: str, state: str, db: Session = Depends(get_db)):
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

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token from YouTube")

        channel_response = await client.get(
            CHANNEL_URL,
            params={"part": "snippet", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        channel_data = channel_response.json()
        items = channel_data.get("items", [])
        channel_name = items[0]["snippet"]["title"] if items else "YouTube Channel"

    existing = db.query(models.SocialAccount).filter(
        models.SocialAccount.user_id == user.id,
        models.SocialAccount.platform == "YouTube"
    ).first()

    if existing:
        existing.access_token = access_token
        existing.account_name = channel_name
        existing.status = "connected"
    else:
        new_account = models.SocialAccount(
            user_id=user.id,
            platform="YouTube",
            account_name=channel_name,
            access_token=access_token,
            status="connected"
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse("http://localhost:5173/?youtube=connected")
