from typing import Optional, List, Dict
from pydantic import BaseModel

class AIGenerateCaptionRequest(BaseModel):
    topic: str
    tone: Optional[str] = "Engaging"  # Professional, Engaging, Inspiring, Humorous, Urgent, Casual
    platform: Optional[str] = "All"
    target_audience: Optional[str] = "General"
    include_hashtags: Optional[bool] = True
    include_cta: Optional[bool] = True

class PlatformAdaptations(BaseModel):
    instagram: str
    linkedin: str
    twitter: str
    facebook: str
    youtube: Optional[str] = ""
    pinterest: Optional[str] = ""

class AIGenerateCaptionResponse(BaseModel):
    primary_caption: str
    hashtags: List[str]
    call_to_action: str
    best_time_to_post: str
    recommended_days: List[str]
    adaptations: PlatformAdaptations

class AIAdaptContentRequest(BaseModel):
    content: str
    target_platform: str  # instagram, linkedin, twitter, facebook, youtube, pinterest
    tone: Optional[str] = "Professional"

class AIAdaptContentResponse(BaseModel):
    platform: str
    adapted_content: str
    hashtags: List[str]
    character_count: int

class AIHashtagSuggestionRequest(BaseModel):
    content: str
    count: Optional[int] = 8

class AIHashtagSuggestionResponse(BaseModel):
    hashtags: List[str]
    trending_score: str
