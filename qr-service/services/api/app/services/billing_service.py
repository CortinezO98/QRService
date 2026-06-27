"""
Billing Service — Stripe Integration
OWASP: A08:2021 – Software and Data Integrity Failures
  → Webhook signature MUST be verified before processing
SWEBOK v4: Software Construction — External System Integration
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import stripe
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BillingException, WebhookSignatureException
from app.models.models import Subscription, SubscriptionPlan, SubscriptionStatus, User

logger = structlog.get_logger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_checkout_session(self, user_id: UUID, user_email: str) -> str:
        """
        Create Stripe Checkout session for Annual plan.
        Returns checkout URL.
        """
        try:
            # Create/get Stripe customer
            customer_id = await self._get_or_create_stripe_customer(user_id, user_email)

            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price": settings.STRIPE_ANNUAL_PRICE_ID,
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=f"{settings.BASE_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.BASE_URL}/billing/cancel",
                metadata={"user_id": str(user_id)},
                subscription_data={
                    "metadata": {"user_id": str(user_id)},
                },
                # Allow promo codes
                allow_promotion_codes=True,
            )

            logger.info("checkout_session_created", user_id=str(user_id), session_id=session.id)
            return session.url

        except stripe.error.StripeError as e:
            logger.error("stripe_checkout_error", error=str(e), user_id=str(user_id))
            raise BillingException(f"Failed to create checkout session: {e.user_message}")

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        """
        Handle Stripe webhook events.
        CRITICAL OWASP: ALWAYS verify signature before processing.
        Never trust webhook payload without signature check.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except stripe.error.SignatureVerificationError:
            logger.error("webhook_signature_invalid")
            raise WebhookSignatureException()
        except ValueError:
            raise WebhookSignatureException()

        event_type = event["type"]
        logger.info("stripe_webhook_received", event_type=event_type, event_id=event["id"])

        # Route events
        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "invoice.payment_succeeded": self._handle_payment_succeeded,
            "invoice.payment_failed": self._handle_payment_failed,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "customer.subscription.updated": self._handle_subscription_updated,
        }

        handler = handlers.get(event_type)
        if handler:
            await handler(event["data"]["object"])
        else:
            logger.debug("stripe_webhook_unhandled", event_type=event_type)

        return {"status": "processed", "event_type": event_type}

    async def _handle_checkout_completed(self, session: dict) -> None:
        """Activate annual subscription after successful checkout."""
        user_id = session.get("metadata", {}).get("user_id")
        if not user_id:
            logger.error("checkout_completed_missing_user_id", session_id=session.get("id"))
            return

        subscription_id = session.get("subscription")

        # Get the Stripe subscription for details
        stripe_sub = stripe.Subscription.retrieve(subscription_id)

        await self._activate_annual_subscription(
            user_id=UUID(user_id),
            stripe_subscription_id=subscription_id,
            stripe_customer_id=session.get("customer"),
            amount_paid_usd=session.get("amount_total", 0) / 100,
        )

        logger.info("subscription_activated", user_id=user_id, stripe_sub_id=subscription_id)

    async def _handle_payment_succeeded(self, invoice: dict) -> None:
        """Renew subscription on successful payment."""
        subscription_id = invoice.get("subscription")
        if not subscription_id:
            return

        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        if sub:
            sub.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.ANNUAL_PLAN_DURATION_DAYS)
            sub.status = SubscriptionStatus.ACTIVE
            await self.db.commit()
            logger.info("subscription_renewed", subscription_id=str(sub.id))

    async def _handle_payment_failed(self, invoice: dict) -> None:
        """Mark subscription as past due."""
        subscription_id = invoice.get("subscription")
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        if sub:
            sub.status = SubscriptionStatus.EXPIRED
            await self.db.commit()
            logger.warning("subscription_payment_failed", subscription_id=str(sub.id))
            # TODO: Queue email notification

    async def _handle_subscription_deleted(self, stripe_subscription: dict) -> None:
        """Cancel subscription when deleted in Stripe."""
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription["id"]
            )
        )
        if sub:
            sub.status = SubscriptionStatus.CANCELLED
            await self.db.commit()
            logger.info("subscription_cancelled", subscription_id=str(sub.id))

    async def _handle_subscription_updated(self, stripe_subscription: dict) -> None:
        """Sync subscription status changes."""
        pass  # Extend as needed

    async def _activate_annual_subscription(
        self,
        user_id: UUID,
        stripe_subscription_id: str,
        stripe_customer_id: str,
        amount_paid_usd: float,
    ) -> Subscription:
        """Create or upgrade to Annual subscription."""
        # Expire any active FREE subscriptions
        active_subs = await self.db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
        for sub in active_subs.scalars():
            sub.status = SubscriptionStatus.CANCELLED

        # Create new Annual subscription
        annual_sub = Subscription(
            user_id=user_id,
            plan=SubscriptionPlan.ANNUAL,
            status=SubscriptionStatus.ACTIVE,
            starts_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.ANNUAL_PLAN_DURATION_DAYS),
            stripe_subscription_id=stripe_subscription_id,
            stripe_customer_id=stripe_customer_id,
            amount_paid_usd=amount_paid_usd,
        )
        self.db.add(annual_sub)
        await self.db.commit()
        return annual_sub

    async def _get_or_create_stripe_customer(self, user_id: UUID, email: str) -> str:
        """Get existing Stripe customer or create new one."""
        existing_sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.stripe_customer_id.isnot(None),
            )
        )
        if existing_sub and existing_sub.stripe_customer_id:
            return existing_sub.stripe_customer_id

        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": str(user_id)},
        )
        return customer.id
