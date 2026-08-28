from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.routes.profile import router as profile_router

from app.core.config import settings
from app.database.session import engine
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router


app = FastAPI(
    title=settings.app_name,
    description="Social Media Scheduler & Campaign Management Platform",
    version="0.1.0",
)


# Authentication routes
app.include_router(auth_router)

# Admin routes
app.include_router(admin_router)
app.include_router(profile_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": f"{settings.app_name} API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


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

    return {"status": "ok", "database": "connected"}