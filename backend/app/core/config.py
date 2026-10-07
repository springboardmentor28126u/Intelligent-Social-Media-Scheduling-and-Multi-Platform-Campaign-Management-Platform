# app/core/config.py
#
# This file's ONE job: safely read secrets from the .env file (your locked
# recipe safe) and make them available to the rest of the app as clean,
# typed Python variables — instead of scattering "os.environ" calls
# everywhere in the codebase.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # This tells pydantic-settings: "go read the .env file sitting next
    # to this project, and match its variable names to the fields below."
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # This MUST match the variable name in your .env file exactly:
    # MONGODB_URL=mongodb+srv://...
    MONGODB_URL: str

    # New: JWT settings, used to create and verify login "wristbands"
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # New: the shared Supabase Postgres connection string. Posts and
    # publishing data will live here instead of MongoDB. Auth (MONGODB_URL
    # above) is untouched and keeps working exactly as before.
    DATABASE_URL: str
    # LinkedIn OAuth settings, read from .env (never hardcode these)
    LINKEDIN_CLIENT_ID: str
    LINKEDIN_CLIENT_SECRET: str
    LINKEDIN_REDIRECT_URI: str

# We create ONE instance of Settings here, so the rest of the app can just
# do: `from app.core.config import settings` and use `settings.MONGODB_URL`
# — instead of every file re-reading the .env file separately.
settings = Settings()