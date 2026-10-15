from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.schemas.caption import (
    CaptionGenerateRequest,
    CaptionGenerateResponse,
    PostRewriteRequest,
    PostRewriteResponse,
)
from app.services.ai_caption import (
    CaptionGenerationError,
    generate_caption,
    rewrite_post,
)


router = APIRouter(
    prefix="/ai/captions",
    tags=["AI Captions"],
)


@router.post("/generate", response_model=CaptionGenerateResponse)
async def generate_caption_endpoint(
    request: CaptionGenerateRequest,
    _current_user_id: int = Depends(get_current_user),
):
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(
            status_code=422,
            detail="Topic or product description cannot be empty.",
        )

    try:
        caption = await generate_caption(
            topic=topic,
            platform=request.platform,
            tone=request.tone,
        )
    except CaptionGenerationError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    return CaptionGenerateResponse(caption=caption)


@router.post("/rewrite", response_model=PostRewriteResponse)
async def rewrite_post_endpoint(
    request: PostRewriteRequest,
    _current_user_id: int = Depends(get_current_user),
):
    content = request.content.strip()
    if not content:
        raise HTTPException(
            status_code=422,
            detail="Post content cannot be empty.",
        )

    try:
        rewritten_content = await rewrite_post(
            content=content,
            style=request.style,
        )
    except CaptionGenerationError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    return PostRewriteResponse(rewritten_content=rewritten_content)
