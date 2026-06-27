# QR-as-a-Service

A production-grade QR code generation API built with **FastAPI**, **Docker**, and **PostgreSQL**.  
Follows **SWEBOK v4** engineering principles and **OWASP Top 10** security guidelines throughout.

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Internet                    │
                    └──────────────────┬──────────────────────┘
                                       │ HTTPS (TLS 1.3)
                    ┌──────────────────▼──────────────────────┐
                    │   Nginx (Rate Limit + Security Headers)  │
                    └──────┬───────────────────────┬──────────┘
                           │                       │
               ┌───────────▼───────────┐ ┌─────────▼──────────┐
               │   FastAPI API (x4)    │ │  QR Redirect /r/   │
               └───────────┬───────────┘ └─────────┬──────────┘
                           │                       │
          ┌────────────────┼───────────────────────┤
          │                │                       │
  ┌───────▼──────┐ ┌───────▼──────┐ ┌─────────────▼───────┐
  │  PostgreSQL  │ │    Redis     │ │   Celery Worker      │
  │  (Primary)   │ │  (Cache +   │ │  (Async Tasks:       │
  │              │ │   Queue)    │ │   Emails, Expire)    │
  └──────────────┘ └─────────────┘ └─────────────────────-┘
```

---

## Features

| Feature | Free Plan (30 days) | Annual Plan ($49.99/year) |
|---------|:-------------------:|:-------------------------:|
| QR Codes | Up to 5 | Unlimited |
| Custom Colors | ✅ | ✅ |
| Custom Style | ✅ | ✅ |
| Scan Analytics | ❌ | ✅ |
| Custom Logo | ❌ | ✅ |
| API Rate Limit | 10 req/min | 100 req/min |
| Support | Community | Priority |

---

## Security Controls (OWASP Top 10)

| OWASP Risk | Control Applied |
|------------|----------------|
| A01 Broken Access Control | All QR queries scoped by `user_id`; ownership verified on every request |
| A02 Cryptographic Failures | bcrypt (rounds=12) for passwords; JWT HS256 for access tokens; tokens stored as SHA-256 hashes |
| A03 Injection | SQLAlchemy ORM (parameterized queries); Pydantic strict validation on all inputs |
| A04 Insecure Design | Subscription limits enforced in domain layer; constant-time password comparison |
| A05 Security Misconfiguration | Security headers via middleware; Nginx hardening; no server version leak |
| A06 Vulnerable Components | `safety` scans deps on every CI run; Trivy scans Docker image |
| A07 Auth Failures | Refresh token rotation; JWT short expiry (30m); rate limiting on auth endpoints |
| A08 Data Integrity | Stripe webhook signature verification required; no unsigned webhooks processed |
| A09 Logging Failures | Structured JSON logs (structlog); request ID tracing; audit log on all sensitive actions |
| A10 SSRF | URL validation rejects localhost, private IPs, non-HTTP schemes before QR creation |

---

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- `make` (optional, for shortcuts)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/qr-service.git
cd qr-service

# Copy and fill environment variables
cp .env.example .env
# Edit .env — generate keys with:
openssl rand -hex 32   # SECRET_KEY
openssl rand -base64 32  # POSTGRES_PASSWORD, REDIS_PASSWORD
```

### 2. Start development environment

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Run database migrations

```bash
docker compose exec api alembic upgrade head
```

### 4. Verify

```bash
curl http://localhost/health
# {"status":"healthy","version":"1.0.0"}

# API docs (dev only)
open http://localhost/docs
```

---

## Development

### Setup pre-commit hooks

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files  # Run once to check everything
```

### Run tests

```bash
# Unit tests only (fast, no DB required)
cd services/api
pytest app/tests/unit/ -v --cov=app --cov-report=term-missing

# All tests (requires running DB + Redis)
pytest app/tests/ -v --cov=app --cov-fail-under=85
```

### Security scans

```bash
# SAST scan
bandit -r app/ -ll

# Dependency vulnerabilities
safety check -r requirements.txt

# Secrets detection
detect-secrets scan > .secrets.baseline
```

---

## API Reference

### Authentication

```bash
# Register
POST /api/v1/auth/register
{"email": "user@example.com", "password": "MyPass123!", "full_name": "John Doe"}

# Login
POST /api/v1/auth/login
{"email": "user@example.com", "password": "MyPass123!"}
# Returns: {"access_token": "...", "refresh_token": "...", "expires_in": 1800}

# Refresh
POST /api/v1/auth/refresh
{"refresh_token": "..."}
```

### QR Codes

```bash
# Create QR code
POST /api/v1/qr/
Authorization: Bearer <access_token>
{
  "destination_url": "https://example.com",
  "title": "My Campaign QR",
  "style": {
    "foreground_color": "#1a1a2e",
    "background_color": "#ffffff",
    "module_style": "rounded",
    "error_correction": "H"
  }
}

# Download QR image
GET /api/v1/qr/{id}/image?format=png
Authorization: Bearer <access_token>

# Scan analytics (Annual plan only)
GET /api/v1/qr/{id}/analytics
Authorization: Bearer <access_token>
```

### Billing

```bash
# Create checkout session (upgrade to Annual)
POST /api/v1/billing/checkout
Authorization: Bearer <access_token>
# Returns: {"checkout_url": "https://checkout.stripe.com/..."}
```

---

## Versioning Strategy

This project follows **Semantic Versioning 2.0.0** and **Conventional Commits**:

```
MAJOR.MINOR.PATCH
  │     │     └── Bug fixes, security patches
  │     └──────── New features (backward compatible)
  └────────────── Breaking API changes

Commit format: type(scope): description
  feat(qr): add SVG export format
  fix(auth): prevent timing attack in login
  security(billing): verify webhook signatures
  docs(api): update OpenAPI schema for v2
```

---

## SWEBOK v4 Compliance Checklist

- [x] **Requirements Engineering** — Business rules as domain constants; use cases documented
- [x] **Software Design** — Layered architecture (API → Service → Repository → DB); DTOs separate from models
- [x] **Software Construction** — Type hints throughout; no magic strings; Pydantic validation at boundaries
- [x] **Software Testing** — Unit, integration, E2E; ≥85% coverage enforced in CI
- [x] **Software Maintenance** — Alembic migrations; structured logging; health checks
- [x] **Configuration Management** — Git Flow; Semantic Versioning; Conventional Commits; pre-commit hooks
- [x] **Software Quality** — Ruff linting; mypy type checking; Bandit SAST; Safety dependency scan
- [x] **Software Security** — OWASP Top 10 mitigated; Trivy container scan; secrets detection
- [x] **Software Operations** — Docker multi-stage builds; Prometheus metrics; Grafana dashboards

---

## License

MIT License — see [LICENSE](LICENSE)
