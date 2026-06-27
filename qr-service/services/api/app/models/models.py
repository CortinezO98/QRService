"""
Database Models — SQLAlchemy 2.0
SWEBOK v4: Software Design — Data Management
OWASP: A03:2021 – Injection Prevention (ORM, no raw SQL)
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────

class SubscriptionPlan(str, PyEnum):
    FREE = "free"
    ANNUAL = "annual"


class SubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class QRErrorCorrection(str, PyEnum):
    L = "L"  # ~7% correction
    M = "M"  # ~15% correction
    Q = "Q"  # ~25% correction
    H = "H"  # ~30% correction (recommended for logos)


# ── Models ────────────────────────────────────────────────────

class TimestampMixin:
    """Reusable audit timestamps."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )


class User(TimestampMixin, Base):
    """
    User account.
    OWASP: A07 – Authentication: passwords stored as bcrypt hash, never plain text.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Rate limit override for verified annual users
    rate_limit_override: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    subscriptions: Mapped[List["Subscription"]] = relationship(back_populates="user")
    qr_codes: Mapped[List["QRCode"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class Subscription(TimestampMixin, Base):
    """
    Subscription / License management.
    SWEBOK v4: Business Rules — Free (30d) vs Annual (365d)
    """
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan), nullable=False, default=SubscriptionPlan.FREE
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Stripe integration
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    amount_paid_usd: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="subscriptions")

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_expires_at", "expires_at"),
    )


class QRCode(TimestampMixin, Base):
    """
    QR Code entity with tracking and styling.
    SWEBOK v4: Software Design — Entity with rich behavior
    """
    __tablename__ = "qr_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    short_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)

    # Style config stored as JSONB for flexibility
    style_config: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    # Analytics
    scan_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="qr_codes")
    scans: Mapped[List["QRScan"]] = relationship(back_populates="qr_code", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_qr_codes_user_active", "user_id", "is_active"),
    )


class QRScan(Base):
    """
    Scan analytics log.
    OWASP: Privacy — IP is hashed (SHA-256), never stored raw.
    """
    __tablename__ = "qr_scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    qr_code_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qr_codes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64))  # SHA-256 of IP
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    country_code: Mapped[Optional[str]] = mapped_column(String(2))
    referer: Mapped[Optional[str]] = mapped_column(String(512))
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), index=True
    )

    qr_code: Mapped["QRCode"] = relationship(back_populates="scans")

    __table_args__ = (
        Index("ix_qr_scans_code_time", "qr_code_id", "scanned_at"),
    )


class RefreshToken(Base):
    """
    Refresh token store for JWT rotation.
    OWASP: A07 – Token invalidation support.
    """
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    device_info: Mapped[Optional[str]] = mapped_column(String(512))
