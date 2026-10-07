import os

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from runtime_config import validate_environment
validate_environment()

cloud_database_url = os.getenv("DATABASE_URL")
DATABASE_URL = make_url(cloud_database_url)

# Cloud providers commonly supply either of these PostgreSQL URL schemes.
if DATABASE_URL.drivername in {"postgres", "postgresql"}:
    DATABASE_URL = DATABASE_URL.set(drivername="postgresql+psycopg")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
