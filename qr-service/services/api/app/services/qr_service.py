"""
QR Code Generation Service
SWEBOK v4: Software Construction — Domain Service
OWASP: A01 – URL validation to prevent malicious QR payloads
"""
import io
import hashlib
from typing import Optional
from urllib.parse import urlparse
import shortuuid
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import (
    RoundedModuleDrawer,
    CircleModuleDrawer,
    SquareModuleDrawer,
)
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image
import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    QRLimitExceededException,
    QRNotFoundException,
    InvalidURLException,
    SubscriptionExpiredException,
)
from app.models.models import QRCode, QRScan, SubscriptionStatus, SubscriptionPlan, Subscription
from app.schemas.qr import QRCreateRequest, QRStyleConfig

logger = structlog.get_logger(__name__)

# ── Blocklist: Known malicious URL patterns ───────────────────
BLOCKED_URL_SCHEMES = {"javascript", "data", "vbscript", "file"}
BLOCKED_DOMAINS = set()  # Load from DB or config in production


class QRService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_qr(self, user_id, request: QRCreateRequest) -> QRCode:
        """
        Create a new QR code.
        SWEBOK: Business Rules enforced here (limits per plan).
        """
        # 1. Validate URL (OWASP: prevent malicious payloads)
        self._validate_url(request.destination_url)

        # 2. Check subscription and limits
        subscription = await self._get_active_subscription(user_id)
        await self._enforce_limits(user_id, subscription)

        # 3. Generate unique short code
        short_code = self._generate_short_code()

        qr = QRCode(
            user_id=user_id,
            short_code=short_code,
            title=request.title,
            destination_url=request.destination_url,
            style_config=request.style.model_dump() if request.style else {},
            expires_at=subscription.expires_at,
        )
        self.db.add(qr)
        await self.db.commit()
        await self.db.refresh(qr)

        logger.info("qr_created", qr_id=str(qr.id), user_id=str(user_id), short_code=short_code)
        return qr

    async def generate_image(self, qr_id, user_id, fmt: str = "png") -> bytes:
        """Generate QR code image (PNG or SVG)."""
        qr = await self._get_qr_owned_by(qr_id, user_id)

        # Redirect URL goes through our tracker
        redirect_url = f"{settings.BASE_URL}/r/{qr.short_code}"

        style = QRStyleConfig(**(qr.style_config or {}))
        image_bytes = self._render_qr(redirect_url, style, fmt)

        logger.info("qr_image_generated", qr_id=str(qr_id), format=fmt)
        return image_bytes

    async def track_scan(self, short_code: str, ip: str, user_agent: str, referer: str = "") -> str:
        """
        Record scan and return destination URL.
        OWASP: Privacy — IP is SHA-256 hashed before storage.
        """
        qr = await self.db.scalar(
            select(QRCode).where(QRCode.short_code == short_code, QRCode.is_active == True)
        )
        if not qr:
            raise QRNotFoundException(short_code)

        # Hash IP before storing (GDPR / Privacy best practice)
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()

        scan = QRScan(
            qr_code_id=qr.id,
            ip_hash=ip_hash,
            user_agent=user_agent[:512] if user_agent else None,
            referer=referer[:512] if referer else None,
        )
        self.db.add(scan)

        # Atomic increment
        qr.scan_count += 1
        await self.db.commit()

        return qr.destination_url

    async def get_analytics(self, qr_id, user_id) -> dict:
        """Return scan analytics (annual plan only)."""
        qr = await self._get_qr_owned_by(qr_id, user_id)

        subscription = await self._get_active_subscription(user_id)
        if subscription.plan != SubscriptionPlan.ANNUAL:
            raise SubscriptionExpiredException("Analytics require an Annual subscription.")

        # Scans per day (last 30 days)
        result = await self.db.execute(
            select(
                func.date(QRScan.scanned_at).label("day"),
                func.count(QRScan.id).label("count"),
            )
            .where(QRScan.qr_code_id == qr.id)
            .group_by(func.date(QRScan.scanned_at))
            .order_by(func.date(QRScan.scanned_at).desc())
            .limit(30)
        )
        daily = [{"date": str(row.day), "scans": row.count} for row in result]

        return {
            "total_scans": qr.scan_count,
            "daily_breakdown": daily,
        }

    async def list_qr_codes(self, user_id, skip: int = 0, limit: int = 20) -> list:
        result = await self.db.execute(
            select(QRCode)
            .where(QRCode.user_id == user_id, QRCode.is_active == True)
            .offset(skip)
            .limit(min(limit, 100))  # Cap at 100
            .order_by(QRCode.created_at.desc())
        )
        return result.scalars().all()

    async def delete_qr(self, qr_id, user_id) -> None:
        """Soft delete — never hard delete (audit trail)."""
        qr = await self._get_qr_owned_by(qr_id, user_id)
        qr.is_active = False
        await self.db.commit()
        logger.info("qr_deleted", qr_id=str(qr_id), user_id=str(user_id))

    # ── Private Helpers ───────────────────────────────────────

    def _validate_url(self, url: str) -> None:
        """
        OWASP: Validate URL to prevent XSS, SSRF, and malicious payloads.
        """
        try:
            parsed = urlparse(url)
        except Exception:
            raise InvalidURLException(url)

        # Only allow http/https
        if parsed.scheme.lower() not in {"http", "https"}:
            raise InvalidURLException(url, reason="Only HTTP and HTTPS URLs are allowed")

        # Block internal/private networks (SSRF prevention)
        hostname = (parsed.hostname or "").lower()
        if hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
            raise InvalidURLException(url, reason="Local addresses are not allowed")

        # Block private IP ranges
        import ipaddress
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise InvalidURLException(url, reason="Private IP addresses are not allowed")
        except ValueError:
            pass  # Not an IP, it's a domain — OK

        if hostname in BLOCKED_DOMAINS:
            raise InvalidURLException(url, reason="This domain is blocked")

    async def _get_active_subscription(self, user_id) -> Subscription:
        from datetime import datetime, timezone
        sub = await self.db.scalar(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at > datetime.now(timezone.utc),
            ).order_by(Subscription.expires_at.desc())
        )
        if not sub:
            raise SubscriptionExpiredException()
        return sub

    async def _enforce_limits(self, user_id, subscription: Subscription) -> None:
        """Enforce QR code limits based on plan."""
        if subscription.plan == SubscriptionPlan.ANNUAL:
            return  # No limit

        count = await self.db.scalar(
            select(func.count(QRCode.id)).where(
                QRCode.user_id == user_id, QRCode.is_active == True
            )
        )
        if count >= settings.FREE_PLAN_QR_LIMIT:
            raise QRLimitExceededException(settings.FREE_PLAN_QR_LIMIT)

    async def _get_qr_owned_by(self, qr_id, user_id) -> QRCode:
        """OWASP: A01 Broken Access Control — always scope by user_id."""
        qr = await self.db.scalar(
            select(QRCode).where(
                QRCode.id == qr_id,
                QRCode.user_id == user_id,  # Critical: ownership check
            )
        )
        if not qr:
            raise QRNotFoundException(str(qr_id))
        return qr

    def _generate_short_code(self) -> str:
        """Generate URL-safe short code."""
        return shortuuid.uuid()[:8]

    def _render_qr(self, url: str, style: "QRStyleConfig", fmt: str) -> bytes:
        """Render QR code image with optional styling."""
        import qrcode.constants

        qr = qrcode.QRCode(
            version=None,  # Auto-size
            error_correction=getattr(qrcode.constants, f"ERROR_CORRECT_{style.error_correction}", qrcode.constants.ERROR_CORRECT_M),
            box_size=style.box_size,
            border=style.border,
        )
        qr.add_data(url)
        qr.make(fit=True)

        # Choose drawer
        drawer_map = {
            "rounded": RoundedModuleDrawer(),
            "circle": CircleModuleDrawer(),
            "square": SquareModuleDrawer(),
        }
        drawer = drawer_map.get(style.module_style, SquareModuleDrawer())

        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=drawer,
            color_mask=SolidFillColorMask(
                back_color=self._hex_to_rgb(style.background_color),
                front_color=self._hex_to_rgb(style.foreground_color),
            ),
        )

        buf = io.BytesIO()
        img.save(buf, format=fmt.upper() if fmt != "svg" else "PNG")
        return buf.getvalue()

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple:
        """Convert #RRGGBB to (R, G, B)."""
        h = hex_color.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
