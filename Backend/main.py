from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash
import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import models
import schemas
from database import get_db
from mongo_database import test_mongo_connection
from roles import Role, ROLE_PERMISSIONS, normalize_role, permissions_for
load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
password_hash = PasswordHash.recommended()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY must be configured before starting the backend")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, role: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )
def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    unauthorized = HTTPException(
        status_code=401, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"}
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        user_id = int(payload["sub"])
        if user_id <= 0:
            raise ValueError("Invalid subject")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Token expired", headers={"WWW-Authenticate": "Bearer"}
        )
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise unauthorized
    user = db.get(models.User, user_id)
    if user is None:
        raise unauthorized
    # Resolve permissions from the database so role changes apply immediately.
    role = normalize_role(user.role)
    if role is None:
        raise HTTPException(status_code=403, detail="Account role is not supported")
    payload["role"] = role.value
    return payload


def require_permission(permission):
    def check(payload: dict = Depends(verify_token)):
        if permission not in permissions_for(payload.get("role")):
            raise HTTPException(status_code=403, detail="Permission denied")
        return payload
    return check


from social_oauth import make_router
app.include_router(make_router(require_permission))
from posts import make_router as make_posts_router
app.include_router(make_posts_router(require_permission))
from scheduling import make_router as make_schedule_router
app.include_router(make_schedule_router(require_permission))
from analytics import make_router as make_analytics_router
app.include_router(make_analytics_router(require_permission))
from campaigns import make_router as make_campaigns_router
app.include_router(make_campaigns_router(require_permission))
from reports import make_router as make_reports_router
app.include_router(make_reports_router(require_permission))
from demo import make_router as make_demo_router
app.include_router(make_demo_router(require_permission))
def require_admin(
    payload: dict = Depends(verify_token)
):
    if payload.get("role") not in {"admin", "administrator"}:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return payload


@app.get("/admin")
def admin_page(
    payload: dict = Depends(require_admin)
):
    return {
        "message": "Welcome Admin"
    }


@app.get("/me/permissions")
def my_permissions(payload: dict = Depends(verify_token)):
    return {"role": payload["role"], "permissions": sorted(permissions_for(payload["role"]))}


@app.get("/admin/roles")
def list_roles(payload: dict = Depends(require_permission("roles:read"))):
    return [{"role": role.value, "permissions": sorted(permissions)}
            for role, permissions in ROLE_PERMISSIONS.items()]


@app.get("/admin/users", response_model=list[schemas.UserResponse])
def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    payload: dict = Depends(require_permission("users:read")),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(models.User.id).offset(offset).limit(limit).all()


@app.patch("/admin/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    change: schemas.UserRoleUpdate,
    payload: dict = Depends(require_permission("users:write")),
    db: Session = Depends(get_db),
):
    # Disallow self-demotion so an administrator cannot lock themselves out.
    if user_id == int(payload["sub"]) and change.role != Role.ADMINISTRATOR:
        raise HTTPException(status_code=409, detail="Administrators cannot demote themselves")
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = change.role.value
    db.commit()
    db.refresh(user)
    return user
@app.get("/me")
def get_me(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user_id = int(payload["sub"])

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }
@app.patch("/me", response_model=schemas.UserResponse)
def update_profile(change: schemas.ProfileUpdate, payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.get(models.User, int(payload["sub"]))
    user.name = change.name
    db.commit()
    db.refresh(user)
    return user


@app.post("/me/password")
def change_password(change: schemas.PasswordChange, payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.get(models.User, int(payload["sub"]))
    if not password_hash.verify(change.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if change.current_password == change.new_password:
        raise HTTPException(status_code=400, detail="Choose a different new password")
    user.password_hash = password_hash.hash(change.new_password)
    db.commit()
    return {"message": "Password updated"}


@app.delete("/accounts/{account_id}")
def disconnect_social_account(
    account_id: int,
    payload: dict = Depends(require_permission("accounts:write")),
    db: Session = Depends(get_db)
):
    user_id = int(payload["sub"])

    account = (
        db.query(models.SocialAccount)
        .filter(
            models.SocialAccount.id == account_id,
            models.SocialAccount.user_id == user_id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    # Lock parent posts before changing jobs, matching worker/scheduler lock order.
    from scheduling import log as publishing_log, sync_post
    affected_ids = [row[0] for row in db.query(models.PublishingJob.post_id).filter_by(account_id=account.id).distinct()]
    for post_id in sorted(affected_ids):
        post = db.query(models.Post).filter_by(id=post_id).with_for_update().one()
        jobs = db.query(models.PublishingJob).filter_by(account_id=account.id, post_id=post_id).all()
        if any(job.status == "processing" for job in jobs):
            raise HTTPException(409, "Account is publishing; wait for the result before disconnecting")
        for job in jobs:
            if job.status in {"scheduled", "retry"}:
                job.status = "cancelled"
                publishing_log(db, job, "cancelled", "Target account disconnected")
            job.account_id = None
        sync_post(db, post)
    db.query(models.Post).filter_by(account_id=account.id).update({"account_id": None})
    db.query(models.SocialCredential).filter_by(account_id=account.id).delete()
    db.delete(account)
    db.commit()

    return {"message": "Social account disconnected"}
@app.post(
    "/accounts",
    response_model=schemas.SocialAccountResponse,
    status_code=status.HTTP_201_CREATED
)
def connect_social_account(
    account: schemas.SocialAccountCreate,
    payload: dict = Depends(require_permission("accounts:write")),
    db: Session = Depends(get_db)
):
    user_id = int(payload["sub"])

    new_account = models.SocialAccount(
        user_id=user_id,
        platform=account.platform,
        account_name=account.account_name,
        connected=False
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account
@app.get(
    "/accounts",
    response_model=list[schemas.SocialAccountResponse]
)
def get_social_accounts(
    payload: dict = Depends(require_permission("accounts:read")),
    db: Session = Depends(get_db)
):
    user_id = int(payload["sub"])

    accounts = (
        db.query(models.SocialAccount)
        .filter(models.SocialAccount.user_id == user_id)
        .all()
    )

    return accounts
@app.get("/")
def home():
    return {"message": "SocialPilot Backend is running"}
@app.get("/mongo-test")
def mongo_test():
    test_mongo_connection()
    return {"message": "MongoDB connected successfully"}

@app.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == str(user.email).lower())
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = password_hash.hash(user.password)

    new_user = models.User(
        name=user.name,
        email=str(user.email),
        password_hash=hashed_password,
        role="user"
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(new_user)

    return new_user
@app.post("/login")
def login_user(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    # Emails are stored lower-case; func.lower also matches older mixed-case rows.
    db_user = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == str(user.email).lower())
        .order_by(models.User.id)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not password_hash.verify(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    access_token = create_access_token(
    user_id=db_user.id,
    role=db_user.role
 )

    return {
    "message": "Login successful",
    "access_token": access_token,
    "token_type": "bearer",
    "user": {
        "id": db_user.id,
        "name": db_user.name,
        "email": db_user.email,
        "role": db_user.role
    }
}
    
