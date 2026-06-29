"""
Billing Endpoints — Multi-plan + renovación FREE + Customer Portal
OWASP A08: Webhook con firma verificada + idempotencia
"""
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, DBSession
from app.core.exceptions import WebhookSignatureException
from app.db.session import get_db
from app.models.models import User
from app.schemas.qr import (
    CheckoutRequest,
    CheckoutResponse,
    SubscriptionResponse,
    MessageResponse,
)
from app.services.billing_service import BillingService
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("/plans")
async def get_plans() -> list:
    """
    Lista todos los planes con precios, cuotas y features.
    Endpoint PÚBLICO — no requiere autenticación.
    """
    service = BillingService(None)
    return await service.get_plans_info()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    """
    Crea sesión de Stripe Checkout.
    El plan y precio vienen de settings — nunca del frontend.
    """
    service = BillingService(db)
    result = await service.create_checkout_session(
        user_id=current_user.id,
        user_email=current_user.email,
        plan=payload.plan,
    )
    return CheckoutResponse(**result)


@router.post("/customer-portal")
async def customer_portal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Genera URL del Stripe Customer Portal.
    Permite cancelar, cambiar plan, ver facturas directamente en Stripe.
    """
    service = BillingService(db)
    return await service.create_customer_portal_session(current_user.id)


@router.get("/invoices")
async def get_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    """Historial de pagos y facturas desde Stripe."""
    service = BillingService(db)
    return await service.get_invoices(current_user.id)


@router.post("/renew-free", response_model=SubscriptionResponse)
async def renew_free_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """
    Renovación mensual gratuita para plan FREE.
    Fricción intencional: el usuario debe hacer clic cada 30 días.
    """
    service = SubscriptionService(db)
    sub = await service.renew_free_subscription(current_user.id)
    return SubscriptionResponse.from_model(sub)


@router.get("/status")
async def billing_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Estado completo de la suscripción:
    plan, días restantes, QR usados/disponibles, opciones de upgrade.
    """
    service = SubscriptionService(db)
    return await service.get_subscription_summary(current_user.id)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Webhook de Stripe con:
    1. Verificación de firma HMAC (OWASP A08)
    2. Idempotencia por event_id (evita doble procesamiento)
    """
    if not stripe_signature:
        raise WebhookSignatureException()

    payload = await request.body()
    service = BillingService(db)
    return await service.handle_webhook(payload=payload, signature=stripe_signature)