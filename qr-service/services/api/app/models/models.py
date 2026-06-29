"""
Database Models — SQLAlchemy 2.0
Modelo de negocio:
    FREE:     1 QR/mes, renueva manualmente cada 30 días
    STARTER:  5 QR totales → $10/año
    PRO:      15 QR totales → $20/año
    BUSINESS: 30 QR totales → $30/año

Sprint 1: Agrega StripeEvent para idempotencia de webhooks.
          Elimina referencia a plan ANNUAL.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, Index, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────

class SubscriptionPlan(str, PyEnum):
    FREE     = "free"      # $0  — 1 QR/mes, renovación manual
    STARTER  = "starter"   # $10/año — 5 QR totales
    PRO      = "pro"       # $20/año — 15 QR totales
    BUSINESS = "business"  # $30/año — 30 QR totales


class SubscriptionStatus(str, PyEnum):
    ACTIVE    = "active"
    EXPIRED   = "expired"
    CANCELLED = "cancelled"
    PENDING   = "pending"


class QRStatus(str, PyEnum):
    ACTIVE   = "active"
    INACTIVE = "inactive"   # FREE plan: no renovó el mes
    EXPIRED  = "expired"    # Suscripción venció


# ── Mixins ────────────────────────────────────────────────────

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )


# ── Models ────────────────────────────────────────────────────

class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    subscriptions: Mapped[List["Subscription"]] = relationship(back_populates="user")
    qr_codes: Mapped[List["QRCode"]] = relationship(back_populates="user")


class Subscription(TimestampMixin, Base):
    """
    Suscripción del usuario.
    FREE:     expires_at = 30 días, renovar gratis mes a mes.
    STARTER:  qr_quota = 5  (permanentes)
    PRO:      qr_quota = 15
    BUSINESS: qr_quota = 30
    """
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=SubscriptionPlan.FREE
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=SubscriptionStatus.ACTIVE
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    qr_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    qr_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    amount_paid_usd: Mapped[Optional[float]] = mapped_column(Float)

    user: Mapped["User"] = relationship(back_populates="subscriptions")

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_expires_at", "expires_at"),
    )

    @property
    def qr_remaining(self) -> int:
        return max(0, self.qr_quota - self.qr_used)

    @property
    def is_free_plan(self) -> bool:
        return self.plan == SubscriptionPlan.FREE


class QRCode(TimestampMixin, Base):
    __tablename__ = "qr_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False
    )
    short_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)

    qr_type: Mapped[str] = mapped_column(
        Enum(
            "url", "text", "email", "phone", "whatsapp", "wifi", "sms", "vcard",
            "maps", "pdf", "youtube", "spotify", "facebook", "instagram", "twitter",
            "tiktok", "linkedin", "telegram", "calendar", "paypal", "crypto", "reddit",
            "amazon", "wechat", "snapchat", "venmo", "barcode2d", "upi", "office365",
            "googledoc", "googleforms", "googlesheets", "googlereview", "logo", "shaped",
            "booking", "etsy", "png", "pptx", "excel", "archivo", "linktree", "line",
            "kakaotalk", "pcr", "video",
            name="qrtype", create_type=False,
        ),
        nullable=False, server_default="url"
    )
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    style_config: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    scan_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[QRStatus] = mapped_column(
        Enum(QRStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=QRStatus.ACTIVE
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="qr_codes")
    scans: Mapped[List["QRScan"]] = relationship(back_populates="qr_code", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_qr_codes_user_active", "user_id", "status"),
        Index("ix_qr_codes_short_code", "short_code"),
    )


class QRScan(Base):
    __tablename__ = "qr_scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    qr_code_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qr_codes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    country_code: Mapped[Optional[str]] = mapped_column(String(2))
    referer: Mapped[Optional[str]] = mapped_column(String(512))
    device_type: Mapped[Optional[str]] = mapped_column(String(32))   # mobile/desktop/tablet
    os_family: Mapped[Optional[str]] = mapped_column(String(64))     # iOS/Android/Windows/macOS
    browser_family: Mapped[Optional[str]] = mapped_column(String(64)) # Chrome/Safari/Firefox
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), index=True
    )

    qr_code: Mapped["QRCode"] = relationship(back_populates="scans")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    device_info: Mapped[Optional[str]] = mapped_column(String(512))


class StripeEvent(Base):
    """
    Registro de webhooks de Stripe procesados.
    OWASP A08: Idempotencia — event_id único previene procesamiento doble.
    """
    __tablename__ = "stripe_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="processed"
    )  # processed / failed / ignored
    error: Mapped[Optional[str]] = mapped_column(Text)
