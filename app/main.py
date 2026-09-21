from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    admin,
    auth,
    campaigns,
    media,
    posts,
    profile,
    publishing_logs,
    social_accounts,
    social_auth,

)

app = FastAPI(title="SocialPilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
app.include_router(campaigns.router)


@app.get("/")
def home():
    return {"message": "SocialPilot backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}