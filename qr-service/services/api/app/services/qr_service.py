"""
QR Service — Sprint 3: soporte de campaign_id en create y update.
"""
import hashlib
import io
import ipaddress
import re
from urllib.parse import urlparse

import qrcode
import shortuuid
import structlog
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers import (
    CircleModuleDrawer, RoundedModuleDrawer, SquareModuleDrawer,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    InvalidURLException, QRLimitExceededException, QRNotFoundException,
    SubscriptionExpiredException,
)
from app.models.models import (
    Campaign, QRCode, QRScan, QRStatus,
    Subscription, SubscriptionPlan, SubscriptionStatus,
)
from app.schemas.qr import QRCreateRequest, QRStyleConfig
from app.services.qr_content_generator import generate_qr_content

logger = structlog.get_logger(__name__)

SHORT_CODE_RE = re.compile(r"^[a-zA-Z0-9]{4,16}$")

URL_BASED_TYPES = {
    "url", "pdf", "youtube", "spotify", "facebook", "instagram",
    "twitter", "tiktok", "linkedin", "amazon", "googledoc",
    "googleforms", "googlesheets", "googlereview", "office365",
    "pptx", "excel", "archivo", "png", "video", "logo",
    "shaped", "booking", "etsy", "linktree", "wechat",
    "line", "kakaotalk",
}

_BLOCKED_HOSTNAMES = frozenset({
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "metadata.google.internal",
    "169.254.169.254",
    "fd00:ec2::254",
    "100.100.100.200",
})

_BLOCKED_SCHEMES = frozenset({
    "javascript", "data", "file", "vbscript", "ftp",
    "dict", "gopher", "ldap", "ldaps",
})

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


