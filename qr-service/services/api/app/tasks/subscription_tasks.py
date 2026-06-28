"""
Celery Tasks — Ciclo de vida de suscripciones con nuevo modelo de negocio
Tareas programadas:
  02:00 UTC — Expirar suscripciones vencidas
  02:15 UTC — Desactivar QR de FREE expirados
  08:00 UTC — Avisar usuarios FREE con 5 días restantes
  08:30 UTC — Recordar usuarios FREE que no renovaron (5 días después)
"""
import asyncio
from datetime import datetime, timedelta, timezone

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── Tarea 1: Expirar suscripciones vencidas ──────────────────
@celery_app.task(name="app.tasks.subscription_tasks.expire_stale_subscriptions",
                 bind=True, max_retries=3, default_retry_delay=300, queue="default")
def expire_stale_subscriptions(self) -> dict:
    """Diaria 02:00 UTC — marca como EXPIRED las suscripciones vencidas."""
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.services.subscription_service import SubscriptionService
        async with AsyncSessionLocal() as db:
            count = await SubscriptionService(db).expire_stale_subscriptions()
            logger.info("task_expire_subs_complete", count=count)
            return {"status": "ok", "expired": count}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Tarea 2: Desactivar QR FREE expirados ────────────────────
@celery_app.task(name="app.tasks.subscription_tasks.deactivate_expired_qr_codes",
                 bind=True, max_retries=3, default_retry_delay=300, queue="default")
def deactivate_expired_qr_codes(self) -> dict:
    """Diaria 02:15 UTC — desactiva QR de plan FREE vencidos."""
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.services.subscription_service import SubscriptionService
        async with AsyncSessionLocal() as db:
            count = await SubscriptionService(db).deactivate_expired_qr_codes()
            logger.info("task_deactivate_qr_complete", count=count)
            return {"status": "ok", "deactivated": count}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Tarea 3: Avisar a usuarios FREE con 5 días restantes ─────
@celery_app.task(name="app.tasks.subscription_tasks.send_free_expiry_warnings",
                 bind=True, max_retries=3, default_retry_delay=600, queue="emails")
def send_free_expiry_warnings(self) -> dict:
    """
    Diaria 08:00 UTC — avisa a usuarios FREE con 1, 2, 3, 4 o 5 días restantes.
    Un email por usuario, no uno por día.
    """
    async def _run():
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.models import Subscription, SubscriptionPlan, SubscriptionStatus, User

        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=5)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Subscription, User)
                .join(User, Subscription.user_id == User.id)
                .where(
                    Subscription.plan == SubscriptionPlan.FREE,
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.expires_at > now,
                    Subscription.expires_at <= threshold,
                    User.is_active == True,
                )
            )
            rows = result.all()
            sent = 0
            for sub, user in rows:
                days_left = max(0, (sub.expires_at - now).days)
                send_free_expiry_email.delay(
                    user_email=user.email,
                    user_name=user.full_name or "usuario",
                    days_remaining=days_left,
                    expires_at=sub.expires_at.isoformat(),
                )
                sent += 1

            logger.info("free_expiry_warnings_queued", count=sent)
            return {"status": "ok", "queued": sent}

    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Tarea 4: Recordatorio post-vencimiento (5 días después) ──
@celery_app.task(name="app.tasks.subscription_tasks.send_renewal_reminders",
                 bind=True, max_retries=3, default_retry_delay=600, queue="emails")
