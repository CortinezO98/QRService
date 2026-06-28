"""
Subscription Service — Lógica de negocio para los 4 planes
FREE:     1 QR/mes, renovar manualmente cada 30 días
STARTER:  5 QR totales por $10/año
PRO:      15 QR totales por $20/año
BUSINESS: 30 QR totales por $30/año
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    QRLimitExceededException,
    SubscriptionNotFoundException,
    SubscriptionExpiredException,
)
from app.models.models import (
    QRCode, QRStatus, Subscription,
    SubscriptionPlan, SubscriptionStatus,
)

logger = structlog.get_logger(__name__)

# ── Feature matrix por plan ───────────────────────────────────
PLAN_FEATURES = {
    SubscriptionPlan.FREE: {
        "qr_quota":       1,
        "analytics":      False,
        "custom_logo":    False,
        "custom_colors":  False,
        "price_usd":      0.00,
        "duration_days":  30,
        "support":        "none",
        "description":    "1 QR gratis por mes. Renueva mensualmente.",
    },
    SubscriptionPlan.STARTER: {
        "qr_quota":       5,
        "analytics":      True,
        "custom_logo":    False,
        "custom_colors":  True,
        "price_usd":      10.00,
        "duration_days":  365,
        "support":        "email",
        "description":    "5 QR permanentes por $10/año.",
    },
    SubscriptionPlan.PRO: {
        "qr_quota":       15,
        "analytics":      True,
        "custom_logo":    True,
        "custom_colors":  True,
        "price_usd":      20.00,
        "duration_days":  365,
        "support":        "email",
        "description":    "15 QR permanentes por $20/año.",
    },
    SubscriptionPlan.BUSINESS: {
        "qr_quota":       30,
        "analytics":      True,
        "custom_logo":    True,
        "custom_colors":  True,
        "price_usd":      30.00,
        "duration_days":  365,
        "support":        "priority",
        "description":    "30 QR permanentes por $30/año. ($1 por QR)",
    },
}


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_free_subscription(self, user_id: UUID) -> Subscription:
        """
        Al registrarse: FREE plan por 30 días, 1 QR disponible.
        Debe renovar manualmente al mes siguiente.
        """
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.FREE_PLAN_DURATION_DAYS
        )
        sub = Subscription(
            user_id=user_id,
            plan=SubscriptionPlan.FREE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            qr_quota=settings.FREE_PLAN_QR_QUOTA,
            qr_used=0,
        )
        self.db.add(sub)
        await self.db.flush()

        logger.info("free_subscription_created", user_id=str(user_id), expires_at=expires_at.isoformat())
        return sub

    async def renew_free_subscription(self, user_id: UUID) -> Subscription:
        """
        El usuario FREE renueva su mes gratis manualmente.
        - Reactiva su QR por 30 días más
        - Resetea qr_used a 0 (puede crear 1 QR nuevo si el anterior fue eliminado)
        - Si tenía un QR inactivo, lo reactiva
        """
        sub = await self.get_current_or_expired_subscription(user_id)

        if sub.plan != SubscriptionPlan.FREE:
            raise ValueError("Solo los usuarios FREE necesitan renovar manualmente.")

        now = datetime.now(timezone.utc)
        sub.starts_at = now
        sub.expires_at = now + timedelta(days=settings.FREE_PLAN_DURATION_DAYS)
        sub.status = SubscriptionStatus.ACTIVE
        sub.qr_used = 0  # Reset mensual

        # Reactivar QR inactivos del usuario (solo tiene 1)
        result = await self.db.execute(
            select(QRCode).where(
                QRCode.user_id == user_id,
                QRCode.status == QRStatus.INACTIVE,
            )
        )
        for qr in result.scalars().all():
            qr.status = QRStatus.ACTIVE
            qr.expires_at = sub.expires_at
            logger.info("free_qr_reactivated", qr_id=str(qr.id))

        await self.db.commit()
        logger.info("free_subscription_renewed", user_id=str(user_id), expires_at=sub.expires_at.isoformat())
        return sub

    async def activate_paid_subscription(
        self,
        user_id: UUID,
        plan: SubscriptionPlan,
        stripe_subscription_id: str,
        stripe_customer_id: str,
        amount_paid_usd: float,
    ) -> Subscription:
        """
        Activa un plan de pago (STARTER / PRO / BUSINESS).
        - Cancela suscripción FREE activa
        - Los QR existentes se vuelven permanentes (no expiran)
        """
        features = PLAN_FEATURES[plan]

        # Cancelar suscripción activa anterior
        active = await self._get_active_subscription(user_id)
        if active:
            active.status = SubscriptionStatus.CANCELLED
            # Reactivar QR que estaban inactivos
            result = await self.db.execute(
                select(QRCode).where(QRCode.user_id == user_id)
            )
            for qr in result.scalars().all():
                qr.status = QRStatus.ACTIVE
                qr.expires_at = None  # Permanente en planes de pago

        now = datetime.now(timezone.utc)
        new_sub = Subscription(
            user_id=user_id,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            expires_at=now + timedelta(days=features["duration_days"]),
            qr_quota=features["qr_quota"],
            qr_used=active.qr_used if active else 0,  # Mantener QR ya creados
            stripe_subscription_id=stripe_subscription_id,
            stripe_customer_id=stripe_customer_id,
            amount_paid_usd=amount_paid_usd,
        )
        self.db.add(new_sub)
        await self.db.commit()
        await self.db.refresh(new_sub)

        logger.info(
            "paid_subscription_activated",
            user_id=str(user_id),
            plan=plan.value,
            qr_quota=features["qr_quota"],
            expires_at=new_sub.expires_at.isoformat(),
        )
        return new_sub

    async def check_can_create_qr(self, user_id: UUID) -> Subscription:
        """
        Verifica si el usuario puede crear un QR nuevo.
        Lanza excepción si no puede, con mensaje específico por plan.
        """
        sub = await self._get_active_subscription(user_id)
        if not sub:
            raise SubscriptionExpiredException(
                "Tu suscripción venció. Renueva gratis o elige un plan de pago."
            )

        if sub.qr_used >= sub.qr_quota:
            features = PLAN_FEATURES[sub.plan]
            if sub.plan == SubscriptionPlan.FREE:
                raise QRLimitExceededException(
                    limit=sub.qr_quota,
                    current_plan="free",
                    message=(
                        "El plan gratuito incluye 1 QR por mes. "
                        "Espera tu renovación mensual o pasa a un plan de pago "
                        "desde $10/año para tener hasta 5 QR permanentes."
                    ),
                )
            else:
                raise QRLimitExceededException(
                    limit=sub.qr_quota,
                    current_plan=sub.plan.value,
                    message=(
                        f"Has usado {sub.qr_used}/{sub.qr_quota} QR de tu plan "
                        f"{sub.plan.value.upper()}. "
                        f"Pasa al plan BUSINESS ($30/año) para tener hasta 30 QR."
                    ),
                )

        return sub

    async def increment_qr_used(self, subscription_id: UUID) -> None:
        """Incrementa el contador de QR usados al crear uno nuevo."""
        sub = await self.db.get(Subscription, subscription_id)
        if sub:
            sub.qr_used += 1
            await self.db.commit()

    async def get_current_subscription(self, user_id: UUID) -> Subscription:
        sub = await self._get_active_subscription(user_id)
        if not sub:
            raise SubscriptionNotFoundException()
        return sub

    async def get_current_or_expired_subscription(self, user_id: UUID) -> Subscription:
        """Retorna la más reciente, activa o expirada (para renovación FREE)."""
        result = await self.db.scalar(
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.expires_at.desc())
        )
        if not result:
            raise SubscriptionNotFoundException()
        return result

    async def get_subscription_summary(self, user_id: UUID) -> dict:
        """Resumen del plan con feature flags para el frontend."""
        sub = await self._get_active_subscription(user_id)
        if not sub:
            return {"plan": "none", "status": "expired", "features": PLAN_FEATURES[SubscriptionPlan.FREE]}

        now = datetime.now(timezone.utc)
        days_remaining = max(0, (sub.expires_at - now).days)
        features = PLAN_FEATURES[sub.plan]

        return {
            "plan":          sub.plan.value,
            "status":        sub.status.value,
            "days_remaining": days_remaining,
            "qr_quota":      sub.qr_quota,
            "qr_used":       sub.qr_used,
            "qr_remaining":  sub.qr_remaining,
            "starts_at":     sub.starts_at.isoformat(),
            "expires_at":    sub.expires_at.isoformat(),
            "features":      features,
            "can_renew_free": sub.plan == SubscriptionPlan.FREE,
            "upgrade_options": self._upgrade_options(sub.plan),
        }

    async def expire_stale_subscriptions(self) -> int:
        """Tarea diaria: marca como EXPIRED las suscripciones vencidas."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Subscription).where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at <= now,
            )
        )
        stale = result.scalars().all()
        count = 0
        for sub in stale:
            sub.status = SubscriptionStatus.EXPIRED
            count += 1
            logger.info("subscription_auto_expired", subscription_id=str(sub.id), plan=sub.plan.value)

        if count:
            await self.db.commit()
        return count

    async def deactivate_expired_qr_codes(self) -> int:
        """
        Tarea diaria: desactiva QR de plan FREE que expiraron.
        Los planes de pago NO desactivan QR (son permanentes durante el año).
        """
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(QRCode).where(
                QRCode.status == QRStatus.ACTIVE,
                QRCode.expires_at <= now,
                QRCode.expires_at.isnot(None),  # Solo FREE tiene expires_at
            )
        )
        expired_qrs = result.scalars().all()
        count = 0
        for qr in expired_qrs:
            qr.status = QRStatus.INACTIVE  # INACTIVE, no EXPIRED — puede reactivarse
            count += 1

        if count:
            await self.db.commit()
            logger.info("free_qr_codes_deactivated", count=count)
        return count

    # ── Privados ──────────────────────────────────────────────

    async def _get_active_subscription(self, user_id: UUID) -> Subscription | None:
        now = datetime.now(timezone.utc)
        return await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at > now,
            ).order_by(Subscription.expires_at.desc())
        )

    @staticmethod
    def _upgrade_options(current_plan: SubscriptionPlan) -> list:
        """Planes de upgrade disponibles desde el plan actual."""
        order = [
            SubscriptionPlan.FREE,
            SubscriptionPlan.STARTER,
            SubscriptionPlan.PRO,
            SubscriptionPlan.BUSINESS,
        ]
        current_index = order.index(current_plan)
        options = []
        for plan in order[current_index + 1:]:
            f = PLAN_FEATURES[plan]
            options.append({
                "plan":        plan.value,
                "price_usd":   f["price_usd"],
                "qr_quota":    f["qr_quota"],
                "description": f["description"],
                "price_per_qr": round(f["price_usd"] / f["qr_quota"], 2) if f["qr_quota"] > 0 else 0,
            })
        return options
