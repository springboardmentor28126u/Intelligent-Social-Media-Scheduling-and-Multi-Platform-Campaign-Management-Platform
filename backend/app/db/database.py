from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

from pathlib import Path

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    if db_url.startswith("sqlite:///./"):
        backend_dir = Path(__file__).resolve().parent.parent.parent
        db_file = backend_dir / db_url.replace("sqlite:///./", "")
        db_url = f"sqlite:///{db_file.as_posix()}"
elif "ep-curly-sun-b3oq0tjg" in db_url:
    connect_args["hostaddr"] = "52.76.246.190"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()