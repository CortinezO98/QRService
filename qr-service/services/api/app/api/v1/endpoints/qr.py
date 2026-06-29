"""
QR Code Endpoints
OWASP A01: Ownership checks enforced inside QRService
Sprint 1: update_qr delegado al service (no lógica en endpoint)
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_active_subscription
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Subscription, User
from app.schemas.qr import (
    MessageResponse,
    QRAnalyticsResponse,
    QRCreateRequest,
    QRListResponse,
    QRResponse,
    QRUpdateRequest,
)
from app.services.qr_service import QRService

router = APIRouter()


@router.get("/types")
async def get_qr_types() -> list:
    """Catálogo de tipos de QR disponibles. Endpoint público."""
    service = QRService(None)
    return await service.get_qr_types()


@router.get("/", response_model=QRListResponse)
async def list_qr_codes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QRListResponse:
    service = QRService(db)
    skip = (page - 1) * page_size
    qr_codes = await service.list_qr_codes(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
    )
    items = [QRResponse.from_model(qr, settings.BASE_URL) for qr in qr_codes]
    return QRListResponse(items=items, total=len(items), page=page, page_size=page_size)


@router.post("/", response_model=QRResponse, status_code=status.HTTP_201_CREATED)
async def create_qr(
    payload: QRCreateRequest,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
) -> QRResponse:
    service = QRService(db)
    qr = await service.create_qr(user_id=current_user.id, request=payload)
    return QRResponse.from_model(qr, settings.BASE_URL)


@router.get("/{qr_id}", response_model=QRResponse)
async def get_qr_detail(
    qr_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QRResponse:
    service = QRService(db)
    qr = await service._get_qr_owned_by(qr_id=qr_id, user_id=current_user.id)
    return QRResponse.from_model(qr, settings.BASE_URL)


@router.put("/{qr_id}", response_model=QRResponse)
async def update_qr(
    qr_id: UUID,
    payload: QRUpdateRequest,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
) -> QRResponse:
    service = QRService(db)
    update_data = payload.model_dump(exclude_unset=True)
    qr = await service.update_qr(qr_id=qr_id, user_id=current_user.id, payload=update_data)
    return QRResponse.from_model(qr, settings.BASE_URL)


@router.delete("/{qr_id}", response_model=MessageResponse)
async def delete_qr(
    qr_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    service = QRService(db)
    await service.delete_qr(qr_id=qr_id, user_id=current_user.id)
    return MessageResponse(message="QR code deleted successfully.")


@router.get("/{qr_id}/image")
async def get_qr_image(
    qr_id: UUID,
    size: int = Query(default=512, ge=128, le=2048),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = QRService(db)
    image_bytes = await service.generate_image(qr_id=qr_id, user_id=current_user.id, fmt="png")
    qr = await service._get_qr_owned_by(qr_id=qr_id, user_id=current_user.id)
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="qr-{qr.short_code}.png"',
            "Cache-Control": "private, max-age=300",
        },
    )


@router.get("/{qr_id}/analytics", response_model=QRAnalyticsResponse)
async def get_qr_analytics(
    qr_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QRAnalyticsResponse:
    service = QRService(db)
    analytics = await service.get_analytics(qr_id=qr_id, user_id=current_user.id)
    return QRAnalyticsResponse(**analytics)
