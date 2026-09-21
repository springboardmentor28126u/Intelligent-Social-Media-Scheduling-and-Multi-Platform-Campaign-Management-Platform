import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import text

from alembic import context

# Make backend folder available to Python
sys.path.append(os.getcwd())

# Import database configuration
from database import DATABASE_URL, Base

# Import models so Alembic can detect all SQLAlchemy models
import models  # noqa: F401


# Alembic configuration object
config = context.config

# Use DATABASE_URL from database.py
config.set_main_option("sqlalchemy.url", DATABASE_URL)


# Configure logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# SQLAlchemy metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations without opening a database connection.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations using a live database connection.
    """

    connectable = engine_from_config(
        config.get_section(
            config.config_ini_section,
            {}
        ),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        # -----------------------------------------
        # DATABASE DEBUG INFORMATION
        # -----------------------------------------

        print("====================================")
        print("ALEMBIC DATABASE CHECK")
        print("====================================")

        result = connection.execute(
            text("""
                SELECT
                    current_database(),
                    current_user,
                    current_schema(),
                    to_regclass('public.alembic_version')
            """)
        )

        row = result.fetchone()

        print("Database:", row[0])
        print("User:", row[1])
        print("Schema:", row[2])
        print("Alembic table:", row[3])
        print("====================================")

        # -----------------------------------------
        # ALEMBIC MIGRATION CONFIGURATION
        # -----------------------------------------

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        # -----------------------------------------
        # RUN MIGRATIONS
        # -----------------------------------------

        with context.begin_transaction():
            context.run_migrations()


# -----------------------------------------
# START ALEMBIC
# -----------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()