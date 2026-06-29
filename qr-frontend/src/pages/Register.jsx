import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Lock, Mail, QrCode, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import Button from '../components/ui/Button'

const perks = [
  '1 QR dinámico gratis cada mes',
  'Cambia el destino sin reimprimir',
  'Descarga PNG en alta resolución',
  '44 tipos de QR disponibles',
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name)
      toast.success('Cuenta creada. Tienes 30 días gratis.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Error al crear la cuenta'
      toast.error(typeof msg === 'string' ? msg : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg grid min-h-screen lg:grid-cols-[0.9fr_1fr]">

      {/* ── Left — benefits panel ───────────────────────────── */}
      <section className="relative hidden flex-col items-start justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-16 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl" />

        <Link to="/" className="mb-12 flex items-center gap-2.5 font-black text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <QrCode size={20} />
          </span>
          QR Service
        </Link>

        <div className="eyebrow mb-6 border-white/30 bg-white/10 text-white">
          30 días gratis · Sin tarjeta
        </div>

        <h1 className="text-balance text-4xl font-black leading-tight tracking-tight xl:text-5xl">
          Empieza hoy, escala cuando necesites.
        </h1>
        <p className="mt-5 text-lg leading-8 text-white/70">
          Únete a cientos de negocios que ya gestionan sus QR dinámicos con QR Service.
        </p>

        <ul className="mt-10 grid gap-4">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-white/85">{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-3xl bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Plan gratuito incluye</p>
          <p className="text-4xl font-black">1 QR / mes</p>
          <p className="mt-1 text-sm text-white/60">Actualiza cuando necesites más capacidad</p>
        </div>
      </section>

      {/* ── Right — form ────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link to="/" className="mb-8 flex items-center gap-2.5 font-black text-brand-700 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-glow-sm">
              <QrCode size={18} />
            </span>
            QR Service
          </Link>

          <div className="mb-8">
            <div className="eyebrow mb-3">30 días gratis · Sin tarjeta</div>
            <h2 className="text-3xl font-black text-ink-950">Crear cuenta</h2>
            <p className="mt-2 text-sm text-ink-500">Empieza gratis. Crea tu primer QR profesional hoy.</p>
          </div>

          {/* OAuth */}
          <div className="mb-6 grid gap-3">
            <a
              href="/api/v1/auth/google"
              className="flex items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Registrarse con Google
            </a>
            <a
              href="/api/v1/auth/facebook"
              className="flex items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Registrarse con Facebook
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-semibold text-ink-400">o con tu correo</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="label">Nombre completo</label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="Jose Cortinez"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-1.5 text-xs font-medium text-ink-400">
                Usa mayúscula, número y símbolo.
              </p>
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-brand-700 hover:underline">
              Iniciar sesión
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-ink-400">
            Al registrarte aceptas nuestros Términos de Servicio y Política de Privacidad.
          </p>
        </div>
      </section>
    </div>
  )
}
