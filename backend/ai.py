from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

DAILY_LIMIT = 20
_usage = defaultdict(int)  # resets on server restart; fine for a demo


class CaptionRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    platforms: list[str] = Field(min_length=1)
    tone: str = Field(default="professional", max_length=30)


@router.post("/generate-caption")
def generate_caption(req: CaptionRequest, user=Depends(get_current_user)):
    unknown = [p for p in req.platforms if p not in ai_service.PLATFORM_RULES]
    if unknown:
        raise HTTPException(400, f"Unsupported platform(s): {', '.join(unknown)}")

    key = (user.id, date.today())
    if _usage[key] >= DAILY_LIMIT:
        raise HTTPException(429, "Daily AI generation limit reached.")

    try:
        posts = ai_service.generate_captions(req.topic, req.platforms, req.tone)
    except ai_service.AIServiceError as e:
        raise HTTPException(503, str(e))

    _usage[key] += 1
    return {"posts": posts}