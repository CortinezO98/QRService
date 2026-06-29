"""
Admin Endpoints — Panel de administración
Sprint 5: CRUD de usuarios, cambio de plan, estadísticas globales.
OWASP A01: require_admin en todos los endpoints.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import require_admin, DBSession
from app.models.models import (
    User, Subscription, QRCode, QRScan,
    SubscriptionPlan, SubscriptionStatus, utcnow,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    is_verified: bool
    created_at: datetime
    plan: Optional[str] = None
    plan_status: Optional[str] = None
    plan_expires_at: Optional[datetime] = None
    qr_count: int = 0
    total_scans: int = 0

    model_config = {"from_attributes": True}


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_qr: int
    active_qr: int
    total_scans: int
    plans: dict
    new_users_last_30d: int
    new_qr_last_30d: int


class ChangePlanRequest(BaseModel):
    plan: str = Field(pattern=r"^(free|starter|pro|business)$")
    days: int = Field(default=365, ge=1, le=3650)


class ToggleAdminRequest(BaseModel):
    is_admin: bool


class ToggleActiveRequest(BaseModel):
    is_active: bool


# ── Helpers ───────────────────────────────────────────────────

PLAN_QUOTAS = {
    "free": 1,
    "starter": 5,
    "pro": 15,
    "business": 30,
}


async def _get_user_or_404(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "USER_NOT_FOUND", "message": "Usuario no encontrado."},
        )
    return user


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
async def get_global_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> AdminStatsResponse:
    """Estadísticas globales del sistema."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Totales de usuarios
    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active == True)
    ) or 0
    admin_users = await db.scalar(
        select(func.count(User.id)).where(User.is_admin == True)
    ) or 0

    # Totales de QR
    total_qr = await db.scalar(select(func.count(QRCode.id))) or 0
    active_qr = await db.scalar(
        select(func.count(QRCode.id)).where(QRCode.status == "active")
    ) or 0

    # Total escaneos
    total_scans = await db.scalar(select(func.count(QRScan.id))) or 0

    # Distribución de planes (solo subs activas)
    plans_result = await db.execute(
        select(Subscription.plan, func.count(Subscription.id))
        .where(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        )
        .group_by(Subscription.plan)
    )
    plans = {row[0]: row[1] for row in plans_result.all()}

    # Nuevos últimos 30 días
    new_users_last_30d = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    ) or 0
    new_qr_last_30d = await db.scalar(
        select(func.count(QRCode.id)).where(QRCode.created_at >= thirty_days_ago)
    ) or 0

    logger.info("admin_stats_requested")
    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_qr=total_qr,
        active_qr=active_qr,
        total_scans=total_scans,
        plans=plans,
        new_users_last_30d=new_users_last_30d,
        new_qr_last_30d=new_qr_last_30d,
    )


@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> List[AdminUserResponse]:
    """Lista todos los usuarios con paginación y filtros."""
    now = datetime.now(timezone.utc)
    offset = (page - 1) * page_size

    # Query de usuarios
    query = select(User).order_by(desc(User.created_at))

    if search:
        query = query.where(
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )

    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    # Enriquecer con datos de suscripción y QR
    response = []
    for user in users:
        # Suscripción activa
        sub = await db.scalar(
            select(Subscription)
            .where(
                Subscription.user_id == user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at > now,
            )
            .order_by(desc(Subscription.expires_at))
        )

        # Filtrar por plan si se especifica
        if plan and (not sub or sub.plan.value != plan):
            continue

        # Conteo de QR
        qr_count = await db.scalar(
            select(func.count(QRCode.id)).where(QRCode.user_id == user.id)
        ) or 0

        # Total escaneos del usuario
        total_scans = await db.scalar(
            select(func.count(QRScan.id))
            .join(QRCode, QRScan.qr_code_id == QRCode.id)
            .where(QRCode.user_id == user.id)
        ) or 0

        response.append(AdminUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            is_verified=user.is_verified,
            created_at=user.created_at,
            plan=sub.plan.value if sub else "none",
            plan_status=sub.status.value if sub else None,
            plan_expires_at=sub.expires_at if sub else None,
            qr_count=qr_count,
            total_scans=total_scans,
        ))

    return response


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_detail(
    user_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> AdminUserResponse:
    """Detalle completo de un usuario."""
    now = datetime.now(timezone.utc)
    user = await _get_user_or_404(db, user_id)

    sub = await db.scalar(
        select(Subscription)
        .where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        )
        .order_by(desc(Subscription.expires_at))
    )

    qr_count = await db.scalar(
        select(func.count(QRCode.id)).where(QRCode.user_id == user.id)
    ) or 0

    total_scans = await db.scalar(
        select(func.count(QRScan.id))
        .join(QRCode, QRScan.qr_code_id == QRCode.id)
        .where(QRCode.user_id == user.id)
    ) or 0

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        created_at=user.created_at,
        plan=sub.plan.value if sub else "none",
        plan_status=sub.status.value if sub else None,
        plan_expires_at=sub.expires_at if sub else None,
        qr_count=qr_count,
        total_scans=total_scans,
    )


