from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.posts import router as posts_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router
from app.routers.social_accounts import router as social_accounts_router
from app.routers.team import router as team_router
from app.routers.notifications import router as notifications_router
from app.routers.reports import router as reports_router
from app.routers.ai_assistant import router as ai_router

__all__ = [
    "auth_router",
    "users_router",
    "posts_router",
    "campaigns_router",
    "analytics_router",
    "social_accounts_router",
    "team_router",
    "notifications_router",
    "reports_router",
    "ai_router"
]
