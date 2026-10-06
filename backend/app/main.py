from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.analytics import router as analytics_router
from app.routers.social_accounts import router as social_accounts_router
from app.routers.posts import router as posts_router
from app.routers.campaigns import router as campaigns_router
from app.routers.admin import router as admin_router

from app.services.scheduler import scheduler

from fastapi.staticfiles import StaticFiles
from pathlib import Path



# Upload directories
UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "images").mkdir(exist_ok=True)
(UPLOAD_DIR / "videos").mkdir(exist_ok=True)

# ---------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the scheduler when FastAPI starts
    scheduler.start()

    print("Post scheduler started")
    print("Timezone: Asia/Kolkata (Indian Standard Time)")

    yield

    # Stop the scheduler when FastAPI shuts down
    if scheduler.running:
        scheduler.shutdown()

    print("Post scheduler stopped")


# ---------------------------------------------------------
# Create FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="SocialPilot API",
    description="Intelligent Social Media Scheduling and Multi-Platform Campaign Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Serve uploaded files publicly from the live application instance.
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


# ---------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Include routers
# ---------------------------------------------------------

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(social_accounts_router)
app.include_router(posts_router)
app.include_router(campaigns_router)
app.include_router(admin_router)


# ---------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to SocialPilot API",
        "timezone": "Asia/Kolkata"
    }


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timezone": "Asia/Kolkata"
    }