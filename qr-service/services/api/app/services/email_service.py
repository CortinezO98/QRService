"""
Email Service — Templates actualizados para el nuevo modelo de negocio
Emails:
  1. Bienvenida (registro)
  2. Alerta 5 días antes de expirar FREE
  3. QR desactivado (FREE no renovó)
  4. Recordatorio de renovación FREE
  5. Confirmación de pago (con detalle del plan)
  6. Renovación anual confirmada
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ── Estilos base del email ────────────────────────────────────
BASE_STYLE = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: white;
                 border-radius: 12px; overflow: hidden;
                 box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6);
              padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 40px; }
    .body h2 { color: #1e293b; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px;
           text-decoration: none; font-weight: 600; font-size: 15px; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-success { background: #22c55e; color: white; }
    .btn-warning { background: #f59e0b; color: white; }
    .btn-danger  { background: #ef4444; color: white; }
    .plan-card { background: #f8fafc; border: 1px solid #e2e8f0;
                 border-radius: 10px; padding: 20px; margin: 20px 0; }
    .plan-card h3 { margin: 0 0 8px; color: #1e293b; }
    .plan-card .price { font-size: 28px; font-weight: 700; color: #6366f1; }
    .plan-card .price span { font-size: 14px; color: #64748b; font-weight: 400; }
    .features { list-style: none; padding: 0; margin: 12px 0 0; }
    .features li { color: #475569; padding: 4px 0; font-size: 14px; }
    .features li::before { content: "✓ "; color: #22c55e; font-weight: 700; }
    .upgrade-grid { display: grid; gap: 12px; margin: 20px 0; }
    .upgrade-option { border: 1px solid #e2e8f0; border-radius: 8px;
                      padding: 16px; background: #fafafa; }
    .upgrade-option.best { border-color: #6366f1; background: #f5f3ff; }
    .upgrade-option h4 { margin: 0 0 4px; color: #1e293b; font-size: 15px; }
    .upgrade-option .tag { background: #6366f1; color: white; font-size: 11px;
                           padding: 2px 8px; border-radius: 12px; margin-left: 8px; }
    .footer { padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0;
              text-align: center; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
"""


def _base_html(header_title: str, header_subtitle: str, body_content: str) -> str:
    return f"""
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>{BASE_STYLE}</style></head><body>
    <div class="container">
      <div class="header">
        <h1>📱 {header_title}</h1>
        <p>{header_subtitle}</p>
      </div>
      <div class="body">{body_content}</div>
      <div class="footer">
        <p>© 2025 QR Service · <a href="{settings.BASE_URL}" style="color:#6366f1">qrservice.com</a></p>
        <p style="margin-top:4px">Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    </div>
    </body></html>
    """


