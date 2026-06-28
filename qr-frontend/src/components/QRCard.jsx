import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ExternalLink, Trash2, Download, BarChart2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI } from '../api/client'

export default function QRCard({ qr, onDelete, canAnalytics }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
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

  const downloadImage = () => {
    const token = localStorage.getItem('access_token')
    fetch(`/api/v1/qr/${qr.id}/image`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `qr-${qr.short_code}.png`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  const expiresAt = qr.expires_at ? new Date(qr.expires_at) : null
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000))
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
      {/* QR preview */}
      <div className="flex-shrink-0">
        <QRCodeSVG value={qr.redirect_url} size={90} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{qr.title || 'Sin título'}</h3>
            <a
              href={qr.destination_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-violet-600 hover:underline flex items-center gap-1 truncate"
            >
              <ExternalLink size={12} /> {qr.destination_url}
            </a>
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
              <Calendar size={12} /> Vence en {daysLeft}d
            </span>
          )}
          <span className="font-mono text-gray-400">{qr.short_code}</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={downloadImage}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <Download size={12} /> Descargar
          </button>
          {canAnalytics && (
            <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <BarChart2 size={12} /> Analytics
            </button>
          )}
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
          >
            <Trash2 size={12} /> {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
