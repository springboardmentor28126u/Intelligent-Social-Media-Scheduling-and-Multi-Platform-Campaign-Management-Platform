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

    # ---------------------------------------------------------------------------
# POST TEMPLATES
# ---------------------------------------------------------------------------

class PostStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"
    # New for Milestone 2 — matches the brief's original list
    CANCELLED = "cancelled"
    PENDING_APPROVAL = "pending_approval"

class PostCreate(BaseModel):
    post_type: str = Field(..., min_length=2, max_length=50)
    platforms: list[SocialPlatform] = Field(default_factory=list)
    content: str = Field(..., min_length=1, max_length=10000)
    scheduled_at: Optional[datetime] = None
    status: PostStatus
    # New: link a post to a campaign (optional — not every post belongs to one)
    campaign_id: Optional[str] = None
    # New: recurring post support
    is_recurring: bool = False
    # e.g. "daily", "weekly" — kept as a plain string for now, simplest
    # option until Milestone 3's campaign/recurrence logic is fleshed out
    recurrence_rule: Optional[str] = None

# New: used for the PATCH /posts/{post_id} edit endpoint (Step 4).
# Every field is Optional because an edit might only change one thing —
# e.g. just the content, or just the scheduled_at time.
class PostUpdate(BaseModel):
    post_type: Optional[str] = Field(None, min_length=2, max_length=50)
    platforms: Optional[list[SocialPlatform]] = None
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    scheduled_at: Optional[datetime] = None
    status: Optional[PostStatus] = None
    campaign_id: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None

class PostInDB(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    post_type: str
    platforms: list[SocialPlatform] = Field(default_factory=list)
    content: str
    scheduled_at: Optional[datetime] = None
    status: PostStatus
    campaign_id: Optional[str] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    retry_count: int = 0
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PostPublic(BaseModel):
    id: str
    post_type: str
    platforms: list[SocialPlatform]
    content: str
    scheduled_at: Optional[datetime]
    status: PostStatus
    campaign_id: Optional[str]
    is_recurring: bool
    recurrence_rule: Optional[str]
    retry_count: int
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

# New: shape of a single publishing attempt log entry (Step 6)
class PublishingLogPublic(BaseModel):
    id: str
    post_id: str
    status: str
    message: Optional[str]
    timestamp: datetime