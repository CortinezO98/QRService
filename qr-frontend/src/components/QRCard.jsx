import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ExternalLink,
  Trash2,
  Download,
  BarChart2,
  Calendar,
  Eye,
  Copy,
  Power,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI } from '../api/client'
import { formatNumber, getDaysLeft, getShortLink } from '../lib/format'
import Badge from './ui/Badge'

export default function QRCard({ qr, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const shortLink = getShortLink(qr)
  const daysLeft = getDaysLeft(qr.expires_at)
  const isActive = qr.status === 'active' || qr.is_active === true

  const handleDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar este QR? Esta acción no se puede deshacer.')) return

    setDeleting(true)
    try {
      await qrAPI.delete(qr.id)
      toast.success('QR eliminado')
      onDelete?.(qr.id)
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const downloadImage = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloading(true)
    try {
      await qrAPI.downloadImage(qr.id, qr.short_code, 1024)
      toast.success('Descarga iniciada')
    } catch {
      toast.error('Error al descargar')
    } finally {
      setDownloading(false)
    }
  }

  const copyLink = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(shortLink)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <Link
      to={`/qr/${qr.id}`}
      className="group surface-card block overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex items-center gap-4 sm:block">
          <div className={`rounded-3xl border border-ink-100 bg-white p-3 shadow-sm ${!isActive ? 'opacity-50 grayscale' : ''}`}>
            <QRCodeSVG value={shortLink} size={96} level="M" />
          </div>
          <div className="sm:hidden">
            <Badge variant={isActive ? 'green' : 'amber'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-ink-950 group-hover:text-brand-700">
                {qr.title || 'Sin título'}
              </h3>
              <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink-400">
                <ExternalLink size={13} />
                {qr.destination_url || qr.payload?.url || shortLink}
              </p>
            </div>
            <div className="hidden sm:block">
              <Badge variant={isActive ? 'green' : 'amber'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <span className="inline-flex items-center gap-1 rounded-xl bg-ink-50 px-2.5 py-1.5 font-bold text-ink-500">
              <BarChart2 size={13} /> {formatNumber(qr.scan_count)} escaneos
            </span>
            {daysLeft !== null && (
              <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-bold ${daysLeft <= 5 ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
                <Calendar size={13} /> {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días`}
              </span>
            )}
            <span className="truncate rounded-xl bg-ink-50 px-2.5 py-1.5 font-mono font-bold text-ink-400">
              {qr.short_code}
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl bg-ink-50 px-2.5 py-1.5 font-bold text-ink-500">
              <Power size={13} /> {qr.qr_type || 'url'}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-2xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">
              <Eye size={13} /> Ver detalle
            </span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-2xl bg-ink-50 px-3 py-2 text-xs font-bold text-ink-600 transition hover:bg-ink-100"
            >
              <Copy size={13} /> Copiar
            </button>
            <button
              onClick={downloadImage}
              disabled={downloading}
              className="inline-flex items-center gap-1 rounded-2xl bg-ink-50 px-3 py-2 text-xs font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-60"
            >
              <Download size={13} /> {downloading ? '...' : 'PNG'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto inline-flex items-center gap-1 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={13} /> {deleting ? '...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
