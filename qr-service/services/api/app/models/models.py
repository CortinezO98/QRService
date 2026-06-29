"""
Database Models — SQLAlchemy 2.0
Sprint 3: Agrega Campaign y campaign_id en QRCode.
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
    FREE     = "free"
    STARTER  = "starter"
    PRO      = "pro"
    BUSINESS = "business"


class SubscriptionStatus(str, PyEnum):
    ACTIVE    = "active"
    EXPIRED   = "expired"
    CANCELLED = "cancelled"
    PENDING   = "pending"


class QRStatus(str, PyEnum):
    ACTIVE   = "active"
    INACTIVE = "inactive"
    EXPIRED  = "expired"


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
    campaigns: Mapped[List["Campaign"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Subscription(TimestampMixin, Base):
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


class Campaign(TimestampMixin, Base):
    """
    Campaña / Carpeta para agrupar QR codes.
    Sprint 3: Diferenciador de producto para STARTER, PRO y BUSINESS.
    """
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")  # hex color

    user: Mapped["User"] = relationship(back_populates="campaigns")
    qr_codes: Mapped[List["QRCode"]] = relationship(back_populates="campaign")

    __table_args__ = (
        Index("ix_campaigns_user_id", "user_id"),
    )


class QRCode(TimestampMixin, Base):
    __tablename__ = "qr_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False
    )
    # Sprint 3: campaign_id opcional
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True
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
    campaign: Mapped[Optional["Campaign"]] = relationship(back_populates="qr_codes")
    scans: Mapped[List["QRScan"]] = relationship(back_populates="qr_code", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_qr_codes_user_active", "user_id", "status"),
        Index("ix_qr_codes_short_code", "short_code"),
        Index("ix_qr_codes_campaign_id", "campaign_id"),
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
    device_type: Mapped[Optional[str]] = mapped_column(String(32))
    os_family: Mapped[Optional[str]] = mapped_column(String(64))
    browser_family: Mapped[Optional[str]] = mapped_column(String(64))
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
    __tablename__ = "stripe_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="processed")
    error: Mapped[Optional[str]] = mapped_column(Text)
