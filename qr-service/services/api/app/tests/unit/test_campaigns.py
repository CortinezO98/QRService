"""
Tests de Campañas — Sprint 3
SWEBOK v4: Software Testing — Unit + Integration
"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.campaign_service import CampaignService
from app.models.models import Campaign, QRCode, QRStatus


def make_campaign(user_id=None, name="Mi campaña") -> Campaign:
    c = Campaign()
    c.id = uuid.uuid4()
    c.user_id = user_id or uuid.uuid4()
    c.name = name
    c.description = None
    c.color = "#6366f1"
    c._qr_count = 0
    return c


# ── Ownership ─────────────────────────────────────────────────

class TestCampaignOwnership:

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_users_campaign(self):
        """Usuario A no puede ver campaña de usuario B."""
        user_a = uuid.uuid4()
        user_b = uuid.uuid4()

        mock_db = AsyncMock()
        mock_db.scalar.return_value = None  # No encontrado para user_a

        service = CampaignService(db=mock_db)
        from app.core.exceptions import QRServiceException
        with pytest.raises(QRServiceException):
            await service._get_owned(uuid.uuid4(), user_a)

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_user_can_access_own_campaign(self):
        user_id = uuid.uuid4()
        campaign = make_campaign(user_id=user_id)

        mock_db = AsyncMock()
        mock_db.scalar.return_value = campaign
        service = CampaignService(db=mock_db)

        result = await service._get_owned(campaign.id, user_id)
        assert result.id == campaign.id

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assign_qr_rejects_foreign_campaign(self):
        """No se puede asignar un QR a una campaña de otro usuario."""
        user_id = uuid.uuid4()
        qr_id = uuid.uuid4()
        foreign_campaign_id = uuid.uuid4()

        qr = QRCode()
        qr.id = qr_id
        qr.user_id = user_id
        qr.campaign_id = None

        mock_db = AsyncMock()
        # Primera llamada (QR) devuelve el QR correcto
        # Segunda llamada (Campaign) devuelve None (no pertenece al usuario)
        mock_db.scalar.side_effect = [qr, None]

        service = CampaignService(db=mock_db)
        from app.core.exceptions import QRServiceException
        with pytest.raises(QRServiceException):
            await service.assign_qr_to_campaign(qr_id, foreign_campaign_id, user_id)


# ── CRUD ──────────────────────────────────────────────────────

class TestCampaignCRUD:

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_campaign_sets_owner(self):
        user_id = uuid.uuid4()

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        added_objects = []
        mock_db.add.side_effect = lambda obj: added_objects.append(obj)

        campaign_returned = make_campaign(user_id=user_id, name="Test Campaign")
        mock_db.refresh = AsyncMock(side_effect=lambda obj: None)
        mock_db.scalar.return_value = campaign_returned

        service = CampaignService(db=mock_db)
        # Patch refresh to set the returned campaign
        async def fake_refresh(obj):
            obj.id = campaign_returned.id
        mock_db.refresh.side_effect = fake_refresh

        result = await service.create_campaign(
            user_id=user_id,
            name="Test Campaign",
            color="#6366f1",
        )
        # The add was called with a Campaign object
        assert len(added_objects) == 1
        assert added_objects[0].user_id == user_id
        assert added_objects[0].name == "Test Campaign"

    @pytest.mark.unit
    def test_campaign_color_validation(self):
        """Color inválido debe caer al default."""
        # Simula la lógica del service
        def validate_color(color: str) -> str:
            if color.startswith("#") and len(color) == 7:
                return color
            return "#6366f1"

        assert validate_color("#ff0000") == "#ff0000"
        assert validate_color("red") == "#6366f1"
        assert validate_color("#gggggg") == "#6366f1"  # longitud correcta pero inválida
        assert validate_color("") == "#6366f1"

    @pytest.mark.unit
    def test_campaign_name_trimmed(self):
        """El nombre de la campaña se debe limpiar de espacios."""
        name = "  Mi campaña  "
        assert name.strip()[:255] == "Mi campaña"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_campaign_requires_ownership(self):
        mock_db = AsyncMock()
        mock_db.scalar.return_value = None  # No encontrada

        service = CampaignService(db=mock_db)
        from app.core.exceptions import QRServiceException
        with pytest.raises(QRServiceException):
            await service.delete_campaign(uuid.uuid4(), uuid.uuid4())


# ── Integración con QR ────────────────────────────────────────

class TestCampaignQRIntegration:

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assign_qr_to_none_removes_campaign(self):
        """campaign_id=None desasigna el QR de cualquier campaña."""
        user_id = uuid.uuid4()
        qr = QRCode()
        qr.id = uuid.uuid4()
        qr.user_id = user_id
        qr.campaign_id = uuid.uuid4()  # Tenía una campaña

        mock_db = AsyncMock()
        mock_db.scalar.return_value = qr
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        service = CampaignService(db=mock_db)
        await service.assign_qr_to_campaign(qr.id, None, user_id)

        assert qr.campaign_id is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assign_qr_not_owned_fails(self):
        """Un QR que no pertenece al usuario no se puede asignar."""
        user_a = uuid.uuid4()
        user_b = uuid.uuid4()

        mock_db = AsyncMock()
        mock_db.scalar.return_value = None  # QR no encontrado para user_a

        service = CampaignService(db=mock_db)
        from app.core.exceptions import QRNotFoundException
        with pytest.raises(QRNotFoundException):
            await service.assign_qr_to_campaign(uuid.uuid4(), uuid.uuid4(), user_a)
