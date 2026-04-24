"""
📁 apps/backend/app/core/config.py
🎯 Configuración centralizada del backend con variables de entorno (Pydantic BaseSettings).
📦 Capa: Core / Infraestructura
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- App ---
    PROJECT_NAME: str = "SafeCampus PUCP"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # Frontend web (Next.js)
        "http://localhost:8081",  # Frontend móvil (Expo)
    ]

    # --- Database ---
    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    # --- Auth / JWT ---
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-safecampus-secret-key-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # --- Integraciones externas ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GOOGLE_MAPS_API_KEY: str = ""
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # --- Gmail OAuth2 ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Supabase Auth ---
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    ALLOWED_INSTITUTIONAL_DOMAIN: str = "pucp.edu.pe"
    DEFAULT_COMMUNITY_ROLE_ID: str = "0c21c807-e3d3-4daa-b67f-b8929b3ac10d"

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Exige DSN async de PostgreSQL y SSL para conexión remota segura."""
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL debe iniciar con 'postgresql+asyncpg://'.")
        if "ssl=require" not in value and "sslmode=require" not in value:
            raise ValueError("DATABASE_URL debe exigir SSL (agrega '?ssl=require').")
        return value

    @field_validator("ALLOWED_INSTITUTIONAL_DOMAIN")
    @classmethod
    def normalize_domain(cls, value: str) -> str:
        return value.strip().lower()

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "case_sensitive": True}


settings = Settings()
