"""
Security Middleware
OWASP Top 10 Mitigations:
  A05 - Security Misconfiguration → Security Headers
  A04 - Insecure Design → Rate Limiting
  Logging → Request Tracing
"""
import time
import uuid
import structlog

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.core.config import settings
from app.db.redis import get_redis_client

logger = structlog.get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Inject security headers on every response.
    OWASP: A05:2021 – Security Misconfiguration
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # HSTS (only over HTTPS in prod)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data:; "
            "script-src 'none'; "
            "object-src 'none';"
        )
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Remove server fingerprint
        # Fix: MutableHeaders no tiene .pop(), usar del con verificación
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assign unique ID to every request for distributed tracing.
    SWEBOK v4: Software Quality — Traceability
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        # Bind to structlog context
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        structlog.contextvars.clear_contextvars()
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token-bucket rate limiting per IP + User.
    OWASP: A04:2021 – Insecure Design (DoS Protection)
    SWEBOK v4: Software Security — Availability
    """
    # Paths exempt from rate limiting
    EXEMPT_PATHS = {"/health", "/metrics", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Determine limit based on auth
        limit = self._get_limit(request)
        key = self._get_key(request)

        try:
            redis = await get_redis_client()
            allowed, remaining, reset_in = await self._check_rate(redis, key, limit)
        except Exception:
            # Si Redis falla, dejar pasar la request (fail open para disponibilidad)
            return await call_next(request)

        if not allowed:
            logger.warning(
                "rate_limit_exceeded",
                key=key,
                path=str(request.url.path),
                ip=self._get_client_ip(request),
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Retry after {reset_in} seconds.",
                    "retry_after": reset_in,
                },
                headers={
                    "Retry-After": str(reset_in),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_in),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_in)
        return response

    def _get_limit(self, request: Request) -> int:
        token = request.headers.get("Authorization", "")
        if token.startswith("Bearer "):
            return settings.RATE_LIMIT_FREE_PER_MINUTE
        return settings.RATE_LIMIT_ANON_PER_MINUTE

    def _get_key(self, request: Request) -> str:
        ip = self._get_client_ip(request)
        minute = int(time.time() // 60)
        return f"ratelimit:{ip}:{minute}"

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def _check_rate(self, redis, key: str, limit: int):
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)
        results = await pipe.execute()
        count = results[0]
        remaining = max(0, limit - count)
        allowed = count <= limit
        reset_in = 60 - (int(time.time()) % 60)
        return allowed, remaining, reset_in