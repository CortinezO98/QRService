"""
Domain Exceptions — Structured Error Hierarchy
SWEBOK v4: Software Construction — Error Handling Strategy
OWASP: Never expose internal details in error messages
"""
from typing import List, Optional
from fastapi import status


class QRServiceException(Exception):
    """Base exception for all domain errors."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."
    details: Optional[dict] = None

    def __init__(self, message: str = None, details: dict = None):
        self.message = message or self.__class__.message
        self.details = details
        super().__init__(self.message)


# ── Auth Exceptions ───────────────────────────────────────────

class InvalidCredentialsException(QRServiceException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "INVALID_CREDENTIALS"
    message = "Invalid email or password."


class TokenExpiredException(QRServiceException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "TOKEN_EXPIRED"
    message = "Your session has expired. Please log in again."


class EmailAlreadyExistsException(QRServiceException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "EMAIL_ALREADY_EXISTS"

    def __init__(self, email: str):
        super().__init__(
            message="An account with this email already exists.",
            # NOTE: Don't leak the email in prod; here it's for dev convenience
        )


class WeakPasswordException(QRServiceException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "WEAK_PASSWORD"

    def __init__(self, missing: List[str]):
        super().__init__(
            message=f"Password must contain: {', '.join(missing)}.",
            details={"requirements": missing},
        )


class UserNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "USER_NOT_FOUND"
    message = "User not found."


# ── QR Exceptions ─────────────────────────────────────────────

class QRNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "QR_NOT_FOUND"

    def __init__(self, identifier: str = ""):
        super().__init__(message="QR code not found.")


class QRLimitExceededException(QRServiceException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "QR_LIMIT_EXCEEDED"

    def __init__(self, limit: int):
        super().__init__(
            message=f"Free plan allows up to {limit} QR codes. Upgrade to Annual for unlimited.",
            details={"limit": limit, "upgrade_url": "/api/v1/billing/checkout"},
        )


class InvalidURLException(QRServiceException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "INVALID_URL"

    def __init__(self, url: str = "", reason: str = "URL is not valid"):
        super().__init__(message=reason)


# ── Subscription Exceptions ───────────────────────────────────

class SubscriptionExpiredException(QRServiceException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    error_code = "SUBSCRIPTION_EXPIRED"
    message = "Your subscription has expired. Please renew to continue."


class SubscriptionNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "SUBSCRIPTION_NOT_FOUND"
    message = "No active subscription found."


# ── Billing Exceptions ────────────────────────────────────────

class BillingException(QRServiceException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    error_code = "BILLING_ERROR"
    message = "A billing error occurred. Please try again."


class WebhookSignatureException(QRServiceException):
    """OWASP: Always verify Stripe webhook signatures."""
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "INVALID_WEBHOOK_SIGNATURE"
    message = "Webhook signature verification failed."
