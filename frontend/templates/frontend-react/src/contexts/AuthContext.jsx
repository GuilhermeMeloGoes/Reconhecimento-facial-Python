import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = ''

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [token, setTokenState]  = useState(() => localStorage.getItem('access_token'))

  const setToken = useCallback((t) => {
    setTokenState(t)
    if (t) {
      localStorage.setItem('access_token', t)
    } else {
      localStorage.removeItem('access_token')
    }
  }, [])

  const setRefreshToken = useCallback((t) => {
    if (t) {
      localStorage.setItem('refresh_token', t)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }, [])

  // Check token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem('access_token')
      if (!stored) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${stored}` },
        })

        if (res.ok) {
          const data = await res.json()
          setUsuario(data.usuario)
          setToken(stored)
        } else {
          // Try refresh
          const refreshed = await tentarRefresh()
          if (!refreshed) {
            logout()
          }
        }
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tentarRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setToken(data.access_token)

        // Re-fetch user data
        const meRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` },
        })
        if (meRes.ok) {
          const meData = await meRes.json()
          setUsuario(meData.usuario)
        }
        return true
      }
    } catch {
      // ignore
    }
    return false
  }, [setToken])

  const login = useCallback(async (email, senha) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      throw new Error(data.erro || 'Erro ao fazer login')
    }

    setToken(data.access_token)
    setRefreshToken(data.refresh_token)
    setUsuario(data.usuario)

    return data.usuario
  }, [setToken, setRefreshToken])

  const logout = useCallback(async () => {
    const stored = localStorage.getItem('access_token')
    if (stored) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stored}` },
        })
      } catch {
        // ignore
      }
    }

    setToken(null)
    setRefreshToken(null)
    setUsuario(null)
  }, [setToken, setRefreshToken])

  const isAdmin = useCallback(() => {
    return usuario?.perfil === 'admin'
  }, [usuario])

  const isAluno = useCallback(() => {
    return usuario?.perfil === 'aluno'
  }, [usuario])

  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = localStorage.getItem('access_token')

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    let res = await fetch(url, { ...options, headers })

    // If 401, try refreshing
    if (res.status === 401) {
      const refreshed = await tentarRefresh()
      if (refreshed) {
        const newToken = localStorage.getItem('access_token')
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(url, { ...options, headers })
      } else {
        logout()
        throw new Error('Sessão expirada')
      }
    }

    return res
  }, [tentarRefresh, logout])

  const value = {
    usuario,
    token,
    loading,
    login,
    logout,
    isAdmin,
    isAluno,
    authFetch,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
