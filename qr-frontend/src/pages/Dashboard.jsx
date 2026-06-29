import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, QrCode, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI, billingAPI } from '../api/client'
import QRCard from '../components/QRCard'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [qrs, setQrs] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)

  useEffect(() => {
    Promise.all([
      qrAPI.list(),
      billingAPI.status(),
    ]).then(([qrRes, subRes]) => {
      setQrs(qrRes.data.items || [])
      setSubscription(subRes.data)
    }).catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = (id) => setQrs(prev => prev.filter(q => q.id !== id))

  const handleRenew = async () => {
    setRenewing(true)
    try {
      await billingAPI.renewFree()
      const { data } = await billingAPI.status()
      setSubscription(data)
      toast.success('¡Suscripción renovada por 30 días más!')
    } catch {
      toast.error('Error al renovar')
    } finally {
      setRenewing(false)
    }
  }

  const canCreateMore = subscription && subscription.qr_remaining > 0
  const canAnalytics = subscription?.features?.analytics

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis QR Codes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Hola, {user?.full_name} 👋</p>
        </div>
        {canCreateMore ? (
          <Link
            to="/create"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={18} /> Nuevo QR
          </Link>
        ) : (
          <Link
            to="/billing"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={18} /> Ampliar plan
          </Link>
        )}
      </div>

      {/* Subscription banner */}
      {subscription && (
        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between
          ${subscription.days_remaining <= 5 && subscription.plan === 'free'
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-violet-50 border border-violet-100'}`}>
          <div className="flex items-center gap-3">
            {subscription.days_remaining <= 5 && subscription.plan === 'free' && (
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-gray-900 capitalize">
                Plan {subscription.plan} — {subscription.days_remaining} días restantes
              </p>
              <p className="text-sm text-gray-500">
                {subscription.qr_used}/{subscription.qr_quota === null ? '∞' : subscription.qr_quota} QR usados
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {subscription.can_renew_free && (
              <button
                onClick={handleRenew} disabled={renewing}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 font-medium transition-colors"
              >
                <RefreshCw size={14} className={renewing ? 'animate-spin' : ''} />
                Renovar gratis
              </button>
            )}
            <Link
              to="/billing"
              className="text-sm px-3 py-1.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      )}

      {/* QR List */}
      {qrs.length === 0 ? (
        <div className="text-center py-20">
          <QrCode size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium">Aún no tienes QR codes</h3>
          <p className="text-gray-400 text-sm mt-1">Crea tu primer QR gratis</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 mt-4 bg-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
          >
            <Plus size={18} /> Crear QR
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {qrs.map(qr => (
            <QRCard
              key={qr.id}
              qr={qr}
              onDelete={handleDelete}
              canAnalytics={canAnalytics}
            />
          ))}
        </div>
      )}
    </div>
  )
}