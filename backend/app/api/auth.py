"""
app/api/auth.py — The register and login "service counters."

Two routes live here:
  POST /auth/register  -> create a new user (checks for duplicate email,
                            shreds the password, saves to MongoDB)
  POST /auth/login      -> check email + password, hand back a JWT
                            "wristband" if correct

Both routes return UserPublic-shaped data (never the password, hashed
or not) alongside the token where relevant.
"""

from fastapi import APIRouter, HTTPException, status, Depends

from app.core.security import create_access_token, hash_password, verify_password
from typing import List

from app.core.deps import get_current_user, require_role
from app.db.users import create_user, get_all_users, get_user_by_email
from app.models.schemas import UserCreate, UserInDB, UserPublic

# An APIRouter is like a mini FastAPI app for just ONE topic (auth).
# We'll "plug" this into the main app in app/main.py next.
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """
    Registers a new user.
    1. Check no existing user already has this email (emails must be unique).
    2. Shred the plain password into a hash.
    3. Build the full UserInDB record (adds id, created_at automatically).
    4. Save it to MongoDB.
    5. Return the public-safe version (no password) back to the frontend.
    """
    existing_user = await get_user_by_email(user_in.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    hashed_pw = hash_password(user_in.password)

    new_user = UserInDB(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role,
    )

    saved_user_dict = await create_user(new_user)

    # saved_user_dict is a plain dict fresh from MongoDB — FastAPI will
    # automatically reshape it to match UserPublic (dropping hashed_password)
    # because of response_model=UserPublic above.
    return saved_user_dict


@router.post("/login")
async def login(email: str, password: str):
    """
    Logs a user in.
    1. Find the user by email — if not found, reject (generic error message
       on purpose, so we don't reveal WHICH part was wrong to an attacker).
    2. Verify the submitted password against the stored hash.
    3. If correct, stamp a JWT wristband containing the user's id and role.
    4. Return the token plus the public-safe user info.
    """
    user_dict = await get_user_by_email(email)
    if user_dict is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not verify_password(password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(
        data={"sub": user_dict["id"], "role": user_dict["role"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(**user_dict),
    }

@router.get("/me", response_model=UserPublic)
async def read_current_user(current_user: UserPublic = Depends(get_current_user)):
    """
    'Who am I?' — takes the JWT wristband from the request, and if it's
    valid, hands back that user's own public-safe info. This is the
    permanent home for what used to be a temporary test route in main.py.
    """
    return current_user

@router.get("/users", response_model=List[UserPublic])
async def list_all_users(current_user: UserPublic = Depends(require_role(["administrator"]))):
    """
    Administrator-only: the 'back-office binder' — lists every registered
    user. require_role(["administrator"]) checks the wristband AND the
    role before this function even runs; anyone else gets a 403 automatically.
    """
    all_users = await get_all_users()
    return all_users