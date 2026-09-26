from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from apscheduler.schedulers.background import BackgroundScheduler
from app.routes.social_auth import router as social_auth_router
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine
from app.routes.publishing_logs import (
    router as publishing_logs_router,
)

from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.profile import router as profile_router
from app.routes.social_accounts import router as social_accounts_router
from app.routes.posts import router as posts_router

from app.scheduler.post_scheduler import publish_scheduled_posts
from app.routes.media import (
    router as media_router,
)
from app.routes import media


# =========================
# APScheduler
# =========================

scheduler = BackgroundScheduler()


# =========================
# FastAPI Application
# =========================

app = FastAPI(
    title=settings.app_name,
    description="Social Media Scheduler & Campaign Management Platform",
    version="0.1.0",
)
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)


# =========================
# CORS Middleware
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Routers
# =========================

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(profile_router)
app.include_router(social_accounts_router)
app.include_router(posts_router)
# Social OAuth routes
app.include_router(social_auth_router)
app.include_router(publishing_logs_router)

app.include_router(media_router)


# =========================
# Scheduler Events
# =========================

@app.on_event("startup")
def start_scheduler():

    if not scheduler.running:

        scheduler.add_job(
            publish_scheduled_posts,
            trigger="interval",
            seconds=10,
            id="publish_scheduled_posts",
            replace_existing=True,
        )

        scheduler.start()

        print("Scheduler started successfully.")


@app.on_event("shutdown")
def shutdown_scheduler():

    if scheduler.running:

        scheduler.shutdown()

        print("Scheduler stopped successfully.")


# =========================
# Basic Routes
# =========================

@app.get("/")
def root():
    return {
        "message": f"{settings.app_name} API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/health/db")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="PostgreSQL connection failed",
        ) from None

    return {
        "status": "ok",
        "database": "connected",
    }