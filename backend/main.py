import os
import shutil
import secrets
from datetime import datetime, timedelta

import pandas as pd

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
)

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from pydantic import BaseModel, EmailStr

from database import (
    engine,
    Base,
    get_db,
)

from models import (
    User,
    Dataset,
    Scenario,
    SimulationResult,
    SocialAccount,
    SystemRole,
    Post,
    PostStatus,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
)
from linkedin_publisher import (
    publish_linkedin_text_post
)

from mongo import mongo_db

from email_service import (
    send_password_reset_email
)

from oauth_linkedin import (
    router as linkedin_router
)


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="SocialPilot API",
    description="AI-powered scenario simulation engine",
    version="1.0.0",
)


# ============================================================
# LINKEDIN OAUTH ROUTER
# ============================================================
#
# LinkedIn OAuth routes are implemented inside:
#
# backend/oauth_linkedin.py
#
# This keeps the OAuth logic separate from the main application.
# ============================================================

app.include_router(
    linkedin_router
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
#
# Existing tables are preserved.
# SQLAlchemy will only create tables that do not already exist.
# ============================================================

Base.metadata.create_all(
    bind=engine
)


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
class LinkedInPublishRequest(BaseModel):
    content: str

class UpdateProfileRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


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
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # system_role is NOT NULL in PostgreSQL.
    # Therefore we explicitly set USER.
    # --------------------------------------------------------

    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(
            request.password
        ),
        role=request.role,
        system_role=SystemRole.USER,
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
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {
            "user_id": user.id,
            "role": user.role,
        }
    )

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
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if not user:

        return {
            "message": (
                "If that email is registered, "
                "a reset link has been sent."
            )
        }

    token = secrets.token_urlsafe(32)

    user.reset_token = token

    user.reset_token_expiry = (
        datetime.utcnow()
        + timedelta(hours=1)
    )

    db.commit()

    reset_link = (
        "http://localhost:3000/"
        f"reset-password?token={token}"
    )

    send_password_reset_email(
        user.email,
        reset_link,
    )

    return {
        "message": (
            "If that email is registered, "
            "a reset link has been sent."
        ),
    }


# ============================================================
# RESET PASSWORD
# ============================================================


@app.post("/auth/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.reset_token == request.token
        )
        .first()
    )

    if (
        not user
        or not user.reset_token_expiry
        or user.reset_token_expiry
        < datetime.utcnow()
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link",
        )

    user.password_hash = hash_password(
        request.new_password
    )

    user.reset_token = None

    user.reset_token_expiry = None

    db.commit()

    return {
        "message": "Password reset successful"
    }


# ============================================================
# CURRENT USER
# ============================================================


@app.get("/auth/me")
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }


# ============================================================
# UPDATE PROFILE
# ============================================================


@app.put("/auth/me")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(
        get_current_user
    ),
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


# ============================================================
# CHANGE PASSWORD
# ============================================================


@app.post("/auth/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    if not current_user.password_hash:

        raise HTTPException(
            status_code=400,
            detail=(
                "This account uses Google sign-in "
                "and has no password to change"
            ),
        )

    if not verify_password(
        request.current_password,
        current_user.password_hash,
    ):

        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect",
        )

    current_user.password_hash = (
        hash_password(
            request.new_password
        )
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }


# ============================================================
# SOCIAL ACCOUNTS
# ============================================================


