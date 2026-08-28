from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=100
    )

    date_of_birth: date

    role: Literal[
        "content_creator",
        "business",
        "marketing_team",
        "other"
    ]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str