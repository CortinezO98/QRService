"""
API v1 Router — con OAuth incluido
Reemplaza el router.py existente
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, billing, qr, redirect, oauth

api_router = APIRouter()

# ── Auth (email/password) ─────────────────────────────────────
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# ── OAuth (Google, Facebook) ──────────────────────────────────
api_router.include_router(
    oauth.router,
    prefix="/auth",
    tags=["OAuth Social Login"],
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

redirect_router = redirect.router
