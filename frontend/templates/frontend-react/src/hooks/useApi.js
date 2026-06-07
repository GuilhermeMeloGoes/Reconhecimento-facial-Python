import { useState, useEffect, useCallback } from 'react'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (token) {
    return { 'Authorization': `Bearer ${token}` }
  }
  return {}
}

export function useApi(url, interval = 0) {
  const [data, setData]       = useState()
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url, {
        headers: { ...getAuthHeaders() },
      })

      if (res.status === 401) {
        // Try token refresh
        const refreshed = await tryRefresh()
        if (refreshed) {
          const retryRes = await fetch(url, {
            headers: { ...getAuthHeaders() },
          })
          if (!retryRes.ok) throw new Error(`Erro ${retryRes.status}`)
          const json = await retryRes.json()
          setData(json)
          setError(null)
          return
        }
        // If refresh failed, redirect to login
        window.location.href = '/login'
        return
      }

      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    const initialFetchId = setTimeout(fetchData, 0)
    let pollId
    if (interval > 0) {
      pollId = setInterval(fetchData, interval)
    }
    return () => {
      clearTimeout(initialFetchId)
      if (pollId) clearInterval(pollId)
    }
  }, [fetchData, interval])

  return { data, loading, error, refetch: fetchData }
}

export async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  }

  let res = await fetch(url, { ...options, headers })

  // Auto-retry on 401
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryHeaders = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      }
      res = await fetch(url, { ...options, headers: retryHeaders })
    } else {
      window.location.href = '/login'
      throw new Error('Sessão expirada')
    }
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`)
  return json
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('access_token', data.access_token)
      return true
    }
  } catch {
    // ignore
  }
  return false
}