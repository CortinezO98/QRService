"""
Pydantic Schemas
Sprint 5: is_admin en UserResponse.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(default="")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_admin: bool = False          # Sprint 5
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


# ── QR Styles ─────────────────────────────────────────────────

class QRStyleConfig(BaseModel):
    foreground_color: str = Field(default="#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#ffffff", pattern=r"^#[0-9A-Fa-f]{6}$")
    module_style: str = Field(default="square")
    error_correction: str = Field(default="M")
    box_size: int = Field(default=10, ge=1, le=50)
    border: int = Field(default=4, ge=0, le=20)


# ── QR Requests ───────────────────────────────────────────────

class QRCreateRequest(BaseModel):
    qr_type: str = Field(default="url", min_length=1, max_length=32)
    title: Optional[str] = Field(default=None, max_length=255)
    payload: Optional[Dict[str, Any]] = None
    style: Optional[QRStyleConfig] = None
    destination_url: Optional[str] = Field(default=None, max_length=2048)
    campaign_id: Optional[uuid.UUID] = None


class QRUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    destination_url: Optional[str] = Field(default=None, max_length=2048)
    style: Optional[QRStyleConfig] = None
    is_active: Optional[bool] = None
    status: Optional[str] = Field(default=None, pattern=r"^(active|inactive)$")
    campaign_id: Optional[uuid.UUID] = None


# ── QR Responses ──────────────────────────────────────────────

class QRResponse(BaseModel):
    id: uuid.UUID
    short_code: str
    title: Optional[str]
    destination_url: str
    qr_type: str
    payload: Optional[Dict[str, Any]]
    style_config: Optional[Dict[str, Any]]
    scan_count: int
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    redirect_url: Optional[str] = None
    campaign_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, qr, base_url: str) -> "QRResponse":
        return cls(
            id=qr.id,
            short_code=qr.short_code,
            title=qr.title,
            destination_url=qr.destination_url,
            qr_type=getattr(qr, "qr_type", "url"),
            payload=getattr(qr, "payload", None),
            style_config=qr.style_config,
            scan_count=qr.scan_count,
            status=qr.status.value if hasattr(qr.status, "value") else qr.status,
            expires_at=qr.expires_at,
            created_at=qr.created_at,
            updated_at=qr.updated_at,
            redirect_url=f"{base_url}/r/{qr.short_code}",
            campaign_id=getattr(qr, "campaign_id", None),
        )


class QRListResponse(BaseModel):
    items: List[QRResponse]
    total: int
    page: int
    page_size: int


class QRAnalyticsResponse(BaseModel):
    total_scans: int
    daily_breakdown: List[Dict[str, Any]]
    by_device: Optional[List[Dict[str, Any]]] = None
    by_os: Optional[List[Dict[str, Any]]] = None


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
    id: uuid.UUID
    plan: str
    status: str
    qr_quota: int
    qr_used: int
    starts_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, sub) -> "SubscriptionResponse":
        return cls(
            id=sub.id,
            plan=sub.plan.value if hasattr(sub.plan, "value") else sub.plan,
            status=sub.status.value if hasattr(sub.status, "value") else sub.status,
            qr_quota=sub.qr_quota,
            qr_used=sub.qr_used,
            starts_at=sub.starts_at,
            expires_at=sub.expires_at,
        )
