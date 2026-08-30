"""
schemas.py — Our "order ticket templates" for the database.

Every piece of data that flows in or out of SocialPilot's kitchen (backend)
gets checked against one of these templates first. If a field is missing
or the wrong type, Pydantic rejects it automatically — before it ever
reaches our database logic. This is a huge safety net for a beginner:
you'll get clear errors instead of mysterious bugs.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# ENUMS: fixed lists of allowed values.
# Think of an Enum as a dropdown menu — the user (or our own code) can ONLY
# pick from these exact options, nothing else. This matches the role
# dropdown you already built on the frontend register page.
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    CONTENT_CREATOR = "content_creator"
    MARKETING_TEAM = "marketing_team"
    BUSINESS_USER = "business_user"
    ADMINISTRATOR = "administrator"


class SocialPlatform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"       # this is the one with REAL OAuth for Milestone 1
    YOUTUBE = "youtube"
    PINTEREST = "pinterest"


def generate_uuid() -> str:
    """
    Generates a random unique ID as plain text, e.g. 'a1b2c3d4-...'.
    We use this instead of MongoDB's built-in ObjectId because plain
    text IDs are much easier to work with in Pydantic and in the
    frontend (no special conversion needed).
    """
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# USER TEMPLATES
# Why THREE separate templates for one "User" concept?
# - UserCreate  = what the CUSTOMER hands the waiter (the register form)
# - UserInDB    = what the KITCHEN actually stores (includes the scrambled
#                 password — never the real one)
# - UserPublic  = what goes back out on the RECEIPT (never includes any
#                 password, not even the scrambled one)
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """Incoming data when someone fills out the Register form."""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole


class UserInDB(BaseModel):
    """
    What actually gets saved into MongoDB's 'users' collection.
    Note: 'hashed_password' — we NEVER store the real password, only a
    one-way scrambled version (we'll build that hashing in Step 3).
    """
    id: str = Field(default_factory=generate_uuid)
    full_name: str
    email: EmailStr
    hashed_password: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserPublic(BaseModel):
    """
    What we send back to the frontend — e.g. after login, or when showing
    'who am I' on the dashboard. Deliberately leaves out the password
    entirely, hashed or not.
    """
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


# ---------------------------------------------------------------------------
# SOCIAL ACCOUNT TEMPLATES
# One SocialAccount = one connected external account (e.g. "my Twitter"),
# always linked back to exactly one User via user_id (like a table number
# on an order ticket, linking the order back to the customer).
# ---------------------------------------------------------------------------

class SocialAccountCreate(BaseModel):
    """
    Incoming data when a user connects/mocks a platform account.
    access_token/refresh_token are optional here because for MOCKED
    platforms (Facebook/Instagram/LinkedIn/YouTube/Pinterest) we won't
    have real OAuth tokens — only for real Twitter OAuth in Step 6.
    """
    platform: SocialPlatform
    platform_username: str
    is_mocked: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class SocialAccountInDB(BaseModel):
    """What gets saved into MongoDB's 'social_accounts' collection."""
    id: str = Field(default_factory=generate_uuid)
    user_id: str                     # links this account back to a User.id
    platform: SocialPlatform
    platform_username: str
    is_mocked: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    connected_at: datetime = Field(default_factory=datetime.utcnow)


class SocialAccountPublic(BaseModel):
    """
    What we show the user on their dashboard's connected-accounts list.
    Deliberately excludes access_token/refresh_token — these are secret
    "keys" to their real accounts and should never be sent to the browser.
    """
    id: str
    platform: SocialPlatform
    platform_username: str
    is_mocked: bool
    connected_at: datetime