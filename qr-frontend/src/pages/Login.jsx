import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, QrCode, BarChart2, RefreshCw, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import Button from '../components/ui/Button'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Email o contraseña incorrectos'
      toast.error(typeof msg === 'string' ? msg : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-bg grid min-h-screen lg:grid-cols-[1fr_0.9fr]">

      {/* ── Left panel ─────────────────────────────────────── */}
      <section className="relative hidden flex-col items-start justify-center overflow-hidden p-16 lg:flex">
        <div className="pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-brand-600/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-accent-400/10 blur-3xl" />

        <div className="relative max-w-lg">
          <Link to="/" className="mb-12 flex items-center gap-2.5 font-black text-brand-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-glow-sm">
              <QrCode size={20} />
            </span>
            QR Service
          </Link>

          <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-tight text-ink-950 xl:text-6xl">
            Vuelve a medir cada escaneo.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink-500">
            Accede a tus QR dinámicos, actualiza destinos en tiempo real y consulta el rendimiento de tus campañas.
          </p>

          <div className="mt-10 grid gap-3">
            {[
              { icon: RefreshCw, text: 'Edita el destino sin reimprimir' },
              { icon: BarChart2, text: 'Analytics en tiempo real' },
              { icon: Shield,    text: 'Pagos seguros con Stripe' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-card backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={15} />
                </div>
                <p className="text-sm font-semibold text-ink-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Right panel — form ─────────────────────────────── */}
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
            <h2 className="text-3xl font-black text-ink-950">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-ink-500">Bienvenido de nuevo. Tus QR te esperan.</p>
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
              Continuar con Google
            </a>
            <a
              href="/api/v1/auth/facebook"
              className="flex items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
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
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar al portal'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-bold text-brand-700 hover:underline">
              Créala gratis
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
