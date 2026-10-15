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
  const { regionId } = useLocation()
  const [status, setStatus] = useState({ current: [], places: {} })
  const placeKey = places.map((p) => p.id).join(',')

  useEffect(() => {
    if (!data) return
    let alive = true
    getLimitBreaches({ regionId, placeIds: placeKey ? placeKey.split(',') : [] }).then((s) => alive && setStatus(s))
    return () => {
      alive = false
    }
  }, [data, regionId, placeKey])

  return status
}
