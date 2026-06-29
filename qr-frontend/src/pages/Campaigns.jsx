/**
 * Campaigns.jsx — /campaigns
 * Sprint 3: Gestión de campañas/carpetas para agrupar QR codes.
 * Disponible solo para planes de pago (Starter, Pro, Business).
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Folder, Trash2, Edit2, Check, X,
  QrCode, BarChart2, ChevronRight, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignsAPI, billingAPI } from '../api/client'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    billingAPI.status()
      .then(res => setSubscription(res.data))
      .catch(() => {})
      .finally(() => {
        if (subscription?.plan !== 'free') {
          campaignsAPI.list()
            .then(res => setCampaigns(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
  }, [])

  // Reload campaigns separately once subscription is known
  useEffect(() => {
    if (subscription && subscription.plan !== 'free') {
      campaignsAPI.list()
        .then(res => setCampaigns(Array.isArray(res.data) ? res.data : []))
        .catch(() => setCampaigns([]))
        .finally(() => setLoading(false))
    } else if (subscription) {
      setLoading(false)
    }
  }, [subscription])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const { data } = await campaignsAPI.create({
        name: newName.trim(),
        description: newDesc.trim() || null,
        color: newColor,
      })
      setCampaigns(prev => [data, ...prev])
      setNewName('')
      setNewDesc('')
      setNewColor('#6366f1')
      setCreating(false)
      toast.success('Campaña creada')
    } catch {
      toast.error('Error al crear la campaña')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditDesc(c.description || '')
    setEditColor(c.color)
  }

  const handleUpdate = async (id) => {
    setSaving(true)
    try {
      const { data } = await campaignsAPI.update(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        color: editColor,
      })
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
      setEditingId(null)
      toast.success('Campaña actualizada')
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la campaña "${name}"? Los QR quedarán sin campaña.`)) return
    try {
      await campaignsAPI.delete(id)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      toast.success('Campaña eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  // Paywall — plan FREE no tiene campañas
  if (subscription?.plan === 'free') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Campañas</h1>
        <p className="text-gray-500 mb-6">
          Organiza tus QR en campañas y carpetas. Disponible en planes de pago.
        </p>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 text-left space-y-3">
          {[
            'Agrupa QR por cliente, evento o campaña',
            'Ve estadísticas consolidadas por campaña',
            'Asigna colores para identificar rápido',
            'Disponible desde Starter ($10/año)',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <Link
          to="/billing"
          className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Ver planes →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Organiza tus QR en grupos</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={18} /> Nueva campaña
        </button>
      </div>

      {/* Formulario de creación */}
      {creating && (
        <div className="bg-white border border-violet-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Nueva campaña</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de la campaña"
              maxLength={255}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div>
              <p className="text-xs text-gray-500 mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Creando...' : 'Crear campaña'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de campañas */}
      {campaigns.length === 0 ? (
        <div className="text-center py-20">
          <Folder size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium">Aún no tienes campañas</h3>
          <p className="text-gray-400 text-sm mt-1">Crea tu primera campaña para organizar tus QR</p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 mt-4 bg-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
          >
            <Plus size={18} /> Nueva campaña
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              {editingId === campaign.id ? (
                /* Formulario de edición inline */
                <div className="space-y-3">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={255}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(campaign.id)}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Check size={12} /> Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* Vista normal */
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: campaign.color + '20' }}
                    >
                      <Folder size={20} style={{ color: campaign.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                        {campaign.name}
                      </p>
                      {campaign.description && (
                        <p className="text-xs text-gray-400 truncate">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <QrCode size={11} /> {campaign.qr_count || 0} QR
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0 group-hover:text-violet-400 transition-colors" />
                  </Link>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(campaign)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id, campaign.name)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
