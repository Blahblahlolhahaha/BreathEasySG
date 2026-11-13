// Shares the user's limits and saved places with every page.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getMe } from '../api/profile'
import { DEFAULT_LIMITS } from '../lib/aq'

const ProfileContext = createContext(null)

/**
 * Loads the signed-in user's limits and saved places (read-only for the dashboard).
 * Pages that save settings call `refresh()` afterwards so the dashboard shows the new values.
 */
export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(
    () =>
      getMe()
        .then((p) => {
          if (alive.current) {
            setProfile(p)
            setError(null)
          }
        })
        .catch((e) => alive.current && setError(e)),
    [],
  )

  useEffect(() => {
    alive.current = true
    refresh()
    window.addEventListener('be:mock-change', refresh)
    return () => {
      alive.current = false
      window.removeEventListener('be:mock-change', refresh)
    }
  }, [refresh])

  const value = {
    profile,
    error,
    loading: !profile && !error,
    limits: profile?.limits || DEFAULT_LIMITS,
    places: profile?.places || [],
    setupComplete: Boolean(profile?.setupComplete),
    refresh,
  }
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfile = () => useContext(ProfileContext)
