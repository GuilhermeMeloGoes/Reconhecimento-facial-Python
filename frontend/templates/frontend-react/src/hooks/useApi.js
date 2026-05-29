import { useState, useEffect, useCallback } from 'react'

export function useApi(url, interval = 0) {
  const [data, setData]       = useState()
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
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
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`)
  return json
}