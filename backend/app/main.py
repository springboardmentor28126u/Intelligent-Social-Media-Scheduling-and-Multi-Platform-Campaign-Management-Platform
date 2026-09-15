from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.social_accounts import router as social_accounts_router
from app.routers.posts import router as posts_router

from app.services.scheduler import scheduler


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
app.include_router(social_accounts_router)
app.include_router(posts_router)


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