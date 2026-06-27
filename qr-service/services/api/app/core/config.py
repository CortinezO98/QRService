"""
Application Configuration — Security-first settings
SWEBOK v4: Software Configuration Management
OWASP: Secrets Management
"""
from functools import lru_cache
from typing import List
from pydantic import (
    AnyHttpUrl,
    PostgresDsn,
    RedisDsn,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All settings loaded from environment variables.
    NO hardcoded secrets. EVER. (OWASP A02:2021 – Cryptographic Failures)
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="forbid",  # Fail fast on unknown env vars
    )

    # ── App ───────────────────────────────────────────────────
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[AnyHttpUrl] = []

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str                           # Min 32 chars, generated with: openssl rand -hex 32
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12                   # OWASP: min 10 rounds

    # ── Database ──────────────────────────────────────────────
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # ── Redis ─────────────────────────────────────────────────
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str

    @property
    def REDIS_URL(self) -> str:
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/1"

    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_FREE_PER_MINUTE: int = 10
    RATE_LIMIT_ANNUAL_PER_MINUTE: int = 100
    RATE_LIMIT_ANON_PER_MINUTE: int = 5

    # ── QR Service ────────────────────────────────────────────
    FREE_PLAN_QR_LIMIT: int = 5
    FREE_PLAN_DURATION_DAYS: int = 30
    ANNUAL_PLAN_DURATION_DAYS: int = 365
    ANNUAL_PLAN_PRICE_USD: float = 49.99
    BASE_URL: str = "http://localhost:8000"   # For short-link redirects

    # ── Stripe ────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_ANNUAL_PRICE_ID: str

    # ── Email ─────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@qrservice.com"

    # ── Sentry ────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Validators ────────────────────────────────────────────
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters (use: openssl rand -hex 32)")
        return v

    @field_validator("BCRYPT_ROUNDS")
    @classmethod
    def bcrypt_rounds_minimum(cls, v: int) -> int:
        if v < 10:
            raise ValueError("BCRYPT_ROUNDS must be >= 10 (OWASP recommendation)")
        return v

    @model_validator(mode="after")
    def debug_not_in_production(self) -> "Settings":
        if self.ENVIRONMENT == "production" and self.DEBUG:
            raise ValueError("DEBUG must be False in production!")
        return self


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — singleton pattern."""
    return Settings()


settings = get_settings()
