"""
OAuth2 Endpoints — Google y Facebook
OWASP A07: State anti-CSRF en Redis
OWASP A02: Refresh token en cookie HttpOnly, NO en URL
SWEBOK v4: Secure by Design — tokens nunca viajan en query string
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.redis import get_redis_client
from app.services.oauth_service import OAuthService
from app.core.config import settings

router = APIRouter()

# TTL del state en Redis (10 minutos)
STATE_TTL = 600

# Cookie settings
_COOKIE_KWARGS = {
    "httponly": True,
    "secure": settings.ENVIRONMENT == "production",
    "samesite": "lax",
    "path": "/",
}


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """
    Setea access y refresh token en cookies HttpOnly.
    OWASP A02: Nunca exponer refresh token a JavaScript.
    """
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **_COOKIE_KWARGS,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        **_COOKIE_KWARGS,
    )


# ── Google ────────────────────────────────────────────────────

@router.get("/google")
async def google_login() -> RedirectResponse:
    """
    Inicia el flujo OAuth con Google.
    Genera state aleatorio (anti-CSRF) y redirige a Google.
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
) -> RedirectResponse:
    """
    Google redirige aquí con el código de autorización.
    1. Verifica state anti-CSRF
    2. Intercambia code por tokens del proveedor
    3. Crea/autentica el usuario
    4. Setea cookies HttpOnly — NUNCA redirige con tokens en URL
    5. Redirige al dashboard limpio
    """
    redis = await get_redis_client()
    stored = await redis.get(f"oauth:state:{state}")
    if not stored:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=invalid_state"
        )
    await redis.delete(f"oauth:state:{state}")

    service = OAuthService(db)
    try:
        tokens = await service.handle_google_callback(code)
    except Exception:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=google_failed"
        )

    # Redirigir al frontend limpio (sin tokens en URL)
    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=status.HTTP_302_FOUND,
    )
    _set_auth_cookies(redirect, tokens["access_token"], tokens["refresh_token"])
    return redirect


# ── Facebook ──────────────────────────────────────────────────

@router.get("/facebook")
async def facebook_login() -> RedirectResponse:
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
) -> RedirectResponse:
    """Facebook redirige aquí con el código."""
    redis = await get_redis_client()
    stored = await redis.get(f"oauth:state:{state}")
    if not stored:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=invalid_state"
        )
    await redis.delete(f"oauth:state:{state}")

    service = OAuthService(db)
    try:
        tokens = await service.handle_facebook_callback(code)
    except Exception:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=facebook_failed"
        )

    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=status.HTTP_302_FOUND,
    )
    _set_auth_cookies(redirect, tokens["access_token"], tokens["refresh_token"])
    return redirect