@router.post("/users/{user_id}/change-plan")
async def change_user_plan(
    user_id: uuid.UUID,
    payload: ChangePlanRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> dict:
    """
    Cambia el plan de un usuario manualmente (sin Stripe).
    Expira suscripciones previas y crea una nueva.
    """
    now = datetime.now(timezone.utc)
    user = await _get_user_or_404(db, user_id)

    # Expirar suscripciones activas previas
    prev_subs_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
    )
    for sub in prev_subs_result.scalars().all():
        sub.status = SubscriptionStatus.EXPIRED

    # Crear nueva suscripción
    plan_enum = SubscriptionPlan(payload.plan)
    quota = PLAN_QUOTAS.get(payload.plan, 1)

    new_sub = Subscription(
        id=uuid.uuid4(),
        user_id=user_id,
        plan=plan_enum,
        status=SubscriptionStatus.ACTIVE,
        starts_at=now,
        expires_at=now + timedelta(days=payload.days),
        qr_quota=quota,
        qr_used=0,
        amount_paid_usd=0.0,
    )
    db.add(new_sub)
    await db.commit()

    logger.info(
        "admin_plan_changed",
        admin_id=str(admin.id),
        target_user_id=str(user_id),
        new_plan=payload.plan,
        days=payload.days,
    )

    return {
        "message": f"Plan cambiado a {payload.plan} por {payload.days} días.",
        "user_id": str(user_id),
        "plan": payload.plan,
        "expires_at": (now + timedelta(days=payload.days)).isoformat(),
    }


@router.post("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: uuid.UUID,
    payload: ToggleAdminRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> dict:
    """Otorga o revoca permisos de admin a un usuario."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "SELF_ADMIN_TOGGLE", "message": "No puedes modificar tu propio rol de admin."},
        )

    user = await _get_user_or_404(db, user_id)
    user.is_admin = payload.is_admin
    await db.commit()

    logger.info(
        "admin_role_changed",
        admin_id=str(admin.id),
        target_user_id=str(user_id),
        is_admin=payload.is_admin,
    )

    return {
        "message": f"Admin {'otorgado' if payload.is_admin else 'revocado'} correctamente.",
        "user_id": str(user_id),
        "is_admin": payload.is_admin,
    }


@router.post("/users/{user_id}/toggle-active")
async def toggle_active(
    user_id: uuid.UUID,
    payload: ToggleActiveRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> dict:
    """Activa o desactiva una cuenta de usuario."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "SELF_DEACTIVATE", "message": "No puedes desactivarte a ti mismo."},
        )

    user = await _get_user_or_404(db, user_id)
    user.is_active = payload.is_active
    await db.commit()

    logger.info(
        "admin_user_toggled",
        admin_id=str(admin.id),
        target_user_id=str(user_id),
        is_active=payload.is_active,
    )

    return {
        "message": f"Usuario {'activado' if payload.is_active else 'desactivado'}.",
        "user_id": str(user_id),
        "is_active": payload.is_active,
    }


@router.get("/users/{user_id}/qr-codes")
async def get_user_qr_codes(
    user_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(DBSession),
) -> list:
    """Lista todos los QR de un usuario específico."""
    await _get_user_or_404(db, user_id)

    result = await db.execute(
        select(QRCode)
        .where(QRCode.user_id == user_id)
        .order_by(desc(QRCode.created_at))
    )
    qr_codes = result.scalars().all()

    return [
        {
            "id": str(qr.id),
            "short_code": qr.short_code,
            "title": qr.title,
            "destination_url": qr.destination_url,
            "qr_type": qr.qr_type,
            "scan_count": qr.scan_count,
            "status": qr.status.value if hasattr(qr.status, "value") else qr.status,
            "created_at": qr.created_at.isoformat(),
        }
        for qr in qr_codes
    ]
