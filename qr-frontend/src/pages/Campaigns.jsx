import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Edit2, Folder, Lock, Plus, QrCode, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingAPI, campaignsAPI } from '../api/client'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b']

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })

  const loadCampaigns = async () => {
    const { data } = await campaignsAPI.list()
    setCampaigns(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    billingAPI.status()
      .then(({ data }) => {
        setSubscription(data)
        if (data.plan !== 'free') return loadCampaigns()
        return null
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => setForm({ name: '', description: '', color: '#6366f1' })

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data } = await campaignsAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
      })
      setCampaigns((prev) => [data, ...prev])
      setCreating(false)
      resetForm()
      toast.success('Campaña creada')
    } catch {
      toast.error('Error al crear campaña')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (campaign) => {
    setEditingId(campaign.id)
    setForm({ name: campaign.name, description: campaign.description || '', color: campaign.color || '#6366f1' })
  }

  const handleUpdate = async (id) => {
    setSaving(true)
    try {
      const { data } = await campaignsAPI.update(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
      })
      setCampaigns((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
      setEditingId(null)
      resetForm()
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
      setCampaigns((prev) => prev.filter((item) => item.id !== id))
      toast.success('Campaña eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (loading) return <LoadingScreen label="Cargando campañas..." />

  if (subscription?.plan === 'free') {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={Lock}
          title="Campañas disponibles en planes de pago"
          description="Organiza tus QR por cliente, evento o campaña y revisa estadísticas consolidadas."
          actionLabel="Ver planes"
          actionTo="/billing"
        />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={<><Folder size={13} /> Organización</>}
        title="Campañas"
        description="Agrupa tus QR por proyecto, cliente, evento o estrategia comercial."
        actions={<Button onClick={() => setCreating(true)}><Plus size={17} /> Nueva campaña</Button>}
      />

      {creating && (
        <CampaignForm
          title="Nueva campaña"
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => { setCreating(false); resetForm() }}
          saving={saving}
        />
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Aún no tienes campañas"
          description="Crea tu primera campaña para organizar tus QR y mejorar tus reportes."
          actionLabel="Nueva campaña"
          actionOnClick={() => setCreating(true)}
        />
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} hover>
              <CardBody>
                {editingId === campaign.id ? (
                  <CampaignForm
                    compact
                    form={form}
                    setForm={setForm}
                    onSubmit={(event) => { event.preventDefault(); handleUpdate(campaign.id) }}
                    onCancel={() => { setEditingId(null); resetForm() }}
                    saving={saving}
                  />
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link to={`/campaigns/${campaign.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl" style={{ backgroundColor: `${campaign.color || '#6366f1'}20` }}>
                        <Folder size={26} style={{ color: campaign.color || '#6366f1' }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-ink-950 group-hover:text-brand-700">{campaign.name}</h3>
                        {campaign.description && <p className="mt-1 truncate text-sm text-ink-500">{campaign.description}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge><QrCode size={12} /> {campaign.qr_count || 0} QR</Badge>
                        </div>
                      </div>
                      <ChevronRight className="ml-auto hidden text-ink-300 group-hover:text-brand-600 sm:block" size={20} />
                    </Link>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(campaign)}><Edit2 size={14} /> Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(campaign.id, campaign.name)}><Trash2 size={14} /> Eliminar</Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

function CampaignForm({ title, form, setForm, onSubmit, onCancel, saving, compact = false }) {
  return (
    <Card className={compact ? 'border-0 shadow-none' : 'mb-6'}>
      <CardBody className={compact ? 'p-0' : ''}>
        {title && <h3 className="mb-4 text-lg font-black text-ink-950">{title}</h3>}
        <form onSubmit={onSubmit} className="grid gap-4">
          <input className="input-field" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nombre de la campaña" required maxLength={255} />
          <textarea className="input-field resize-y" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descripción opcional" rows={3} />
          <div>
            <p className="label">Color</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm((prev) => ({ ...prev, color }))} className={`h-8 w-8 rounded-full transition ${form.color === color ? 'scale-110 ring-2 ring-ink-400 ring-offset-2' : ''}`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}><X size={15} /> Cancelar</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}><Check size={15} /> {saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
