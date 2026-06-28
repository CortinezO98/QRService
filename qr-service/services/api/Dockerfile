# ============================================================
# Multi-stage Dockerfile — QR Service API
# SWEBOK v4: Software Construction + Security
# OWASP: Container Security Best Practices
# ============================================================

# ── Stage 1: Base ────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Non-root user (OWASP Container Security)
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# ── Stage 2: Dependencies ────────────────────────────────────
FROM base AS dependencies

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Development ─────────────────────────────────────
FROM dependencies AS development

RUN pip install --no-cache-dir -r requirements-dev.txt

COPY --chown=appuser:appgroup . .
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Stage 4: Testing ─────────────────────────────────────────
FROM development AS testing

RUN pip install --no-cache-dir -r requirements-dev.txt
RUN python -m pytest tests/ --cov=app --cov-report=xml --cov-fail-under=85

# ── Stage 5: Production ───────────────────────────────────────
FROM base AS production

# Only runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy only installed packages (no build tools)
COPY --from=dependencies /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

COPY --chown=appuser:appgroup app/ ./app/
COPY --chown=appuser:appgroup alembic.ini ./
COPY --chown=appuser:appgroup alembic/ ./alembic/

# Fix: dar ownership completo a appuser sin restringir permisos de ejecución
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "app.main:app", \
        "-k", "uvicorn.workers.UvicornWorker", \
        "-w", "4", "--bind", "0.0.0.0:8000", \
        "--timeout", "30", "--keep-alive", "5", \
        "--access-logfile", "-", "--error-logfile", "-"]