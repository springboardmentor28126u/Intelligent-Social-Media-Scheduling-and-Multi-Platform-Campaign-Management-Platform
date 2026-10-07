# app/db/database_pg.py
#
# This file's ONE job: set up the async connection to the shared Supabase
# Postgres database, separate from Mongo's database.py. Posts and
# publishing data will use this; auth keeps using database.py untouched.

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import uuid

from app.core.config import settings


# Base class that all our Postgres table models (Post, PublishingLog) will
# inherit from. SQLAlchemy uses this to know what tables to create.
class Base(DeclarativeBase):
    pass


# PgBouncer (Supabase pooler, transaction mode) doesn't support prepared
# statements, so we turn off asyncpg's statement cache and give any
# prepared statement a unique name to avoid name collisions.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
    },
)

# A factory that hands out new database "sessions" (think: a single
# conversation with the database — open it, do some queries, close it).
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


# FastAPI dependency: any route that needs to talk to Postgres will do
# `db: AsyncSession = Depends(get_db)` and get one of these sessions,
# automatically closed when the request finishes.
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# Simple startup check — call this from main.py's startup event, same
# idea as your existing ping_database() for Mongo.
async def ping_postgres() -> bool:
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    return True