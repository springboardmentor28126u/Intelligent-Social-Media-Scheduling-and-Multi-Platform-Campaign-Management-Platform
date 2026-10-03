import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base


# ============================================================
# LOAD .ENV
# ============================================================

load_dotenv()


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is missing from your .env file"
    )


# ============================================================
# DATABASE ENGINE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# ============================================================
# CHECK WHICH DATABASE WE ARE CONNECTED TO
# ============================================================

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    current_database(),
                    current_user,
                    current_schema(),
                    inet_server_addr()
            """)
        )

        row = result.fetchone()

        print("====================================")
        print("DATABASE CONNECTION DETAILS")
        print("====================================")
        print("Database:", row[0] if row else "N/A")
        print("User:", row[1] if row else "N/A")
        print("Schema:", row[2] if row else "N/A")
        print("Server:", row[3] if row else "N/A")
        print("====================================")
except Exception as e:
    print("====================================")
    print("DATABASE INFO: Could not connect to remote PostgreSQL during startup check.")
    print("Detail:", str(e))
    print("====================================")


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