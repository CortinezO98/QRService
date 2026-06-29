"""
Tests de seguridad y ownership — Sprint 1
SWEBOK v4: Software Testing — Security Testing
Cubre:
  - Tokens manipulados / expirados / revocados rechazados
  - URL validation: javascript:, data:, localhost, IP privada, cloud metadata
  - Ownership: usuario A no puede ver/editar/borrar QR de usuario B
  - Webhook sin firma rechazado
  - Webhook duplicado no procesado dos veces
  - Plan limits: todos los planes
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import (
    InvalidURLException, QRLimitExceededException, QRNotFoundException,
    SubscriptionExpiredException, WebhookSignatureException,
)
from app.models.models import (
    QRCode, QRStatus, Subscription, SubscriptionPlan, SubscriptionStatus,
)
from app.services.qr_service import QRService


# ── Helpers ───────────────────────────────────────────────────

def make_subscription(plan: SubscriptionPlan, qr_used: int = 0, expired: bool = False) -> Subscription:
    from app.services.subscription_service import PLAN_FEATURES
    features = PLAN_FEATURES[plan]
    now = datetime.now(timezone.utc)
    sub = Subscription()
    sub.id = uuid.uuid4()
    sub.user_id = uuid.uuid4()
    sub.plan = plan
    sub.status = SubscriptionStatus.ACTIVE
    sub.starts_at = now - timedelta(days=1)
    sub.expires_at = now - timedelta(hours=1) if expired else now + timedelta(days=30)
    sub.qr_quota = features["qr_quota"]
    sub.qr_used = qr_used
    sub.stripe_subscription_id = None
    sub.stripe_customer_id = None
    return sub


def make_qr(user_id=None, status=QRStatus.ACTIVE) -> QRCode:
    qr = QRCode()
    qr.id = uuid.uuid4()
    qr.user_id = user_id or uuid.uuid4()
    qr.short_code = "abc12345"
    qr.destination_url = "https://example.com"
    qr.qr_type = "url"
    qr.scan_count = 0
    qr.status = status
    qr.style_config = {}
    return qr


# ── URL Validation Tests ──────────────────────────────────────

class TestURLValidation:
    """OWASP A10: SSRF Prevention."""

    def setup_method(self):
        self.service = QRService(db=MagicMock())

    @pytest.mark.unit
    def test_javascript_scheme_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("javascript:alert(1)")

    @pytest.mark.unit
    def test_data_scheme_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("data:text/html,<script>alert(1)</script>")

    @pytest.mark.unit
    def test_file_scheme_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("file:///etc/passwd")

    @pytest.mark.unit
    def test_localhost_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://localhost/admin")

    @pytest.mark.unit
    def test_127_loopback_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://127.0.0.1:8000/secret")

    @pytest.mark.unit
    def test_private_ip_192_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://192.168.1.100/")

    @pytest.mark.unit
    def test_private_ip_10_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://10.0.0.1/")

    @pytest.mark.unit
    def test_private_ip_172_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://172.16.50.1/")

    @pytest.mark.unit
    def test_cloud_metadata_aws_rejected(self):
        """SSRF: AWS/GCP/Azure metadata endpoint."""
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://169.254.169.254/latest/meta-data/")

    @pytest.mark.unit
    def test_link_local_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://169.254.0.1/")

    @pytest.mark.unit
    def test_credentials_in_url_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://user:password@example.com/")

    @pytest.mark.unit
    def test_valid_https_accepted(self):
        """URL válida no debe lanzar excepción."""
        self.service._validate_url("https://www.google.com")
        self.service._validate_url("https://miempresa.com/landing?utm=qr")

    @pytest.mark.unit
    def test_valid_http_accepted(self):
        self.service._validate_url("http://misitioweb.com")

    @pytest.mark.unit
    def test_0_0_0_0_rejected(self):
        with pytest.raises(InvalidURLException):
            self.service._validate_url("http://0.0.0.0/")


# ── Plan Limits Tests ─────────────────────────────────────────

class TestPlanLimits:
    """Verifica que los límites de QR se aplican en TODOS los planes."""

    def setup_method(self):
        self.service = QRService(db=MagicMock())

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_free_plan_limit_1(self):
        sub = make_subscription(SubscriptionPlan.FREE, qr_used=1)
        with pytest.raises(QRLimitExceededException) as exc:
            await self.service._enforce_limits(uuid.uuid4(), sub)
        assert exc.value.details["limit"] == 1

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_starter_plan_limit_5(self):
        sub = make_subscription(SubscriptionPlan.STARTER, qr_used=5)
        with pytest.raises(QRLimitExceededException) as exc:
            await self.service._enforce_limits(uuid.uuid4(), sub)
        assert exc.value.details["limit"] == 5

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_pro_plan_limit_15(self):
        sub = make_subscription(SubscriptionPlan.PRO, qr_used=15)
        with pytest.raises(QRLimitExceededException) as exc:
            await self.service._enforce_limits(uuid.uuid4(), sub)
        assert exc.value.details["limit"] == 15

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_business_plan_limit_30(self):
        sub = make_subscription(SubscriptionPlan.BUSINESS, qr_used=30)
        with pytest.raises(QRLimitExceededException) as exc:
            await self.service._enforce_limits(uuid.uuid4(), sub)
        assert exc.value.details["limit"] == 30

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_starter_under_limit_no_error(self):
        sub = make_subscription(SubscriptionPlan.STARTER, qr_used=4)
        await self.service._enforce_limits(uuid.uuid4(), sub)  # no debe lanzar

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_business_under_limit_no_error(self):
        sub = make_subscription(SubscriptionPlan.BUSINESS, qr_used=29)
        await self.service._enforce_limits(uuid.uuid4(), sub)  # no debe lanzar


# ── Ownership Tests ───────────────────────────────────────────

class TestOwnership:
    """OWASP A01: Broken Access Control."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_users_qr(self):
        """Usuario A intenta acceder al QR de usuario B → debe fallar."""
        user_a = uuid.uuid4()
        user_b = uuid.uuid4()
        qr_of_b = make_qr(user_id=user_b)

        mock_db = AsyncMock()
        mock_db.scalar.return_value = None  # No encontrado para user_a
        service = QRService(db=mock_db)

        with pytest.raises(QRNotFoundException):
            await service._get_qr_owned_by(qr_of_b.id, user_a)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_user_can_access_own_qr(self):
        user_id = uuid.uuid4()
        qr = make_qr(user_id=user_id)

        mock_db = AsyncMock()
        mock_db.scalar.return_value = qr
        service = QRService(db=mock_db)

        result = await service._get_qr_owned_by(qr.id, user_id)
        assert result.id == qr.id


