import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, auth

router = APIRouter()

LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI")

AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
PROFILE_URL = "https://api.linkedin.com/v2/userinfo"

@router.get("/auth/linkedin/login")
def linkedin_login(token: str):
    # 'token' here is the logged-in user's JWT, passed as state so we know who to attach the account to
    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "scope": "openid profile email w_member_social",
        "state": token,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{AUTHORIZATION_URL}?{query}")

@router.get("/auth/linkedin/callback")
async def linkedin_callback(code: str, state: str, db: Session = Depends(get_db)):
    # 'state' contains the JWT we passed earlier, identifying the user
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
                "redirect_uri": LINKEDIN_REDIRECT_URI,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token from LinkedIn")

        profile_response = await client.get(
            PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_data = profile_response.json()
        account_name = profile_data.get("name", "LinkedIn User")

    existing = db.query(models.SocialAccount).filter(
        models.SocialAccount.user_id == user.id,
        models.SocialAccount.platform == "LinkedIn"
    ).first()

    if existing:
        existing.access_token = access_token
        existing.account_name = account_name
        existing.status = "connected"
    else:
        new_account = models.SocialAccount(
            user_id=user.id,
            platform="LinkedIn",
            account_name=account_name,
            access_token=access_token,
            status="connected"
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse("http://localhost:5173/?linkedin=connected")
