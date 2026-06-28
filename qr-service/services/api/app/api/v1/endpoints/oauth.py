"""
OAuth2 Endpoints — Google y Facebook
OWASP: State parameter para prevenir CSRF en OAuth flows
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.redis import get_redis_client
from app.services.oauth_service import OAuthService
from app.core.config import settings

router = APIRouter()

# TTL del state en Redis (10 minutos)
STATE_TTL = 600


# ── Google ────────────────────────────────────────────────────

@router.get("/google")
async def google_login():
    """
    Inicia el flujo OAuth con Google.
    Genera un state aleatorio (anti-CSRF) y redirige a Google.
    """
    state = secrets.token_urlsafe(32)
    redis = await get_redis_client()
    await redis.setex(f"oauth:state:{state}", STATE_TTL, "google")

    service = OAuthService(None)
    auth_url = service.get_google_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Google redirige aquí con el código de autorización.
    Verifica el state, intercambia el code, crea/autentica el usuario
    y redirige al frontend con el token.
    """
    # Verificar state anti-CSRF
    redis = await get_redis_client()
    stored = await redis.get(f"oauth:state:{state}")
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado OAuth inválido o expirado. Intenta de nuevo."
        )
    await redis.delete(f"oauth:state:{state}")

    service = OAuthService(db)
    try:
        tokens = await service.handle_google_callback(code)
    except Exception as e:
        # Redirigir al frontend con error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=google_failed"
        )

    # Redirigir al frontend con los tokens en la URL
    # El frontend los captura y los guarda en localStorage
    return RedirectResponse(
        url=(
            f"{settings.FRONTEND_URL}/oauth/callback"
            f"?access_token={tokens['access_token']}"
            f"&refresh_token={tokens['refresh_token']}"
            f"&provider=google"
        )
    )


# ── Facebook ──────────────────────────────────────────────────

@router.get("/facebook")
async def facebook_login():
    """Inicia el flujo OAuth con Facebook."""
    state = secrets.token_urlsafe(32)
    redis = await get_redis_client()
    await redis.setex(f"oauth:state:{state}", STATE_TTL, "facebook")

    service = OAuthService(None)
    auth_url = service.get_facebook_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Facebook redirige aquí con el código."""
    redis = await get_redis_client()
    stored = await redis.get(f"oauth:state:{state}")
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado OAuth inválido o expirado."
        )
    await redis.delete(f"oauth:state:{state}")

    service = OAuthService(db)
    try:
        tokens = await service.handle_facebook_callback(code)
    except Exception as e:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=facebook_failed"
        )

    return RedirectResponse(
        url=(
            f"{settings.FRONTEND_URL}/oauth/callback"
            f"?access_token={tokens['access_token']}"
            f"&refresh_token={tokens['refresh_token']}"
            f"&provider=facebook"
        )
    )
