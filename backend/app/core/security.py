"""
security.py — The password shredder and wristband maker/checker.

Two separate jobs live here, kept in one file since they're both small
and both about "keeping the user's identity safe":

1. Password hashing:
   - hash_password()   -> shred a plain password into a stored hash
   - verify_password() -> re-shred a login attempt and compare to the
                            stored hash, WITHOUT ever un-shredding either one

2. JWT (JSON Web Token) "wristbands":
   - create_access_token() -> stamp a new wristband after successful login
   - decode_access_token() -> check a wristband is genuine and not expired
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# PASSWORD HASHING
# CryptContext is passlib's tool that knows HOW to shred passwords using
# the bcrypt algorithm — a well-tested, slow-on-purpose hashing method
# (slow is a GOOD thing here: it makes brute-force guessing painfully slow
# for an attacker, while still being instant for one real login attempt).
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Shred a plain-text password into a one-way bcrypt hash for storage."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Re-shred a login attempt's password and compare it to the stored hash.
    Returns True if they match (same original password), False otherwise.
    We NEVER reverse the hash back into the original password — that's
    not possible by design, which is the whole point.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT "WRISTBAND" CREATION AND VERIFICATION
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Stamps a new wristband (JWT string) containing whatever info we pass
    in `data` (we'll pass the user's id and role). The wristband is signed
    with our SECRET_KEY, so we can later prove it's genuine and untampered.
    """
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})  # "exp" = expiry time, a JWT standard field

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Checks a wristband (JWT string) is genuine (signed with our SECRET_KEY)
    and not expired. Returns the data baked into it if valid, or None if
    the wristband is fake, tampered with, or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None