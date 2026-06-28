"""
Shared pytest fixtures
SWEBOK v4: Software Testing — Test Infrastructure
"""
import os
import pytest

# ── Force test environment ────────────────────────────────────
# Must be set BEFORE any app imports
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters-ok")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_password")
os.environ.setdefault("REDIS_HOST", "localhost")
os.environ.setdefault("REDIS_PASSWORD", "")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake_key_for_testing")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_fake_webhook_secret")
os.environ.setdefault("STRIPE_ANNUAL_PRICE_ID", "price_fake_annual")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')
os.environ.setdefault("ALLOWED_HOSTS", '["*"]')


@pytest.fixture(autouse=True)
def reset_settings_cache():
    """Clear settings cache between tests to allow env var overrides."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
