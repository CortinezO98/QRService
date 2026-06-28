"""
Application Configuration — Nuevo modelo de precios
FREE:     $0     — 1 QR/mes, renovación manual
STARTER:  $10/año — 5 QR totales
PRO:      $20/año — 15 QR totales
BUSINESS: $30/año — 30 QR totales
"""
from functools import lru_cache
from typing import List
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="forbid",
    )

    # ── App ───────────────────────────────────────────────────
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[AnyHttpUrl] = []
    BASE_URL: str = "http://localhost:8000"

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12

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
    RATE_LIMIT_PAID_PER_MINUTE: int = 60
    RATE_LIMIT_ANON_PER_MINUTE: int = 5

    # ── Plan: FREE ────────────────────────────────────────────
    FREE_PLAN_QR_QUOTA: int = 1          # 1 QR activo por mes
    FREE_PLAN_DURATION_DAYS: int = 30    # Debe renovar cada 30 días
    FREE_QR_EXPIRY_DAYS: int = 30        # El QR expira con la suscripción

    # ── Plan: STARTER — $10/año ───────────────────────────────
    STARTER_PLAN_QR_QUOTA: int = 5
    STARTER_PLAN_PRICE_USD: float = 10.00
    STARTER_PLAN_DURATION_DAYS: int = 365

    # ── Plan: PRO — $20/año ───────────────────────────────────
    PRO_PLAN_QR_QUOTA: int = 15
    PRO_PLAN_PRICE_USD: float = 20.00
    PRO_PLAN_DURATION_DAYS: int = 365

    # ── Plan: BUSINESS — $30/año ──────────────────────────────
    BUSINESS_PLAN_QR_QUOTA: int = 30
    BUSINESS_PLAN_PRICE_USD: float = 30.00
    BUSINESS_PLAN_DURATION_DAYS: int = 365

    # ── Stripe Price IDs ──────────────────────────────────────
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_STARTER_PRICE_ID: str
    STRIPE_PRO_PRICE_ID: str
    STRIPE_BUSINESS_PRICE_ID: str

    # ── Email ─────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@qrservice.com"
    EMAILS_FROM_NAME: str = "QR Service"

    # ── Sentry ────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Validators ────────────────────────────────────────────
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @model_validator(mode="after")
    def debug_not_in_production(self) -> "Settings":
        if self.ENVIRONMENT == "production" and self.DEBUG:
            raise ValueError("DEBUG must be False in production!")
        return self

    def get_plan_quota(self, plan: str) -> int:
        """Retorna cuota de QR según el plan."""
        return {
            "free":     self.FREE_PLAN_QR_QUOTA,
            "starter":  self.STARTER_PLAN_QR_QUOTA,
            "pro":      self.PRO_PLAN_QR_QUOTA,
            "business": self.BUSINESS_PLAN_QR_QUOTA,
        }.get(plan, 1)

    def get_plan_price(self, plan: str) -> float:
        return {
            "free":     0.00,
            "starter":  self.STARTER_PLAN_PRICE_USD,
            "pro":      self.PRO_PLAN_PRICE_USD,
            "business": self.BUSINESS_PLAN_PRICE_USD,
        }.get(plan, 0.00)

    def get_stripe_price_id(self, plan: str) -> str:
        return {
            "starter":  self.STRIPE_STARTER_PRICE_ID,
            "pro":      self.STRIPE_PRO_PRICE_ID,
            "business": self.STRIPE_BUSINESS_PRICE_ID,
        }.get(plan, "")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