@app.post("/social-accounts")
def connect_social_account(
    request: SocialAccountRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # NORMALIZE PLATFORM
    # --------------------------------------------------------

    platform = request.platform.strip().lower()

    account_name = (
        request.account_name.strip()
    )

    if not account_name:

        raise HTTPException(
            status_code=400,
            detail="Account name cannot be empty",
        )

    # --------------------------------------------------------
    # CHECK EXISTING MANUAL ACCOUNT
    # --------------------------------------------------------

    existing_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id
            == current_user.id,

            SocialAccount.platform
            == platform,

            SocialAccount.account_name
            == account_name,
        )
        .first()
    )

    if existing_account:

        raise HTTPException(
            status_code=400,
            detail=(
                "This social account is already connected."
            ),
        )

    # --------------------------------------------------------
    # CREATE ACCOUNT
    # --------------------------------------------------------

    account = SocialAccount(
        user_id=current_user.id,
        platform=platform,
        account_name=account_name,
        status="connected",
        is_active=True,
        last_synced_at=datetime.utcnow(),
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
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    accounts = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id
            == current_user.id
        )
        .order_by(
            SocialAccount.created_at.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # NEVER SEND ACCESS / REFRESH TOKENS TO FRONTEND
    # --------------------------------------------------------

    return [
        {
            "id": account.id,
            "platform": account.platform,
            "account_name": account.account_name,
            "platform_user_id":
                account.platform_user_id,
            "status": account.status,
            "is_active": account.is_active,
        }
        for account in accounts
    ]
# ============================================================
# LINKEDIN PUBLISH
# ============================================================

@app.post("/linkedin/publish")
async def publish_to_linkedin(
    request: LinkedInPublishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Publish a text post to the authenticated user's LinkedIn account.
    """

    # --------------------------------------------------------
    # FIND CONNECTED LINKEDIN ACCOUNT
    # --------------------------------------------------------

    linkedin_account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.user_id == current_user.id,
            SocialAccount.platform == "linkedin",
            SocialAccount.is_active == True,
        )
        .first()
    )

    if not linkedin_account:
        raise HTTPException(
            status_code=404,
            detail="No connected LinkedIn account found",
        )

    # --------------------------------------------------------
    # CHECK TOKEN
    # --------------------------------------------------------

    if not linkedin_account.access_token:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn access token is missing",
        )

    if not linkedin_account.platform_user_id:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn member ID is missing",
        )

    # --------------------------------------------------------
    # PUBLISH
    # --------------------------------------------------------

    try:
        result = await publish_linkedin_text_post(
            access_token=linkedin_account.access_token,
            linkedin_user_id=linkedin_account.platform_user_id,
            content=request.content,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    # --------------------------------------------------------
    # UPDATE LAST SYNC
    # --------------------------------------------------------

    linkedin_account.last_synced_at = datetime.utcnow()
    linkedin_account.status = "connected"

    db.commit()

    return {
        "success": True,
        "message": "LinkedIn post published successfully",
        "platform": "linkedin",
        "post_id": result.get("post_id"),
    }

# ============================================================
# DATASET UPLOAD
# ============================================================


@app.post("/datasets/upload")
def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    allowed_extensions = [
        ".csv",
        ".xlsx",
        ".xls",
    ]

    extension = os.path.splitext(
        file.filename
    )[1].lower()

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only CSV and Excel files "
                "are supported"
            ),
        )

    upload_directory = "uploads"

    os.makedirs(
        upload_directory,
        exist_ok=True,
    )

    file_path = os.path.join(
        upload_directory,
        file.filename,
    )

    with open(
        file_path,
        "wb",
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer,
        )

    try:

        if extension == ".csv":

            df = pd.read_csv(
                file_path
            )

        else:

            df = pd.read_excel(
                file_path
            )

        dataset = Dataset(
            filename=file.filename,
            dataset_type=extension.replace(
                ".",
                "",
            ),
            row_count=len(df),
            column_count=len(df.columns),
        )

        db.add(dataset)

        db.commit()

        db.refresh(dataset)

        return {
            "message":
                "Dataset uploaded successfully",

            "dataset_id":
                dataset.id,

            "filename":
                dataset.filename,

            "dataset_type":
                dataset.dataset_type,

            "row_count":
                dataset.row_count,

            "column_count":
                dataset.column_count,
        }

    except Exception as error:

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not process dataset: "
                f"{str(error)}"
            ),
        )


# ============================================================
# GET DATASETS
# ============================================================


@app.get("/datasets")
def get_datasets(
    db: Session = Depends(get_db),
):

    return (
        db.query(Dataset)
        .all()
    )


@app.get("/datasets/{dataset_id}")
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):

    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id
        )
        .first()
    )

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    return dataset


# ============================================================
# CREATE SCENARIO
# ============================================================


@app.post("/scenarios")
def create_scenario(
    request: ScenarioRequest,
    db: Session = Depends(get_db),
):

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
        "message":
            "Scenario created successfully",

        "scenario_id":
            scenario.id,

        "name":
            scenario.name,

        "question":
            scenario.question,

        "decision_type":
            scenario.decision_type,

        "variable":
            scenario.variable,

        "direction":
            scenario.direction,

        "magnitude":
            scenario.magnitude,
    }


# ============================================================
# GET SCENARIOS
# ============================================================


@app.get("/scenarios")
def get_scenarios(
    db: Session = Depends(get_db),
):

    return (
        db.query(Scenario)
        .all()
    )


@app.get("/scenarios/{scenario_id}")
def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
):

    scenario = (
        db.query(Scenario)
        .filter(
            Scenario.id == scenario_id
        )
        .first()
    )

    if not scenario:

        raise HTTPException(
            status_code=404,
            detail="Scenario not found",
        )

    return scenario


# ============================================================
# SIMULATE SCENARIO
# ============================================================


@app.post(
    "/scenarios/{scenario_id}/simulate"
)
def simulate_scenario(
    scenario_id: int,
    request: SimulationRequest,
    db: Session = Depends(get_db),
):

    scenario = (
        db.query(Scenario)
        .filter(
            Scenario.id == scenario_id
        )
        .first()
    )

    if not scenario:

        raise HTTPException(
            status_code=404,
            detail="Scenario not found",
        )

    # --------------------------------------------------------
    # CALCULATE PREDICTED VALUE
    # --------------------------------------------------------

    predicted_value = (
        request.baseline_value
        * (
            1
            + request.change_percentage
            / 100
        )
    )

    delta = (
        predicted_value
        - request.baseline_value
    )

    if request.baseline_value != 0:

        delta_percentage = (
            delta
            / request.baseline_value
        ) * 100

    else:

        delta_percentage = 0

    # --------------------------------------------------------
    # SAVE RESULT
    # --------------------------------------------------------

    result = SimulationResult(
        scenario_id=scenario.id,
        metric_name=request.metric_name,
        baseline_value=request.baseline_value,
        predicted_value=predicted_value,
        delta=delta,
        delta_percentage=delta_percentage,
    )

    db.add(result)

    db.commit()

    db.refresh(result)

    return {
        "message":
            "Simulation completed successfully",

        "scenario_id":
            scenario.id,

        "result_id":
            result.id,

        "metric_name":
            result.metric_name,

        "baseline_value":
            result.baseline_value,

        "predicted_value":
            round(
                result.predicted_value,
                2,
            ),

        "delta":
            round(
                result.delta,
                2,
            ),

        "delta_percentage":
            round(
                result.delta_percentage,
                2,
            ),
    }


# ============================================================
# GET SIMULATION RESULTS
# ============================================================


@app.get(
    "/scenarios/{scenario_id}/results"
)
def get_scenario_results(
    scenario_id: int,
    db: Session = Depends(get_db),
):

    scenario = (
        db.query(Scenario)
        .filter(
            Scenario.id == scenario_id
        )
        .first()
    )

    if not scenario:

        raise HTTPException(
            status_code=404,
            detail="Scenario not found",
        )

    return (
        db.query(
            SimulationResult
        )
        .filter(
            SimulationResult.scenario_id
            == scenario_id
        )
        .all()
    )


@app.get(
    "/results/{result_id}"
)
def get_result(
    result_id: int,
    db: Session = Depends(get_db),
):

    result = (
        db.query(
            SimulationResult
        )
        .filter(
            SimulationResult.id
            == result_id
        )
        .first()
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail="Result not found",
        )

    return result