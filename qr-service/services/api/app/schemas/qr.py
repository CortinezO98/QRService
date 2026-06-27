"""
Pydantic Schemas — Request/Response DTOs
SWEBOK v4: Software Design — Data Transfer Objects
OWASP: Input validation at boundary (never trust user input)
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Auth Schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)

    @field_validator("full_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        # Strip HTML/scripts from name field
        import re
        cleaned = re.sub(r"<[^>]+>", "", v).strip()
        if not cleaned:
            raise ValueError("Full name cannot be empty after sanitization")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── QR Schemas ────────────────────────────────────────────────

class QRStyleConfig(BaseModel):
    """QR visual customization options."""
    foreground_color: str = Field(default="#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    error_correction: str = Field(default="M", pattern=r"^[LMQH]$")
    box_size: int = Field(default=10, ge=5, le=50)
    border: int = Field(default=4, ge=1, le=10)
    module_style: str = Field(default="square", pattern=r"^(square|rounded|circle)$")

    @model_validator(mode="after")
    def colors_must_be_different(self) -> "QRStyleConfig":
        if self.foreground_color.upper() == self.background_color.upper():
            raise ValueError("Foreground and background colors must be different")
        return self


class QRCreateRequest(BaseModel):
    destination_url: str = Field(
        min_length=7,
        max_length=2048,
        description="Target URL the QR code redirects to",
        examples=["https://example.com/my-page"],
    )
    title: Optional[str] = Field(default=None, max_length=255)
    style: Optional[QRStyleConfig] = None

    @field_validator("destination_url")
    @classmethod
    def url_must_be_http(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class QRUpdateRequest(BaseModel):
    destination_url: Optional[str] = Field(default=None, min_length=7, max_length=2048)
    title: Optional[str] = Field(default=None, max_length=255)
    style: Optional[QRStyleConfig] = None
    is_active: Optional[bool] = None


class QRResponse(BaseModel):
    id: UUID
    short_code: str
    title: Optional[str]
    destination_url: str
    scan_count: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    redirect_url: str
    style_config: Optional[dict]

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, qr, base_url: str) -> "QRResponse":
        return cls(
            **{k: getattr(qr, k) for k in cls.model_fields if hasattr(qr, k)},
            redirect_url=f"{base_url}/r/{qr.short_code}",
        )


class QRListResponse(BaseModel):
    items: List[QRResponse]
    total: int
    page: int
    page_size: int


class QRAnalyticsResponse(BaseModel):
    total_scans: int
    daily_breakdown: List[dict]


# ── Subscription Schemas ──────────────────────────────────────

class SubscriptionResponse(BaseModel):
    id: UUID
    plan: str
    status: str
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
            starts_at=sub.starts_at,
            expires_at=sub.expires_at,
            days_remaining=days,
        )


class CheckoutResponse(BaseModel):
    checkout_url: str
    plan: str = "annual"
    price_usd: float


# ── Common Schemas ────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None
