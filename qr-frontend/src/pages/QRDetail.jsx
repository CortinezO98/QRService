import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  BarChart2,
  Calendar,
  Check,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Power,
  QrCode,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { billingAPI, qrAPI } from '../api/client'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LoadingScreen from '../components/ui/LoadingScreen'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import { formatNumber, getDaysLeft, getShortLink } from '../lib/format'

export default function QRDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [qr, setQr] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ title: '', destination_url: '' })

  useEffect(() => {
    Promise.all([qrAPI.get(id), billingAPI.status()])
      .then(([qrRes, subRes]) => {
        setQr(qrRes.data)
        setSubscription(subRes.data)
        setDraft({
          title: qrRes.data.title || '',
          destination_url: qrRes.data.destination_url || '',
        })
      })
      .catch(() => {
        toast.error('No se pudo cargar el QR')
        navigate('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!qr || !subscription?.features?.analytics) return
    qrAPI.analytics(id)
      .then(({ data }) => setAnalytics(data))
      .catch(() => {})
  }, [qr, subscription, id])

  if (loading) return <LoadingScreen label="Cargando detalle..." />
  if (!qr) return null

  const isActive = qr.status === 'active' || qr.is_active === true
  const daysLeft = getDaysLeft(qr.expires_at)
  const shortLink = getShortLink(qr)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortLink)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const saveField = async (field) => {
    setSaving(true)
    try {
      const { data } = await qrAPI.update(id, { [field]: draft[field] })
      setQr(data)
      setEditing(null)
      toast.success(field === 'destination_url' ? 'Destino actualizado' : 'Título actualizado')
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async () => {
    setSaving(true)
    try {
      const { data } = await qrAPI.update(id, { status: isActive ? 'inactive' : 'active' })
      setQr(data)
      toast.success(isActive ? 'QR desactivado' : 'QR activado')
    } catch {
      toast.error('Error al cambiar estado')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este QR permanentemente?')) return
    setSaving(true)
    try {
      await qrAPI.delete(id)
      toast.success('QR eliminado')
      navigate('/dashboard')
    } catch {
      toast.error('Error al eliminar')
      setSaving(false)
    }
  }

  const download = async (size) => {
    try {
      await qrAPI.downloadImage(id, qr.short_code, size)
      toast.success('Descarga iniciada')
    } catch {
      toast.error('Error al descargar')
    }
  }

  return (
    <>
      <PageHeader
        backTo="/dashboard"
        backLabel="Dashboard"
        eyebrow={<><QrCode size={13} /> Detalle del QR</>}
        title={qr.title || 'QR sin título'}
        description="Edita el destino sin cambiar el código impreso, descarga el QR y revisa su rendimiento."
        actions={
          <Button variant={isActive ? 'danger' : 'secondary'} onClick={toggleStatus} disabled={saving}>
            <Power size={16} /> {isActive ? 'Desactivar' : 'Activar'}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="grid gap-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardBody>
              <div className={`mx-auto flex aspect-square max-w-[320px] items-center justify-center rounded-[2rem] border border-ink-100 bg-white p-6 shadow-card ${!isActive ? 'opacity-50 grayscale' : ''}`}>
                <QRCodeSVG
                  value={shortLink}
                  size={250}
                  fgColor={qr.style_config?.foreground_color || '#111827'}
                  bgColor={qr.style_config?.background_color || '#ffffff'}
                  level="H"
                />
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Badge variant={isActive ? 'green' : 'amber'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
                {daysLeft !== null && <Badge variant={daysLeft <= 5 ? 'red' : 'brand'}>{daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días`}</Badge>}
                <Badge>{qr.qr_type || 'url'}</Badge>
              </div>

              <div className="mt-5 rounded-2xl bg-ink-50 p-3">
                <p className="break-all font-mono text-xs font-semibold text-ink-500">{shortLink}</p>
                <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={copyLink}>
                  <Copy size={15} /> Copiar enlace
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="mb-3 text-sm font-black text-ink-950">Descargar PNG</p>
              <div className="grid grid-cols-3 gap-2">
                {[512, 1024, 2048].map((size) => (
                  <Button key={size} variant="secondary" size="sm" onClick={() => download(size)}>
                    <Download size={14} /> {size}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </aside>

        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={BarChart2} label="Escaneos" value={qr.scan_count || 0} tone="green" />
            <StatCard icon={Calendar} label="Vigencia" value={daysLeft ?? '∞'} hint={daysLeft === null ? 'Sin vencimiento' : 'días restantes'} tone="brand" />
            <StatCard icon={QrCode} label="Short code" value={qr.short_code} tone="slate" />
          </div>

          <Card>
            <CardBody className="grid gap-5">
              <EditableField
                label="Título"
                value={qr.title || 'Sin título'}
                editing={editing === 'title'}
                draft={draft.title}
                onEdit={() => setEditing('title')}
                onChange={(value) => setDraft((prev) => ({ ...prev, title: value }))}
                onCancel={() => setEditing(null)}
                onSave={() => saveField('title')}
                saving={saving}
              />

              <EditableField
                label="Destino del QR"
                value={qr.destination_url}
                link
                editing={editing === 'destination_url'}
                draft={draft.destination_url}
                onEdit={() => setEditing('destination_url')}
                onChange={(value) => setDraft((prev) => ({ ...prev, destination_url: value }))}
                onCancel={() => setEditing(null)}
                onSave={() => saveField('destination_url')}
                saving={saving}
                helper="El código QR físico seguirá siendo el mismo; solo cambia el destino."
              />
            </CardBody>
          </Card>

          {subscription?.features?.analytics ? (
            <Card>
              <CardBody>
                <div className="mb-5 flex items-center gap-2">
                  <BarChart2 size={18} className="text-brand-700" />
                  <h2 className="text-lg font-black text-ink-950">Analytics</h2>
                </div>

                {analytics?.daily_breakdown?.length ? (
                  <div className="grid gap-3">
                    {analytics.daily_breakdown.slice(0, 10).reverse().map((item) => {
                      const max = Math.max(...analytics.daily_breakdown.map((x) => x.scans), 1)
                      return (
                        <div key={item.date} className="grid grid-cols-[70px_1fr_44px] items-center gap-3">
                          <span className="text-right text-xs font-bold text-ink-400">{item.date.slice(5)}</span>
                          <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, (item.scans / max) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-black text-ink-700">{formatNumber(item.scans)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-ink-50 p-5 text-center text-sm font-semibold text-ink-500">
                    Aún no hay datos suficientes de escaneo.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="text-center">
                <BarChart2 className="mx-auto text-ink-300" size={34} />
                <h3 className="mt-3 font-black text-ink-950">Analytics disponibles en planes de pago</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
                  Mejora tu plan para ver escaneos por fecha, dispositivo y más.
                </p>
                <Button to="/billing" className="mt-5">Ver planes</Button>
              </CardBody>
            </Card>
          )}

          <Button variant="danger" onClick={handleDelete} disabled={saving} className="justify-self-start">
            <Trash2 size={16} /> Eliminar este QR
          </Button>
        </section>
      </div>
    </>
  )
}

function EditableField({ label, value, link, editing, draft, onEdit, onChange, onCancel, onSave, saving, helper }) {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-400">{label}</p>
        {!editing && (
          <button onClick={onEdit} className="rounded-xl p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-700">
            <Edit2 size={15} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="grid gap-3">
          <input autoFocus type={link ? 'url' : 'text'} value={draft || ''} onChange={(event) => onChange(event.target.value)} className="input-field" />
          {helper && <p className="text-xs font-semibold text-brand-700">{helper}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={saving}><Check size={14} /> Guardar</Button>
            <Button size="sm" variant="secondary" onClick={onCancel}><X size={14} /> Cancelar</Button>
          </div>
        </div>
      ) : link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all text-sm font-bold text-brand-700 hover:underline">
          <ExternalLink size={15} /> {value}
        </a>
      ) : (
        <p className="text-base font-bold text-ink-900">{value}</p>
      )}
    </div>
  )
}
