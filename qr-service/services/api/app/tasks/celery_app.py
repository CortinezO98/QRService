"""
Celery App — Scheduler actualizado con 5 tareas programadas
"""
from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_ready

from app.core.config import settings

celery_app = Celery(
    "qr_service",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL.replace("/0", "/2"),
    include=["app.tasks.subscription_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    result_expires=3600,
    task_annotations={
        "app.tasks.subscription_tasks.send_free_expiry_email":      {"rate_limit": "20/m"},
        "app.tasks.subscription_tasks.send_renewal_reminder_email": {"rate_limit": "20/m"},
        "app.tasks.subscription_tasks.send_payment_confirmation_email": {"rate_limit": "20/m"},
    },
    redbeat_redis_url=settings.CELERY_BROKER_URL,
    beat_scheduler="redbeat.RedBeatScheduler",

    beat_schedule={
        # 02:00 — Expirar suscripciones vencidas
        "expire-stale-subscriptions": {
            "task": "app.tasks.subscription_tasks.expire_stale_subscriptions",
            "schedule": crontab(hour=2, minute=0),
            "options": {"queue": "default"},
        },
        # 02:15 — Desactivar QR FREE expirados
        "deactivate-expired-qr-codes": {
            "task": "app.tasks.subscription_tasks.deactivate_expired_qr_codes",
            "schedule": crontab(hour=2, minute=15),
            "options": {"queue": "default"},
        },
        # 02:30 — Notificar usuarios cuyos QR fueron desactivados
        "notify-qr-deactivations": {
            "task": "app.tasks.subscription_tasks.notify_qr_deactivations",
            "schedule": crontab(hour=2, minute=30),
            "options": {"queue": "emails"},
        },
        # 08:00 — Avisar a usuarios FREE con 1–5 días restantes
        "send-free-expiry-warnings": {
            "task": "app.tasks.subscription_tasks.send_free_expiry_warnings",
            "schedule": crontab(hour=8, minute=0),
            "options": {"queue": "emails"},
        },
        # 08:30 — Recordatorio a usuarios FREE que no renovaron (5 días después)
        "send-renewal-reminders": {
            "task": "app.tasks.subscription_tasks.send_renewal_reminders",
            "schedule": crontab(hour=8, minute=30),
            "options": {"queue": "emails"},
        },
    },
)


@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    import structlog
    structlog.get_logger(__name__).info("celery_worker_ready", worker=str(sender))