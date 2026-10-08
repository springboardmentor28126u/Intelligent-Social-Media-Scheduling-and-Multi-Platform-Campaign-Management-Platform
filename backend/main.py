import os
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from database import get_db, engine
from config import MEDIA_DIR
import models, schemas, auth
from linkedin_auth import router as linkedin_router
from youtube_auth import router as youtube_router
from posts import router as posts_router
from campaigns import router as campaigns_router
from analytics import router as analytics_router
from notifications import router as notifications_router
from reports import router as reports_router
from media_router import router as media_router
from admin_router import router as admin_router
from ai import router as ai_router
import instagram_auth
import facebook_auth
import x_auth

# Ensure tables and columns exist
try:
    models.Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        conn.commit()
except Exception as e:
    print(f"Database initialization warning: {e}")

app = FastAPI(title="SocialPilot API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(campaigns_router)
app.include_router(posts_router)
app.include_router(media_router)
app.include_router(admin_router)
app.include_router(linkedin_router)
app.include_router(youtube_router)
app.include_router(instagram_auth.router)
app.include_router(facebook_auth.router)
app.include_router(x_auth.router)
app.include_router(analytics_router)
app.include_router(notifications_router)
app.include_router(reports_router)
app.include_router(ai_router)
# Mount static media directory
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/")
def read_root():
    return {"message": "SocialPilot backend is running!"}


@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if signups are enabled in admin system settings
    signup_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "allow_signups").first()
    if signup_setting and signup_setting.value is False:
        raise HTTPException(
            status_code=403,
            detail="User registration is currently disabled by administrator.",
        )

    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    default_role_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "default_user_role").first()
    role_to_assign = user.role or (default_role_setting.value if default_role_setting and default_role_setting.value else "Content Creator")

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=auth.hash_password(user.password),
        role=role_to_assign,
        preferences={},
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"sub": db_user.email, "role": db_user.role})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.put("/me", response_model=schemas.UserOut)
def update_current_user(
    profile_data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.email is not None and profile_data.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == profile_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = profile_data.email
    if profile_data.password is not None and profile_data.password.strip():
        current_user.password_hash = auth.hash_password(profile_data.password)
    if profile_data.preferences is not None:
        existing_prefs = dict(current_user.preferences or {})
        existing_prefs.update(profile_data.preferences)
        current_user.preferences = existing_prefs
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/social-accounts", response_model=schemas.SocialAccountOut)
def connect_social_account(
    account: schemas.SocialAccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    new_account = models.SocialAccount(
        user_id=current_user.id,
        platform=account.platform,
        account_name=account.account_name,
        status="connected"
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


@app.get("/social-accounts", response_model=List[schemas.SocialAccountOut])
def list_social_accounts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.SocialAccount).filter(models.SocialAccount.user_id == current_user.id).all()
@app.get("/health")
def health():
    return {"status": "ok"}



@app.delete("/social-accounts/{account_id}")
def disconnect_social_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    account = db.query(models.SocialAccount).filter(
        models.SocialAccount.id == account_id,
        models.SocialAccount.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.query(models.PostPlatform).filter(models.PostPlatform.social_account_id == account_id).delete(synchronize_session=False)
    db.delete(account)
    db.commit()
    return {"message": "Account disconnected"}