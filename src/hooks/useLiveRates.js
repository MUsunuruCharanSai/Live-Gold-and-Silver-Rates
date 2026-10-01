import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLiveRates } from '../api/metals'

const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 30000

export function useLiveRates() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(POLL_MS / 1000)
  const aliveRef = useRef(true)

  const loadRates = useCallback(async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchLiveRates()
      if (!aliveRef.current) return
      setRates(data)
      setLastUpdated(data.updatedAt || new Date())
      setError('')
      setSecondsLeft(POLL_MS / 1000)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err.message || 'Could not update live rates.')
    } finally {
      if (!aliveRef.current) return
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    loadRates(false)

    const pollTimer = setInterval(() => {
      loadRates(true)
    }, POLL_MS)

    const tickTimer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => {
      aliveRef.current = false
      clearInterval(pollTimer)
      clearInterval(tickTimer)
    }
  }, [loadRates])

  return {
    rates,
    loading,
    refreshing,
    error,
    lastUpdated,
    secondsLeft,
    pollSeconds: POLL_MS / 1000,
    refresh: () => loadRates(true),
  }
}
