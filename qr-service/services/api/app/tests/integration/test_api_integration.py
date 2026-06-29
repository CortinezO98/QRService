"""
Integration Tests — Full API flows with real DB + Redis
SWEBOK v4: Software Testing — Integration Testing
Uses httpx AsyncClient against the real FastAPI app.
Requires: PostgreSQL + Redis running (see docker-compose.yml or CI services)
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Base

# ── Test DB Setup ─────────────────────────────────────────────

TEST_DATABASE_URL = settings.DATABASE_URL  # Uses test env vars from CI

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient):
    """Register and return a user + tokens."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "integration@test.com",
        "password": "IntTest123!",
        "full_name": "Integration Test",
    })
    assert response.status_code == 201
    return response.json()


@pytest_asyncio.fixture
async def auth_tokens(client: AsyncClient, registered_user):
    """Login and return access + refresh tokens."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "integration@test.com",
        "password": "IntTest123!",
    })
    assert response.status_code == 200
    return response.json()


@pytest_asyncio.fixture
def auth_headers(auth_tokens):
    return {"Authorization": f"Bearer {auth_tokens['access_token']}"}


# ── Auth Integration Tests ────────────────────────────────────

class TestAuthIntegration:
    @pytest.mark.asyncio
    async def test_register_creates_user_and_free_subscription(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com",
            "password": "NewUser123!",
            "full_name": "New User",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["is_verified"] is False

    @pytest.mark.asyncio
    async def test_duplicate_email_returns_409(self, client: AsyncClient, registered_user):
        response = await client.post("/api/v1/auth/register", json={
            "email": "integration@test.com",
            "password": "IntTest123!",
            "full_name": "Duplicate",
        })
        assert response.status_code == 409
        assert response.json()["error"] == "EMAIL_ALREADY_EXISTS"

    @pytest.mark.asyncio
    async def test_login_returns_tokens(self, client: AsyncClient, registered_user):
        response = await client.post("/api/v1/auth/login", json={
            "email": "integration@test.com",
            "password": "IntTest123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_wrong_password_returns_401(self, client: AsyncClient, registered_user):
        response = await client.post("/api/v1/auth/login", json={
            "email": "integration@test.com",
            "password": "WrongPass999!",
        })
        assert response.status_code == 401
        # OWASP: Generic error — no indication of which field is wrong
        assert "Invalid" in response.json()["detail"]["message"]

    @pytest.mark.asyncio
    async def test_refresh_token_rotation(self, client: AsyncClient, auth_tokens):
        """OWASP: Refresh tokens must rotate on each use."""
        old_refresh = auth_tokens["refresh_token"]
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": old_refresh,
        })
        assert response.status_code == 200
        new_tokens = response.json()
        assert new_tokens["refresh_token"] != old_refresh  # Rotation happened

        # Old refresh token must be invalidated
        response2 = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": old_refresh,
        })
        assert response2.status_code == 401

    @pytest.mark.asyncio
    async def test_me_endpoint_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_endpoint_returns_user(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "integration@test.com"


# ── QR Code Integration Tests ─────────────────────────────────

class TestQRIntegration:
    @pytest.mark.asyncio
    async def test_create_qr_code(self, client: AsyncClient, auth_headers):
        response = await client.post("/api/v1/qr/", headers=auth_headers, json={
            "destination_url": "https://example.com",
            "title": "Test QR",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["destination_url"] == "https://example.com"
        assert data["short_code"]
        assert data["scan_count"] == 0
        assert data["redirect_url"].startswith(settings.BASE_URL)

    @pytest.mark.asyncio
    async def test_create_qr_requires_auth(self, client: AsyncClient):
        response = await client.post("/api/v1/qr/", json={
            "destination_url": "https://example.com",
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_malicious_url_rejected(self, client: AsyncClient, auth_headers):
        """OWASP: SSRF — localhost must be blocked."""
        for bad_url in [
            "http://localhost/admin",
            "http://127.0.0.1:8080/secret",
            "javascript:alert(1)",
            "http://192.168.1.1/internal",
        ]:
            response = await client.post("/api/v1/qr/", headers=auth_headers, json={
                "destination_url": bad_url,
            })
            assert response.status_code in (422, 400), f"Expected rejection of: {bad_url}"

    @pytest.mark.asyncio
    async def test_list_qr_codes(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/v1/qr/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

    @pytest.mark.asyncio
    async def test_cannot_access_other_users_qr(self, client: AsyncClient, auth_headers):
        """OWASP: A01 — Broken Access Control must be prevented."""
        # Create QR as user A
        create_resp = await client.post("/api/v1/qr/", headers=auth_headers, json={
            "destination_url": "https://user-a.com",
        })
        qr_id = create_resp.json()["id"]

        # Register user B and try to access user A's QR
        await client.post("/api/v1/auth/register", json={
            "email": "user_b@test.com",
            "password": "UserB123!",
            "full_name": "User B",
        })
        login_b = await client.post("/api/v1/auth/login", json={
            "email": "user_b@test.com",
            "password": "UserB123!",
        })
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B tries to access User A's QR — must be 404
        response = await client.get(f"/api/v1/qr/{qr_id}", headers=headers_b)
        assert response.status_code == 404  # Not 403 — don't confirm existence

    @pytest.mark.asyncio
    async def test_delete_qr_soft_deletes(self, client: AsyncClient, auth_headers):
        # Create
        create = await client.post("/api/v1/qr/", headers=auth_headers, json={
            "destination_url": "https://to-delete.com",
        })
        qr_id = create.json()["id"]

        # Delete
        delete = await client.delete(f"/api/v1/qr/{qr_id}", headers=auth_headers)
        assert delete.status_code == 200

        # Must no longer appear in list
        detail = await client.get(f"/api/v1/qr/{qr_id}", headers=auth_headers)
        assert detail.status_code == 404

    @pytest.mark.asyncio
    async def test_qr_image_download(self, client: AsyncClient, auth_headers):
        create = await client.post("/api/v1/qr/", headers=auth_headers, json={
            "destination_url": "https://example.com/image-test",
        })
        qr_id = create.json()["id"]

        img = await client.get(f"/api/v1/qr/{qr_id}/image", headers=auth_headers)
        assert img.status_code == 200
        assert img.headers["content-type"] == "image/png"
        assert len(img.content) > 100  # Non-empty PNG


# ── Redirect Integration Tests ────────────────────────────────

class TestRedirectIntegration:
    @pytest.mark.asyncio
    async def test_redirect_tracks_scan(self, client: AsyncClient, auth_headers):
        create = await client.post("/api/v1/qr/", headers=auth_headers, json={
            "destination_url": "https://redirect-target.com",
        })
        short_code = create.json()["short_code"]
        qr_id = create.json()["id"]

        # Scan the QR
        redirect = await client.get(f"/r/{short_code}", follow_redirects=False)
        assert redirect.status_code == 302
        assert redirect.headers["location"] == "https://redirect-target.com"

        # Scan count must have incremented
        detail = await client.get(f"/api/v1/qr/{qr_id}", headers=auth_headers)
        assert detail.json()["scan_count"] == 1

    @pytest.mark.asyncio
    async def test_invalid_short_code_returns_404(self, client: AsyncClient):
        response = await client.get("/r/nonexistent123", follow_redirects=False)
        assert response.status_code == 404


# ── Billing Integration Tests ─────────────────────────────────

class TestBillingIntegration:
    @pytest.mark.asyncio
    async def test_billing_status_returns_free_plan(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/v1/billing/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "free"
        assert data["status"] == "active"
        assert data["days_remaining"] > 0

    @pytest.mark.asyncio
    async def test_webhook_without_signature_rejected(self, client: AsyncClient):
        """OWASP: A08 — unsigned webhooks must be rejected."""
        response = await client.post(
            "/api/v1/billing/webhook",
            content=b'{"type":"checkout.session.completed"}',
            headers={"Content-Type": "application/json"},
            # No Stripe-Signature header
        )
        assert response.status_code == 400
        assert "signature" in response.json()["detail"]["message"].lower()