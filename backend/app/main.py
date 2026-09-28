 Shalini-B-A
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, get_db
from app.services.seed_service import seed_database
from app.services.scheduler_service import SchedulerService
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.routers.auth import router as auth_router, login as auth_login, register as auth_register
from app.routers.users import router as users_router
from app.routers.posts import router as posts_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router
from app.routers.social_accounts import router as social_accounts_router
from app.routers.team import router as team_router
from app.routers.notifications import router as notifications_router
from app.routers.reports import router as reports_router
from app.routers.ai_assistant import router as ai_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create DB tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed initial realistic demo data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # 3. Start background post scheduler
    await SchedulerService.start()

    yield

    # 4. Graceful shutdown
    await SchedulerService.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="IntelliPost API - Plan. Post. Perform. Intelligent Social Media Management SaaS Backend",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(posts_router, prefix=settings.API_V1_STR)
app.include_router(campaigns_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(social_accounts_router, prefix=settings.API_V1_STR)
app.include_router(team_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)

# Root & Health check
@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Plan. Post. Perform.",
        "version": settings.VERSION,
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "OK",
        "service": "IntelliPost Backend",
        "database": "connected"
    }

# Backward-compatibility routes for direct /login and /register
@app.post("/login", response_model=Token, tags=["Authentication"])
def direct_login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return auth_login(login_data=login_data, db=db)

@app.post("/register", response_model=Token, tags=["Authentication"])
def direct_register(user_in: RegisterRequest, db: Session = Depends(get_db)):
    return auth_register(user_in=user_in, db=db)
from fastapi import FastAPI

app = FastAPI(
    title="Intelligent Social Media Platform",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Social Media Management API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
  main
