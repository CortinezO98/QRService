import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'

// URL base de la API
const API_URL = 'http://localhost:7000'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  // Mostrar error si viene de OAuth fallido
  const oauthError = searchParams.get('error')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail?.message || 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = `${API_URL}/api/v1/auth/google`
  }

  const handleFacebook = () => {
    window.location.href = `${API_URL}/api/v1/auth/facebook`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-white px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl mb-4">
            <QrCode size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-gray-500 text-sm mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {/* Error OAuth */}
        {oauthError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            No se pudo iniciar sesión con el proveedor. Intenta de nuevo.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── Botones sociales ─────────────────────────── */}
          <div className="space-y-3 mb-6">

            {/* Google */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebook}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-blue-50 transition-colors font-medium text-gray-700 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
            </button>
          </div>

          {/* Separador */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400 font-medium">o con tu correo</span>
            </div>
          </div>

          {/* ── Formulario email/contraseña ───────────────── */}
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-violet-600 font-medium hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
