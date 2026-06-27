"""
Celery Application Configuration
SWEBOK v4: Software Construction — Async Processing
"""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "qr_service",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_BROKER_URL,
    include=[
        "app.tasks.subscription_tasks",
    ],
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    redbeat_redis_url=settings.CELERY_BROKER_URL,
    beat_schedule={
        "expire-subscriptions-daily": {
            "task": "app.tasks.subscription_tasks.expire_subscriptions",
            "schedule": 86400.0,
        },
    },
)