/**
 * AdminDashboard.jsx — Panel de administración
 * Sprint 5: Vista completa para administradores.
 * Ruta: /admin
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, Check, ChevronDown, Crown, Edit2,
  Loader2, QrCode, RefreshCw, Search, Shield,
  Sparkles, Star, Trash2, Users, X, Zap,
  AlertTriangle, Eye, ToggleLeft, ToggleRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import { adminAPI } from '../api/adminAPI'
import LoadingScreen from '../components/ui/LoadingScreen'

// ── Helpers ───────────────────────────────────────────────────

const PLAN_COLORS = {
  free:     'bg-ink-100 text-ink-600',
  starter:  'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pro:      'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  business: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  none:     'bg-red-50 text-red-500',
}

const PLAN_ICONS = {
  free: Zap, starter: Star, pro: Sparkles, business: Crown, none: AlertTriangle,
}

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'business']
const PLAN_DAYS    = { free: 30, starter: 365, pro: 365, business: 365 }

function PlanBadge({ plan }) {
  const Icon = PLAN_ICONS[plan] || AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${PLAN_COLORS[plan] || PLAN_COLORS.none}`}>
      <Icon size={11} /> {plan || 'sin plan'}
    </span>
  )
}

function StatBox({ icon: Icon, label, value, sub, color = 'text-brand-700' }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
          <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          {sub && <p className="mt-1 text-xs font-medium text-ink-400">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

// ── Modal: cambiar plan ───────────────────────────────────────

function ChangePlanModal({ user, onClose, onSaved }) {
  const [plan, setPlan] = useState(user.plan !== 'none' ? user.plan : 'free')
  const [days, setDays] = useState(PLAN_DAYS[plan] || 365)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await adminAPI.changePlan(user.id, plan, days)
      toast.success(`Plan cambiado a ${plan}`)
      onSaved()
      onClose()
    } catch {
      toast.error('Error al cambiar el plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-ink-950">Cambiar plan</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-ink-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
          <span className="font-bold">{user.email}</span>
          {' · Plan actual: '}
          <span className="font-bold capitalize">{user.plan}</span>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-ink-700">Nuevo plan</label>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => { setPlan(p); setDays(PLAN_DAYS[p] || 365) }}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-bold capitalize transition
                  ${plan === p
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-ink-700">
            Duración: <span className="text-brand-700">{days} días</span>
          </label>
          <input
            type="range"
            min={1}
            max={730}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full accent-brand-700"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-400">
            <span>1 día</span>
            <span>2 años</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-ink-200 py-2.5 text-sm font-bold text-ink-600 hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: QR de un usuario ───────────────────────────────────

function UserQRModal({ user, onClose }) {
  const [qrs, setQrs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getUserQR(user.id)
      .then(({ data }) => setQrs(data))
      .catch(() => toast.error('Error al cargar QR'))
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-ink-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div>
            <h3 className="font-black text-ink-950">QR de {user.full_name || user.email}</h3>
            <p className="text-xs text-ink-400">{qrs.length} códigos</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-ink-100">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-brand-600" />
            </div>
          ) : qrs.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">Este usuario no tiene QR.</p>
          ) : (
            <div className="grid gap-3">
              {qrs.map((qr) => (
                <div key={qr.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <QrCode size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">{qr.title || 'Sin título'}</p>
                    <p className="truncate text-xs text-ink-400">{qr.destination_url}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-ink-950">{qr.scan_count}</p>
                    <p className="text-xs text-ink-400">escaneos</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${qr.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {qr.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)

  const [changePlanUser, setChangePlanUser] = useState(null)
  const [viewQRUser, setViewQRUser] = useState(null)

  // Redirigir si no es admin
  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      navigate('/dashboard')
    }
  }, [user, authLoading, navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.stats(),
        adminAPI.listUsers({ page, page_size: 25, search: search || undefined, plan: planFilter || undefined }),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.is_admin) loadData()
  }, [user, page, planFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadData()
  }

  const handleToggleActive = async (u) => {
    try {
      await adminAPI.toggleActive(u.id, !u.is_active)
      toast.success(u.is_active ? 'Usuario desactivado' : 'Usuario activado')
      loadData()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const handleToggleAdmin = async (u) => {
    if (!confirm(`¿${u.is_admin ? 'Revocar' : 'Otorgar'} permisos de admin a ${u.email}?`)) return
    try {
      await adminAPI.toggleAdmin(u.id, !u.is_admin)
      toast.success(u.is_admin ? 'Admin revocado' : 'Admin otorgado')
      loadData()
    } catch {
      toast.error('Error al cambiar rol')
    }
  }

  if (authLoading || (!user?.is_admin && loading)) {
    return <LoadingScreen label="Cargando panel admin..." />
  }

  return (
    <div className="min-h-screen bg-ink-50">

      {/* Header */}
      <header className="border-b border-ink-200/60 bg-white px-6 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black text-ink-950">Panel Admin</h1>
              <p className="text-xs text-ink-400">QR Service · {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-600 hover:bg-ink-50"
            >
              <RefreshCw size={13} /> Actualizar
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800"
            >
              Ir al dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox icon={Users}   label="Usuarios totales"  value={stats.total_users}  sub={`${stats.active_users} activos`} />
            <StatBox icon={QrCode}  label="QR totales"        value={stats.total_qr}     sub={`${stats.active_qr} activos`}    color="text-emerald-700" />
            <StatBox icon={BarChart2} label="Escaneos totales" value={stats.total_scans.toLocaleString()} color="text-purple-700" />
            <StatBox icon={Sparkles} label="Nuevos (30 días)" value={stats.new_users_last_30d} sub={`${stats.new_qr_last_30d} QR nuevos`} color="text-amber-700" />
          </div>
        )}

        {/* Plan distribution */}
        {stats?.plans && (
          <div className="mb-8 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-black text-ink-950">Distribución de planes (suscripciones activas)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PLAN_OPTIONS.map((p) => (
                <div key={p} className="rounded-xl bg-ink-50 p-3 text-center">
                  <p className="text-2xl font-black text-ink-950">{stats.plans[p] || 0}</p>
                  <p className="text-xs font-semibold capitalize text-ink-400">{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-ink-950">
            Usuarios ({users.length})
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Email o nombre..."
                  className="w-56 rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button type="submit" className="rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800">
                Buscar
              </button>
            </form>

            {/* Plan filter */}
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 focus:outline-none"
            >
              <option value="">Todos los planes</option>
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Users table */}
        <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-brand-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-ink-300" />
              <p className="text-sm font-semibold text-ink-400">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/60">
                    {['Usuario', 'Plan', 'QR', 'Escaneos', 'Registro', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-ink-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {users.map((u) => (
                    <tr key={u.id} className="transition hover:bg-ink-50/50">
                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${u.is_admin ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-ink-900 max-w-[180px]">
                              {u.full_name || '—'}
                              {u.is_admin && (
                                <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-black text-brand-700">
                                  ADMIN
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-ink-400 max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <PlanBadge plan={u.plan} />
                        {u.plan_expires_at && (
                          <p className="mt-1 text-[10px] text-ink-400">
                            Vence {new Date(u.plan_expires_at).toLocaleDateString('es-CO')}
                          </p>
                        )}
                      </td>

                      {/* QR */}
                      <td className="px-4 py-3 font-black text-ink-950">{u.qr_count}</td>

                      {/* Escaneos */}
                      <td className="px-4 py-3 font-bold text-emerald-700">{u.total_scans.toLocaleString()}</td>

                      {/* Registro */}
                      <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('es-CO')}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Ver QR */}
                          <button
                            onClick={() => setViewQRUser(u)}
                            title="Ver QR"
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Cambiar plan */}
                          <button
                            onClick={() => setChangePlanUser(u)}
                            title="Cambiar plan"
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Toggle admin */}
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            title={u.is_admin ? 'Revocar admin' : 'Hacer admin'}
                            className={`rounded-lg p-1.5 transition ${u.is_admin ? 'text-brand-600 hover:bg-brand-50' : 'text-ink-400 hover:bg-ink-100'}`}
                          >
                            <Shield size={15} />
                          </button>

                          {/* Toggle activo */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.is_active ? 'Desactivar' : 'Activar'}
                            className={`rounded-lg p-1.5 transition ${u.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-400 hover:bg-red-50'}`}
                          >
                            {u.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {users.length > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
              <p className="text-xs text-ink-400">Página {page}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 disabled:opacity-40 hover:bg-ink-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < 25}
                  className="rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 disabled:opacity-40 hover:bg-ink-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {changePlanUser && (
        <ChangePlanModal
          user={changePlanUser}
          onClose={() => setChangePlanUser(null)}
          onSaved={loadData}
        />
      )}
      {viewQRUser && (
        <UserQRModal
          user={viewQRUser}
          onClose={() => setViewQRUser(null)}
        />
      )}
    </div>
  )
}
