"""
Campaign Service — Gestión de campañas/carpetas para agrupar QR codes
Sprint 3: Disponible para STARTER, PRO y BUSINESS.
OWASP A01: Ownership check en cada operación.
"""
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Campaign, QRCode, QRStatus

logger = structlog.get_logger(__name__)


class CampaignService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_campaigns(self, user_id: uuid.UUID) -> List[Campaign]:
        """Lista todas las campañas del usuario con conteo de QR."""
        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.user_id == user_id)
            .order_by(Campaign.created_at.desc())
        )
        campaigns = result.scalars().all()

        # Enriquecer con conteo de QR activos
        for camp in campaigns:
            count = await self.db.scalar(
                select(func.count(QRCode.id)).where(
                    QRCode.campaign_id == camp.id,
                    QRCode.status == QRStatus.ACTIVE,
                )
            )
            camp._qr_count = count or 0

        return campaigns

    async def create_campaign(
        self,
        user_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        color: str = "#6366f1",
    ) -> Campaign:
        campaign = Campaign(
            user_id=user_id,
            name=name.strip()[:255],
            description=description,
            color=color if color.startswith("#") and len(color) == 7 else "#6366f1",
        )
        self.db.add(campaign)
        await self.db.commit()
        await self.db.refresh(campaign)
        logger.info("campaign_created", campaign_id=str(campaign.id), user_id=str(user_id))
        return campaign

    async def update_campaign(
        self,
        campaign_id: uuid.UUID,
        user_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
    ) -> Campaign:
        campaign = await self._get_owned(campaign_id, user_id)
        if name is not None:
            campaign.name = name.strip()[:255]
        if description is not None:
            campaign.description = description
        if color is not None and color.startswith("#") and len(color) == 7:
            campaign.color = color
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign

    async def delete_campaign(self, campaign_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Elimina la campaña. Los QR quedan sin campaña (SET NULL)."""
        campaign = await self._get_owned(campaign_id, user_id)
        await self.db.delete(campaign)
        await self.db.commit()
        logger.info("campaign_deleted", campaign_id=str(campaign_id), user_id=str(user_id))

    async def get_campaign(self, campaign_id: uuid.UUID, user_id: uuid.UUID) -> Campaign:
        return await self._get_owned(campaign_id, user_id)

    async def assign_qr_to_campaign(
        self,
        qr_id: uuid.UUID,
        campaign_id: Optional[uuid.UUID],
        user_id: uuid.UUID,
    ) -> QRCode:
        """Asigna o desasigna un QR a una campaña. Verifica ownership de ambos."""
        qr = await self.db.scalar(
            select(QRCode).where(QRCode.id == qr_id, QRCode.user_id == user_id)
        )
        if not qr:
            from app.core.exceptions import QRNotFoundException
            raise QRNotFoundException(str(qr_id))

        if campaign_id is not None:
            # Verificar que la campaña pertenece al mismo usuario
            campaign = await self.db.scalar(
                select(Campaign).where(
                    Campaign.id == campaign_id,
                    Campaign.user_id == user_id,
                )
            )
            if not campaign:
                from app.core.exceptions import QRServiceException
                raise QRServiceException("Campaña no encontrada.")

        qr.campaign_id = campaign_id
        await self.db.commit()
        await self.db.refresh(qr)
        return qr

    async def get_campaign_stats(self, campaign_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        """Estadísticas agregadas de todos los QR de una campaña."""
        campaign = await self._get_owned(campaign_id, user_id)

        qr_result = await self.db.execute(
            select(QRCode).where(
                QRCode.campaign_id == campaign_id,
                QRCode.user_id == user_id,
            )
        )
        qrs = qr_result.scalars().all()

        total_scans = sum(qr.scan_count for qr in qrs)
        active_count = sum(1 for qr in qrs if qr.status == QRStatus.ACTIVE)

        return {
            "campaign_id": str(campaign.id),
            "name": campaign.name,
            "color": campaign.color,
            "total_qr": len(qrs),
            "active_qr": active_count,
            "total_scans": total_scans,
            "qr_codes": [
                {
                    "id": str(qr.id),
                    "title": qr.title,
                    "short_code": qr.short_code,
                    "scan_count": qr.scan_count,
                    "status": qr.status.value,
                    "qr_type": qr.qr_type,
                }
                for qr in qrs
            ],
        }

    async def _get_owned(self, campaign_id: uuid.UUID, user_id: uuid.UUID) -> Campaign:
        campaign = await self.db.scalar(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.user_id == user_id,
            )
        )
        if not campaign:
            from app.core.exceptions import QRServiceException
            raise QRServiceException("Campaña no encontrada.")
        return campaign
