"""
E2E Tests — Complete User Journey
SWEBOK v4: Software Testing — System Testing / Acceptance Testing
Tests the full product flow a real user would experience.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.core.config import settings


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestCompleteUserJourney:
    """
    Full E2E: Register → Create QR (Free) → Hit limit → Upgrade → Unlimited QR
    SWEBOK v4: Acceptance Testing — Business scenario coverage
    """

    @pytest.mark.asyncio
    async def test_full_freemium_to_paid_journey(self, client: AsyncClient):
        """
        Scenario:
        1. User registers → gets FREE plan (30 days, 5 QR)
        2. Creates 5 QR codes (hits limit)
        3. 6th QR code is rejected with upgrade prompt
        4. Simulates Stripe payment → Annual plan activated
        5. Can now create unlimited QR codes
        6. Analytics available only after upgrade
        """
        email = "e2e_journey@test.com"

        # ── Step 1: Register ──────────────────────────────────
        reg = await client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "E2EJourney123!",
            "full_name": "E2E User",
        })
        assert reg.status_code == 201, f"Register failed: {reg.json()}"

        # ── Step 2: Login ─────────────────────────────────────
        login = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "E2EJourney123!",
        })
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # ── Step 3: Verify FREE plan ──────────────────────────
        status = await client.get("/api/v1/billing/status", headers=headers)
        assert status.status_code == 200
        assert status.json()["plan"] == "free"
        assert status.json()["days_remaining"] >= 29

        # ── Step 4: Create 5 QR codes (fill free limit) ──────
        qr_ids = []
        for i in range(5):
            r = await client.post("/api/v1/qr/", headers=headers, json={
                "destination_url": f"https://example.com/page-{i}",
                "title": f"QR {i+1}",
            })
            assert r.status_code == 201, f"QR {i+1} creation failed: {r.json()}"
            qr_ids.append(r.json()["id"])

        # ── Step 5: 6th QR must be rejected ──────────────────
        limit_hit = await client.post("/api/v1/qr/", headers=headers, json={
            "destination_url": "https://example.com/sixth",
        })
        assert limit_hit.status_code == 403
        detail = limit_hit.json()["detail"]
        assert detail["error"] == "QR_LIMIT_EXCEEDED"
        assert "upgrade_url" in detail  # User shown upgrade path

        # ── Step 6: Analytics denied on FREE plan ─────────────
        analytics = await client.get(f"/api/v1/qr/{qr_ids[0]}/analytics", headers=headers)
        assert analytics.status_code == 403
        assert "Annual" in analytics.json()["detail"]["message"]

        # ── Step 7: Simulate Stripe payment (webhook) ─────────
        # In real tests, use Stripe's test webhooks. Here we mock the service.
        with patch("app.services.billing_service.stripe.Webhook.construct_event") as mock_event:
            mock_event.return_value = {
                "type": "checkout.session.completed",
                "id": "evt_test_123",
                "data": {
                    "object": {
                        "id": "cs_test_123",
                        "customer": "cus_test_123",
                        "subscription": "sub_test_annual_123",
                        "amount_total": 4999,
                        "metadata": {"user_id": reg.json()["id"]},
                    }
                }
            }
            with patch("app.services.billing_service.stripe.Subscription.retrieve") as mock_sub:
                mock_sub.return_value = {"id": "sub_test_annual_123", "status": "active"}
                webhook = await client.post(
                    "/api/v1/billing/webhook",
                    content=b'{"type":"checkout.session.completed"}',
                    headers={
                        "Content-Type": "application/json",
                        "Stripe-Signature": "t=1,v1=fake",
                    },
                )
                assert webhook.status_code == 200

        # ── Step 8: Verify Annual plan is now active ──────────
        # Re-login to get fresh token with updated subscription
        login2 = await client.post("/api/v1/auth/login", json={
            "email": email, "password": "E2EJourney123!",
        })
        headers2 = {"Authorization": f"Bearer {login2.json()['access_token']}"}

        status2 = await client.get("/api/v1/billing/status", headers=headers2)
        assert status2.json()["plan"] == "annual"
        assert status2.json()["days_remaining"] >= 364

        # ── Step 9: Can create more QR codes (6th, 7th...) ───
        for i in range(5, 8):
            r = await client.post("/api/v1/qr/", headers=headers2, json={
                "destination_url": f"https://example.com/annual-{i}",
            })
            assert r.status_code == 201, f"Annual QR {i} failed: {r.json()}"

        # ── Step 10: Analytics now available ─────────────────
        analytics2 = await client.get(
            f"/api/v1/qr/{qr_ids[0]}/analytics",
            headers=headers2,
        )
        assert analytics2.status_code == 200
        assert "total_scans" in analytics2.json()

    @pytest.mark.asyncio
    async def test_qr_scan_tracking_journey(self, client: AsyncClient):
        """
        Scenario: Create QR → Scan multiple times → Verify analytics
        """
        # Register fresh user
        await client.post("/api/v1/auth/register", json={
            "email": "scan_journey@test.com",
            "password": "ScanTest123!",
            "full_name": "Scan Tester",
        })
        login = await client.post("/api/v1/auth/login", json={
            "email": "scan_journey@test.com", "password": "ScanTest123!",
        })
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # Create QR
        qr = await client.post("/api/v1/qr/", headers=headers, json={
            "destination_url": "https://scan-target.com",
        })
        short_code = qr.json()["short_code"]
        qr_id = qr.json()["id"]

        # Simulate 3 scans from different "IPs"
        for _ in range(3):
            r = await client.get(f"/r/{short_code}", follow_redirects=False)
            assert r.status_code == 302

        # Verify count
        detail = await client.get(f"/api/v1/qr/{qr_id}", headers=headers)
        assert detail.json()["scan_count"] == 3
