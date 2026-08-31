from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.postgres import SessionLocal
from app.models.user import User

from app.schemas.auth import (
    UserCreate,
    UserResponse,
    UserLogin,
    TokenResponse
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =====================================================
# DATABASE
# =====================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =====================================================
# REGISTER
# =====================================================

@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # Check whether email already exists
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(
        user.password
    )

    # New users are normal users
    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role="USER"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =====================================================
# LOGIN
# =====================================================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    # Find user by email
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    # User not found
    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check password
    if not verify_password(
        user.password,
        existing_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # =================================================
    # CREATE JWT
    # =================================================

    access_token = create_access_token(
        data={
            "sub": str(existing_user.id),
            "role": existing_user.role
        }
    )

    # =================================================
    # RETURN TOKEN + ROLE
    # =================================================

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": existing_user.role
    }


# =====================================================
# CURRENT USER
# =====================================================

@router.get("/me")
def get_me(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "You are authenticated",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }


# =====================================================
# ADMIN TEST / ADMIN DASHBOARD
# =====================================================

@router.get("/admin")
def admin_test(
    current_user=Depends(require_admin)
):

    return {
        "message": "Welcome Admin!",
        "user": current_user.email,
        "role": current_user.role
    }

# =====================================================
# GET ALL USERS - ADMIN ONLY
# =====================================================

@router.get("/users")
def get_all_users(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]