"""
📁 apps/backend/app/core/config.py
🎯 Configuración centralizada del backend con variables de entorno (Pydantic BaseSettings).
📦 Capa: Core / Infraestructura
"""

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


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
    SESSION_COOKIE_NAME: str = "safecampus_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_DOMAIN: str | None = None
    WEB_APP_URL: str = "http://localhost:3000"
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"

    # --- Integraciones externas ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GOOGLE_MAPS_API_KEY: str = ""
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # --- Gmail OAuth2 ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Supabase Auth / User Sync ---
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    ALLOWED_INSTITUTIONAL_DOMAIN: str
    DEFAULT_COMMUNITY_ROLE_ID: str

    # --- Dev allowlist (excepción a ALLOWED_INSTITUTIONAL_DOMAIN) ---
    # Lista separada por comas de correos puntuales (típicamente @gmail.com de devs)
    # autorizados a iniciar sesión. Debe quedar vacío en producción.
    DEV_ALLOWED_EMAILS: str = ""

    @property
    def dev_allowed_emails_set(self) -> set[str]:
        return {
            value.strip().lower()
            for value in self.DEV_ALLOWED_EMAILS.split(",")
            if value.strip()
        }

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Exige DSN async de PostgreSQL y SSL para conexión remota segura."""
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL debe iniciar con 'postgresql+asyncpg://'.")
        if "ssl=require" not in value and "sslmode=require" not in value:
            raise ValueError("DATABASE_URL debe exigir SSL (agrega '?ssl=require').")
        return value

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="forbid",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return init_settings, dotenv_settings, env_settings, file_secret_settings


settings = Settings()
