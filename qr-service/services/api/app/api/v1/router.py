"""
API v1 Router — Aggregates all endpoint routers
SWEBOK v4: Software Design — Modular decomposition
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, billing, qr, redirect

api_router = APIRouter()

# ── Auth ──────────────────────────────────────────────────────
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# ── QR Codes ──────────────────────────────────────────────────
api_router.include_router(
    qr.router,
    prefix="/qr",
    tags=["QR Codes"],
)

# ── Billing ───────────────────────────────────────────────────
api_router.include_router(
    billing.router,
    prefix="/billing",
    tags=["Billing & Subscriptions"],
)

# ── Public Redirect (mounted at root, not /api/v1) ───────────
# Note: redirect is registered directly on the app in main.py
# This export is kept for reference
redirect_router = redirect.router
