import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, QrCode, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import Button from '../components/ui/Button'

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
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-black text-brand-700">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
            <QrCode size={22} />
          </span>
          QR Service
        </Link>

        <div className="surface-card p-6 sm:p-8">
          <div className="mb-7">
            <div className="eyebrow mb-3">30 días gratis</div>
            <h1 className="text-3xl font-black tracking-tight text-ink-950">Crear cuenta</h1>
            <p className="mt-2 text-sm text-ink-500">Empieza sin tarjeta. Crea tu primer QR profesional hoy.</p>
          </div>

          <div className="mb-6 grid gap-3">
            <a href="/api/v1/auth/google" className="btn-secondary w-full">Registrarse con Google</a>
            <a href="/api/v1/auth/facebook" className="btn-secondary w-full">Registrarse con Facebook</a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 font-bold text-ink-400">o con tu correo</span></div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="label">Nombre completo</label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={17} />
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.full_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  className="input-field pl-11"
                  placeholder="Jose Cortinez"
                  autoComplete="name"
                />
              </div>
            </div>

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
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="input-field pl-11"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <p className="mt-2 text-xs font-medium text-ink-400">Usa mayúscula, número y símbolo para mayor seguridad.</p>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              {!loading && <ArrowRight size={17} />}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-black text-brand-700 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
