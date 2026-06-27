"""
Subscription Service
SWEBOK v4: Software Construction — Business Rule Enforcement
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import SubscriptionExpiredException, SubscriptionNotFoundException
from app.models.models import (
    QRCode,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)

logger = structlog.get_logger(__name__)


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_free_subscription(self, user_id: UUID) -> Subscription:
        """
        Create a FREE subscription automatically after user registration.
        Business rule: FREE lasts 30 days.
        """
        now = datetime.now(timezone.utc)

        subscription = Subscription(
            user_id=user_id,
            plan=SubscriptionPlan.FREE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            expires_at=now + timedelta(days=settings.FREE_PLAN_DURATION_DAYS),
        )

        self.db.add(subscription)
        await self.db.flush()

        logger.info(
            "free_subscription_created",
            user_id=str(user_id),
            subscription_id=str(subscription.id),
        )

        return subscription

    async def get_current_subscription(self, user_id: UUID) -> Subscription:
        """
        Return current active subscription.
        Raises domain exception if missing or expired.
        """
        now = datetime.now(timezone.utc)

        subscription = await self.db.scalar(
            select(Subscription)
            .where(
                Subscription.user_id == user_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at > now,
            )
            .order_by(Subscription.expires_at.desc())
        )

        if not subscription:
            raise SubscriptionNotFoundException()

        return subscription

    async def require_active_subscription(self, user_id: UUID) -> Subscription:
        """
        Enforce active subscription for protected business actions.
        """
        try:
            return await self.get_current_subscription(user_id)
        except SubscriptionNotFoundException as exc:
            raise SubscriptionExpiredException() from exc

    async def expire_due_subscriptions(self) -> int:
        """
        Expire subscriptions whose expiration date has passed.
        Also disables QR codes tied to expired subscriptions.
        Intended to run daily via Celery Beat.
        """
        now = datetime.now(timezone.utc)

        expired_subscriptions_result = await self.db.execute(
            select(Subscription).where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at <= now,
            )
        )

        expired_subscriptions = list(expired_subscriptions_result.scalars().all())

        if not expired_subscriptions:
            return 0

        expired_user_ids = [subscription.user_id for subscription in expired_subscriptions]

        await self.db.execute(
            update(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at <= now,
            )
            .values(status=SubscriptionStatus.EXPIRED)
        )

        await self.db.execute(
            update(QRCode)
            .where(QRCode.user_id.in_(expired_user_ids))
            .values(is_active=False)
        )

        await self.db.commit()

        logger.info(
            "subscriptions_expired",
            count=len(expired_subscriptions),
        )

        return len(expired_subscriptions)