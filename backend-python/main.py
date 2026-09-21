import os
import shutil
import secrets
from datetime import datetime, timedelta

import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import engine, Base, get_db
from models import User, Dataset, Scenario, SimulationResult, SocialAccount
from auth import hash_password, verify_password, create_access_token, decode_access_token
from mongo import mongo_db
from email_service import send_password_reset_email


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="SocialPilot API",
    description="AI-powered scenario simulation engine",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CREATE DATABASE TABLES
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "content_creator"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ScenarioRequest(BaseModel):
    name: str
    question: str
    decision_type: str | None = None
    variable: str | None = None
    direction: str | None = None
    magnitude: float | None = None


class SimulationRequest(BaseModel):
    metric_name: str
    baseline_value: float
    change_percentage: float


class SocialAccountRequest(BaseModel):
    platform: str
    account_name: str
class UpdateProfileRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ============================================================
# AUTH DEPENDENCY
# ============================================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message": "SocialPilot Backend is running",
    }


# ============================================================
# FRONTEND CONNECTION TEST
# ============================================================

@app.get("/api/test")
def test_connection():
    return {
        "success": True,
        "message": "SocialPilot Backend Connected Successfully",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    try:
        mongo_db.list_collection_names()
        mongo_status = "connected"
    except Exception:
        mongo_status = "unreachable"

    return {
        "success": True,
        "status": "healthy",
        "postgresql": "connected",
        "mongodb": mongo_status,
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"user_id": user.id, "role": user.role})

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.post("/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    reset_link = f"http://localhost:3000/reset-password?token={token}"
    send_password_reset_email(user.email, reset_link)

    return {
        "message": "If that email is registered, a reset link has been sent.",
    }


# ============================================================
# RESET PASSWORD
# ============================================================

@app.post("/auth/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == request.token).first()

    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.password_hash = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return {"message": "Password reset successful"}


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }
@app.put("/auth/me")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.name = request.name
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }


@app.post("/auth/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in and has no password to change",
        )

    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.password_hash = hash_password(request.new_password)
    db.commit()

    return {"message": "Password changed successfully"}

# ============================================================
# SOCIAL ACCOUNTS
# ============================================================

@app.post("/social-accounts")
def connect_social_account(
    request: SocialAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = SocialAccount(
        user_id=current_user.id,
        platform=request.platform,
        account_name=request.account_name,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "message": "Social account connected",
        "account_id": account.id,
        "platform": account.platform,
        "account_name": account.account_name,
    }


@app.get("/social-accounts")
def get_social_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(SocialAccount).filter(SocialAccount.user_id == current_user.id).all()


# ============================================================
# DATASET UPLOAD
# ============================================================

@app.post("/datasets/upload")
def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed_extensions = [".csv", ".xlsx", ".xls"]
    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    upload_directory = "uploads"
    os.makedirs(upload_directory, exist_ok=True)
    file_path = os.path.join(upload_directory, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        if extension == ".csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        dataset = Dataset(
            filename=file.filename,
            dataset_type=extension.replace(".", ""),
            row_count=len(df),
            column_count=len(df.columns),
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return {
            "message": "Dataset uploaded successfully",
            "dataset_id": dataset.id,
            "filename": dataset.filename,
            "dataset_type": dataset.dataset_type,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
        }

    except Exception as error:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Could not process dataset: {str(error)}")


# ============================================================
# GET DATASETS
# ============================================================

@app.get("/datasets")
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()


@app.get("/datasets/{dataset_id}")
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


# ============================================================
# CREATE SCENARIO
# ============================================================

@app.post("/scenarios")
def create_scenario(request: ScenarioRequest, db: Session = Depends(get_db)):
    scenario = Scenario(
        name=request.name,
        question=request.question,
        decision_type=request.decision_type,
        variable=request.variable,
        direction=request.direction,
        magnitude=request.magnitude,
    )

    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        "message": "Scenario created successfully",
        "scenario_id": scenario.id,
        "name": scenario.name,
        "question": scenario.question,
        "decision_type": scenario.decision_type,
        "variable": scenario.variable,
        "direction": scenario.direction,
        "magnitude": scenario.magnitude,
    }


# ============================================================
# GET SCENARIOS
# ============================================================

@app.get("/scenarios")
def get_scenarios(db: Session = Depends(get_db)):
    return db.query(Scenario).all()


@app.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


# ============================================================
# SIMULATE SCENARIO
# ============================================