from sqlalchemy import text
from database import engine


def main():
    print("\n====================================")
    print("CHECKING FASTAPI DATABASE")
    print("====================================")

    with engine.begin() as connection:

        # 1. Show exactly which database FastAPI is using
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

        # 2. Check whether posts table exists
        result = connection.execute(
            text("""
                SELECT to_regclass('public.posts')
            """)
        )

        posts_table = result.scalar()

        print("Posts    :", posts_table)

        if posts_table is None:
            print("\nERROR: posts table does not exist in the database FastAPI uses.")
            return

        # 3. Check existing columns
        result = connection.execute(
            text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'posts'
                ORDER BY ordinal_position
            """)
        )

        columns = [row[0] for row in result.fetchall()]

        print("\nExisting columns:")
        for column in columns:
            print(" -", column)

        # 4. Add platforms if missing
        if "platforms" not in columns:
            print("\nAdding platforms column...")

            connection.execute(
                text("""
                    ALTER TABLE public.posts
                    ADD COLUMN platforms JSON
                """)
            )

        else:
            print("\nplatforms already exists.")

        # 5. Add content_type if missing
        if "content_type" not in columns:
            print("Adding content_type column...")

            connection.execute(
                text("""
                    ALTER TABLE public.posts
                    ADD COLUMN content_type VARCHAR(50)
                """)
            )

        else:
            print("content_type already exists.")

        # 6. Fill existing rows
        connection.execute(
            text("""
                UPDATE public.posts
                SET platforms = '[]'
                WHERE platforms IS NULL
            """)
        )

        connection.execute(
            text("""
                UPDATE public.posts
                SET content_type = 'text'
                WHERE content_type IS NULL
            """)
        )

        # 7. Make both columns required
        connection.execute(
            text("""
                ALTER TABLE public.posts
                ALTER COLUMN platforms SET NOT NULL
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE public.posts
                ALTER COLUMN content_type SET NOT NULL
            """)
        )

        # 8. Verify
        result = connection.execute(
            text("""
                SELECT
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'posts'
                  AND column_name IN ('platforms', 'content_type')
                ORDER BY column_name
            """)
        )

        print("\n====================================")
        print("FINAL CHECK")
        print("====================================")

        for row in result.fetchall():
            print(
                f"Column: {row[0]} | "
                f"Type: {row[1]} | "
                f"Nullable: {row[2]}"
            )

        print("\nSUCCESS: posts table updated.")


if __name__ == "__main__":
    main()
    