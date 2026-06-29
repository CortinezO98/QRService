import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'
import LoadingScreen from '../components/ui/LoadingScreen'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const err = searchParams.get('error')

    if (err) {
      const messages = {
        google_failed: 'No se pudo iniciar sesión con Google.',
        facebook_failed: 'No se pudo iniciar sesión con Facebook.',
        invalid_state: 'Sesión OAuth inválida. Intenta de nuevo.',
      }
      const msg = messages[err] || 'Error al iniciar sesión.'
      setError(msg)
      toast.error(msg)
      setTimeout(() => navigate('/login'), 2500)
      return
    }

    refreshUser().then((user) => {
      if (user) navigate('/dashboard', { replace: true })
      else {
        setError('No se pudo verificar la sesión.')
        setTimeout(() => navigate('/login'), 2500)
      }
    })
  }, [])

  if (error) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center px-4">
        <div className="surface-card max-w-sm p-8 text-center">
          <div className="text-5xl">😕</div>
          <p className="mt-4 font-black text-red-600">{error}</p>
          <p className="mt-2 text-sm text-ink-400">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return <LoadingScreen label="Iniciando sesión..." />
}
