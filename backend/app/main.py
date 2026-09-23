import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.db.database import Base, engine
from app.db.seed import seed_database
from app.services.scheduler import publish_scheduled_posts

# Import Routers
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.roles import router as roles_router
from app.api.routes.teams import router as teams_router
from app.api.routes.social_accounts import router as social_router
from app.api.routes.posts import router as posts_router
from app.api.routes.media import router as media_router
from app.api.routes.campaigns import router as campaign_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.reports import router as reports_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.approvals import router as approvals_router
from app.api.routes.admin import router as admin_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.linkedin import router as linkedin_router
from app.api.routes.instagram import router as instagram_router
from app.api.routes.facebook import router as facebook_router



scheduler = BackgroundScheduler()


def check_and_migrate_db():
    if engine.dialect.name != "sqlite":
        return
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check posts table
            res = conn.execute(text("PRAGMA table_info(posts)"))
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "media_url" not in cols:
                    conn.execute(text("ALTER TABLE posts ADD COLUMN media_url VARCHAR(500)"))
                if "media_type" not in cols:
                    conn.execute(text("ALTER TABLE posts ADD COLUMN media_type VARCHAR(50)"))
                if "approval_status" not in cols:
                    conn.execute(text("ALTER TABLE posts ADD COLUMN approval_status VARCHAR(30) DEFAULT 'approved' NOT NULL"))
                    conn.execute(text("UPDATE posts SET approval_status = 'pending' WHERE status = 'pending_approval'"))
            
            # Check users table
            res_user = conn.execute(text("PRAGMA table_info(users)"))
            u_cols = [row[1] for row in res_user.fetchall()]
            if u_cols:
                if "system_role" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN system_role VARCHAR(20) DEFAULT 'USER'"))

            # Check notifications table
            res_notif = conn.execute(text("PRAGMA table_info(notifications)"))
            n_cols = [row[1] for row in res_notif.fetchall()]
            if n_cols:
                if "actor_user_id" not in n_cols:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN actor_user_id INTEGER"))
                if "related_entity_type" not in n_cols:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN related_entity_type VARCHAR(50)"))
                if "related_entity_id" not in n_cols:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN related_entity_id VARCHAR(100)"))
                if "uuid" not in n_cols:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN uuid VARCHAR(36)"))
            conn.commit()
    except Exception as e:
        print(f"Database migration check notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed demo data only for SQLite
    try:
        if engine.dialect.name == "sqlite":
            Base.metadata.create_all(bind=engine)
            check_and_migrate_db()
            seed_database()
    except Exception as e:
        print(f"Lifespan startup warning: {e}")

    # Start recurring scheduler
    if not scheduler.running:
        scheduler.add_job(
            publish_scheduled_posts,
            "interval",
            minutes=1,
            id="publish_scheduled_posts_job",
            replace_existing=True
        )
        scheduler.start()

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Social Media Scheduler & Campaign Management Platform - Production REST API",
    lifespan=lifespan
)

# CORS configuration supporting any localhost/127.0.0.1 port (5173, 5174, 3000, etc.) and tunnels
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Uploads and Generated Reports
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(teams_router)
app.include_router(social_router)
app.include_router(posts_router)
app.include_router(media_router)
app.include_router(campaign_router)
app.include_router(analytics_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(approvals_router)
app.include_router(admin_router)
app.include_router(dashboard_router)
app.include_router(linkedin_router)
app.include_router(instagram_router)
app.include_router(facebook_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin")
    allowed_origin = origin if origin else "*"
    headers = {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers=headers
    )



@app.get("/", tags=["Health"])
def root():
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "healthy",
        "scheduler": "running" if scheduler.running else "stopped"
    }