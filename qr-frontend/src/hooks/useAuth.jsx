import { useState, useEffect, createContext, useContext, useMemo } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    authAPI.me()
      .then(({ data }) => {
        if (mounted) setUser(data)
      })
      .catch(() => {
        if (mounted) setUser(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    setUser(data)
    return data
  }

  const register = async (email, password, full_name) => {
    const { data } = await authAPI.register({ email, password, full_name })
    setUser(data)
    return data
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } finally {
      setUser(null)
    }
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

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, setUser }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
