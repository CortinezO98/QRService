"""
API v1 Router
SWEBOK v4: Software Design — Modular routing by bounded context
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, billing, qr, redirect

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(qr.router, prefix="/qr", tags=["QR Codes"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(redirect.router, tags=["Redirect"])