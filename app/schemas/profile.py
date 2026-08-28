from datetime import date

from pydantic import BaseModel, Field
from typing import Literal


class ProfileResponse(BaseModel):
    date_of_birth: date | None = None
    role: Literal[
        "content_creator",
        "business",
        "marketing_team",
        "other"
    ] | None = None
    profile_image: str | None = None
    bio: str | None = None
    phone: str | None = None


class ProfileUpdateRequest(BaseModel):
    date_of_birth: date | None = None

    role: Literal[
        "content_creator",
        "business",
        "marketing_team",
        "other"
    ] | None = None

    profile_image: str | None = None

    bio: str | None = Field(
        default=None,
        max_length=500
    )

    phone: str | None = Field(
        default=None,
        max_length=20
    )