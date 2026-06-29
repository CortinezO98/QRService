/**
 * CampaignDetail.jsx — /campaigns/:id
 * Sprint 3: Vista detallada de una campaña con su lista de QR y estadísticas.
 */
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Folder, QrCode, BarChart2,
  ExternalLink, Download, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignsAPI, qrAPI } from '../api/client'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignsAPI.get(id)
      .then(res => setStats(res.data))
      .catch(() => {
        toast.error('No se pudo cargar la campaña')
        navigate('/campaigns')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDownload = async (qr) => {
    try {
      await qrAPI.downloadImage(qr.id, qr.short_code)
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

  if (!stats) return null

  const shortLink = (short_code) => `${window.location.origin}/r/${short_code}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Back */}
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Campañas
      </Link>

      {/* Header de la campaña */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: (stats.color || '#6366f1') + '20' }}
          >
            <Folder size={28} style={{ color: stats.color || '#6366f1' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{stats.name}</h1>
            {stats.description && (
              <p className="text-gray-500 text-sm mt-0.5">{stats.description}</p>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total_qr}</p>
            <p className="text-xs text-gray-500 mt-0.5">QR totales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active_qr}</p>
            <p className="text-xs text-gray-500 mt-0.5">QR activos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">
              {stats.total_scans.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Escaneos totales</p>
          </div>
        </div>
      </div>

      {/* Lista de QR en esta campaña */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          QR en esta campaña ({stats.total_qr})
        </h2>
        <Link
          to={`/create?campaign_id=${id}`}
          className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Nuevo QR
        </Link>
      </div>

      {stats.qr_codes?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <QrCode size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aún no hay QR en esta campaña</p>
          <Link
            to={`/create?campaign_id=${id}`}
            className="inline-flex items-center gap-2 mt-4 bg-violet-600 text-white font-medium px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors text-sm"
          >
            <Plus size={16} /> Crear QR en esta campaña
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.qr_codes?.map(qr => (
            <Link
              key={qr.id}
              to={`/qr/${qr.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:border-violet-200 hover:shadow-sm transition-all"
            >
              <div className={`flex-shrink-0 ${qr.status !== 'active' ? 'opacity-40 grayscale' : ''}`}>
                <QRCodeSVG value={shortLink(qr.short_code)} size={64} level="M" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 truncate">{qr.title || 'Sin título'}</p>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                    ${qr.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {qr.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{qr.short_code}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BarChart2 size={11} /> {qr.scan_count} escaneos
                  </span>
                  <span className="capitalize text-gray-400">{qr.qr_type}</span>
                </div>
              </div>
              <button
                onClick={e => { e.preventDefault(); handleDownload(qr) }}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 self-center transition-colors"
                title="Descargar PNG"
              >
                <Download size={15} className="text-gray-400" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
