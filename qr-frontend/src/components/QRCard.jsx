/**
 * QRCard.jsx — Tarjeta de QR en el dashboard
 * Sprint 2: Agrega Link a /qr/:id para ver detalle.
 *           Descarga usa cookies (sin localStorage).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ExternalLink, Trash2, Download, BarChart2, Calendar, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI } from '../api/client'

export default function QRCard({ qr, onDelete, canAnalytics }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('¿Eliminar este QR?')) return
    setDeleting(true)
    try {
      await qrAPI.delete(qr.id)
      toast.success('QR eliminado')
      onDelete(qr.id)
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const downloadImage = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await qrAPI.downloadImage(qr.id, qr.short_code)
    } catch {
      toast.error('Error al descargar')
    }
  }

  const expiresAt = qr.expires_at ? new Date(qr.expires_at) : null
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000))
    : null

  const shortLink = qr.redirect_url || `${window.location.origin}/r/${qr.short_code}`

  return (
    <Link
      to={`/qr/${qr.id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 hover:border-violet-200 hover:shadow-md transition-all"
    >
      {/* QR preview */}
      <div className={`flex-shrink-0 ${qr.status !== 'active' ? 'opacity-40 grayscale' : ''}`}>
        <QRCodeSVG value={shortLink} size={80} level="M" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{qr.title || 'Sin título'}</h3>
            <p className="text-sm text-gray-400 truncate flex items-center gap-1 mt-0.5">
              <ExternalLink size={11} />
              {qr.destination_url}
            </p>
          </div>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
            ${qr.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {qr.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart2 size={12} /> {qr.scan_count} escaneos
          </span>
          {daysLeft !== null && (
            <span className={`flex items-center gap-1 ${daysLeft <= 5 ? 'text-amber-600 font-medium' : ''}`}>
              <Calendar size={12} />
              {daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d`}
            </span>
          )}
          <span className="font-mono text-gray-300">{qr.short_code}</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700">
            <Eye size={12} /> Ver detalle
          </span>
          <button
            onClick={downloadImage}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Download size={12} /> PNG
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
          >
            <Trash2 size={12} /> {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Link>
  )
}
