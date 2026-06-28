"""
QR Schemas actualizados — soporte para todos los tipos de QR
"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# ── Todos los tipos disponibles ───────────────────────────────
QR_TYPE = Literal[
    "url", "text", "email", "phone", "whatsapp",
    "wifi", "sms", "vcard", "maps", "pdf",
    "youtube", "spotify", "facebook", "instagram",
    "twitter", "tiktok", "linkedin", "telegram",
    "calendar", "paypal", "crypto", "reddit",
    "amazon", "wechat", "snapchat", "venmo",
    "barcode2d", "upi", "office365", "googledoc",
    "googleforms", "googlesheets", "googlereview",
    "logo", "shaped", "booking", "etsy", "png",
    "pptx", "excel", "archivo", "linktree", "line",
    "kakaotalk", "pcr", "video",
]


# ── Style ─────────────────────────────────────────────────────
class QRStyleConfig(BaseModel):
    foreground_color: str = Field(default="#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    error_correction: str = Field(default="M", pattern=r"^[LMQH]$")
    box_size: int = Field(default=10, ge=5, le=50)
    border: int = Field(default=4, ge=1, le=10)
    module_style: str = Field(default="square", pattern=r"^(square|rounded|circle)$")


# ── Create Request ────────────────────────────────────────────
class QRCreateRequest(BaseModel):
    """
    Nuevo schema flexible: en vez de destination_url fijo,
    acepta cualquier tipo con su payload estructurado.
    """
    qr_type: QR_TYPE = Field(default="url", description="Tipo de QR a generar")
    title: Optional[str] = Field(default=None, max_length=255)
    payload: Dict[str, Any] = Field(
        description="Datos del QR según el tipo. Ej: {'url': 'https://...'} para tipo url"
    )
    style: Optional[QRStyleConfig] = None

    # Compatibilidad hacia atrás con destination_url
    destination_url: Optional[str] = Field(default=None, max_length=2048)

    @field_validator("payload")
    @classmethod
    def payload_not_empty(cls, v):
        if not v:
            raise ValueError("El payload no puede estar vacío")
        return v


# ── Update Request ────────────────────────────────────────────
class QRUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    payload: Optional[Dict[str, Any]] = None
    style: Optional[QRStyleConfig] = None


# ── Response ──────────────────────────────────────────────────
class QRResponse(BaseModel):
    id: UUID
    short_code: str
    title: Optional[str]
    qr_type: str
    destination_url: str         # El string generado (URL de redirect)
    payload: Optional[dict]      # Datos originales estructurados
    scan_count: int
    status: str
    created_at: datetime
    expires_at: Optional[datetime]
    redirect_url: str
    style_config: Optional[dict]

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, qr, base_url: str) -> "QRResponse":
        return cls(
            id=qr.id,
            short_code=qr.short_code,
            title=qr.title,
            qr_type=qr.qr_type if hasattr(qr, 'qr_type') else "url",
            destination_url=qr.destination_url,
            payload=qr.payload,
            scan_count=qr.scan_count,
            status=qr.status.value,
            created_at=qr.created_at,
            expires_at=qr.expires_at,
            redirect_url=f"{base_url}/r/{qr.short_code}",
            style_config=qr.style_config,
        )


class QRListResponse(BaseModel):
    items: List[QRResponse]
    total: int
    page: int
    page_size: int


class QRAnalyticsResponse(BaseModel):
    total_scans: int
    daily_breakdown: List[dict]


# ── Tipos info (para el frontend) ────────────────────────────
class QRTypeInfo(BaseModel):
    type: str
    label: str
    description: str
    icon: str
    category: str
    fields: List[dict]    # Campos del formulario dinámico


# ── Billing ───────────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    plan: str = Field(pattern=r"^(starter|pro|business)$")


class CheckoutResponse(BaseModel):
    checkout_url: str
    plan: str
    price_usd: float
    qr_quota: int
    price_per_qr: float
    duration_days: int


class SubscriptionResponse(BaseModel):
    id: UUID
    plan: str
    status: str
    qr_quota: int
    qr_used: int
    qr_remaining: int
    starts_at: datetime
    expires_at: datetime
    days_remaining: int

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, sub) -> "SubscriptionResponse":
        from datetime import timezone
        now = datetime.now(timezone.utc)
        days = max(0, (sub.expires_at - now).days)
        return cls(
            id=sub.id,
            plan=sub.plan.value,
            status=sub.status.value,
            qr_quota=sub.qr_quota,
            qr_used=sub.qr_used,
            qr_remaining=sub.qr_remaining,
            starts_at=sub.starts_at,
            expires_at=sub.expires_at,
            days_remaining=days,
        )


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None


# ── Auth ──────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)

    @field_validator("full_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        import re
        cleaned = re.sub(r"<[^>]+>", "", v).strip()
        if not cleaned:
            raise ValueError("El nombre no puede estar vacío.")
        return cleaned


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
