from typing import Literal

from pydantic import BaseModel, Field


CaptionPlatform = Literal[
    "Facebook",
    "Instagram",
    "LinkedIn",
    "YouTube",
    "X (Twitter)",
]
CaptionTone = Literal[
    "Professional",
    "Friendly",
    "Promotional",
    "Casual",
    "Creative",
]
RewriteStyle = Literal[
    "Professional",
    "Friendly",
    "Promotional",
    "Casual",
    "Shorten",
    "Expand",
    "Improve Grammar",
]


class CaptionGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=2000)
    platform: CaptionPlatform
    tone: CaptionTone


class CaptionGenerateResponse(BaseModel):
    caption: str


class PostRewriteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    style: RewriteStyle


class PostRewriteResponse(BaseModel):
    rewritten_content: str
