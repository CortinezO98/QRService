"""
Billing Endpoints — Multi-plan + renovación FREE
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
    Crea sesión de Stripe Checkout para el plan elegido.
    Planes disponibles: starter ($10), pro ($20), business ($30).
    """
    service = BillingService(db)
    result = await service.create_checkout_session(
        user_id=current_user.id,
        user_email=current_user.email,
        plan=payload.plan,
    )
    return CheckoutResponse(**result)


@router.post("/renew-free", response_model=SubscriptionResponse)
async def renew_free_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """
    Renovación mensual gratuita para plan FREE.
    El usuario debe hacer clic aquí cada mes para mantener su QR activo.
    Si no renueva, el QR se desactiva a los 30 días.
    """
    service = SubscriptionService(db)
    sub = await service.renew_free_subscription(current_user.id)
    return SubscriptionResponse.from_model(sub)


@router.get("/status", response_model=dict)
async def billing_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Estado completo de la suscripción actual:
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
    Webhook de Stripe — SIEMPRE verifica la firma antes de procesar.
    OWASP A08: Sin firma válida = 400.
    """
    if not stripe_signature:
        raise WebhookSignatureException()

    payload = await request.body()
    service = BillingService(db)
    return await service.handle_webhook(payload=payload, signature=stripe_signature)
