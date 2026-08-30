from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# ============================================================
# DATABASE SETTINGS
# ============================================================

DB_USER = "postgres"
DB_PASSWORD = "YourNewPassword"

DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_NAME = "socialpilot"


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = (
    f"postgresql+psycopg2://"
    f"{DB_USER}:{quote_plus(DB_PASSWORD)}@"
    f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ============================================================
# ENGINE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# ============================================================
# SESSION
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# BASE
# ============================================================

Base = declarative_base()


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# TEST CONNECTION
# ============================================================

def test_database_connection():
    try:
        with engine.connect():
            print("====================================")
            print("✅ PostgreSQL CONNECTED")
            print("✅ Database: socialpilot")
            print("====================================")

        return True

    except Exception as error:
        print("====================================")
        print("❌ PostgreSQL CONNECTION FAILED")
        print(error)
        print("====================================")

        return False


# ============================================================
# CREATE TABLES
# ============================================================

def create_tables():
    try:
        import models

        Base.metadata.create_all(bind=engine)

        print("====================================")
        print("✅ DATABASE TABLES CREATED")
        print("====================================")

    except Exception as error:
        print("====================================")
        print("❌ TABLE CREATION FAILED")
        print(error)
        print("====================================")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    if test_database_connection():
        create_tables()