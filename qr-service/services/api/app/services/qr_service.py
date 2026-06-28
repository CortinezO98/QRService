"""
QR Service — Soporte para todos los tipos de QR
SWEBOK v4: Software Design — Open/Closed Principle
Agregar un tipo nuevo = agregar un generador, sin tocar el service.
"""
import io
import hashlib
from urllib.parse import urlparse
import shortuuid
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import (
    RoundedModuleDrawer, CircleModuleDrawer, SquareModuleDrawer,
)
from qrcode.image.styles.colormasks import SolidFillColorMask
import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    QRLimitExceededException, QRNotFoundException,
    InvalidURLException, SubscriptionExpiredException,
)
from app.models.models import QRCode, QRScan, QRStatus, Subscription, SubscriptionPlan, SubscriptionStatus
from app.schemas.qr import QRCreateRequest, QRStyleConfig
from app.services.qr_content_generator import generate_qr_content

logger = structlog.get_logger(__name__)

# Tipos que usan URL directa (se validan contra SSRF)
URL_BASED_TYPES = {"url", "pdf", "youtube", "spotify", "facebook", "instagram",
                   "twitter", "tiktok", "linkedin", "amazon", "googledoc",
                   "googleforms", "googlesheets", "googlereview", "office365",
                   "pptx", "excel", "archivo", "png", "video", "logo",
                   "shaped", "booking", "etsy", "linktree", "wechat",
                   "line", "kakaotalk"}