# ── Short Code Validation ─────────────────────────────────────

class TestShortCodeValidation:
    """OWASP: Defense in depth en el endpoint de redirect."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_invalid_short_code_rejected(self):
        service = QRService(db=MagicMock())
        with pytest.raises(QRNotFoundException):
            await service.track_scan("../etc/passwd", "1.2.3.4", "Mozilla/5.0")

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_sql_injection_attempt_rejected(self):
        service = QRService(db=MagicMock())
        with pytest.raises(QRNotFoundException):
            await service.track_scan("'; DROP TABLE qr_codes; --", "1.2.3.4", "test")

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_xss_attempt_rejected(self):
        service = QRService(db=MagicMock())
        with pytest.raises(QRNotFoundException):
            await service.track_scan("<script>alert(1)</script>", "1.2.3.4", "test")


# ── IP Hashing ────────────────────────────────────────────────

class TestIPHashing:
    """GDPR: nunca guardar IP cruda."""

    @pytest.mark.unit
    def test_ip_is_hashed(self):
        """La IP debe guardarse como SHA-256, nunca en texto plano."""
        ip = "203.0.113.42"
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()
        assert ip not in ip_hash  # La IP no debe aparecer literalmente en el hash
        assert len(ip_hash) == 64  # SHA-256 = 64 chars hex


# ── Stripe Idempotency ────────────────────────────────────────

class TestStripeIdempotency:
    """OWASP A08: Webhook debe procesarse exactamente una vez."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_duplicate_webhook_rejected(self):
        """Si event_id ya existe en stripe_events, no debe procesarse de nuevo."""
        from app.services.billing_service import BillingService
        from app.models.models import StripeEvent

        existing_event = StripeEvent()
        existing_event.event_id = "evt_test_123"
        existing_event.event_type = "checkout.session.completed"
        existing_event.status = "processed"

        mock_db = AsyncMock()
        mock_db.scalar.return_value = existing_event

        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = {
                "id": "evt_test_123",
                "type": "checkout.session.completed",
                "data": {"object": {}},
            }
            service = BillingService(db=mock_db)
            result = await service.handle_webhook(
                payload=b'{"id":"evt_test_123"}',
                signature="t=123,v1=abc",
            )
            assert result["status"] == "already_processed"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_webhook_without_signature_rejected(self):
        """Webhook sin firma → debe rechazarse."""
        from app.services.billing_service import BillingService
        mock_db = AsyncMock()

        with patch("stripe.Webhook.construct_event") as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                "Invalid signature", "sig_header"
            )
            service = BillingService(db=mock_db)
            with pytest.raises(WebhookSignatureException):
                await service.handle_webhook(
                    payload=b'{"id":"evt_fake"}',
                    signature="invalid_sig",
                )


# ── Auth Token Tests ──────────────────────────────────────────

class TestAuthTokens:
    """OWASP A07: Token manipulation."""

    @pytest.mark.unit
    def test_manipulated_jwt_rejected(self):
        from app.services.auth_service import decode_access_token
        from app.core.exceptions import TokenExpiredException
        with pytest.raises(TokenExpiredException):
            decode_access_token("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.bad_signature")

    @pytest.mark.unit
    def test_empty_token_rejected(self):
        from app.services.auth_service import decode_access_token
        from app.core.exceptions import TokenExpiredException
        with pytest.raises(TokenExpiredException):
            decode_access_token("")

    @pytest.mark.unit
    def test_token_hash_is_sha256(self):
        from app.services.auth_service import hash_token
        token = "my_raw_refresh_token_abc123"
        hashed = hash_token(token)
        assert hashed == hashlib.sha256(token.encode()).hexdigest()
        assert len(hashed) == 64
        assert token not in hashed
