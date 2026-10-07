from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash
import os
import jwt
from datetime import datetime, timedelta, timezone
import models
import schemas
from database import get_db
from roles import normalize_role, permissions_for
def create_app():
    production = os.getenv('APP_ENV') == 'production'
    return FastAPI(docs_url=None if production else '/docs',
                   redoc_url=None if production else '/redoc',
                   openapi_url=None if production else '/openapi.json')


app = create_app()
from runtime_config import SecurityHeaders
app.add_middleware(SecurityHeaders)


@app.get('/health')
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text('SELECT 1'))
    except Exception:
        raise HTTPException(503, 'Database unavailable') from None
    return {'status': 'ok'}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip().rstrip("/") for origin in
                   os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
                   if origin.strip()],
    allow_origin_regex=None if os.getenv("CORS_ORIGINS") else r"http://(localhost|127\.0\.0\.1):\d+",
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
    if user is None or user.is_workspace:
        raise unauthorized
    # Resolve permissions from the database so role changes apply immediately.
    role = normalize_role(user.role)
    if role is None:
        raise HTTPException(status_code=403, detail="Account role is not supported")
    payload["role"] = role.value
    return payload


def require_permission(permission):
    def check(request: Request, payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
        if permission.split(":")[0] in {"posts", "accounts", "analytics", "content", "publish"}:
            from teams import scoped_payload
            payload = scoped_payload(db, payload, request.headers.get("X-Workspace-ID"))
        if permission not in permissions_for(payload.get("role")):
            raise HTTPException(status_code=403, detail="Only content creators can connect accounts or publish" if permission == "publish:write" else "Your current workspace role does not allow this action")
        previous = db.info.get("content_scope")
        db.info["content_scope"] = payload
        try:
            yield payload
        finally:
            if previous is None:
                db.info.pop("content_scope", None)
            else:
                db.info["content_scope"] = previous
    return check


from teams import make_router as make_teams_router
from approvals import make_router as make_approvals_router
from notifications import make_router as make_notifications_router
app.include_router(make_teams_router(verify_token))
app.include_router(make_approvals_router(require_permission))
app.include_router(make_notifications_router(verify_token))

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
@app.get("/me/permissions")
def my_permissions(payload: dict = Depends(verify_token)):
    return {"role": payload["role"], "permissions": sorted(permissions_for(payload["role"]))}


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
    from notifications import notify_user
    notify_user(db, user.id, "account", "Profile updated", "Your profile name was changed.")
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
    from notifications import notify_user
    notify_user(db, user.id, "account", "Password changed", "Your SocialPilot password was changed.")
    db.commit()
    return {"message": "Password updated"}


@app.delete("/accounts/{account_id}")
def disconnect_social_account(
    account_id: int,
    payload: dict = Depends(require_permission("publish:write")),
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
    from notifications import notify_scope
    notify_scope(db, user_id, "account", "Social account disconnected", account.account_name)
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
    payload: dict = Depends(require_permission("publish:write")),
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
@app.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    request: Request = None,
):
    if request is not None:
        from client_ip import get_client_ip
        from login_limits import check_register_limit
        check_register_limit(db, get_client_ip(request), str(user.email))
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
        db.flush()
        from teams import attach_invitations
        attach_invitations(db, new_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(new_user)

    return new_user
@app.post("/login")
def login_user(
    user: schemas.UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    from login_limits import check_login_limit
    from client_ip import get_client_ip
    check_login_limit(db, get_client_ip(request), str(user.email))
    # Emails are stored lower-case; func.lower also matches older mixed-case rows.
    db_user = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == str(user.email).lower())
        .order_by(models.User.id)
        .first()
    )

    if not db_user or db_user.is_workspace:
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
    
