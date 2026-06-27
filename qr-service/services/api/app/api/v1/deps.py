"""
API Dependencies
OWASP A01: Broken Access Control prevention via authenticated user dependency
"""
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidCredentialsException, SubscriptionExpiredException
from app.db.session import get_db
from app.models.models import Subscription, User
from app.services.auth_service import decode_access_token
from app.services.subscription_service import SubscriptionService

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate JWT and return current active user.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidCredentialsException("Missing authentication token")

    payload = decode_access_token(credentials.credentials)

    raw_user_id = payload.get("sub")
    if not raw_user_id:
        raise InvalidCredentialsException("Invalid token payload")

    try:
        user_id = UUID(raw_user_id)
    except ValueError as exc:
        raise InvalidCredentialsException("Invalid user identifier") from exc

    user = await db.get(User, user_id)

    if not user or not user.is_active:
        raise InvalidCredentialsException("Invalid or inactive user")

    return user


async def require_active_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """
    Require active subscription before executing protected actions.
    """
    service = SubscriptionService(db)

    try:
        return await service.require_active_subscription(current_user.id)
    except SubscriptionExpiredException:
        raise