from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis

from app.core.config import settings
from app.core.database import mongodb_container, redis_container, engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up database connections...")
    # Initialize MongoDB client
    try:
        mongodb_container.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=2000
        )
        print("MongoDB client initialized.")
    except Exception as e:
        print(f"Failed to initialize MongoDB: {e}")

    # Initialize Redis client
    try:
        redis_container.client = Redis.from_url(
            settings.redis_uri,
            decode_responses=True,
            socket_timeout=2.0
        )
        print("Redis client initialized.")
    except Exception as e:
        print(f"Failed to initialize Redis: {e}")

    yield

    # Shutdown
    print("Shutting down database connections...")
    if mongodb_container.client:
        mongodb_container.client.close()
        print("MongoDB client closed.")
    if redis_container.client:
        await redis_container.client.close()
        print("Redis client closed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Suitable for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    postgres_status = "healthy"
    mongodb_status = "healthy"
    redis_status = "healthy"

    # 1. Check PostgreSQL
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        postgres_status = f"unhealthy: {str(e)}"

    # 2. Check MongoDB
    try:
        if mongodb_container.client:
            # Ping database to verify active connection
            await mongodb_container.client.admin.command('ping')
        else:
            mongodb_status = "unhealthy: client not initialized"
    except Exception as e:
        mongodb_status = f"unhealthy: {str(e)}"

    # 3. Check Redis
    try:
        if redis_container.client:
            await redis_container.client.ping()
        else:
            redis_status = "unhealthy: client not initialized"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    is_healthy = (
        "unhealthy" not in postgres_status and
        "unhealthy" not in mongodb_status and
        "unhealthy" not in redis_status
    )

    status_code = 200 if is_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "unhealthy",
            "services": {
                "api": "healthy",
                "postgresql": postgres_status,
                "mongodb": mongodb_status,
                "redis": redis_status
            }
        }
    )


@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Visit {settings.API_V1_STR} or /docs for documentation."}
