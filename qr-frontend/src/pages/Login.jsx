import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, QrCode } from 'lucide-react'
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
    <div className="app-bg grid min-h-screen lg:grid-cols-[1fr_0.85fr]">
      <section className="hidden items-center justify-center p-10 lg:flex">
        <div className="max-w-xl">
          <div className="eyebrow mb-5">QR Service</div>
          <h1 className="text-balance text-6xl font-black leading-none tracking-tight text-ink-950">
            Vuelve a medir cada escaneo.
          </h1>
          <p className="mt-6 text-lg leading-8 text-ink-500">
            Accede a tus QR dinámicos, actualiza destinos y consulta el rendimiento de tus campañas.
          </p>
          <div className="mt-8 rounded-4xl border border-white/70 bg-white/70 p-5 shadow-card backdrop-blur">
            <div className="grid grid-cols-3 gap-3">
              {['Seguro', 'Rápido', 'Responsive'].map((item) => (
                <div key={item} className="rounded-2xl bg-brand-50 p-4 text-center text-sm font-black text-brand-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-black text-brand-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
              <QrCode size={22} />
            </span>
            QR Service
          </Link>

          <div className="surface-card p-6 sm:p-8">
            <div className="mb-7">
              <h1 className="text-3xl font-black tracking-tight text-ink-950">Iniciar sesión</h1>
              <p className="mt-2 text-sm text-ink-500">Bienvenido de nuevo. Tus QR te esperan.</p>
            </div>

            <div className="mb-6 grid gap-3">
              <a href="/api/v1/auth/google" className="btn-secondary w-full">Continuar con Google</a>
              <a href="/api/v1/auth/facebook" className="btn-secondary w-full">Continuar con Facebook</a>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 font-bold text-ink-400">o con tu correo</span></div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={17} />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="input-field pl-11"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={17} />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="input-field pl-11"
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Entrar al portal'}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-ink-500">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-black text-brand-700 hover:underline">
              Créala gratis
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
