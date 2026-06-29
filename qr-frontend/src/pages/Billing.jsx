/**
 * Billing.jsx — Planes, facturación y Customer Portal
 * Sprint 2: Agrega botón de Customer Portal para gestionar suscripción en Stripe.
 */
import { useState, useEffect } from 'react'
import { Check, Zap, Star, Crown, RefreshCw, ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingAPI } from '../api/client'

const PLAN_ICONS = {
  free: Zap, starter: Star, pro: Star, business: Crown,
}

export default function Billing() {
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [renewing, setRenewing] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    // Llamadas independientes — si status falla (ej. 401) los planes igual se muestran
    billingAPI.plans()
      .then(res => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlans([]))

    billingAPI.status()
      .then(res => {
        setSubscription(res.data)
        if (res.data.plan !== 'free') {
          billingAPI.invoices()
            .then(inv => setInvoices(Array.isArray(inv.data) ? inv.data : []))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCheckout = async (plan) => {
    setCheckingOut(plan)
    try {
      const { data } = await billingAPI.checkout(plan)
      window.location.href = data.checkout_url
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Error al procesar el pago')
      setCheckingOut(null)
    }
  }

  const handleRenew = async () => {
    setRenewing(true)
    try {
      await billingAPI.renewFree()
      const { data } = await billingAPI.status()
      setSubscription(data)
      toast.success('¡Renovado por 30 días más!')
    } catch {
      toast.error('Error al renovar')
    } finally {
      setRenewing(false)
    }
  }

  const handleCustomerPortal = async () => {
    setOpeningPortal(true)
    try {
      const { data } = await billingAPI.customerPortal()
      window.location.href = data.portal_url
    } catch {
      toast.error('Error abriendo portal. Intenta de nuevo.')
      setOpeningPortal(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  const hasPaidPlan = subscription?.plan && subscription.plan !== 'free'

  if (plans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">No se pudieron cargar los planes.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-violet-600 hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Planes y precios</h1>
        <p className="text-gray-500 mt-2">Elige el plan que mejor se adapte a tus necesidades</p>
        {subscription && (
          <div className="inline-flex items-center gap-2 mt-3 bg-violet-50 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium">
            Plan actual: <span className="capitalize font-bold">{subscription.plan}</span>
            — {subscription.days_remaining} días restantes
          </div>
        )}
      </div>

      {/* Planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.plan] || Zap
          const isCurrent = subscription?.plan === plan.plan
          const isPopular = plan.is_popular
          const isPaid = plan.plan !== 'free'

          return (
            <div
              key={plan.plan}
              className={`relative rounded-2xl border p-5 flex flex-col
                ${isPopular ? 'border-amber-400 shadow-lg shadow-amber-100' : 'border-gray-200'}
                ${isCurrent ? 'ring-2 ring-violet-500' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MEJOR VALOR
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    TU PLAN
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                  ${plan.plan === 'business' ? 'bg-amber-100' : 'bg-violet-100'}`}>
                  <Icon size={18} className={plan.plan === 'business' ? 'text-amber-600' : 'text-violet-600'} />
                </div>
                <span className="font-bold text-gray-900 capitalize">{plan.plan}</span>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">${plan.price_usd.toFixed(0)}</span>
                <span className="text-gray-500 text-sm">{plan.price_usd > 0 ? '/año' : ' gratis'}</span>
                {plan.qr_quota > 0 && plan.price_usd > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">${plan.price_per_qr.toFixed(2)} por QR</p>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                  {plan.qr_quota} QR {plan.plan === 'free' ? 'por mes' : 'permanentes'}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className={plan.analytics ? 'text-green-500' : 'text-gray-300'} />
                  <span className={!plan.analytics ? 'text-gray-400' : ''}>Analytics</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className={plan.custom_logo ? 'text-green-500' : 'text-gray-300'} />
                  <span className={!plan.custom_logo ? 'text-gray-400' : ''}>Logo personalizado</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                  Soporte {plan.support}
                </li>
              </ul>

              {isCurrent && plan.plan === 'free' ? (
                <button
                  onClick={handleRenew} disabled={renewing}
                  className="w-full py-2.5 rounded-xl border-2 border-violet-500 text-violet-700 font-semibold text-sm hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} className={renewing ? 'animate-spin' : ''} />
                  {renewing ? 'Renovando...' : 'Renovar gratis'}
                </button>
              ) : isCurrent ? (
                <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm text-center">
                  Plan activo
                </div>
              ) : isPaid ? (
                <button
                  onClick={() => handleCheckout(plan.plan)}
                  disabled={!!checkingOut}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors
                    ${isPopular ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}
                    disabled:opacity-50`}
                >
                  {checkingOut === plan.plan ? 'Redirigiendo...' : `Contratar — $${plan.price_usd}/año`}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Gestionar suscripción (solo planes de pago) */}
      {hasPaidPlan && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Gestionar suscripción</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCustomerPortal}
              disabled={openingPortal}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <ExternalLink size={14} />
              {openingPortal ? 'Abriendo...' : 'Portal de facturación Stripe'}
            </button>
            <p className="text-xs text-gray-400 self-center">
              Cambia de plan, cancela o descarga facturas directamente en Stripe.
            </p>
          </div>
        </div>
      )}

      {/* Historial de facturas */}
      {invoices.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            Historial de pagos
          </h2>
          <div className="space-y-2">
            {invoices.slice(0, 10).map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{new Date(inv.date).toLocaleDateString('es-CO')}</p>
                  <p className="text-xs text-gray-400 capitalize">{inv.status}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    ${inv.amount_paid.toFixed(2)} {inv.currency}
                  </span>
                  {inv.invoice_pdf && (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-600 hover:underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-8">
        Pagos procesados de forma segura por Stripe · Cancela cuando quieras desde el portal
      </p>
    </div>
  )
}
