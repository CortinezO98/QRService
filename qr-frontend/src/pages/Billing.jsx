import { useEffect, useMemo, useState } from 'react'
import { Check, Crown, ExternalLink, FileText, RefreshCw, Shield, Sparkles, Star, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingAPI } from '../api/client'
import Button from '../components/ui/Button'
import LoadingScreen from '../components/ui/LoadingScreen'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import { Card, CardBody } from '../components/ui/Card'
import { formatCurrency, formatDate, normalizePlan } from '../lib/format'

const PLAN_ICONS = { free: Zap, starter: Star, pro: Sparkles, business: Crown }

export default function Billing() {
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [renewing, setRenewing] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    Promise.allSettled([billingAPI.plans(), billingAPI.status()])
      .then(([plansRes, subRes]) => {
        if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value.data) ? plansRes.value.data : [])
        if (subRes.status === 'fulfilled') {
          setSubscription(subRes.value.data)
          if (subRes.value.data?.plan !== 'free') {
            billingAPI.invoices()
              .then((res) => setInvoices(Array.isArray(res.data) ? res.data : []))
              .catch(() => {})
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const currentPlan = normalizePlan(subscription?.plan)
  const hasPaidPlan = currentPlan !== 'free'
  const sortedPlans = useMemo(() => {
    const order = { free: 0, starter: 1, pro: 2, business: 3 }
    return [...plans].sort((a, b) => (order[a.plan] ?? 99) - (order[b.plan] ?? 99))
  }, [plans])

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
      toast.success('Renovado por 30 días más')
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
      toast.error('Error abriendo portal')
      setOpeningPortal(false)
    }
  }

  if (loading) return <LoadingScreen label="Cargando planes..." />

  return (
    <>
      <PageHeader
        eyebrow={<><Shield size={13} /> Pagos seguros con Stripe</>}
        title="Planes simples para crecer"
        description="Empieza gratis y mejora cuando necesites QR permanentes, analytics o funcionalidades avanzadas."
        actions={subscription && <Badge variant="brand">Plan actual: {subscription.plan}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sortedPlans.map((plan) => {
          const Icon = PLAN_ICONS[plan.plan] || Zap
          const isCurrent = currentPlan === plan.plan
          const isPopular = plan.is_popular || plan.plan === 'business'
          const isPaid = plan.plan !== 'free'

          return (
            <Card key={plan.plan} hover className={`relative overflow-hidden ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}>
              {isPopular && (
                <div className="absolute right-4 top-4">
                  <Badge variant="amber">Mejor valor</Badge>
                </div>
              )}

              <CardBody className="flex h-full flex-col">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon size={23} />
                </div>

                <h3 className="text-xl font-black capitalize text-ink-950">{plan.plan}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {plan.plan === 'free' ? 'Para probar la plataforma.' : 'QR permanentes y más capacidad.'}
                </p>

                <div className="my-6">
                  <span className="text-4xl font-black tracking-tight text-ink-950">
                    ${Number(plan.price_usd || 0).toFixed(0)}
                  </span>
                  <span className="ml-1 text-sm font-semibold text-ink-400">
                    {Number(plan.price_usd || 0) > 0 ? '/año' : ' gratis'}
                  </span>
                  {plan.price_per_qr && (
                    <p className="mt-1 text-xs font-bold text-limebrand-500">
                      ${Number(plan.price_per_qr).toFixed(2)} por QR
                    </p>
                  )}
                </div>

                <ul className="mb-6 grid gap-3 text-sm">
                  {[
                    `${plan.qr_quota} QR ${plan.plan === 'free' ? 'por mes' : 'permanentes'}`,
                    plan.analytics ? 'Analytics incluido' : 'Analytics limitado',
                    plan.custom_logo ? 'Logo personalizado' : 'Sin logo personalizado',
                    `Soporte ${plan.support || 'básico'}`,
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 font-semibold text-ink-600">
                      <Check size={16} className="text-green-600" /> {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {isCurrent && plan.plan === 'free' ? (
                    <Button variant="secondary" className="w-full" onClick={handleRenew} disabled={renewing}>
                      <RefreshCw size={16} className={renewing ? 'animate-spin' : ''} />
                      Renovar gratis
                    </Button>
                  ) : isCurrent ? (
                    <div className="rounded-2xl bg-ink-100 px-4 py-3 text-center text-sm font-black text-ink-500">Plan activo</div>
                  ) : isPaid ? (
                    <Button className="w-full" variant={isPopular ? 'lime' : 'primary'} onClick={() => handleCheckout(plan.plan)} disabled={!!checkingOut}>
                      {checkingOut === plan.plan ? 'Redirigiendo...' : `Contratar ${plan.plan}`}
                    </Button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {hasPaidPlan && (
        <Card className="mt-6">
          <CardBody>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-ink-950">Gestionar suscripción</h2>
                <p className="mt-1 text-sm text-ink-500">Cambia plan, cancela o descarga facturas desde el portal seguro de Stripe.</p>
              </div>
              <Button onClick={handleCustomerPortal} disabled={openingPortal}>
                <ExternalLink size={17} />
                {openingPortal ? 'Abriendo...' : 'Abrir portal de Stripe'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {invoices.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-ink-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink-950">
              <FileText size={18} /> Historial de pagos
            </h2>
          </div>
          <div className="divide-y divide-ink-100">
            {invoices.slice(0, 10).map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-ink-800">{formatDate(invoice.date)}</p>
                  <p className="text-xs font-semibold uppercase text-ink-400">{invoice.status}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-ink-950">{formatCurrency(invoice.amount_paid, invoice.currency || 'USD')}</span>
                  {invoice.invoice_pdf && (
                    <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-brand-700 hover:underline">
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="mt-8 text-center text-xs font-semibold text-ink-400">
        Pagos procesados por Stripe · No almacenamos tarjetas · Cancela cuando quieras
      </p>
    </>
  )
}
