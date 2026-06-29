"""
API v1 Router — Registra todos los endpoints
Sprint 3: Agrega campaigns.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, billing, campaigns, oauth, qr, redirect

api_router = APIRouter()

api_router.include_router(auth.router,      prefix="/auth",      tags=["auth"])
api_router.include_router(oauth.router,     prefix="/auth",      tags=["oauth"])
api_router.include_router(qr.router,        prefix="/qr",        tags=["qr"])
api_router.include_router(billing.router,   prefix="/billing",   tags=["billing"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(redirect.router,  tags=["redirect"])
