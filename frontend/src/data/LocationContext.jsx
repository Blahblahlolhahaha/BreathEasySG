// Keeps track of where the user is: their GPS position (if allowed) or an area they picked.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { findRegionForCoords } from '../api/location'

const LocationContext = createContext(null)
const AREA_KEY = 'be.chosenArea'

/**
 * Handles "where am I?" for the dashboard.
 * status: 'checking' | 'prompt' | 'locating' | 'ready' | 'denied' | 'error' | 'unsupported'
 * If location is off, the user can pick an area instead (chosenRegionId).
 */
export function LocationProvider({ children }) {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [status, setStatus] = useState(supported ? 'checking' : 'unsupported')
  const [coords, setCoords] = useState(null)
  const [gpsRegionId, setGpsRegionId] = useState(null)
  const [chosenRegionId, setChosenRegionIdState] = useState(() => {
    try {
      return localStorage.getItem(AREA_KEY)
    } catch {
      return null
    }
  })

  const locate = useCallback(() => {
    if (!supported) return
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
        setCoords(c)
        setGpsRegionId(await findRegionForCoords(c.lat, c.lng))
        setStatus('ready')
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }, [supported])

  // Only locate automatically if the user already allowed it; otherwise wait for them to tap the button.
  useEffect(() => {
    if (!supported) return
    if (!navigator.permissions?.query) {
      setStatus('prompt')
      return
    }
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') locate()
        else setStatus(p.state === 'denied' ? 'denied' : 'prompt')
      })
      .catch(() => setStatus('prompt'))
  }, [supported, locate])

  const setChosenRegionId = (id) => {
    try {
      localStorage.setItem(AREA_KEY, id)
    } catch {
      // ignore
    }
    setChosenRegionIdState(id)
  }

  const usingGps = status === 'ready' && gpsRegionId
  const value = {
    status,
    coords: usingGps ? coords : null,
    regionId: usingGps ? gpsRegionId : chosenRegionId,
    source: usingGps ? 'gps' : chosenRegionId ? 'chosen' : null,
    locate,
    setChosenRegionId,
  }
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export const useLocation = () => useContext(LocationContext)
