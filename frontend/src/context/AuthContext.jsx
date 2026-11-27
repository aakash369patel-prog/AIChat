import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const persistSession = useCallback((payload) => {
    localStorage.setItem('auth_token', payload.token)
    setUser(payload.user)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }

    api
      .get('/me')
      .then((res) => setUser(res.data.user))
      .catch(() => clearSession())
      .finally(() => setLoading(false))
  }, [clearSession])

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password })
    persistSession(res.data)
    return res.data.user
  }

  const register = async (name, email, password, password_confirmation) => {
    const res = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation,
    })
    persistSession(res.data)
    return res.data.user
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid; still clear local session.
    }
    clearSession()
  }

  const refreshUser = async () => {
    const res = await api.get('/me')
    setUser(res.data.user)
    return res.data.user
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}