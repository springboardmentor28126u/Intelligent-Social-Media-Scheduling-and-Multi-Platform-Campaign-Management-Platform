from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview, PlatformPerformance, TrendDataPoint, TopPostItem
)
from app.services.auth_service import get_current_user
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return AnalyticsService.get_overview(db=db, user_id=current_user.id)

@router.get("/platforms", response_model=List[PlatformPerformance])
def get_platforms_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return AnalyticsService.get_platform_performance(db=db, user_id=current_user.id)

@router.get("/trends", response_model=List[TrendDataPoint])
def get_engagement_trends(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    return AnalyticsService.get_trend_data(days=days)

@router.get("/top-posts", response_model=List[TopPostItem])
def get_top_performing_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return AnalyticsService.get_top_posts(db=db, user_id=current_user.id)