class QRService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_qr(self, user_id, request: QRCreateRequest) -> QRCode:
        """
        Crea un QR de cualquier tipo.
        1. Genera el contenido según el tipo
        2. Valida si es URL-based (anti-SSRF)
        3. Verifica límites del plan
        4. Guarda en DB con tipo y payload
        """
        # Compatibilidad: si viene destination_url en lugar de payload
        if request.destination_url and not request.payload:
            request.payload = {"url": request.destination_url}
            request.qr_type = "url"

        # 1. Generar el contenido del QR según el tipo
        qr_content = generate_qr_content(request.qr_type, request.payload)

        if not qr_content:
            raise InvalidURLException(reason="El payload no generó contenido válido para el QR")

        # 2. Validar URLs (solo para tipos URL-based)
        if request.qr_type in URL_BASED_TYPES:
            self._validate_url(qr_content)

        # 3. Verificar suscripción y límites
        subscription = await self._get_active_subscription(user_id)
        await self._enforce_limits(user_id, subscription)

        # 4. Short code único para redirect tracking
        short_code = self._generate_short_code()

        # 5. Crear el QR en DB
        qr = QRCode(
            user_id=user_id,
            subscription_id=subscription.id,
            short_code=short_code,
            title=request.title or self._default_title(request.qr_type, request.payload),
            destination_url=qr_content,    # El contenido generado
            qr_type=request.qr_type,
            payload=request.payload,       # Datos originales para edición futura
            style_config=request.style.model_dump() if request.style else {},
            expires_at=subscription.expires_at if subscription.plan == SubscriptionPlan.FREE else None,
        )
        self.db.add(qr)
        subscription.qr_used += 1
        await self.db.commit()
        await self.db.refresh(qr)

        logger.info("qr_created",
            qr_id=str(qr.id),
            user_id=str(user_id),
            qr_type=request.qr_type,
            short_code=short_code,
        )
        return qr

    async def get_qr_types(self) -> list:
        """
        Retorna la lista de todos los tipos de QR con metadata para el frontend.
        Endpoint público — no requiere auth.
        """
        return QR_TYPES_CATALOG

    async def generate_image(self, qr_id, user_id, fmt: str = "png") -> bytes:
        qr = await self._get_qr_owned_by(qr_id, user_id)
        # Para el QR visual, usamos el redirect URL (para tracking)
        # Para tipos que no son URL (wifi, vcard, etc.) usamos el contenido directo
        if qr.qr_type in URL_BASED_TYPES:
            content = f"{settings.BASE_URL}/r/{qr.short_code}"
        else:
            content = qr.destination_url  # Contenido directo (WIFI:, BEGIN:VCARD, etc.)

        style = QRStyleConfig(**(qr.style_config or {}))
        return self._render_qr(content, style, fmt)

    async def track_scan(self, short_code: str, ip: str, user_agent: str, referer: str = "") -> str:
        qr = await self.db.scalar(
            select(QRCode).where(QRCode.short_code == short_code, QRCode.status == QRStatus.ACTIVE)
        )
        if not qr:
            raise QRNotFoundException(short_code)

        ip_hash = hashlib.sha256(ip.encode()).hexdigest()
        scan = QRScan(
            qr_code_id=qr.id,
            ip_hash=ip_hash,
            user_agent=user_agent[:512] if user_agent else None,
            referer=referer[:512] if referer else None,
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
        return {"total_scans": qr.scan_count, "daily_breakdown": daily}

    async def list_qr_codes(self, user_id, skip: int = 0, limit: int = 20) -> list:
        result = await self.db.execute(
            select(QRCode)
            .where(QRCode.user_id == user_id, QRCode.status == QRStatus.ACTIVE)
            .offset(skip).limit(min(limit, 100))
            .order_by(QRCode.created_at.desc())
        )
        return result.scalars().all()

    async def delete_qr(self, qr_id, user_id) -> None:
        qr = await self._get_qr_owned_by(qr_id, user_id)
        qr.status = QRStatus.INACTIVE
        await self.db.commit()

    # ── Private ───────────────────────────────────────────────

    def _validate_url(self, url: str) -> None:
        """OWASP: Anti-SSRF para tipos URL-based."""
        try:
            parsed = urlparse(url)
        except Exception:
            raise InvalidURLException(url)

        if parsed.scheme.lower() not in {"http", "https"}:
            return  # WiFi, vCard, etc. no son URLs — OK

        hostname = (parsed.hostname or "").lower()
        if hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
            raise InvalidURLException(url, reason="Direcciones locales no permitidas")

        import ipaddress
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback:
                raise InvalidURLException(url, reason="IPs privadas no permitidas")
        except ValueError:
            pass

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
        if subscription.plan != SubscriptionPlan.FREE:
            return

        count = await self.db.scalar(
            select(func.count(QRCode.id)).where(
                QRCode.user_id == user_id,
                QRCode.status == QRStatus.ACTIVE,
            )
        )
        if count >= settings.FREE_PLAN_QR_QUOTA:
            raise QRLimitExceededException(
                limit=settings.FREE_PLAN_QR_QUOTA,
                current_plan="free",
            )

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
        """Título automático si el usuario no especifica uno."""
        titles = {
            "url": payload.get("url", "Mi enlace")[:50],
            "whatsapp": f"WhatsApp - {payload.get('phone', '')}",
            "wifi": f"WiFi - {payload.get('ssid', '')}",
            "vcard": f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip(),
            "maps": payload.get("address", "Mi ubicación")[:50],
            "email": f"Email - {payload.get('email', '')}",
            "phone": f"Tel - {payload.get('phone', '')}",
            "calendar": payload.get("title", "Mi evento"),
        }
        return titles.get(qr_type, f"QR {qr_type.upper()}")

    def _render_qr(self, content: str, style: QRStyleConfig, fmt: str) -> bytes:
        import qrcode.constants
        qr = qrcode.QRCode(
            version=None,
            error_correction=getattr(
                qrcode.constants, f"ERROR_CORRECT_{style.error_correction}",
                qrcode.constants.ERROR_CORRECT_M
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
        img.save(buf, format=fmt.upper() if fmt != "svg" else "PNG")
        return buf.getvalue()

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple:
        h = hex_color.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


# ── Catálogo de tipos para el frontend ───────────────────────
QR_TYPES_CATALOG = [
    # ── Básicos ───────────────────────────────────────────────
    {"type": "url",         "label": "Enlace / URL",        "icon": "🔗", "category": "Básico",
     "fields": [{"name": "url", "label": "URL", "type": "url", "placeholder": "https://tu-sitio.com", "required": True}]},
    {"type": "text",        "label": "Texto",               "icon": "📝", "category": "Básico",
     "fields": [{"name": "text", "label": "Texto", "type": "textarea", "placeholder": "Escribe tu texto aquí", "required": True}]},
    {"type": "whatsapp",    "label": "WhatsApp",            "icon": "💬", "category": "Básico",
     "fields": [
         {"name": "phone",   "label": "Número (con código país)", "type": "tel", "placeholder": "+57 300 123 4567", "required": True},
         {"name": "message", "label": "Mensaje predeterminado",  "type": "textarea", "placeholder": "Hola, me comunico desde tu QR"},
     ]},
    {"type": "email",       "label": "Correo electrónico",  "icon": "📧", "category": "Básico",
     "fields": [
         {"name": "email",   "label": "Email",   "type": "email", "placeholder": "contacto@empresa.com", "required": True},
         {"name": "subject", "label": "Asunto",  "type": "text",  "placeholder": "Hola desde tu QR"},
         {"name": "body",    "label": "Mensaje", "type": "textarea"},
     ]},
    {"type": "phone",       "label": "Llamada telefónica",  "icon": "📞", "category": "Básico",
     "fields": [{"name": "phone", "label": "Número de teléfono", "type": "tel", "placeholder": "+57 300 123 4567", "required": True}]},
    {"type": "sms",         "label": "SMS",                 "icon": "💬", "category": "Básico",
     "fields": [
         {"name": "phone",   "label": "Número", "type": "tel", "required": True},
         {"name": "message", "label": "Mensaje", "type": "textarea"},
     ]},

    # ── Negocios ──────────────────────────────────────────────
    {"type": "vcard",       "label": "vCard (Contacto)",    "icon": "👤", "category": "Negocios",
     "fields": [
         {"name": "first_name", "label": "Nombre",    "type": "text", "required": True},
         {"name": "last_name",  "label": "Apellido",  "type": "text"},
         {"name": "org",        "label": "Empresa",   "type": "text"},
         {"name": "title",      "label": "Cargo",     "type": "text"},
         {"name": "phone",      "label": "Teléfono",  "type": "tel"},
         {"name": "mobile",     "label": "Celular",   "type": "tel"},
         {"name": "email",      "label": "Email",     "type": "email"},
         {"name": "website",    "label": "Sitio web", "type": "url"},
         {"name": "address",    "label": "Dirección", "type": "text"},
     ]},
    {"type": "maps",        "label": "Google Maps",         "icon": "📍", "category": "Negocios",
     "fields": [
         {"name": "address", "label": "Dirección o lugar", "type": "text", "placeholder": "Calle 93 #13-24, Bogotá", "required": True},
     ]},
    {"type": "wifi",        "label": "Wi-Fi",               "icon": "📶", "category": "Negocios",
     "fields": [
         {"name": "ssid",     "label": "Nombre de la red", "type": "text",     "required": True},
         {"name": "password", "label": "Contraseña",       "type": "password"},
         {"name": "security", "label": "Seguridad",        "type": "select",
          "options": ["WPA", "WEP", "nopass"]},
     ]},
    {"type": "pdf",         "label": "PDF",                 "icon": "📄", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL del PDF", "type": "url", "placeholder": "https://drive.google.com/...", "required": True}]},
    {"type": "booking",     "label": "Reserva en línea",    "icon": "📅", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de reserva", "type": "url", "required": True}]},
    {"type": "googlereview","label": "Google Review",       "icon": "⭐", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de reseñas de Google", "type": "url", "required": True}]},
    {"type": "paypal",      "label": "PayPal",              "icon": "💳", "category": "Negocios",
     "fields": [
         {"name": "email",    "label": "Email de PayPal", "type": "email", "required": True},
         {"name": "amount",   "label": "Monto",           "type": "number"},
         {"name": "currency", "label": "Moneda",          "type": "text", "placeholder": "USD"},
         {"name": "item_name","label": "Descripción",     "type": "text"},
     ]},
    {"type": "etsy",        "label": "Etsy",                "icon": "🛍️", "category": "Negocios",
     "fields": [{"name": "url", "label": "URL de tu tienda Etsy", "type": "url", "required": True}]},

    # ── Redes Sociales ────────────────────────────────────────
    {"type": "instagram",   "label": "Instagram",           "icon": "📸", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "placeholder": "miusuario", "required": True}]},
    {"type": "facebook",    "label": "Facebook",            "icon": "👍", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de perfil o página", "type": "url", "required": True}]},
    {"type": "tiktok",      "label": "TikTok",              "icon": "🎵", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "placeholder": "miusuario", "required": True}]},
    {"type": "twitter",     "label": "X (Twitter)",         "icon": "🐦", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "linkedin",    "label": "LinkedIn",            "icon": "💼", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "URL de perfil", "type": "text", "required": True}]},
    {"type": "telegram",    "label": "Telegram",            "icon": "✈️", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario (@)", "type": "text", "required": True}]},
    {"type": "snapchat",    "label": "Snapchat",            "icon": "👻", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario", "type": "text", "required": True}]},
    {"type": "reddit",      "label": "Reddit",              "icon": "🤖", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario u/", "type": "text", "required": True}]},
    {"type": "youtube",     "label": "YouTube",             "icon": "▶️", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL del canal o video", "type": "url", "required": True}]},
    {"type": "spotify",     "label": "Spotify",             "icon": "🎵", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de Spotify", "type": "url", "required": True}]},
    {"type": "linktree",    "label": "Linktree",            "icon": "🌳", "category": "Redes Sociales",
     "fields": [{"name": "username", "label": "Usuario", "type": "text", "required": True}]},
    {"type": "wechat",      "label": "WeChat",              "icon": "💬", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de WeChat", "type": "url", "required": True}]},
    {"type": "line",        "label": "Line",                "icon": "💬", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de Line", "type": "url", "required": True}]},
    {"type": "kakaotalk",   "label": "KakaoTalk",           "icon": "💛", "category": "Redes Sociales",
     "fields": [{"name": "url", "label": "URL de KakaoTalk", "type": "url", "required": True}]},

    # ── Pagos ─────────────────────────────────────────────────
    {"type": "crypto",      "label": "Pago criptográfico",  "icon": "₿", "category": "Pagos",
     "fields": [
         {"name": "coin",    "label": "Criptomoneda", "type": "select", "options": ["bitcoin", "ethereum", "litecoin"]},
         {"name": "address", "label": "Dirección",    "type": "text", "required": True},
         {"name": "amount",  "label": "Monto",        "type": "number"},
     ]},
    {"type": "upi",         "label": "UPI",                 "icon": "💳", "category": "Pagos",
     "fields": [
         {"name": "vpa",    "label": "UPI VPA",  "type": "text", "required": True},
         {"name": "name",   "label": "Nombre",   "type": "text"},
         {"name": "amount", "label": "Monto",    "type": "number"},
     ]},
    {"type": "venmo",       "label": "Venmo",               "icon": "💸", "category": "Pagos",
     "fields": [{"name": "username", "label": "Usuario Venmo", "type": "text", "required": True}]},

    # ── Documentos ────────────────────────────────────────────
    {"type": "googledoc",   "label": "Google Doc",          "icon": "📃", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del documento", "type": "url", "required": True}]},
    {"type": "googleforms", "label": "Google Forms",        "icon": "📋", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del formulario", "type": "url", "required": True}]},
    {"type": "googlesheets","label": "Google Sheets",       "icon": "📊", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de la hoja", "type": "url", "required": True}]},
    {"type": "office365",   "label": "Office 365",          "icon": "📎", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de Office 365", "type": "url", "required": True}]},
    {"type": "pptx",        "label": "Presentación",        "icon": "📊", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de la presentación", "type": "url", "required": True}]},
    {"type": "excel",       "label": "Excel",               "icon": "📈", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del Excel", "type": "url", "required": True}]},
    {"type": "archivo",     "label": "Archivo",             "icon": "📁", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del archivo", "type": "url", "required": True}]},
    {"type": "png",         "label": "PNG / Imagen",        "icon": "🖼️", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL de la imagen", "type": "url", "required": True}]},
    {"type": "video",       "label": "Video",               "icon": "🎬", "category": "Documentos",
     "fields": [{"name": "url", "label": "URL del video", "type": "url", "required": True}]},

    # ── Eventos ───────────────────────────────────────────────
    {"type": "calendar",    "label": "Evento / Calendar",   "icon": "📅", "category": "Eventos",
     "fields": [
         {"name": "title",       "label": "Título del evento", "type": "text", "required": True},
         {"name": "start",       "label": "Inicio",           "type": "datetime-local", "required": True},
         {"name": "end",         "label": "Fin",              "type": "datetime-local"},
         {"name": "location",    "label": "Lugar",            "type": "text"},
         {"name": "description", "label": "Descripción",      "type": "textarea"},
     ]},

    # ── Otros ─────────────────────────────────────────────────
    {"type": "amazon",      "label": "Amazon",              "icon": "📦", "category": "Otros",
     "fields": [{"name": "url", "label": "URL del producto Amazon", "type": "url", "required": True}]},
    {"type": "pcr",         "label": "PCR / Código de barras", "icon": "🔲", "category": "Otros",
     "fields": [{"name": "data", "label": "Datos del código", "type": "text", "required": True}]},
    {"type": "barcode2d",   "label": "Código de barras 2D", "icon": "⬛", "category": "Otros",
     "fields": [{"name": "data", "label": "Datos", "type": "text", "required": True}]},
]