class QRService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_qr(self, user_id, request: QRCreateRequest) -> QRCode:
        # Compat: destination_url → payload
        if request.destination_url and not request.payload:
            request.payload = {"url": request.destination_url}
            request.qr_type = "url"

        qr_content = generate_qr_content(request.qr_type, request.payload)
        if not qr_content:
            raise InvalidURLException(reason="El payload no generó contenido válido para el QR")

        if request.qr_type in URL_BASED_TYPES:
            self._validate_url(qr_content)

        subscription = await self._get_active_subscription(user_id)
        await self._enforce_limits(user_id, subscription)

        # Sprint 3: validar campaign_id si se envía
        campaign_id = getattr(request, "campaign_id", None)
        if campaign_id is not None:
            campaign = await self.db.scalar(
                select(Campaign).where(
                    Campaign.id == campaign_id,
                    Campaign.user_id == user_id,
                )
            )
            if not campaign:
                campaign_id = None  # Silenciosamente ignorar campaña inválida

        short_code = self._generate_short_code()

        qr = QRCode(
            user_id=user_id,
            subscription_id=subscription.id,
            campaign_id=campaign_id,
            short_code=short_code,
            title=request.title or self._default_title(request.qr_type, request.payload or {}),
            destination_url=qr_content,
            qr_type=request.qr_type,
            payload=request.payload,
            style_config=request.style.model_dump() if request.style else {},
            expires_at=subscription.expires_at if subscription.plan == SubscriptionPlan.FREE else None,
        )
        self.db.add(qr)
        subscription.qr_used += 1
        await self.db.commit()
        await self.db.refresh(qr)

        logger.info("qr_created", qr_id=str(qr.id), user_id=str(user_id), qr_type=request.qr_type)
        return qr

    async def get_qr_types(self) -> list:
        return QR_TYPES_CATALOG

    async def generate_image(self, qr_id, user_id, fmt: str = "png") -> bytes:
        qr = await self._get_qr_owned_by(qr_id, user_id)
        if qr.qr_type in URL_BASED_TYPES:
            content = f"{settings.BASE_URL}/r/{qr.short_code}"
        else:
            content = qr.destination_url
        style = QRStyleConfig(**(qr.style_config or {}))
        return self._render_qr(content, style, fmt)

    async def track_scan(
        self, short_code: str, ip: str, user_agent: str, referer: str = ""
    ) -> str:
        if not SHORT_CODE_RE.match(short_code):
            raise QRNotFoundException(short_code)

        qr = await self.db.scalar(
            select(QRCode).where(
                QRCode.short_code == short_code,
                QRCode.status == QRStatus.ACTIVE,
            )
        )
        if not qr:
            raise QRNotFoundException(short_code)

        ip_hash = hashlib.sha256(ip.encode()).hexdigest()
        device_type, os_family, browser_family = self._parse_user_agent(user_agent)

        scan = QRScan(
            qr_code_id=qr.id,
            ip_hash=ip_hash,
            user_agent=user_agent[:512] if user_agent else None,
            referer=referer[:512] if referer else None,
            device_type=device_type,
            os_family=os_family,
            browser_family=browser_family,
        )
        self.db.add(scan)
        qr.scan_count += 1
        await self.db.commit()
        return qr.destination_url

    async def get_analytics(self, qr_id, user_id) -> dict:
        qr = await self._get_qr_owned_by(qr_id, user_id)
        subscription = await self._get_active_subscription(user_id)
        if subscription.plan == SubscriptionPlan.FREE:
            raise SubscriptionExpiredException("Analytics requieren un plan de pago.")

        daily_result = await self.db.execute(
            select(
                func.date(QRScan.scanned_at).label("day"),
                func.count(QRScan.id).label("count"),
            )
            .where(QRScan.qr_code_id == qr.id)
            .group_by(func.date(QRScan.scanned_at))
            .order_by(func.date(QRScan.scanned_at).desc())
            .limit(30)
        )
        daily = [{"date": str(r.day), "scans": r.count} for r in daily_result]

        device_result = await self.db.execute(
            select(QRScan.device_type, func.count(QRScan.id).label("count"))
            .where(QRScan.qr_code_id == qr.id, QRScan.device_type.isnot(None))
            .group_by(QRScan.device_type)
        )
        devices = [{"device": r.device_type, "count": r.count} for r in device_result]

        os_result = await self.db.execute(
            select(QRScan.os_family, func.count(QRScan.id).label("count"))
            .where(QRScan.qr_code_id == qr.id, QRScan.os_family.isnot(None))
            .group_by(QRScan.os_family)
            .order_by(func.count(QRScan.id).desc())
            .limit(10)
        )
        os_breakdown = [{"os": r.os_family, "count": r.count} for r in os_result]

        return {
            "total_scans": qr.scan_count,
            "daily_breakdown": daily,
            "by_device": devices,
            "by_os": os_breakdown,
        }

    async def list_qr_codes(
        self,
        user_id,
        skip: int = 0,
        limit: int = 20,
        campaign_id=None,
    ) -> list:
        """Sprint 3: filtrar por campaign_id opcionalmente."""
        q = select(QRCode).where(QRCode.user_id == user_id)
        if campaign_id is not None:
            q = q.where(QRCode.campaign_id == campaign_id)
        q = q.offset(skip).limit(min(limit, 100)).order_by(QRCode.created_at.desc())
        result = await self.db.execute(q)
        return result.scalars().all()

    async def update_qr(self, qr_id, user_id, payload: dict) -> QRCode:
        qr = await self._get_qr_owned_by(qr_id, user_id)

        if "destination_url" in payload and payload["destination_url"] is not None:
            new_url = payload["destination_url"]
            if qr.qr_type in URL_BASED_TYPES:
                self._validate_url(new_url)
            qr.destination_url = new_url

        if "title" in payload and payload["title"] is not None:
            qr.title = payload["title"][:255]

        if "style" in payload and payload["style"] is not None:
            qr.style_config = payload["style"]

        if "status" in payload and payload["status"] is not None:
            qr.status = QRStatus(payload["status"])

        # Sprint 3: actualizar campaign_id
        if "campaign_id" in payload:
            new_campaign_id = payload["campaign_id"]
            if new_campaign_id is not None:
                campaign = await self.db.scalar(
                    select(Campaign).where(
                        Campaign.id == new_campaign_id,
                        Campaign.user_id == user_id,
                    )
                )
                if campaign:
                    qr.campaign_id = new_campaign_id
            else:
                qr.campaign_id = None

        await self.db.commit()
        await self.db.refresh(qr)
        return qr

    async def delete_qr(self, qr_id, user_id) -> None:
        qr = await self._get_qr_owned_by(qr_id, user_id)
        qr.status = QRStatus.INACTIVE
        await self.db.commit()

    # ── Private ───────────────────────────────────────────────

    def _validate_url(self, url: str) -> None:
        try:
            parsed = urlparse(url.strip())
        except Exception:
            raise InvalidURLException(url)

        scheme = (parsed.scheme or "").lower()
        if scheme in _BLOCKED_SCHEMES:
            raise InvalidURLException(url, reason=f"Scheme '{scheme}' no permitido")
        if scheme not in {"http", "https"}:
            raise InvalidURLException(url, reason="Solo se permiten URLs http/https")
        if parsed.username or parsed.password:
            raise InvalidURLException(url, reason="URLs con credenciales no permitidas")

        hostname = (parsed.hostname or "").lower().strip(".")
        if not hostname:
            raise InvalidURLException(url, reason="URL sin hostname válido")
        if hostname in _BLOCKED_HOSTNAMES:
            raise InvalidURLException(url, reason="Destino interno no permitido")

        try:
            ip = ipaddress.ip_address(hostname)
            for network in _PRIVATE_NETWORKS:
                if ip in network:
                    raise InvalidURLException(url, reason="IPs privadas no permitidas")
            if ip.is_loopback or ip.is_multicast or ip.is_reserved:
                raise InvalidURLException(url, reason="IP reservada no permitida")
        except ValueError:
            pass

    async def _enforce_limits(self, user_id, subscription: Subscription) -> None:
        if subscription.qr_used >= subscription.qr_quota:
            raise QRLimitExceededException(
                limit=subscription.qr_quota,
                current_plan=subscription.plan.value,
            )

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

    async def _get_qr_owned_by(self, qr_id, user_id) -> QRCode:
        qr = await self.db.scalar(
            select(QRCode).where(QRCode.id == qr_id, QRCode.user_id == user_id)
        )
        if not qr:
            raise QRNotFoundException(str(qr_id))
        return qr

    def _generate_short_code(self) -> str:
        return shortuuid.uuid()[:8]

    def _default_title(self, qr_type: str, payload: dict) -> str:
        titles = {
            "url":      payload.get("url", "Mi enlace")[:50],
            "whatsapp": f"WhatsApp - {payload.get('phone', '')}",
            "wifi":     f"WiFi - {payload.get('ssid', '')}",
            "vcard":    f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip(),
            "maps":     payload.get("address", "Mi ubicación")[:50],
            "email":    f"Email - {payload.get('email', '')}",
            "phone":    f"Tel - {payload.get('phone', '')}",
            "calendar": payload.get("title", "Mi evento"),
        }
        return titles.get(qr_type, f"QR {qr_type.upper()}")

    def _render_qr(self, content: str, style: "QRStyleConfig", fmt: str) -> bytes:
        import qrcode.constants
        qr = qrcode.QRCode(
            version=None,
            error_correction=getattr(
                qrcode.constants,
                f"ERROR_CORRECT_{style.error_correction}",
                qrcode.constants.ERROR_CORRECT_M,
            ),
            box_size=style.box_size,
            border=style.border,
        )
        qr.add_data(content)
        qr.make(fit=True)

        drawer_map = {
            "rounded": RoundedModuleDrawer(),
            "circle":  CircleModuleDrawer(),
            "square":  SquareModuleDrawer(),
        }
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=drawer_map.get(style.module_style, SquareModuleDrawer()),
            color_mask=SolidFillColorMask(
                back_color=self._hex_to_rgb(style.background_color),
                front_color=self._hex_to_rgb(style.foreground_color),
            ),
        )
        buf = io.BytesIO()
        buf.seek(0)
        img.save(buf, format="PNG")
        return buf.getvalue()

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple:
        h = hex_color.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def _parse_user_agent(ua: str) -> tuple:
        if not ua:
            return None, None, None
        ua_lower = ua.lower()
        bots = {"bot", "crawler", "spider", "curl", "wget", "python-requests", "go-http"}
        if any(b in ua_lower for b in bots):
            return "bot", None, None
        device = "mobile" if ("mobile" in ua_lower and "tablet" not in ua_lower) else \
                 "tablet" if ("tablet" in ua_lower or "ipad" in ua_lower) else "desktop"
        if "windows" in ua_lower:
            os_fam = "Windows"
        elif "android" in ua_lower:
            os_fam = "Android"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os_fam = "iOS"
        elif "mac os" in ua_lower or "macintosh" in ua_lower:
            os_fam = "macOS"
        elif "linux" in ua_lower:
            os_fam = "Linux"
        else:
            os_fam = "Other"
        if "edg/" in ua_lower:
            browser = "Edge"
        elif "chrome/" in ua_lower:
            browser = "Chrome"
        elif "safari/" in ua_lower and "chrome" not in ua_lower:
            browser = "Safari"
        elif "firefox/" in ua_lower:
            browser = "Firefox"
        else:
            browser = "Other"
        return device, os_fam, browser


