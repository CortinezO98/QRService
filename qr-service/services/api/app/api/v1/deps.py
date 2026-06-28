"""
FastAPI Dependencies — Reusable guards and injectors
SWEBOK v4: Software Design — Dependency Injection Pattern
OWASP: A01 Broken Access Control — Centralized auth enforcement

Usage in endpoints:
    current_user: User = Depends(get_current_user)
    sub: Subscription = Depends(require_active_subscription)
    annual: Subscription = Depends(require_annual_plan)
"""
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, status
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

# ── HTTP Bearer scheme ────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


# ── Core Auth Dependency ──────────────────────────────────────

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode JWT, validate, and return the authenticated User.
    OWASP A01: Every protected endpoint MUST use this dependency.
    Raises HTTP 401 on any auth failure — generic message (no info leak).
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "Authentication required."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except (TokenExpiredException, InvalidCredentialsException):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_INVALID", "message": "Invalid or expired token."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "TOKEN_INVALID", "message": "Malformed token payload."},
        )

    user = await db.scalar(
        select(User).where(User.id == user_id, User.is_active == True)
    )

    if not user:
        # User was deleted or deactivated after token was issued
        logger.warning("auth_user_not_found_or_inactive", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "USER_INACTIVE", "message": "Account not found or deactivated."},
        )

    # Bind user context to structured logs for this request
    structlog.contextvars.bind_contextvars(user_id=str(user.id))

    return user


# ── Subscription Dependencies ─────────────────────────────────

async def get_active_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription | None:
    """
    Return the user's active subscription or None.
    Does NOT raise — use require_active_subscription for enforcement.
    """
    now = datetime.now(timezone.utc)
    return await db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        ).order_by(Subscription.expires_at.desc())
    )


async def require_active_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """
    Enforce that the user has an active (non-expired) subscription.
    Raises HTTP 402 if expired or missing.
    Used as a guard on endpoints that require any valid plan.
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
        logger.warning("subscription_required_but_missing", user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "SUBSCRIPTION_REQUIRED",
                "message": "Your subscription has expired or is inactive. Please renew.",
                "upgrade_url": "/api/v1/billing/checkout",
            },
        )

    return sub


async def require_annual_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """
    Enforce that the user has an ANNUAL plan.
    Raises HTTP 403 if on FREE plan.
    Used for analytics, custom logos, and premium features.
    """
    now = datetime.now(timezone.utc)
    sub = await db.scalar(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.plan == SubscriptionPlan.ANNUAL,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        )
    )

    if not sub:
        logger.warning("annual_plan_required", user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "ANNUAL_PLAN_REQUIRED",
                "message": "This feature requires an Annual subscription.",
                "upgrade_url": "/api/v1/billing/checkout",
                "price_usd": 49.99,
            },
        )

    return sub


async def require_verified_email(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Enforce that the user has verified their email.
    Can be applied to sensitive operations.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email address to continue.",
            },
        )
    return current_user


# ── Type Aliases (for cleaner endpoint signatures) ────────────
CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveSubscription = Annotated[Subscription, Depends(require_active_subscription)]
AnnualSubscription = Annotated[Subscription, Depends(require_annual_plan)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
