from database import engine
from sqlalchemy import text

with engine.connect() as connection:

    result = connection.execute(
        text("SELECT to_regclass('public.alembic_version')")
    )

    print("alembic_version =", result.scalar())

    result = connection.execute(
        text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
    )

    print("tables:")

    for row in result.fetchall():
        print(" -", row[0])