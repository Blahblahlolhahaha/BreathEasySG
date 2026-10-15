// Loads the air readings for the whole app and refreshes them every few minutes.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getReadings } from '../api/readings'
import { config } from '../config'

const ReadingsContext = createContext(null)

/**
 * Fetches readings once for the whole app and refreshes them every few minutes
 * and whenever the tab comes back into view. Keeps the last good data if a refresh fails.
 */
export function ReadingsProvider({ children }) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const inFlight = useRef(null)

  const load = useCallback(async () => {
    inFlight.current?.abort()
    const ctrl = new AbortController()
    inFlight.current = ctrl
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await getReadings({ signal: ctrl.signal })
      setState({ data, error: null, loading: false })
    } catch (error) {
      if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, config.refreshMs)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('be:mock-change', load)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('be:mock-change', load)
      inFlight.current?.abort()
    }
  }, [load])

  return <ReadingsContext.Provider value={{ ...state, refresh: load }}>{children}</ReadingsContext.Provider>
}

/** { data, error, loading, refresh }. data is null until the first load succeeds. */
export const useReadings = () => useContext(ReadingsContext)

/** Hourly series for one region and metric: [{ time, value }]. */
export function seriesFor(data, regionId, metric) {
  if (!data?.history || !regionId) return []
  return data.history.map((p) => ({ time: p.time, value: p[metric]?.[regionId] })).filter((p) => p.value != null)
}
