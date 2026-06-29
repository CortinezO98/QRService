"""
Campaign Endpoints — Gestión de campañas/carpetas
Sprint 3: Disponible para planes de pago (STARTER, PRO, BUSINESS).
OWASP A01: Ownership verificado en CampaignService.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_paid_plan, DBSession
from app.models.models import User, Subscription
from app.services.campaign_service import CampaignService

router = APIRouter()


# ── Schemas locales ───────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9A-Fa-f]{6}$")


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    color: str
    qr_count: int = 0

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, c) -> "CampaignResponse":
        return cls(
            id=c.id,
            name=c.name,
            description=c.description,
            color=c.color,
            qr_count=getattr(c, "_qr_count", 0),
        )


class AssignCampaignRequest(BaseModel):
    campaign_id: Optional[uuid.UUID] = None  # None = desasignar


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> List[CampaignResponse]:
    """Lista las campañas del usuario con conteo de QR activos."""
    service = CampaignService(db)
    campaigns = await service.list_campaigns(current_user.id)
    return [CampaignResponse.from_model(c) for c in campaigns]


@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> CampaignResponse:
    """Crea una nueva campaña."""
    service = CampaignService(db)
    campaign = await service.create_campaign(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
    )
    return CampaignResponse.from_model(campaign)


@router.get("/{campaign_id}", response_model=dict)
async def get_campaign_stats(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> dict:
    """Estadísticas de una campaña: total QR, escaneos, lista de QR."""
    service = CampaignService(db)
    return await service.get_campaign_stats(campaign_id, current_user.id)


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> CampaignResponse:
    """Actualiza nombre, descripción o color de una campaña."""
    service = CampaignService(db)
    campaign = await service.update_campaign(
        campaign_id=campaign_id,
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
    )
    return CampaignResponse.from_model(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> None:
    """Elimina la campaña. Los QR quedan sin campaña asignada."""
    service = CampaignService(db)
    await service.delete_campaign(campaign_id, current_user.id)


@router.post("/assign-qr/{qr_id}", response_model=dict)
async def assign_qr_to_campaign(
    qr_id: uuid.UUID,
    payload: AssignCampaignRequest,
    current_user: User = Depends(get_current_user),
    _: Subscription = Depends(require_paid_plan),
    db: AsyncSession = Depends(DBSession),
) -> dict:
    """Asigna o desasigna un QR a una campaña. campaign_id=null desasigna."""
    service = CampaignService(db)
    qr = await service.assign_qr_to_campaign(
        qr_id=qr_id,
        campaign_id=payload.campaign_id,
        user_id=current_user.id,
    )
    return {
        "qr_id": str(qr.id),
        "campaign_id": str(qr.campaign_id) if qr.campaign_id else None,
        "message": "QR asignado correctamente." if payload.campaign_id else "QR desasignado.",
    }
