"""
Domain Exceptions — Jerarquía actualizada con mensajes por plan
SWEBOK v4: Software Construction — Error Handling
OWASP: Nunca exponer detalles internos
"""
from typing import List, Optional
from fastapi import status


class QRServiceException(Exception):
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."
    details: Optional[dict] = None

    def __init__(self, message: str = None, details: dict = None):
        self.message = message or self.__class__.message
        self.details = details
        super().__init__(self.message)


# ── Auth ──────────────────────────────────────────────────────

class InvalidCredentialsException(QRServiceException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "INVALID_CREDENTIALS"
    message = "Email o contraseña incorrectos."

class TokenExpiredException(QRServiceException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "TOKEN_EXPIRED"
    message = "Tu sesión ha expirado. Por favor inicia sesión nuevamente."

class EmailAlreadyExistsException(QRServiceException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "EMAIL_ALREADY_EXISTS"
    def __init__(self, email: str = ""):
        super().__init__(message="Ya existe una cuenta con este correo electrónico.")

class WeakPasswordException(QRServiceException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "WEAK_PASSWORD"
    def __init__(self, missing: List[str]):
        super().__init__(
            message=f"La contraseña debe contener: {', '.join(missing)}.",
            details={"requirements": missing},
        )

class UserNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "USER_NOT_FOUND"
    message = "Usuario no encontrado."


# ── QR ────────────────────────────────────────────────────────

class QRNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "QR_NOT_FOUND"
    def __init__(self, identifier: str = ""):
        super().__init__(message="Código QR no encontrado.")


class QRLimitExceededException(QRServiceException):
    """
    Se lanza cuando el usuario intenta crear más QR de los que permite su plan.
    Incluye opciones de upgrade en details.
    """
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "QR_LIMIT_EXCEEDED"

    def __init__(self, limit: int, current_plan: str = "free", message: str = None):
        upgrade_details = {
            "free": {
                "upgrade_options": [
                    {"plan": "starter",  "price_usd": 10, "qr_quota": 5,  "price_per_qr": 2.00},
                    {"plan": "pro",      "price_usd": 20, "qr_quota": 15, "price_per_qr": 1.33},
                    {"plan": "business", "price_usd": 30, "qr_quota": 30, "price_per_qr": 1.00},
                ]
            },
            "starter": {
                "upgrade_options": [
                    {"plan": "pro",      "price_usd": 20, "qr_quota": 15, "price_per_qr": 1.33},
                    {"plan": "business", "price_usd": 30, "qr_quota": 30, "price_per_qr": 1.00},
                ]
            },
            "pro": {
                "upgrade_options": [
                    {"plan": "business", "price_usd": 30, "qr_quota": 30, "price_per_qr": 1.00},
                ]
            },
        }

        super().__init__(
            message=message or (
                f"Has alcanzado el límite de {limit} QR de tu plan. "
                "Pasa a un plan de pago para crear más."
            ),
            details={
                "current_plan": current_plan,
                "limit": limit,
                "checkout_url": "/api/v1/billing/checkout",
                **upgrade_details.get(current_plan, {}),
            },
        )


class InvalidURLException(QRServiceException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "INVALID_URL"
    def __init__(self, url: str = "", reason: str = "La URL no es válida"):
        super().__init__(message=reason)


# ── Subscription ──────────────────────────────────────────────

class SubscriptionExpiredException(QRServiceException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    error_code = "SUBSCRIPTION_EXPIRED"
    message = (
        "Tu suscripción ha vencido. "
        "Renuévala gratis para continuar o elige un plan de pago."
    )

class SubscriptionNotFoundException(QRServiceException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "SUBSCRIPTION_NOT_FOUND"
    message = "No se encontró una suscripción activa."

class FreeRenewalNotAvailableException(QRServiceException):
    """Se lanza si el usuario FREE intenta renovar antes de que venza."""
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "RENEWAL_NOT_AVAILABLE"
    message = "Tu suscripción gratuita aún está activa. La renovación estará disponible cuando venza."


# ── Billing ───────────────────────────────────────────────────

class BillingException(QRServiceException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    error_code = "BILLING_ERROR"
    message = "Ocurrió un error en el proceso de pago. Por favor intenta de nuevo."

class InvalidPlanException(QRServiceException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "INVALID_PLAN"
    def __init__(self, plan: str):
        super().__init__(
            message=f"El plan '{plan}' no existe.",
            details={"valid_plans": ["starter", "pro", "business"]},
        )

class WebhookSignatureException(QRServiceException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "INVALID_WEBHOOK_SIGNATURE"
    message = "Verificación de firma del webhook fallida."
