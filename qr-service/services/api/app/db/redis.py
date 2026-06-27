"""
Redis Client Singleton
SWEBOK v4: Software Construction — Resource Management
OWASP: Availability controls for rate limiting and queues
"""
from redis.asyncio import Redis

from app.core.config import settings

_redis_client: Redis | None = None


async def get_redis_client() -> Redis:
    """
    Return a singleton Redis async client.
    Used by middleware, Celery scheduler and cache-related features.
    """
    global _redis_client

    if _redis_client is None:
        _redis_client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30,
        )

    return _redis_client


async def close_redis_client() -> None:
    """Close Redis connection on application shutdown if needed."""
    global _redis_client

    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None