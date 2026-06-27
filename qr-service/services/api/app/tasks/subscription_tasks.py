"""
Subscription Background Tasks
"""
import asyncio

import structlog

from app.db.session import AsyncSessionLocal
from app.services.subscription_service import SubscriptionService
from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


async def _expire_subscriptions_async() -> int:
    async with AsyncSessionLocal() as db:
        service = SubscriptionService(db)
        return await service.expire_due_subscriptions()


@celery_app.task(name="app.tasks.subscription_tasks.expire_subscriptions")
def expire_subscriptions() -> int:
    """
    Daily task to expire due subscriptions and disable their QR codes.
    """
    expired_count = asyncio.run(_expire_subscriptions_async())

    logger.info(
        "expire_subscriptions_task_finished",
        expired_count=expired_count,
    )

    return expired_count