import os
from typing import List
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        PROJECT_NAME: str = "SocialPilot"
        PROJECT_DESCRIPTION: str = "Intelligent Social Media Scheduling & Management SaaS Platform"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api"
        
        # Security & JWT
        SECRET_KEY: str = os.getenv("SECRET_KEY", "socialpilot_super_secret_jwt_key_98374289347293847293")
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
        
        # Database (defaults to SQLite for zero-config out of the box, switches to PostgreSQL when set)
        DATABASE_URL: str = os.getenv(
            "DATABASE_URL", 
            "sqlite:///./socialpilot.db"
        )
        
        # CORS
        BACKEND_CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "*"
        ]
        
        # AI Engine Settings
        OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

        class Config:
            case_sensitive = True
            extra = "allow"
except ImportError:
    class Settings:
        PROJECT_NAME: str = "SocialPilot"
        PROJECT_DESCRIPTION: str = "Intelligent Social Media Scheduling & Management SaaS Platform"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api"
        
        # Security & JWT
        SECRET_KEY: str = os.getenv("SECRET_KEY", "socialpilot_super_secret_jwt_key_98374289347293847293")
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
        
        # Database
        DATABASE_URL: str = os.getenv(
            "DATABASE_URL", 
            "sqlite:///./socialpilot.db"
        )
        
        # CORS
        BACKEND_CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "*"
        ]
        
        OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
