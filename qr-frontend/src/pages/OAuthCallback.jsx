/**
 * OAuthCallback.jsx
 * Captura tokens de Google/Facebook y redirige al dashboard.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const accessToken  = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const provider     = searchParams.get('provider')
    const err          = searchParams.get('error')

    if (err) {
      const messages = {
        google_failed:   'No se pudo iniciar sesión con Google.',
        facebook_failed: 'No se pudo iniciar sesión con Facebook.',
      }
      setError(messages[err] || 'Error al iniciar sesión.')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (accessToken && refreshToken) {
      // Guardar tokens
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)

      const providerName = provider === 'google' ? 'Google' : 'Facebook'
      toast.success(`¡Sesión iniciada con ${providerName}!`)

      // Forzar recarga completa para que useAuth detecte el nuevo token
      window.location.href = '/dashboard'
    } else {
      setError('No se recibieron tokens. Intenta de nuevo.')
      setTimeout(() => navigate('/login'), 3000)
    }
  }, [])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                   justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                 justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid #5B21B6',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Iniciando sesión...</p>
    </div>
  )
}
