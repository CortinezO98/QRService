"""
Billing Endpoints
OWASP A08: Stripe webhook signature verification enforced in service
"""
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.exceptions import WebhookSignatureException
from app.db.session import get_db
from app.models.models import User
from app.schemas.qr import CheckoutResponse, SubscriptionResponse
from app.services.billing_service import BillingService
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    service = BillingService(db)

    checkout_url = await service.create_checkout_session(
        user_id=current_user.id,
        user_email=current_user.email,
    )

    return CheckoutResponse(
        checkout_url=checkout_url,
        plan="annual",
        price_usd=settings.ANNUAL_PLAN_PRICE_USD,
    )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not stripe_signature:
        raise WebhookSignatureException()

    payload = await request.body()

    service = BillingService(db)

    return await service.handle_webhook(
        payload=payload,
        signature=stripe_signature,
    )


@router.get("/status", response_model=SubscriptionResponse)
async def billing_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    service = SubscriptionService(db)

    subscription = await service.get_current_subscription(current_user.id)

    return SubscriptionResponse.from_model(subscription)