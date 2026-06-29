import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  QrCode,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Folder,
  Sparkles,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { billingAPI, qrAPI } from '../api/client'
import QRCard from '../components/QRCard'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { formatNumber, normalizePlan, planLabels } from '../lib/format'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  const [qrs, setQrs] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [qrRes, subRes] = await Promise.all([qrAPI.list(), billingAPI.status()])
      setQrs(qrRes.data.items || [])
      setSubscription(subRes.data)
    } catch {
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = (id) => setQrs((prev) => prev.filter((qr) => qr.id !== id))

  const handleRenew = async () => {
    setRenewing(true)
    try {
      await billingAPI.renewFree()
      const { data } = await billingAPI.status()
      setSubscription(data)
      toast.success('Suscripción renovada por 30 días más')
    } catch {
      toast.error('Error al renovar')
    } finally {
      setRenewing(false)
    }
  }

  const plan = normalizePlan(subscription?.plan)
  const canCreateMore = Number(subscription?.qr_remaining || 0) > 0
  const totalScans = useMemo(() => qrs.reduce((sum, qr) => sum + Number(qr.scan_count || 0), 0), [qrs])
  const activeQrs = useMemo(() => qrs.filter((qr) => qr.status === 'active' || qr.is_active).length, [qrs])

  const filteredQrs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return qrs
    return qrs.filter((qr) =>
      [qr.title, qr.destination_url, qr.short_code, qr.qr_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [qrs, query])

  if (loading) return <LoadingScreen label="Cargando dashboard..." />

  return (
    <>
      <PageHeader
        eyebrow={<><Sparkles size={13} /> Portal profesional</>}
        title={`Hola, ${user?.full_name?.split(' ')[0] || 'Jose'} 👋`}
        description="Administra tus QR dinámicos, mide cada escaneo y cambia destinos sin volver a imprimir."
        actions={
          canCreateMore ? (
            <Button to="/create">
              <Plus size={17} /> Nuevo QR
            </Button>
          ) : (
            <Button to="/billing" variant="lime">
              <Plus size={17} /> Ampliar plan
            </Button>
          )
        }
      />

      {subscription && (
        <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="surface-card overflow-hidden">
            <div className="relative p-5 sm:p-6">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-100 blur-2xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-ink-950">
                        Plan {planLabels[plan] || plan}
                      </h2>
                      <Badge variant={subscription.days_remaining <= 5 && plan === 'free' ? 'amber' : 'brand'}>
                        {subscription.days_remaining} días restantes
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {subscription.qr_used}/{subscription.qr_quota ?? '∞'} QR usados · {subscription.qr_remaining ?? 0} disponibles
                    </p>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-400"
                        style={{
                          width: `${Math.min(100, ((subscription.qr_used || 0) / Math.max(1, subscription.qr_quota || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subscription.can_renew_free && (
                    <Button variant="secondary" onClick={handleRenew} disabled={renewing}>
                      <RefreshCw size={15} className={renewing ? 'animate-spin' : ''} />
                      Renovar gratis
                    </Button>
                  )}
                  <Button to="/billing" variant="secondary">Ver planes</Button>
                </div>
              </div>
            </div>
          </div>

          {subscription.days_remaining <= 5 && plan === 'free' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} />
                <div>
                  <h3 className="font-black text-amber-900">Tu plan está por vencer</h3>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Renueva gratis o mejora tu plan para mantener tus QR activos sin interrupciones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={QrCode} label="QR totales" value={qrs.length} hint={`${activeQrs} activos`} />
        <StatCard icon={BarChart2} label="Escaneos" value={totalScans} hint="Acumulado histórico" tone="green" />
        <StatCard icon={Folder} label="Campañas" value="Organiza" hint="Disponible en planes de pago" tone="slate" />
        <StatCard icon={Sparkles} label="Conversión" value={qrs.length ? `${Math.round(totalScans / Math.max(1, qrs.length))}` : '0'} hint="Escaneos promedio por QR" tone="amber" />
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-ink-950">Mis códigos QR</h2>
          <p className="text-sm text-ink-500">{formatNumber(filteredQrs.length)} resultados</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, enlace o código..."
            className="input-field pl-11"
          />
        </div>
      </section>

      {qrs.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="Aún no tienes QR"
          description="Crea tu primer QR dinámico gratis. Podrás cambiar el destino después sin modificar el código impreso."
          actionLabel="Crear mi primer QR"
          actionTo="/create"
        />
      ) : filteredQrs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="Prueba con otro título, short code o URL de destino."
          actionLabel="Limpiar búsqueda"
          actionOnClick={() => setQuery('')}
        />
      ) : (
        <div className="grid gap-4">
          {filteredQrs.map((qr) => (
            <QRCard key={qr.id} qr={qr} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  )
}
