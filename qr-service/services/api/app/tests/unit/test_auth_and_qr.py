"""
Unit Tests — Auth Service
SWEBOK v4: Software Testing — Unit Testing
Coverage target: >85%
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.scalar = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ── Password Hashing Tests ────────────────────────────────────

class TestPasswordHashing:
    def test_hash_password_is_not_plain(self):
        from app.services.auth_service import hash_password
        hashed = hash_password("MyPass123!")
        assert hashed != "MyPass123!"

    def test_verify_correct_password(self):
        from app.services.auth_service import hash_password, verify_password
        hashed = hash_password("MyPass123!")
        assert verify_password("MyPass123!", hashed) is True

    def test_verify_wrong_password(self):
        from app.services.auth_service import hash_password, verify_password
        hashed = hash_password("MyPass123!")
        assert verify_password("WrongPass!", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt salt ensures hashes differ — prevents rainbow tables."""
        from app.services.auth_service import hash_password
        h1 = hash_password("MyPass123!")
        h2 = hash_password("MyPass123!")
        assert h1 != h2


# ── JWT Tests ─────────────────────────────────────────────────

class TestJWT:
    def test_create_and_decode_access_token(self):
        from app.services.auth_service import create_access_token, decode_access_token
        user_id = uuid4()
        email = "test@example.com"
        token = create_access_token(user_id, email)
        payload = decode_access_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
        assert payload["type"] == "access"

    def test_tampered_token_rejected(self):
        from app.services.auth_service import create_access_token, decode_access_token
        from app.core.exceptions import TokenExpiredException
        token = create_access_token(uuid4(), "test@example.com")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(TokenExpiredException):
            decode_access_token(tampered)

    def test_expired_token_rejected(self):
        from app.services.auth_service import decode_access_token
        from app.core.exceptions import TokenExpiredException
        from jose import jwt
        from app.core.config import settings
        from datetime import datetime, timezone, timedelta
        payload = {
            "sub": str(uuid4()),
            "email": "test@example.com",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "type": "access",
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        with pytest.raises(TokenExpiredException):
            decode_access_token(expired_token)


# ── Password Strength Tests ───────────────────────────────────

class TestPasswordStrength:
    def test_weak_password_rejected(self):
        from app.services.auth_service import AuthService
        from app.core.exceptions import WeakPasswordException
        with pytest.raises(WeakPasswordException):
            AuthService._validate_password_strength("password")

    def test_no_uppercase_rejected(self):
        from app.services.auth_service import AuthService
        from app.core.exceptions import WeakPasswordException
        with pytest.raises(WeakPasswordException):
            AuthService._validate_password_strength("mypass123!")

    def test_no_digit_rejected(self):
        from app.services.auth_service import AuthService
        from app.core.exceptions import WeakPasswordException
        with pytest.raises(WeakPasswordException):
            AuthService._validate_password_strength("MyPassword!")

    def test_strong_password_accepted(self):
        from app.services.auth_service import AuthService
        # Should not raise
        AuthService._validate_password_strength("MyPass123!")


# ── URL Validation Tests (Security Critical) ──────────────────

class TestURLValidation:
    def setup_method(self):
        from unittest.mock import AsyncMock
        self.qr_service = object.__new__(__import__("app.services.qr_service", fromlist=["QRService"]).QRService)

    def test_valid_https_url_accepted(self):
        from app.services.qr_service import QRService
        svc = object.__new__(QRService)
        svc._validate_url("https://example.com/page")  # Should not raise

    def test_javascript_url_rejected(self):
        """OWASP: XSS via javascript: protocol."""
        from app.services.qr_service import QRService
        from app.core.exceptions import InvalidURLException
        svc = object.__new__(QRService)
        with pytest.raises(InvalidURLException):
            svc._validate_url("javascript:alert('xss')")

    def test_localhost_rejected(self):
        """OWASP: SSRF via localhost."""
        from app.services.qr_service import QRService
        from app.core.exceptions import InvalidURLException
        svc = object.__new__(QRService)
        with pytest.raises(InvalidURLException):
            svc._validate_url("http://localhost:8080/admin")

    def test_private_ip_rejected(self):
        """OWASP: SSRF via private IP."""
        from app.services.qr_service import QRService
        from app.core.exceptions import InvalidURLException
        svc = object.__new__(QRService)
        with pytest.raises(InvalidURLException):
            svc._validate_url("http://192.168.1.1/secrets")

    def test_data_url_rejected(self):
        """OWASP: data: protocol abuse."""
        from app.services.qr_service import QRService
        from app.core.exceptions import InvalidURLException
        svc = object.__new__(QRService)
        with pytest.raises(InvalidURLException):
            svc._validate_url("data:text/html,<h1>hack</h1>")

    def test_internal_ip_127_rejected(self):
        from app.services.qr_service import QRService
        from app.core.exceptions import InvalidURLException
        svc = object.__new__(QRService)
        with pytest.raises(InvalidURLException):
            svc._validate_url("http://127.0.0.1/admin")


# ── Subscription Limit Tests ──────────────────────────────────

class TestSubscriptionLimits:
    @pytest.mark.asyncio
    async def test_free_plan_enforces_limit(self, mock_db):
        """Free users cannot exceed FREE_PLAN_QR_LIMIT."""
        from app.services.qr_service import QRService
        from app.core.exceptions import QRLimitExceededException
        from app.models.models import SubscriptionPlan, Subscription, SubscriptionStatus
        from datetime import datetime, timezone, timedelta
        from unittest.mock import AsyncMock, MagicMock

        svc = QRService(mock_db)

        # Mock: 5 QR codes already exist (at limit)
        mock_result = MagicMock()
        mock_result.scalars.return_value.one.return_value = 5
        mock_db.scalar.return_value = 5

        sub = Subscription()
        sub.plan = SubscriptionPlan.FREE
        sub.status = SubscriptionStatus.ACTIVE
        sub.expires_at = datetime.now(timezone.utc) + timedelta(days=10)

        with pytest.raises(QRLimitExceededException):
            await svc._enforce_limits(uuid4(), sub)

    @pytest.mark.asyncio
    async def test_annual_plan_no_limit(self, mock_db):
        """Annual users have no QR limit."""
        from app.services.qr_service import QRService
        from app.models.models import SubscriptionPlan, Subscription, SubscriptionStatus
        from datetime import datetime, timezone, timedelta

        svc = QRService(mock_db)
        sub = Subscription()
        sub.plan = SubscriptionPlan.ANNUAL
        sub.status = SubscriptionStatus.ACTIVE
        sub.expires_at = datetime.now(timezone.utc) + timedelta(days=365)

        # Should NOT raise, even with 1000 QR codes
        await svc._enforce_limits(uuid4(), sub)


# ── Webhook Signature Tests ───────────────────────────────────

class TestWebhookSecurity:
    @pytest.mark.asyncio
    async def test_invalid_signature_rejected(self, mock_db):
        """OWASP: A08 – Webhook without valid sig must be rejected."""
        from app.services.billing_service import BillingService
        from app.core.exceptions import WebhookSignatureException

        svc = BillingService(mock_db)
        with pytest.raises(WebhookSignatureException):
            await svc.handle_webhook(b'{"type":"test"}', "invalid_signature")
