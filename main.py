
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import (
    admin,
    auth,
    campaigns,
    media,
    notifications,
    posts,
    profile,
    publishing_logs,
    social_accounts,
    social_auth,
    teams,
)

app = FastAPI(title="SocialPilot API")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(posts.router)
app.include_router(media.router)
app.include_router(social_accounts.router)
app.include_router(social_auth.router)
app.include_router(publishing_logs.router)
app.include_router(admin.router)

# These three routers fix the missing API paths
app.include_router(campaigns.router)
app.include_router(notifications.router)
app.include_router(teams.router)


@app.get("/")
def home():
    return {"message": "SocialPilot backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
