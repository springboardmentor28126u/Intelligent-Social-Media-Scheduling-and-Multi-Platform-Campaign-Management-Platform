"""
app/core/deps.py — The bouncers at the door.

get_current_user   -> "Are you logged in at all?" Reads the wristband
                        (JWT) from the request, verifies it, and fetches
                        the real user record from MongoDB.

require_role(...)   -> "Are you logged in AND allowed in THIS specific
                         room?" Builds on get_current_user, adding a
                         role check on top.

Both are FastAPI "dependencies" — you attach them to any route that
needs protecting, and FastAPI runs them automatically before your
route's own code executes.
"""

from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token
from app.db.users import get_user_by_id
from app.models.schemas import UserPublic

# This tells FastAPI HOW to find the wristband in an incoming request:
# look for an "Authorization: Bearer <token>" header. tokenUrl just points
# Swagger UI to our login route for its own "Authorize" button convenience.
oauth2_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
) -> UserPublic:
    token = credentials.credentials
    """
    Runs automatically on any route that depends on this function.
    1. Decode the JWT wristband.
    2. If invalid/expired -> reject with 401.
    3. Look up the real user in MongoDB using the id baked into the token.
    4. If the user no longer exists -> reject with 401.
    5. Otherwise, return the user's public-safe info for the route to use.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user_dict = await get_user_by_id(user_id)
    if user_dict is None:
        raise credentials_exception

    return UserPublic(**user_dict)


def require_role(allowed_roles: List[str]):
    """
    A "dependency factory" — a function that BUILDS a dependency.
    Usage on a route: Depends(require_role(["administrator"]))

    Why a factory instead of one fixed function? Because different rooms
    need different sign-on-the-door lists (e.g. one route might allow
    ["administrator", "marketing_team"], another only ["administrator"]).
    This lets us reuse the same logic with a different allowed list each time.
    """

    async def role_checker(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {allowed_roles}",
            )
        return current_user

    return role_checker