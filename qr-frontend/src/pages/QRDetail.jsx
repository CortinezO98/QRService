/**
 * QRDetail.jsx — /qr/:id
 * Sprint 2: Página de detalle completa con:
 * - Preview grande del QR
 * - Edición de título y destino inline
 * - Descarga PNG (múltiples tamaños)
 * - Copiar short link
 * - Analytics básicos (solo planes de pago)
 * - Toggle activo/inactivo
 * - Estado de vencimiento
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Copy, Download, Edit2, Check, X,
  BarChart2, ExternalLink, Calendar, Trash2,
  ToggleLeft, ToggleRight, QrCode,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI, billingAPI } from '../api/client'
import { useAuth } from '../hooks/useAuth.jsx'

export default function QRDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [qr, setQr] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Edición inline
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingUrl, setEditingUrl] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    Promise.all([qrAPI.get(id), billingAPI.status()])
      .then(([qrRes, subRes]) => {
        setQr(qrRes.data)
        setSubscription(subRes.data)
      })
      .catch(() => {
        toast.error('No se pudo cargar el QR')
        navigate('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [id])

  const canAnalytics = subscription?.features?.analytics

  const loadAnalytics = async () => {
    if (!canAnalytics || analytics) return
    setLoadingAnalytics(true)
    try {
      const { data } = await qrAPI.analytics(id)
      setAnalytics(data)
    } catch {
      toast.error('Error cargando analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (qr && canAnalytics) loadAnalytics()
  }, [qr, canAnalytics])

  // ── Copiar link ─────────────────────────────────────────────
  const copyLink = () => {
    const url = qr?.redirect_url || `${window.location.origin}/r/${qr?.short_code}`
    navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  // ── Guardar título ──────────────────────────────────────────
  const saveTitle = async () => {
    if (!titleDraft.trim()) return setEditingTitle(false)
    setSaving(true)
    try {
      const { data } = await qrAPI.update(id, { title: titleDraft.trim() })
      setQr(data)
      setEditingTitle(false)
      toast.success('Título actualizado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Guardar URL destino ─────────────────────────────────────
  const saveUrl = async () => {
    if (!urlDraft.trim()) return setEditingUrl(false)
    setSaving(true)
    try {
      const { data } = await qrAPI.update(id, { destination_url: urlDraft.trim() })
      setQr(data)
      setEditingUrl(false)
      toast.success('Destino actualizado — el QR físico sigue funcionando')
    } catch (err) {
      const msg = err.response?.data?.detail?.message || 'URL inválida'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle activo/inactivo ──────────────────────────────────
  const toggleStatus = async () => {
    setToggling(true)
    const newStatus = qr.status === 'active' ? 'inactive' : 'active'
    try {
      const { data } = await qrAPI.update(id, { status: newStatus })
      setQr(data)
      toast.success(newStatus === 'active' ? 'QR activado' : 'QR desactivado')
    } catch {
      toast.error('Error al cambiar estado')
    } finally {
      setToggling(false)
    }
  }

  // ── Eliminar ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este QR permanentemente?')) return
    setDeleting(true)
    try {
      await qrAPI.delete(id)
      toast.success('QR eliminado')
      navigate('/dashboard')
    } catch {
      toast.error('Error al eliminar')
      setDeleting(false)
    }
  }

  // ── Descargar imagen ────────────────────────────────────────
  const download = async (size = 512) => {
    try {
      await qrAPI.downloadImage(id, qr.short_code, size)
    } catch {
      toast.error('Error al descargar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  if (!qr) return null

  const expiresAt = qr.expires_at ? new Date(qr.expires_at) : null
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000))
    : null
  const isActive = qr.status === 'active'
  const shortLink = qr.redirect_url || `${window.location.origin}/r/${qr.short_code}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Back */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Volver al dashboard
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Columna izquierda: QR visual ─────────────────── */}
        <div className="space-y-4">
          <div className={`bg-white rounded-2xl border p-8 flex items-center justify-center
            ${!isActive ? 'opacity-50 grayscale' : 'border-gray-200'}`}>
            <QRCodeSVG
              value={shortLink}
              size={240}
              fgColor={qr.style_config?.foreground_color || '#000000'}
              bgColor={qr.style_config?.background_color || '#ffffff'}
              level="H"
            />
          </div>

          {!isActive && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-sm text-amber-700">
              Este QR está <strong>inactivo</strong> y no redirige escaneos.
            </div>
          )}

          {daysLeft !== null && (
            <div className={`rounded-xl p-3 text-center text-sm flex items-center justify-center gap-2
              ${daysLeft <= 5 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-violet-50 text-violet-700'}`}>
              <Calendar size={14} />
              {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} días`}
            </div>
          )}

          {/* Short link */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-mono truncate">{shortLink}</span>
            <button
              onClick={copyLink}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copiar enlace"
            >
              <Copy size={14} className="text-gray-600" />
            </button>
          </div>

          {/* Descargas */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Descargar PNG</p>
            <div className="flex gap-2 flex-wrap">
              {[512, 1024, 2048].map(size => (
                <button
                  key={size}
                  onClick={() => download(size)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <Download size={12} /> {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total escaneos</span>
              <span className="text-2xl font-bold text-gray-900">{qr.scan_count || 0}</span>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: Info y edición ──────────────── */}
        <div className="space-y-5">

          {/* Estado */}
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Estado del QR</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isActive ? 'Activo — redirige correctamente' : 'Inactivo — no redirige'}
              </p>
            </div>
            <button
              onClick={toggleStatus}
              disabled={toggling}
              className="focus:outline-none disabled:opacity-50"
              title={isActive ? 'Desactivar' : 'Activar'}
            >
              {isActive
                ? <ToggleRight size={36} className="text-violet-600" />
                : <ToggleLeft size={36} className="text-gray-400" />
              }
            </button>
          </div>

          {/* Título */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Título</p>
              {!editingTitle && (
                <button
                  onClick={() => { setTitleDraft(qr.title || ''); setEditingTitle(true) }}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <Edit2 size={13} className="text-gray-400" />
                </button>
              )}
            </div>
            {editingTitle ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTitle()}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Título del QR"
                  maxLength={255}
                />
                <button onClick={saveTitle} disabled={saving} className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                  <Check size={13} />
                </button>
                <button onClick={() => setEditingTitle(false)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-900">{qr.title || 'Sin título'}</p>
            )}
          </div>

          {/* URL destino — función clave del producto */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Destino del QR
              </p>
              {!editingUrl && (
                <button
                  onClick={() => { setUrlDraft(qr.destination_url || ''); setEditingUrl(true) }}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <Edit2 size={13} className="text-gray-400" />
                </button>
              )}
            </div>
            {editingUrl ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  type="url"
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://nuevo-destino.com"
                />
                <p className="text-xs text-violet-600">
                  El código QR impreso sigue funcionando automáticamente.
                </p>
                <div className="flex gap-2">
                  <button onClick={saveUrl} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar destino'}
                  </button>
                  <button onClick={() => setEditingUrl(false)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <a
                href={qr.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-violet-600 hover:underline flex items-center gap-1.5 break-all"
              >
                <ExternalLink size={12} className="flex-shrink-0" />
                {qr.destination_url}
              </a>
            )}
          </div>

          {/* Short code / tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Short code</p>
              <p className="text-sm font-mono font-medium">{qr.short_code}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Tipo</p>
              <p className="text-sm font-medium capitalize">{qr.qr_type || 'url'}</p>
            </div>
          </div>

          {/* Analytics */}
          {canAnalytics ? (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={16} className="text-violet-600" />
                <p className="text-sm font-medium text-gray-700">Analytics (últimos 30 días)</p>
              </div>
              {loadingAnalytics ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
                </div>
              ) : analytics ? (
                <div className="space-y-3">
                  {/* Gráfico de barras simple */}
                  {analytics.daily_breakdown?.slice(0, 7).reverse().map(d => (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20 text-right">{d.date.slice(5)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-violet-500 h-2 rounded-full transition-all"
                          style={{
                            width: analytics.total_scans > 0
                              ? `${Math.max(4, (d.scans / Math.max(...(analytics.daily_breakdown?.map(x => x.scans) || [1]))) * 100)}%`
                              : '4%'
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-6">{d.scans}</span>
                    </div>
                  ))}
                  {/* Por dispositivo */}
                  {analytics.by_device?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Por dispositivo</p>
                      <div className="flex flex-wrap gap-2">
                        {analytics.by_device.map(d => (
                          <span key={d.device} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                            {d.device}: {d.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
              <BarChart2 size={20} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Analytics disponibles en planes de pago</p>
              <Link to="/billing" className="text-xs text-violet-600 font-medium hover:underline mt-1 inline-block">
                Ver planes →
              </Link>
            </div>
          )}

          {/* Eliminar */}
          <div className="pt-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? 'Eliminando...' : 'Eliminar este QR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
