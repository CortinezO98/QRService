/**
 * BillingSuccess.jsx — /billing/success
 * Pantalla de éxito después del pago en Stripe.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, QrCode, BarChart2 } from 'lucide-react'
import { billingAPI } from '../api/client'

export default function BillingSuccess() {
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    billingAPI.status()
      .then(({ data }) => setSubscription(data))
      .catch(() => {})
  }, [])

  const planLabels = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">¡Pago exitoso!</h1>
          {subscription && (
            <p className="text-gray-500 mt-2">
              Tu plan <strong className="text-green-600 capitalize">
                {planLabels[subscription.plan] || subscription.plan}
              </strong> está activo.
              Ahora puedes crear hasta <strong>{subscription.qr_quota} QR</strong> permanentes.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700">¿Qué puedes hacer ahora?</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-violet-600 flex-shrink-0" />
              Crear hasta {subscription?.qr_quota || '—'} QR dinámicos permanentes
            </div>
            {subscription?.features?.analytics && (
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-violet-600 flex-shrink-0" />
                Ver analytics completos de cada escaneo
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/create"
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors text-center"
          >
            Crear mi primer QR
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-center"
          >
            Ir al dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Recibirás un email de confirmación de Stripe con tu factura.
        </p>
      </div>
    </div>
  )
}