# ── Catálogo de tipos ─────────────────────────────────────────
QR_TYPES_CATALOG = [
    {"type": "url",         "label": "Enlace / URL",        "icon": "🔗", "category": "Básico",
     "fields": [{"name": "url", "label": "URL", "type": "url", "placeholder": "https://tu-sitio.com", "required": True}]},
    {"type": "text",        "label": "Texto",               "icon": "📝", "category": "Básico",
     "fields": [{"name": "text", "label": "Texto", "type": "textarea", "required": True}]},
    {"type": "whatsapp",    "label": "WhatsApp",            "icon": "💬", "category": "Básico",
     "fields": [
         {"name": "phone",   "label": "Número", "type": "tel", "required": True},
         {"name": "message", "label": "Mensaje", "type": "textarea"},
     ]},
    {"type": "email",       "label": "Correo electrónico",  "icon": "📧", "category": "Básico",
     "fields": [
         {"name": "email",   "label": "Email",   "type": "email", "required": True},
         {"name": "subject", "label": "Asunto",  "type": "text"},
         {"name": "body",    "label": "Mensaje", "type": "textarea"},
     ]},
    {"type": "phone",       "label": "Llamada telefónica",  "icon": "📞", "category": "Básico",
     "fields": [{"name": "phone", "label": "Número", "type": "tel", "required": True}]},
    {"type": "vcard",       "label": "vCard (Contacto)",    "icon": "👤", "category": "Negocios",
     "fields": [
         {"name": "first_name", "label": "Nombre",    "type": "text", "required": True},
         {"name": "last_name",  "label": "Apellido",  "type": "text"},
         {"name": "org",        "label": "Empresa",   "type": "text"},
         {"name": "phone",      "label": "Teléfono",  "type": "tel"},
         {"name": "email",      "label": "Email",     "type": "email"},
         {"name": "website",    "label": "Sitio web", "type": "url"},
     ]},
    {"type": "maps",        "label": "Google Maps",         "icon": "📍", "category": "Negocios",
     "fields": [{"name": "address", "label": "Dirección", "type": "text", "required": True}]},
    {"type": "wifi",        "label": "Wi-Fi",               "icon": "📶", "category": "Negocios",
     "fields": [
         {"name": "ssid",     "label": "Nombre de la red", "type": "text", "required": True},
         {"name": "password", "label": "Contraseña",       "type": "password"},
         {"name": "security", "label": "Seguridad",        "type": "select", "options": ["WPA", "WEP", "nopass"]},
     ]},
    {"type": "pdf",         "label": "PDF",                 "icon": "📄", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL del PDF", "type": "url", "required": True}]},
    {"type": "instagram",   "label": "Instagram",           "icon": "📸", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "youtube",     "label": "YouTube",             "icon": "▶️", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL del canal/video", "type": "url", "required": True}]},
    {"type": "linkedin",    "label": "LinkedIn",            "icon": "💼", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "URL de perfil", "type": "text", "required": True}]},
    {"type": "twitter",     "label": "X (Twitter)",         "icon": "🐦", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "tiktok",      "label": "TikTok",              "icon": "🎵", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "spotify",     "label": "Spotify",             "icon": "🎵", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de Spotify", "type": "url", "required": True}]},
    {"type": "calendar",    "label": "Evento / Calendar",   "icon": "📅", "category": "Eventos",
     "fields": [
         {"name": "title",       "label": "Título del evento", "type": "text", "required": True},
         {"name": "start",       "label": "Inicio",           "type": "datetime-local", "required": True},
         {"name": "end",         "label": "Fin",              "type": "datetime-local"},
         {"name": "location",    "label": "Lugar",            "type": "text"},
         {"name": "description", "label": "Descripción",      "type": "textarea"},
     ]},
    {"type": "googlereview", "label": "Google Review",      "icon": "⭐", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de reseñas", "type": "url", "required": True}]},
    {"type": "booking",     "label": "Reserva en línea",    "icon": "🗓️", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de reserva", "type": "url", "required": True}]},
    {"type": "paypal",      "label": "PayPal",              "icon": "💳", "category": "Negocios",
     "fields": [
         {"name": "email",    "label": "Email PayPal", "type": "email", "required": True},
         {"name": "amount",   "label": "Monto",        "type": "number"},
         {"name": "currency", "label": "Moneda",       "type": "text", "placeholder": "USD"},
     ]},
    {"type": "sms",         "label": "SMS",                 "icon": "✉️", "category": "Básico",
     "fields": [
         {"name": "phone",   "label": "Número", "type": "tel", "required": True},
         {"name": "message", "label": "Mensaje", "type": "textarea"},
     ]},
    {"type": "facebook",    "label": "Facebook",            "icon": "👍", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de perfil/página", "type": "url", "required": True}]},
    {"type": "telegram",    "label": "Telegram",            "icon": "✈️", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "amazon",      "label": "Amazon",              "icon": "📦", "category": "Otros",
     "fields": [{"name": "url", "label": "URL del producto", "type": "url", "required": True}]},
    {"type": "crypto",      "label": "Pago criptográfico",  "icon": "₿", "category": "Pagos",
     "fields": [
         {"name": "coin",    "label": "Criptomoneda", "type": "select", "options": ["bitcoin", "ethereum", "litecoin"]},
         {"name": "address", "label": "Dirección",    "type": "text", "required": True},
     ]},
    {"type": "googledoc",   "label": "Google Doc",          "icon": "📃", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del documento", "type": "url", "required": True}]},
    {"type": "googleforms", "label": "Google Forms",        "icon": "📋", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del formulario", "type": "url", "required": True}]},
    {"type": "googlesheets","label": "Google Sheets",       "icon": "📊", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de la hoja", "type": "url", "required": True}]},
    {"type": "office365",   "label": "Office 365",          "icon": "📎", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de Office 365", "type": "url", "required": True}]},
    {"type": "video",       "label": "Video",               "icon": "🎬", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del video", "type": "url", "required": True}]},
    {"type": "linktree",    "label": "Linktree",            "icon": "🌳", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario", "type": "text", "required": True}]},
    {"type": "etsy",        "label": "Etsy",                "icon": "🛍️", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de tu tienda", "type": "url", "required": True}]},
]
