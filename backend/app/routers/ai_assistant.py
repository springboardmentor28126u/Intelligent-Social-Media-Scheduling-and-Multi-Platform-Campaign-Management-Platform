from fastapi import APIRouter, Depends
from app.schemas.ai import (
    AIGenerateCaptionRequest, AIGenerateCaptionResponse,
    AIAdaptContentRequest, AIAdaptContentResponse,
    AIHashtagSuggestionRequest, AIHashtagSuggestionResponse
)
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Content Assistant"])

@router.post("/generate", response_model=AIGenerateCaptionResponse)
def generate_ai_caption(
    req: AIGenerateCaptionRequest,
    current_user: User = Depends(get_current_user)
):
    return AIService.generate_caption(req)

@router.post("/adapt", response_model=AIAdaptContentResponse)
def adapt_content_for_platform(
    req: AIAdaptContentRequest,
    current_user: User = Depends(get_current_user)
):
    return AIService.adapt_content(req)

@router.post("/hashtags", response_model=AIHashtagSuggestionResponse)
def suggest_hashtags(
    req: AIHashtagSuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    return AIService.suggest_hashtags(req)
