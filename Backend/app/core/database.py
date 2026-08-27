from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis

from app.core.config import settings

# --- PostgreSQL Setup ---
engine = create_engine(
    settings.postgres_uri,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- MongoDB Setup ---
class MongoDBContainer:
    client: AsyncIOMotorClient = None

mongodb_container = MongoDBContainer()

def get_mongodb():
    """Helper dependency to get MongoDB database instance"""
    if mongodb_container.client is None:
        raise RuntimeError("MongoDB client is not initialized.")
    return mongodb_container.client[settings.MONGODB_DB]


# --- Redis Setup ---
class RedisContainer:
    client: Redis = None

redis_container = RedisContainer()

def get_redis() -> Redis:
    """Helper dependency to get Redis client"""
    if redis_container.client is None:
        raise RuntimeError("Redis client is not initialized.")
    return redis_container.client