def send_renewal_reminders(self) -> dict:
    """
    Diaria 08:30 UTC — recuerda a usuarios FREE que vencieron hace 5 días
    y aún no renovaron.
    """
    async def _run():
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.models import Subscription, SubscriptionPlan, SubscriptionStatus, User

        now = datetime.now(timezone.utc)
        five_days_ago = now - timedelta(days=5)
        six_days_ago = now - timedelta(days=6)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Subscription, User)
                .join(User, Subscription.user_id == User.id)
                .where(
                    Subscription.plan == SubscriptionPlan.FREE,
                    Subscription.status == SubscriptionStatus.EXPIRED,
                    Subscription.expires_at >= six_days_ago,
                    Subscription.expires_at <= five_days_ago,
                    User.is_active == True,
                )
            )
            rows = result.all()
            sent = 0
            for sub, user in rows:
                send_renewal_reminder_email.delay(
                    user_email=user.email,
                    user_name=user.full_name or "usuario",
                )
                sent += 1

            logger.info("renewal_reminders_queued", count=sent)
            return {"status": "ok", "queued": sent}

    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Tarea 5: Notificar QRs desactivados ───────────────────────
@celery_app.task(name="app.tasks.subscription_tasks.notify_qr_deactivations",
                 bind=True, max_retries=3, default_retry_delay=300, queue="emails")
def notify_qr_deactivations(self) -> dict:
    """
    Diaria 02:30 UTC — notifica a usuarios cuyo QR fue desactivado hoy.
    Corre después de deactivate_expired_qr_codes.
    """
    async def _run():
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.models import QRCode, QRStatus, User
        from datetime import timezone

        now = datetime.now(timezone.utc)
        since = now - timedelta(hours=1)  # QR desactivados en la última hora

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QRCode, User)
                .join(User, QRCode.user_id == User.id)
                .where(
                    QRCode.status == QRStatus.INACTIVE,
                    QRCode.updated_at >= since,
                    User.is_active == True,
                )
            )
            rows = result.all()
            sent = 0
            seen_users = set()
            for qr, user in rows:
                if user.id not in seen_users:  # Un email por usuario, no uno por QR
                    send_qr_deactivated_email.delay(
                        user_email=user.email,
                        user_name=user.full_name or "usuario",
                    )
                    seen_users.add(user.id)
                    sent += 1

            return {"status": "ok", "notified": sent}

    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Emails individuales (encolados por las tareas batch) ──────

@celery_app.task(name="app.tasks.subscription_tasks.send_welcome_email",
                 bind=True, max_retries=3, default_retry_delay=60, queue="emails")
def send_welcome_email(self, user_email: str, user_name: str) -> dict:
    async def _run():
        from app.services.email_service import EmailService
        await EmailService().send_welcome(user_email, user_name)
        return {"status": "sent"}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.subscription_tasks.send_free_expiry_email",
                 bind=True, max_retries=3, default_retry_delay=60, queue="emails")
def send_free_expiry_email(
    self, user_email: str, user_name: str, days_remaining: int, expires_at: str
) -> dict:
    async def _run():
        from app.services.email_service import EmailService
        await EmailService().send_free_expiry_warning(
            user_email, user_name, days_remaining, expires_at
        )
        return {"status": "sent"}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.subscription_tasks.send_qr_deactivated_email",
                 bind=True, max_retries=3, default_retry_delay=60, queue="emails")
def send_qr_deactivated_email(self, user_email: str, user_name: str) -> dict:
    async def _run():
        from app.services.email_service import EmailService
        await EmailService().send_qr_deactivated(user_email, user_name)
        return {"status": "sent"}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.subscription_tasks.send_renewal_reminder_email",
                 bind=True, max_retries=3, default_retry_delay=60, queue="emails")
def send_renewal_reminder_email(self, user_email: str, user_name: str) -> dict:
    async def _run():
        from app.services.email_service import EmailService
        await EmailService().send_renewal_reminder(user_email, user_name)
        return {"status": "sent"}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.subscription_tasks.send_payment_confirmation_email",
                 bind=True, max_retries=3, default_retry_delay=60, queue="emails")
def send_payment_confirmation_email(
    self, user_email: str, user_name: str, plan: str, amount_usd: float
) -> dict:
    async def _run():
        from app.services.email_service import EmailService
        from app.core.config import settings
        qr_quota = settings.get_plan_quota(plan)
        await EmailService().send_payment_confirmation(
            user_email, user_name, plan, amount_usd, qr_quota
        )
        return {"status": "sent"}
    try:
        return _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)
