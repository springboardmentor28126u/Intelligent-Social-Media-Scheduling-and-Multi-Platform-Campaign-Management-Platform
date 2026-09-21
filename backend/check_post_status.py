from sqlalchemy import text
from database import engine


with engine.connect() as connection:
    print("\n====================================")
    print("POST STATUS ENUM CHECK")
    print("====================================")

    result = connection.execute(
        text("""
            SELECT
                current_database(),
                current_user,
                current_schema()
        """)
    )

    row = result.fetchone()

    print("Database :", row[0])
    print("User     :", row[1])
    print("Schema   :", row[2])

    result = connection.execute(
        text("""
            SELECT
                t.typname AS enum_name,
                e.enumlabel AS enum_value
            FROM pg_type t
            JOIN pg_enum e
                ON t.oid = e.enumtypid
            WHERE t.typname = 'post_status'
            ORDER BY e.enumsortorder
        """)
    )

    values = result.fetchall()

    print("\npost_status values:")

    for row in values:
        print(" -", row[1])

    print("====================================")