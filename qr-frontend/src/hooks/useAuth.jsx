/**
 * useAuth — Context de autenticación
 * OWASP A02: Sin localStorage para tokens.
 * El estado de sesión se mantiene en React state.
 * Las cookies HttpOnly las maneja el navegador automáticamente.
 */
import { useState, useEffect, createContext, useContext } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Intentar restaurar sesión via /auth/me
    // Si hay cookie válida, el backend devuelve el usuario
    authAPI.me()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))  // Sin sesión activa — normal
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data: userData } = await authAPI.login({ email, password })
    // El backend setea las cookies HttpOnly en la response
    // Aquí solo guardamos los datos del usuario en state
    setUser(userData)
    return userData
  }

  const register = async (email, password, full_name) => {
    const { data: userData } = await authAPI.register({ email, password, full_name })
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      // El backend revoca el refresh token y elimina las cookies
      await authAPI.logout()
    } catch {
      // Si falla (sin red, etc.) igual limpiamos el estado local
    }
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.me()
      setUser(data)
      return data
    } catch {
      setUser(null)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)