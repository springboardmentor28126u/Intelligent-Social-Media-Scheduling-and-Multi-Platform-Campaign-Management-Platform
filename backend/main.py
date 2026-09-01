from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from database import get_db, engine, Base
import models, schemas, auth
from linkedin_auth import router as linkedin_router
from youtube_auth import router as youtube_router
from posts import router as posts_router

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(posts_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(linkedin_router)
app.include_router(youtube_router)

@app.get("/")
def read_root():
    return {"message": "SocialPilot backend is running!"}

@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=auth.hash_password(user.password),
        role=user.role
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

@app.get("/admin/users", response_model=List[schemas.UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["Administrator"]))
):
    return db.query(models.User).all()

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