class EmailService:

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAILS_FROM
        self.from_name = settings.EMAILS_FROM_NAME

    # ── 1. Bienvenida ──────────────────────────────────────────
    async def send_welcome(self, to_email: str, user_name: str) -> None:
        body = f"""
        <h2>¡Hola, {user_name}! 👋</h2>
        <p>Tu cuenta en QR Service está lista. Tienes <strong>30 días gratis</strong>
        para crear tu primer QR y probarlo sin costo.</p>

        <div class="plan-card">
          <h3>🆓 Tu plan actual: FREE</h3>
          <ul class="features">
            <li>1 QR activo por mes</li>
            <li>Renovación mensual gratuita</li>
            <li>Tracking de escaneos básico</li>
          </ul>
        </div>

        <p>Cuando quieras más QRs, puedes pasar a un plan de pago desde
        <strong>$10 USD al año</strong> (¡menos de $1 al mes!).</p>

        <a href="{settings.BASE_URL}/dashboard" class="btn btn-primary">
          Crear mi primer QR →
        </a>
        """
        await self._send(
            to_email, "¡Bienvenido a QR Service! Tu prueba gratis comienza ahora 🎉",
            _base_html("Bienvenido a QR Service", "Tu QR gratis te espera", body)
        )

    # ── 2. Alerta 5 días antes de expirar (FREE) ───────────────
    async def send_free_expiry_warning(
        self, to_email: str, user_name: str, days_remaining: int, expires_at: str
    ) -> None:
        urgency = "🔴" if days_remaining <= 2 else "⚠️"
        body = f"""
        <h2>{urgency} Tu QR gratis expira en {days_remaining} día(s)</h2>
        <p>Hola {user_name}, tu plan FREE vence el <strong>{expires_at[:10]}</strong>.
        Si no lo renuevas, tu QR se desactivará y los escaneos dejarán de funcionar.</p>

        <p><strong>Opción 1 — Renovar gratis (1 clic):</strong></p>
        <a href="{settings.BASE_URL}/api/v1/billing/renew-free"
           class="btn btn-success" style="margin-bottom:16px;display:block;width:fit-content">
          Renovar gratis por 30 días más →
        </a>

        <p><strong>Opción 2 — Pasar a un plan de pago:</strong></p>
        <div class="upgrade-grid">
          <div class="upgrade-option">
            <h4>STARTER — $10/año</h4>
            <p style="margin:4px 0;color:#64748b;font-size:13px">5 QR permanentes · $2 por QR · Analytics</p>
          </div>
          <div class="upgrade-option">
            <h4>PRO — $20/año</h4>
            <p style="margin:4px 0;color:#64748b;font-size:13px">15 QR permanentes · $1.33 por QR · Logo personalizado</p>
          </div>
          <div class="upgrade-option best">
            <h4>BUSINESS — $30/año <span class="tag">Mejor valor</span></h4>
            <p style="margin:4px 0;color:#64748b;font-size:13px">30 QR permanentes · $1 por QR · Soporte prioritario</p>
          </div>
        </div>

        <a href="{settings.BASE_URL}/billing" class="btn btn-warning">
          Ver planes de pago →
        </a>
        """
        await self._send(
            to_email, f"{urgency} Tu QR gratis expira en {days_remaining} día(s) — Renueva ahora",
            _base_html("Tu QR está por expirar", f"Vence el {expires_at[:10]}", body)
        )

    # ── 3. QR desactivado (FREE no renovó) ────────────────────
    async def send_qr_deactivated(self, to_email: str, user_name: str) -> None:
        body = f"""
        <h2>😴 Tu QR fue desactivado</h2>
        <p>Hola {user_name}, tu plan FREE venció y tu código QR fue desactivado.
        Los escaneos redirigen a una página de error hasta que lo reactives.</p>

        <p><strong>¿Cómo reactivarlo?</strong></p>
        <p>Es gratis y solo toma un clic. Tu QR volverá a funcionar inmediatamente.</p>

        <a href="{settings.BASE_URL}/api/v1/billing/renew-free" class="btn btn-primary"
           style="display:block;width:fit-content;margin-bottom:24px">
          Reactivar mi QR gratis →
        </a>

        <p style="color:#94a3b8;font-size:13px">
          ¿Quieres olvidarte de renovar cada mes?
          Con el plan BUSINESS tienes <strong>30 QR permanentes por $30/año</strong>
          — solo $1 por QR y no expiran.
          <a href="{settings.BASE_URL}/billing" style="color:#6366f1">Ver planes →</a>
        </p>
        """
        await self._send(
            to_email, "😴 Tu QR fue desactivado — Reactívalo gratis en 1 clic",
            _base_html("QR Desactivado", "Reactívalo gratis ahora mismo", body)
        )

    # ── 4. Recordatorio de renovación (5 días después de vencer) ─
    async def send_renewal_reminder(self, to_email: str, user_name: str) -> None:
        body = f"""
        <h2>📨 ¿Olvidaste renovar tu QR?</h2>
        <p>Hola {user_name}, hace unos días tu QR gratuito fue desactivado.
        Aún puedes reactivarlo gratis con un solo clic.</p>

        <a href="{settings.BASE_URL}/api/v1/billing/renew-free"
           class="btn btn-primary" style="display:block;width:fit-content;margin-bottom:24px">
          Reactivar ahora →
        </a>

        <p>O si ya es momento de dar el siguiente paso, el plan
        <strong>BUSINESS ($30/año)</strong> te da 30 QR permanentes
        por solo <strong>$1 cada uno</strong>. Sin renovaciones mensuales.</p>

        <a href="{settings.BASE_URL}/billing" class="btn btn-warning">
          Ver todos los planes →
        </a>
        """
        await self._send(
            to_email, "📨 Aún puedes reactivar tu QR gratis",
            _base_html("¿Sigues ahí?", "Tu QR te espera", body)
        )

    # ── 5. Confirmación de pago ────────────────────────────────
    async def send_payment_confirmation(
        self,
        to_email: str,
        user_name: str,
        plan: str,
        amount_usd: float,
        qr_quota: int = None,
    ) -> None:
        plan_info = {
            "starter":  {"emoji": "🌱", "qr": 5,  "price": 10},
            "pro":      {"emoji": "🚀", "qr": 15, "price": 20},
            "business": {"emoji": "💼", "qr": 30, "price": 30},
        }.get(plan, {"emoji": "✅", "qr": qr_quota or 0, "price": amount_usd})

        body = f"""
        <h2>✅ ¡Pago confirmado!</h2>
        <p>Hola {user_name}, tu pago de <strong>${amount_usd:.2f} USD</strong>
        fue procesado exitosamente. Tu plan ya está activo.</p>

        <div class="plan-card">
          <h3>{plan_info['emoji']} Plan {plan.upper()} activado</h3>
          <div class="price">${plan_info['price']} <span>/ año</span></div>
          <ul class="features">
            <li>{plan_info['qr']} QR permanentes incluidos</li>
            <li>${round(plan_info['price'] / plan_info['qr'], 2):.2f} USD por QR</li>
            <li>Tus QR no expiran durante el año</li>
            <li>Analytics completos de escaneos</li>
            {'<li>Soporte prioritario</li>' if plan == 'business' else '<li>Soporte por email</li>'}
          </ul>
        </div>

        <a href="{settings.BASE_URL}/dashboard" class="btn btn-success">
          Ir a mi dashboard →
        </a>

        <p style="color:#94a3b8;font-size:13px;margin-top:24px">
          Guarda este correo como comprobante de tu compra.
          ID de transacción disponible en tu panel de billing.
        </p>
        """
        await self._send(
            to_email, f"✅ Pago confirmado — Plan {plan.upper()} activado",
            _base_html("¡Pago Confirmado!", f"Plan {plan.upper()} — ${amount_usd:.2f} USD", body)
        )

    # ── 6. Renovación anual confirmada ─────────────────────────
    async def send_annual_renewal_confirmation(
        self, to_email: str, user_name: str, plan: str, next_renewal: str
    ) -> None:
        body = f"""
        <h2>🔄 Tu plan {plan.upper()} fue renovado</h2>
        <p>Hola {user_name}, tu suscripción anual fue renovada automáticamente.
        Tus QR seguirán activos por otro año completo.</p>
        <p>Próxima renovación: <strong>{next_renewal[:10]}</strong></p>
        <a href="{settings.BASE_URL}/dashboard" class="btn btn-primary">
          Ver mi cuenta →
        </a>
        """
        await self._send(
            to_email, f"🔄 Tu plan {plan.upper()} fue renovado por otro año",
            _base_html("Renovación Confirmada", f"Plan {plan.upper()} activo por 365 días más", body)
        )

    # ── Envío SMTP ─────────────────────────────────────────────
    async def _send(self, to_email: str, subject: str, html_body: str) -> None:
        if not self.host or not self.user:
            logger.warning("smtp_not_configured", to=to_email, subject=subject)
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, to_email, msg.as_string())
            logger.info("email_sent", subject=subject)
        except smtplib.SMTPException as exc:
            logger.error("email_send_failed", subject=subject, error=str(exc))
            raise
