"""
FastAPI Dependencies
SWEBOK v4: Software Construction — Dependency Injection
OWASP A01: Broken Access Control — todas las rutas privadas pasan por aquí

Cambios Sprint 1:
- Eliminado require_annual_plan (modelo viejo $49.99)
- Agregado require_paid_plan (acepta STARTER/PRO/BUSINESS)
- get_current_user lee access_token desde cookie O header Authorization
"""
from datetime import datetime, timezone
from typing import Annotated, Optional

import structlog
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    InvalidCredentialsException,
    SubscriptionExpiredException,
    TokenExpiredException,
)
from app.db.session import get_db
from app.models.models import Subscription, SubscriptionPlan, SubscriptionStatus, User
from app.services.auth_service import decode_access_token

logger = structlog.get_logger(__name__)

# Bearer scheme (opcional — cookie tiene prioridad)
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    access_token: Optional[str] = Cookie(default=None),
) -> User:
    """
    Extrae y valida el access token.
    Prioridad: 1) Cookie HttpOnly  2) Header Authorization Bearer
    OWASP A07: Token validado antes de cualquier operación.
    """
    token: Optional[str] = None

    # 1. Cookie HttpOnly (producción, OAuth, frontend)
    if access_token:
        token = access_token
    # 2. Header Bearer (API directa, desarrollo, tests)
    elif credentials and credentials.credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "NOT_AUTHENTICATED", "message": "Autenticación requerida."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
    except (InvalidCredentialsException, TokenExpiredException):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_INVALID", "message": "Token inválido o expirado."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_MALFORMED", "message": "Token sin identificador de usuario."},
        )

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "USER_INACTIVE", "message": "Usuario no encontrado o inactivo."},
        )

    # Bind user_id al contexto de logging para trazabilidad
    structlog.contextvars.bind_contextvars(user_id=str(user.id))
    return user


async def require_active_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """
    Verifica que el usuario tenga suscripción activa (cualquier plan).
    Lanza 402 si la suscripción venció.
    """
    now = datetime.now(timezone.utc)
    sub = await db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        ).order_by(Subscription.expires_at.desc())
    )

    if not sub:
        logger.warning("subscription_expired", user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "SUBSCRIPTION_EXPIRED",
                "message": (
                    "Tu suscripción ha vencido. "
                    "Renuévala gratis o elige un plan de pago para continuar."
                ),
                "renew_url": "/api/v1/billing/renew-free",
                "checkout_url": "/api/v1/billing/checkout",
            },
        )
    return sub


async def require_paid_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """
    Verifica que el usuario tenga un plan de pago activo (STARTER/PRO/BUSINESS).
    Reemplaza el obsoleto require_annual_plan ($49.99 / plan 'annual').

    Uso: analytics avanzados, logo personalizado, etc.
    """
    now = datetime.now(timezone.utc)
    paid_plans = [SubscriptionPlan.STARTER, SubscriptionPlan.PRO, SubscriptionPlan.BUSINESS]

    sub = await db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.plan.in_(paid_plans),
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        ).order_by(Subscription.expires_at.desc())
    )

    if not sub:
        logger.warning("paid_plan_required", user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "PAID_PLAN_REQUIRED",
                "message": "Esta función requiere un plan de pago (Starter, Pro o Business).",
                "upgrade_url": "/api/v1/billing/checkout",
                "plans": [
                    {"plan": "starter", "price_usd": 10, "qr_quota": 5},
                    {"plan": "pro", "price_usd": 20, "qr_quota": 15},
                    {"plan": "business", "price_usd": 30, "qr_quota": 30},
                ],
            },
        )
    return sub


async def require_verified_email(
    current_user: User = Depends(get_current_user),
) -> User:
    """Exige que el usuario haya verificado su email."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "EMAIL_NOT_VERIFIED",
                "message": "Debes verificar tu correo electrónico para continuar.",
            },
        )
    return current_user


# ── Annotated aliases ─────────────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveSubscription = Annotated[Subscription, Depends(require_active_subscription)]
PaidSubscription = Annotated[Subscription, Depends(require_paid_plan)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
