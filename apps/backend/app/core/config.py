"""
📁 apps/backend/app/core/config.py
🎯 Configuración centralizada del backend con variables de entorno (Pydantic BaseSettings).
📦 Capa: Core / Infraestructura
"""

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)


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
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 2
    DATABASE_POOL_TIMEOUT_SECONDS: int = 30
    DATABASE_POOL_RECYCLE_SECONDS: int = 300

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
    LLM_PROVIDER: str = "openai"
    LLM_TIMEOUT_SECONDS: int = 15
    LLM_MAX_ATTEMPTS: int = 3
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_MAX_TOKENS: int = 3000
    CHATBOT_ENABLED: bool = True
    CHATBOT_AUTO_CREATE_INCIDENTS: bool = True
    CHATBOT_SYSTEM_USER_ID: str = ""
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_PROVIDER: str = "evolution"
    WHATSAPP_ALLOWED_TEST_PHONES: str = ""
    WHATSAPP_IGNORE_GROUP_MESSAGES: bool = True
    EVOLUTION_API_URL: str = "http://localhost:8080"
    EVOLUTION_API_KEY: str = ""
    EVOLUTION_INSTANCE_NAME: str = "safecampus-dev"
    EVOLUTION_WEBHOOK_SECRET: str = ""
    META_WHATSAPP_TOKEN: str = ""
    META_WHATSAPP_PHONE_NUMBER_ID: str = ""
    META_WHATSAPP_VERIFY_TOKEN: str = ""
    META_WHATSAPP_APP_SECRET: str = ""

    # --- Google OAuth (login vía Supabase Auth) ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Correo / Notificaciones (Resend) ---
    EMAIL_ENABLED: bool = False
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    RESEND_FROM_NAME: str = "SafeCampus PUCP"

    # --- Supabase Auth / User Sync ---
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    ALLOWED_INSTITUTIONAL_DOMAIN: str
    DEFAULT_COMMUNITY_ROLE_ID: str

    # --- Supabase Storage (evidencias de incidentes) ---
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "evidencias"

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

    @property
    def whatsapp_allowed_test_phones_set(self) -> set[str]:
        return {
            "".join(char for char in value if char.isdigit())
            for value in self.WHATSAPP_ALLOWED_TEST_PHONES.split(",")
            if "".join(char for char in value if char.isdigit())
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

    @field_validator("LLM_PROVIDER")
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"openai", "gemini"}:
            raise ValueError("LLM_PROVIDER debe ser 'openai' o 'gemini'.")
        return normalized

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
