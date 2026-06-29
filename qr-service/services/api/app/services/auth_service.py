"""
Authentication & Authorization Service
OWASP: A07:2021 – Identification and Authentication Failures
SWEBOK v4: Software Security — Access Control
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

import structlog
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsException,
    TokenExpiredException,
    EmailAlreadyExistsException,
    UserNotFoundException,
)
from app.models.models import RefreshToken, User

logger = structlog.get_logger(__name__)

# ── Password Hashing ──────────────────────────────────────────
# OWASP: Use bcrypt with cost factor >= 10
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def hash_password(plain_password: str) -> str:
    """Hash password with bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using timing-safe comparison."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_token(token: str) -> str:
    """SHA-256 hash for token storage. Never store raw tokens."""
    return hashlib.sha256(token.encode()).hexdigest()


# ── JWT Tokens ────────────────────────────────────────────────

def create_access_token(user_id: UUID, email: str) -> str:
    """
    Create short-lived JWT access token.
    OWASP: Short expiry, minimal claims.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> Tuple[str, str]:
    """
    Create opaque refresh token (not JWT).
    Returns (raw_token, hashed_token).
    OWASP: Refresh tokens stored as hash, not plain text.
    """
    raw_token = secrets.token_urlsafe(64)
    return raw_token, hash_token(raw_token)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate JWT access token.
    OWASP: Validates signature, expiry, and type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "access":
            raise InvalidCredentialsException("Invalid token type")
        return payload
    except JWTError as e:
        logger.warning("jwt_decode_failed", error=str(e))
        raise TokenExpiredException()


# ── User Service ──────────────────────────────────────────────

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str, full_name: str) -> User:
        """
        Register new user.
        - Validates email uniqueness (case-insensitive)
        - Hashes password with bcrypt
        - Creates FREE subscription automatically
        """
        email = email.lower().strip()

        # Check existing (case-insensitive)
        existing = await self.db.scalar(
            select(User).where(User.email == email)
        )
        if existing:
            raise EmailAlreadyExistsException(email)

        # Enforce minimum password strength
        self._validate_password_strength(password)

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
        )
        self.db.add(user)
        await self.db.flush()  # Get user.id before subscription

        # Auto-create FREE subscription
        from app.services.subscription_service import SubscriptionService
        sub_service = SubscriptionService(self.db)
        await sub_service.create_free_subscription(user.id)

        await self.db.commit()
        await self.db.refresh(user)

        logger.info("user_registered", user_id=str(user.id), email=email)
        return user

    async def login(self, email: str, password: str) -> Tuple[str, str]:
        """
        Authenticate and return (access_token, refresh_token).
        OWASP: Constant-time comparison, generic error message.
        """
        email = email.lower().strip()
        user = await self.db.scalar(
            select(User).where(User.email == email)
        )

        # Always run verify_password to prevent timing attacks
        # even if user doesn't exist
        dummy_hash = "$2b$12$eImiTXuWVxfM37uY4JANjQ"
        password_ok = verify_password(
            password,
            user.password_hash if user else dummy_hash,
        )

        if not user or not password_ok or not user.is_active:
            logger.warning("login_failed", email=email)
            raise InvalidCredentialsException()

        # Create tokens
        access_token = create_access_token(user.id, user.email)
        raw_refresh, hashed_refresh = create_refresh_token()

        # Store hashed refresh token
        refresh_token_obj = RefreshToken(
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(refresh_token_obj)
        await self.db.commit()

        logger.info("user_logged_in", user_id=str(user.id))
        return access_token, raw_refresh

    async def refresh_tokens(self, raw_refresh_token: str) -> Tuple[str, str]:
        """
        Rotate refresh token — invalidate old, issue new.
        OWASP: Token rotation prevents replay attacks.
        """
        token_hash = hash_token(raw_refresh_token)
        token_obj = await self.db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )

        if not token_obj:
            logger.warning("refresh_token_invalid_or_expired")
            raise InvalidCredentialsException("Invalid or expired refresh token")

        # Revoke old token
        token_obj.revoked_at = datetime.now(timezone.utc)

        # Get user
        user = await self.db.get(User, token_obj.user_id)
        if not user or not user.is_active:
            raise UserNotFoundException()

        # Issue new tokens
        access_token = create_access_token(user.id, user.email)
        raw_new_refresh, hashed_new_refresh = create_refresh_token()

        new_token_obj = RefreshToken(
            user_id=user.id,
            token_hash=hashed_new_refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(new_token_obj)
        await self.db.commit()

        return access_token, raw_new_refresh

    async def logout(self, raw_refresh_token: str) -> None:
        """Revoke refresh token on logout."""
        token_hash = hash_token(raw_refresh_token)
        token_obj = await self.db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        if token_obj:
            token_obj.revoked_at = datetime.now(timezone.utc)
            await self.db.commit()

    @staticmethod
    def _validate_password_strength(password: str) -> None:
        """
        Enforce OWASP password requirements:
        - Min 8 characters
        - Mix of uppercase, lowercase, digit, special char
        """
        errors = []
        if len(password) < 8:
            errors.append("at least 8 characters")
        if not any(c.isupper() for c in password):
            errors.append("one uppercase letter")
        if not any(c.islower() for c in password):
            errors.append("one lowercase letter")
        if not any(c.isdigit() for c in password):
            errors.append("one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
            errors.append("one special character")
        if errors:
            from app.core.exceptions import WeakPasswordException
            raise WeakPasswordException(errors)