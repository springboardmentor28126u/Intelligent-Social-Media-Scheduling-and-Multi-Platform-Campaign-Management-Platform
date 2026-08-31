from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import models
import schemas
from database import get_db
from mongo_database import test_mongo_connection
load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
password_hash = PasswordHash.recommended()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
security = HTTPBearer()


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
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
        token = credentials.credentials

        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM]
            )

            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token expired"
            )

        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )
def require_admin(
    payload: dict = Depends(verify_token)
):
    if payload.get("role") != "admin":
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
@app.delete("/accounts/{account_id}")
def disconnect_social_account(
    account_id: int,
    payload: dict = Depends(verify_token),
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
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user_id = int(payload["sub"])

    new_account = models.SocialAccount(
        user_id=user_id,
        platform=account.platform,
        account_name=account.account_name,
        connected=True
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
    payload: dict = Depends(verify_token),
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
        .filter(models.User.email == user.email)
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
    db.commit()
    db.refresh(new_user)

    return new_user
@app.post("/login")
def login_user(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(models.User)
        .filter(models.User.email == str(user.email))
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
    