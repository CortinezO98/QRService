# ============================================================
# Makefile — Developer shortcuts
# SWEBOK v4: Software Configuration Management
# ============================================================

.PHONY: help up down dev logs shell migrate test test-unit test-int lint security

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────────
up: ## Start all services (production mode)
	docker compose up -d

down: ## Stop all services
	docker compose down

dev: ## Start in development mode (hot-reload, tools exposed)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

dev-build: ## Rebuild and start in dev mode
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

logs: ## Follow API logs
	docker compose logs -f api worker scheduler

logs-all: ## Follow all service logs
	docker compose logs -f

shell: ## Open shell in API container
	docker compose exec api bash

ps: ## Show running containers
	docker compose ps

# ── Database ──────────────────────────────────────────────────
migrate: ## Run Alembic migrations
	docker compose exec api alembic upgrade head

migrate-rollback: ## Rollback last migration
	docker compose exec api alembic downgrade -1

migrate-status: ## Show migration status
	docker compose exec api alembic current

migrate-history: ## Show migration history
	docker compose exec api alembic history

# ── Testing ───────────────────────────────────────────────────
test: ## Run all tests with coverage
	docker compose exec api pytest app/tests/ -v

test-unit: ## Run unit tests only (fast, no DB)
	docker compose exec api pytest app/tests/unit/ -v -m unit

test-int: ## Run integration tests
	docker compose exec api pytest app/tests/integration/ -v -m integration

test-e2e: ## Run E2E tests
	docker compose exec api pytest app/tests/e2e/ -v -m e2e

test-cov: ## Run tests and open HTML coverage report
	docker compose exec api pytest app/tests/ --cov=app --cov-report=html
	open services/api/htmlcov/index.html

# ── Code Quality ──────────────────────────────────────────────
lint: ## Run ruff linter
	docker compose exec api ruff check app/

format: ## Auto-format code
	docker compose exec api ruff format app/

typecheck: ## Run mypy type checker
	docker compose exec api mypy app/ --ignore-missing-imports

# ── Security ──────────────────────────────────────────────────
security: ## Run all security scans
	docker compose exec api bandit -r app/ -ll -x app/tests
	docker compose exec api safety check -r requirements.txt

secrets-scan: ## Scan for hardcoded secrets
	detect-secrets scan > .secrets.baseline
	detect-secrets audit .secrets.baseline

# ── Setup ─────────────────────────────────────────────────────
setup: ## First-time setup: copy env, install hooks
	cp .env.example .env
	@echo "⚠️  Edit .env and fill in your secrets before continuing!"
	pip install pre-commit
	pre-commit install
	@echo "✅ Pre-commit hooks installed"

generate-secrets: ## Generate secure values for .env
	@echo "SECRET_KEY=$$(openssl rand -hex 32)"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
	@echo "GRAFANA_PASSWORD=$$(openssl rand -base64 16 | tr -d '/+=')"