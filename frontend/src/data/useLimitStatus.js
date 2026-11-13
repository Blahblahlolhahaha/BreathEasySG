// Works out which of the user's locations are over their limits, using the Location & Alerts check.
import { useEffect, useState } from 'react'
import { getLimitBreaches } from '../api/alerts'
import { useReadings } from './ReadingsContext'
import { useProfile } from './ProfileContext'
import { useLocation } from './LocationContext'

/**
 * Which of the user's locations are over their limits right now.
 * Returns { current: [...breaches], places: { [placeId]: [...breaches] } }.
 * Each breach is { metric: 'psi24' | 'pm25', value, limit }.
 */
export function useLimitStatus() {
  const { data } = useReadings()
  const { places } = useProfile()
  const { coords, regionId } = useLocation()
  const [status, setStatus] = useState({ current: [], places: {} })

  // The check works from coordinates, so an area the user picked (no GPS) is sent as that region's centre.
  const region = data?.regions.find((r) => r.id === regionId)
  const lat = coords?.lat ?? region?.lat
  const lng = coords?.lng ?? region?.lng

  useEffect(() => {
    if (!data) return
    let alive = true
    const point = lat != null && lng != null ? { lat, lng } : null
    getLimitBreaches({ coords: point, places }).then((s) => alive && setStatus(s))
    return () => {
      alive = false
    }
  }, [data, lat, lng, places])

  return status
}
