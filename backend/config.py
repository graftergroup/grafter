"""Configuration management for the application."""

import os
from datetime import timedelta
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Database - Use Neon connector
    DATABASE_URL: str = os.getenv(
        "DB8912C3F9_DATABASE_URL",
        os.getenv(
            "DATABASE_URL",
            "postgresql://user:password@localhost:5432/grafter_services",
        ),
    )

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "your-secret-key-change-in-production"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DELTA: timedelta = timedelta(hours=24)
    JWT_REFRESH_EXPIRATION_DELTA: timedelta = timedelta(days=7)

    # API Key Configuration
    API_KEYS_ENABLED: bool = True  # Enable static API key authentication

    # CORS Configuration
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Application
    APP_NAME: str = "Grafter Services API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    """Get the settings instance."""
    return Settings()
