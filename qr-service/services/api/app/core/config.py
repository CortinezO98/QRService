"""
Settings — Pydantic v2 Settings Management
SWEBOK v4: Software Configuration Management
OWASP A05: Security Misconfiguration Prevention
Sprint 1: Eliminado STRIPE_ANNUAL_PRICE_ID, agregados por plan.
          FRONTEND_URL para cookies OAuth y redirects.
"""
import json
from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # ── App ───────────────────────────────────────────────────
    APP_VERSION: str = "2.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    BCRYPT_ROUNDS: int = 12

    # ── CORS / Hosts ──────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5200", "http://localhost:3000"]
    ALLOWED_HOSTS: List[str] = ["*"]

    # ── URLs ──────────────────────────────────────────────────
    BASE_URL: str = "http://localhost:7000"
    FRONTEND_URL: str = "http://localhost:5200"

    # ── PostgreSQL ────────────────────────────────────────────
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "qr_service"
    POSTGRES_USER: str = "qr_user"
    POSTGRES_PASSWORD: str

    # ── Redis ─────────────────────────────────────────────────
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # ── Stripe — modelo 4 planes ──────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_STARTER_PRICE_ID: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_BUSINESS_PRICE_ID: str = ""

    # ── OAuth Google ──────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:7000/api/v1/auth/google/callback"

    # ── OAuth Facebook ────────────────────────────────────────
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    FACEBOOK_REDIRECT_URI: str = "http://localhost:7000/api/v1/auth/facebook/callback"

    # ── Email ─────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.sendgrid.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@qrservice.com"
    EMAILS_FROM_NAME: str = "QR Service"

    # ── Planes FREE ───────────────────────────────────────────
    FREE_PLAN_QR_QUOTA: int = 1
    FREE_PLAN_DURATION_DAYS: int = 30

    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_ANON_PER_MINUTE: int = 20
    RATE_LIMIT_FREE_PER_MINUTE: int = 60

    # ── Sentry ────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Computed ──────────────────────────────────────────────

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def CELERY_BROKER_URL(self) -> str:
        return self.REDIS_URL

    # ── Stripe helpers ────────────────────────────────────────

    _STRIPE_PRICE_MAP = {
        "starter":  "STRIPE_STARTER_PRICE_ID",
        "pro":      "STRIPE_PRO_PRICE_ID",
        "business": "STRIPE_BUSINESS_PRICE_ID",
    }

    _PLAN_PRICES = {
        "starter":  10.00,
        "pro":      20.00,
        "business": 30.00,
    }

    _PLAN_QUOTAS = {
        "starter":  5,
        "pro":      15,
        "business": 30,
    }

    def get_stripe_price_id(self, plan: str) -> str:
        attr = self._STRIPE_PRICE_MAP.get(plan)
        if not attr:
            raise ValueError(f"Unknown plan: {plan}")
        return getattr(self, attr)

    def get_plan_price(self, plan: str) -> float:
        return self._PLAN_PRICES.get(plan, 0.0)

    def get_plan_quota(self, plan: str) -> int:
        return self._PLAN_QUOTAS.get(plan, 0)

    # ── Validators ────────────────────────────────────────────

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
