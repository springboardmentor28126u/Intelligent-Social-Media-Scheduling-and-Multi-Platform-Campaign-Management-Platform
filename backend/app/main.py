
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.social_accounts import router as social_accounts_router
from app.routers.posts import router as posts_router

from app.services.scheduler import start_scheduler, stop_scheduler


app = FastAPI(
    title="SocialPilot API",
    description="Social Media Scheduler & Campaign Management Platform",
    version="1.0.0"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(social_accounts_router)
app.include_router(posts_router)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Welcome to SocialPilot API"
    }


# Start scheduler when FastAPI starts
@app.on_event("startup")
def startup_event():
    start_scheduler()


# Stop scheduler when FastAPI shuts down
@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

