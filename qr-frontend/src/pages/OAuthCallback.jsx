/**
 * OAuthCallback.jsx
 * Sprint 1: El backend ya NO envía tokens en URL.
 * El backend setea las cookies HttpOnly y redirige directamente al /dashboard.
 * Este componente solo sirve para mostrar el spinner mientras se carga la sesión
 * o manejar errores de OAuth que SÍ llegan como query params (solo ?error=...).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const err = searchParams.get('error')

    if (err) {
      const messages = {
        google_failed:  'No se pudo iniciar sesión con Google.',
        facebook_failed:'No se pudo iniciar sesión con Facebook.',
        invalid_state:  'Sesión OAuth inválida. Intenta de nuevo.',
      }
      const msg = messages[err] || 'Error al iniciar sesión.'
      setError(msg)
      toast.error(msg)
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    // No hay error en URL — el backend ya seteó las cookies y redirigió aquí
    // Solo necesitamos verificar la sesión y redirigir al dashboard
    refreshUser().then(user => {
      if (user) {
        navigate('/dashboard', { replace: true })
      } else {
        setError('No se pudo verificar la sesión. Intenta iniciar sesión.')
        setTimeout(() => navigate('/login'), 3000)
      }
    })
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid #5B21B6',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Iniciando sesión...</p>
    </div>
  )
}