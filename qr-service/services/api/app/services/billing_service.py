"""
Billing Service — Stripe multi-plan con idempotencia de webhooks
Planes: STARTER ($10), PRO ($20), BUSINESS ($30) — todos anuales
OWASP A08: Verificación de firma + idempotencia (event_id único en DB)
SWEBOK v4: Software Security — Data Integrity
"""
from datetime import datetime, timezone
from uuid import UUID

import stripe
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    BillingException, InvalidPlanException, WebhookSignatureException,
)
from app.models.models import (
    Subscription, SubscriptionPlan, SubscriptionStatus, StripeEvent,
)

logger = structlog.get_logger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

# Planes de pago disponibles
PAID_PLANS = {
    "starter":  SubscriptionPlan.STARTER,
    "pro":      SubscriptionPlan.PRO,
    "business": SubscriptionPlan.BUSINESS,
}


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_checkout_session(
        self,
        user_id: UUID,
        user_email: str,
        plan: str,
    ) -> dict:
        """
        Crea sesión de Stripe Checkout para el plan elegido.
        OWASP: El plan y el precio vienen de settings — nunca del frontend.
        """
        if plan not in PAID_PLANS:
            raise InvalidPlanException(plan)

        price_id = settings.get_stripe_price_id(plan)
        price_usd = settings.get_plan_price(plan)
        qr_quota = settings.get_plan_quota(plan)

        try:
            customer_id = await self._get_or_create_stripe_customer(user_id, user_email)

            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode="subscription",
                success_url=f"{settings.FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/billing/cancel",
                metadata={
                    "user_id": str(user_id),
                    "plan": plan,
                },
                subscription_data={
                    "metadata": {"user_id": str(user_id), "plan": plan},
                },
                allow_promotion_codes=True,
            )

            logger.info("checkout_session_created", user_id=str(user_id), plan=plan)
            return {
                "checkout_url": session.url,
                "plan": plan,
                "price_usd": price_usd,
                "qr_quota": qr_quota,
                "price_per_qr": round(price_usd / qr_quota, 2),
                "duration_days": 365,
            }

        except stripe.error.StripeError as e:
            logger.error("stripe_checkout_error", error=str(e), user_id=str(user_id))
            raise BillingException(str(e.user_message))

    async def create_customer_portal_session(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Crea sesión del Customer Portal de Stripe.
        Permite al usuario gestionar su plan, cancelar, ver facturas.
        """
        # Obtener stripe_customer_id desde la suscripción
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.stripe_customer_id.isnot(None),
            ).order_by(Subscription.created_at.desc())
        )

        if not sub or not sub.stripe_customer_id:
            raise BillingException("No se encontró una suscripción de Stripe activa.")

        try:
            portal_session = stripe.billing_portal.Session.create(
                customer=sub.stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/billing",
            )
            return {"portal_url": portal_session.url}
        except stripe.error.StripeError as e:
            logger.error("stripe_portal_error", error=str(e), user_id=str(user_id))
            raise BillingException(str(e.user_message))

    async def get_invoices(self, user_id: UUID) -> list:
        """Retorna el historial de facturas del usuario desde Stripe."""
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.stripe_customer_id.isnot(None),
            ).order_by(Subscription.created_at.desc())
        )

        if not sub or not sub.stripe_customer_id:
            return []

        try:
            invoices = stripe.Invoice.list(
                customer=sub.stripe_customer_id,
                limit=20,
            )
            return [
                {
                    "id": inv.id,
                    "amount_paid": inv.amount_paid / 100,
                    "currency": inv.currency.upper(),
                    "status": inv.status,
                    "date": datetime.fromtimestamp(inv.created, tz=timezone.utc).isoformat(),
                    "invoice_pdf": inv.invoice_pdf,
                    "hosted_invoice_url": inv.hosted_invoice_url,
                }
                for inv in invoices.data
            ]
        except stripe.error.StripeError as e:
            logger.error("stripe_invoices_error", error=str(e))
            return []

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        """
        Procesa webhooks de Stripe.
        OWASP A08:
          1. La firma SIEMPRE se verifica antes de procesar.
          2. Idempotencia: event_id único en tabla stripe_events.
        """
        # 1. Verificar firma
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except (stripe.error.SignatureVerificationError, ValueError):
            logger.error("webhook_signature_invalid")
            raise WebhookSignatureException()

        event_id = event["id"]
        event_type = event["type"]

        # 2. Idempotencia — verificar si ya fue procesado
        existing = await self.db.scalar(
            select(StripeEvent).where(StripeEvent.event_id == event_id)
        )
        if existing:
            logger.info("webhook_already_processed", event_id=event_id, event_type=event_type)
            return {"status": "already_processed", "event_id": event_id}

        # 3. Registrar el evento ANTES de procesarlo (marca idempotente)
        stripe_event_record = StripeEvent(
            event_id=event_id,
            event_type=event_type,
            processed_at=datetime.now(timezone.utc),
        )
        self.db.add(stripe_event_record)
        await self.db.flush()  # Reservar el event_id sin hacer commit aún

        logger.info("stripe_webhook_received", event_type=event_type, event_id=event_id)

        handlers = {
            "checkout.session.completed":    self._handle_checkout_completed,
            "invoice.payment_succeeded":     self._handle_payment_succeeded,
            "invoice.payment_failed":        self._handle_payment_failed,
            "customer.subscription.deleted": self._handle_subscription_deleted,
        }

        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(event["data"]["object"])
                stripe_event_record.status = "processed"
            except Exception as exc:
                stripe_event_record.status = "failed"
                stripe_event_record.error = str(exc)[:500]
                logger.error("webhook_handler_failed", event_type=event_type, error=str(exc))
                raise
        else:
            stripe_event_record.status = "ignored"

        await self.db.commit()
        return {"status": "processed", "event_type": event_type, "event_id": event_id}

    async def get_plans_info(self) -> list:
        """Retorna información pública de todos los planes."""
        from app.services.subscription_service import PLAN_FEATURES
        from app.models.models import SubscriptionPlan

        plans = []
        for plan_enum in [
            SubscriptionPlan.FREE,
            SubscriptionPlan.STARTER,
            SubscriptionPlan.PRO,
            SubscriptionPlan.BUSINESS,
        ]:
            f = PLAN_FEATURES[plan_enum]
            plans.append({
                "plan":         plan_enum.value,
                "price_usd":    f["price_usd"],
                "qr_quota":     f["qr_quota"],
                "price_per_qr": round(f["price_usd"] / f["qr_quota"], 2) if f["qr_quota"] > 0 else 0,
                "description":  f["description"],
                "analytics":    f["analytics"],
                "custom_logo":  f["custom_logo"],
                "custom_colors": f["custom_colors"],
                "support":      f["support"],
                "is_popular":   plan_enum == SubscriptionPlan.BUSINESS,
            })
        return plans

    # ── Webhook handlers privados ──────────────────────────────

    async def _handle_checkout_completed(self, session: dict) -> None:
        user_id = session.get("metadata", {}).get("user_id")
        plan_str = session.get("metadata", {}).get("plan")

        if not user_id or not plan_str:
            logger.error("checkout_completed_missing_metadata", session_id=session.get("id"))
            return

        plan_enum = PAID_PLANS.get(plan_str)
        if not plan_enum:
            logger.error("checkout_completed_unknown_plan", plan=plan_str)
            return

        from app.services.subscription_service import SubscriptionService
        sub_service = SubscriptionService(self.db)

        await sub_service.activate_paid_subscription(
            user_id=UUID(user_id),
            plan=plan_enum,
            stripe_subscription_id=session.get("subscription", ""),
            stripe_customer_id=session.get("customer", ""),
            amount_paid_usd=(session.get("amount_total") or 0) / 100,
        )

        # Encolar email de confirmación
        try:
            from app.tasks.subscription_tasks import send_payment_confirmation_email
            from app.models.models import User
            user = await self.db.get(User, UUID(user_id))
            if user:
                send_payment_confirmation_email.delay(
                    user_email=user.email,
                    user_name=user.full_name or "usuario",
                    plan=plan_str,
                    amount_usd=(session.get("amount_total") or 0) / 100,
                )
        except Exception as e:
            logger.warning("payment_email_queue_failed", error=str(e))

        logger.info("checkout_completed_processed", user_id=user_id, plan=plan_str)

    async def _handle_payment_succeeded(self, invoice: dict) -> None:
        """Renovación anual exitosa — extiende la suscripción otro año."""
        from datetime import timedelta
        subscription_id = invoice.get("subscription")
        if not subscription_id:
            return

        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        if sub:
            sub.expires_at = sub.expires_at + timedelta(days=365)
            sub.status = SubscriptionStatus.ACTIVE
            logger.info("subscription_renewed_annually", subscription_id=str(sub.id))

    async def _handle_payment_failed(self, invoice: dict) -> None:
        subscription_id = invoice.get("subscription")
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        if sub:
            sub.status = SubscriptionStatus.EXPIRED
            logger.warning("subscription_payment_failed", subscription_id=str(sub.id))

    async def _handle_subscription_deleted(self, stripe_sub: dict) -> None:
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub["id"]
            )
        )
        if sub:
            sub.status = SubscriptionStatus.CANCELLED
            logger.info("subscription_cancelled", subscription_id=str(sub.id))

    async def _get_or_create_stripe_customer(self, user_id: UUID, email: str) -> str:
        existing = await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.stripe_customer_id.isnot(None),
            )
        )
        if existing and existing.stripe_customer_id:
            return existing.stripe_customer_id

        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": str(user_id)},
        )
        return customer.id
