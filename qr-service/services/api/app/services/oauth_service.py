"""
OAuth2 Social Login Service
Proveedores: Google, Facebook
SWEBOK v4: Software Security — Third-party Authentication
OWASP: A07 — Secure token handling, state parameter anti-CSRF
"""
import secrets
import httpx
import structlog
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import InvalidCredentialsException
from app.models.models import User, Subscription, SubscriptionPlan, SubscriptionStatus
from app.services.auth_service import create_access_token, create_refresh_token, hash_token
from app.models.models import RefreshToken

logger = structlog.get_logger(__name__)


# ── Google OAuth2 ─────────────────────────────────────────────

GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

FACEBOOK_AUTH_URL    = "https://www.facebook.com/v18.0/dialog/oauth"
FACEBOOK_TOKEN_URL   = "https://graph.facebook.com/v18.0/oauth/access_token"
FACEBOOK_USERINFO_URL = "https://graph.facebook.com/me"


class OAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Google ────────────────────────────────────────────────

    def get_google_auth_url(self, state: str) -> str:
        """Genera la URL de autorización de Google con state anti-CSRF."""
        params = {
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope":         "openid email profile",
            "state":         state,
            "access_type":   "offline",
            "prompt":        "select_account",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{GOOGLE_AUTH_URL}?{query}"

    async def handle_google_callback(self, code: str) -> dict:
        """
        Intercambia el code por tokens y obtiene el perfil del usuario.
        Crea o actualiza el usuario en la BD.
        """
        async with httpx.AsyncClient() as client:
            # 1. Intercambiar code por access_token
            token_resp = await client.post(GOOGLE_TOKEN_URL, data={
                "client_id":     settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code":          code,
                "grant_type":    "authorization_code",
                "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            })
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # 2. Obtener perfil del usuario
            user_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_resp.raise_for_status()
            profile = user_resp.json()

        email = profile.get("email")
        if not email:
            raise InvalidCredentialsException("Google no retornó un email válido")

        return await self._get_or_create_social_user(
            email=email,
            full_name=profile.get("name", ""),
            provider="google",
            provider_id=profile.get("id", ""),
            is_verified=profile.get("verified_email", False),
        )

    # ── Facebook ──────────────────────────────────────────────

    def get_facebook_auth_url(self, state: str) -> str:
        params = {
            "client_id":     settings.FACEBOOK_CLIENT_ID,
            "redirect_uri":  settings.FACEBOOK_REDIRECT_URI,
            "state":         state,
            "scope":         "email,public_profile",
            "response_type": "code",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{FACEBOOK_AUTH_URL}?{query}"

    async def handle_facebook_callback(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            # 1. Intercambiar code por access_token
            token_resp = await client.get(FACEBOOK_TOKEN_URL, params={
                "client_id":     settings.FACEBOOK_CLIENT_ID,
                "client_secret": settings.FACEBOOK_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  settings.FACEBOOK_REDIRECT_URI,
            })
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # 2. Obtener perfil
            user_resp = await client.get(
                FACEBOOK_USERINFO_URL,
                params={
                    "fields":       "id,name,email",
                    "access_token": tokens["access_token"],
                },
            )
            user_resp.raise_for_status()
            profile = user_resp.json()

        email = profile.get("email")
        if not email:
            raise InvalidCredentialsException(
                "Facebook no retornó un email. Asegúrate de dar permiso de email."
            )

        return await self._get_or_create_social_user(
            email=email,
            full_name=profile.get("name", ""),
            provider="facebook",
            provider_id=profile.get("id", ""),
            is_verified=True,  # Facebook verifica emails
        )

    # ── Shared: crear o recuperar usuario ────────────────────

    async def _get_or_create_social_user(
        self,
        email: str,
        full_name: str,
        provider: str,
        provider_id: str,
        is_verified: bool,
    ) -> dict:
        """
        Si el usuario ya existe (por email) lo autentica.
        Si no existe, lo crea con suscripción FREE automática.
        No requiere contraseña — la identidad viene del proveedor OAuth.
        """
        email = email.lower().strip()

        # Buscar usuario existente
        user = await self.db.scalar(
            select(User).where(User.email == email)
        )

        if user:
            # Usuario existente — actualizar si es necesario
            if not user.is_verified and is_verified:
                user.is_verified = True
            if not user.is_active:
                raise InvalidCredentialsException("Esta cuenta está desactivada.")
        else:
            # Crear nuevo usuario
            user = User(
                email=email,
                password_hash="oauth_no_password",  # Sin contraseña
                full_name=full_name,
                is_active=True,
                is_verified=is_verified,
                verified_at=datetime.now(timezone.utc) if is_verified else None,
            )
            self.db.add(user)
            await self.db.flush()

            # Crear suscripción FREE automática
            from app.services.subscription_service import SubscriptionService
            sub_service = SubscriptionService(self.db)
            await sub_service.create_free_subscription(user.id)

            logger.info("oauth_user_created",
                email=email, provider=provider, user_id=str(user.id))

        await self.db.commit()
        await self.db.refresh(user)

        # Generar tokens JWT
        access_token = create_access_token(user.id, user.email)
        raw_refresh, hashed_refresh = create_refresh_token()

        refresh_token_obj = RefreshToken(
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS
            ),
        )
        self.db.add(refresh_token_obj)
        await self.db.commit()

        logger.info("oauth_login_success",
            email=email, provider=provider, user_id=str(user.id))

        return {
            "access_token":  access_token,
            "refresh_token": raw_refresh,
            "token_type":    "bearer",
            "expires_in":    settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id":          str(user.id),
                "email":       user.email,
                "full_name":   user.full_name,
                "is_verified": user.is_verified,
            }
        }
