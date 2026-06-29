"""
Auth Endpoints
OWASP A07: Authentication and session management
OWASP A02: Refresh token en cookie HttpOnly — nunca en body response en producción
"""
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import User
from app.schemas.qr import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()

# ── Cookie helpers ────────────────────────────────────────────

_COOKIE_KWARGS = {
    "httponly": True,
    "secure": settings.ENVIRONMENT == "production",
    "samesite": "lax",
    "path": "/",
}


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Setea ambos tokens como cookies HttpOnly."""
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


def _clear_auth_cookies(response: Response) -> None:
    """Elimina las cookies de sesión."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


# ── Endpoints ─────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Registra un nuevo usuario y lo autentica inmediatamente.
    Las cookies de sesión se setean en la respuesta.
    """
    service = AuthService(db)
    user = await service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    # Auto-login tras registro
    access_token, refresh_token = await service.login(payload.email, payload.password)
    _set_auth_cookies(response, access_token, refresh_token)

    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Autentica al usuario.
    Setea access_token y refresh_token en cookies HttpOnly.
    Retorna datos del usuario (NO los tokens — nunca en JSON response).
    """
    service = AuthService(db)
    access_token, refresh_token = await service.login(
        email=payload.email,
        password=payload.password,
    )
    _set_auth_cookies(response, access_token, refresh_token)

    # Retornar datos del usuario, no los tokens
    from sqlalchemy import select
    user = await db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=MessageResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None),
) -> MessageResponse:
    """
    Rota el refresh token.
    Lee el token desde cookie HttpOnly — nunca desde body.
    """
    if not refresh_token:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "NO_REFRESH_TOKEN", "message": "Sesión expirada. Inicia sesión nuevamente."},
        )

    service = AuthService(db)
    new_access, new_refresh = await service.refresh_tokens(raw_refresh_token=refresh_token)
    _set_auth_cookies(response, new_access, new_refresh)

    return MessageResponse(message="Token renovado correctamente.")


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None),
) -> MessageResponse:
    """
    Revoca el refresh token y elimina ambas cookies.
    """
    if refresh_token:
        service = AuthService(db)
        await service.logout(refresh_token)

    _clear_auth_cookies(response)
    return MessageResponse(message="Sesión cerrada correctamente.")


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Retorna el usuario autenticado. Usado por el frontend al inicializar."""
    return UserResponse.model_validate(current_user)