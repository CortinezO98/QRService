import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { BarChart2, Download, Folder, Plus, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignsAPI, qrAPI } from '../api/client'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { Card, CardBody } from '../components/ui/Card'
import { formatNumber } from '../lib/format'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignsAPI.get(id)
      .then(({ data }) => setStats(data))
      .catch(() => {
        toast.error('No se pudo cargar la campaña')
        navigate('/campaigns')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingScreen label="Cargando campaña..." />
  if (!stats) return null

  const shortLink = (shortCode) => `${window.location.origin}/r/${shortCode}`

  const handleDownload = async (qr) => {
    try {
      await qrAPI.downloadImage(qr.id, qr.short_code, 1024)
    } catch {
      toast.error('Error al descargar')
    }
  }

  return (
    <>
      <PageHeader
        backTo="/campaigns"
        backLabel="Campañas"
        eyebrow={<><Folder size={13} /> Campaña</>}
        title={stats.name}
        description={stats.description || 'QR agrupados en una campaña.'}
        actions={<Button to={`/create?campaign_id=${id}`}><Plus size={17} /> Nuevo QR</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={QrCode} label="QR totales" value={stats.total_qr || 0} />
        <StatCard icon={QrCode} label="QR activos" value={stats.active_qr || 0} tone="green" />
        <StatCard icon={BarChart2} label="Escaneos" value={stats.total_scans || 0} tone="brand" />
      </div>

      {!stats.qr_codes?.length ? (
        <EmptyState
          icon={QrCode}
          title="Aún no hay QR en esta campaña"
          description="Crea un QR dentro de esta campaña para empezar a medir resultados agrupados."
          actionLabel="Crear QR"
          actionTo={`/create?campaign_id=${id}`}
        />
      ) : (
        <div className="grid gap-4">
          {stats.qr_codes.map((qr) => {
            const isActive = qr.status === 'active'
            return (
              <Card key={qr.id} hover>
                <CardBody>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Link to={`/qr/${qr.id}`} className={`shrink-0 rounded-3xl border border-ink-100 bg-white p-3 ${!isActive ? 'opacity-50 grayscale' : ''}`}>
                      <QRCodeSVG value={shortLink(qr.short_code)} size={76} level="M" />
                    </Link>

                    <Link to={`/qr/${qr.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black text-ink-950 hover:text-brand-700">{qr.title || 'Sin título'}</h3>
                        <Badge variant={isActive ? 'green' : 'amber'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs font-semibold text-ink-400">{qr.short_code}</p>
                      <p className="mt-2 text-sm font-semibold text-ink-500">{formatNumber(qr.scan_count)} escaneos · {qr.qr_type || 'url'}</p>
                    </Link>

                    <Button variant="secondary" size="sm" onClick={() => handleDownload(qr)}>
                      <Download size={14} /> PNG
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
