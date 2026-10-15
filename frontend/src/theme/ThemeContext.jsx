// Remembers the light/dark theme choice and shares the current colours with the charts and map.
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

const KEY = 'be.theme'
const ThemeContext = createContext(null)
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Reads the colour tokens from CSS so charts and the map match the current theme. */
function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name) => cs.getPropertyValue(name).trim()
  return { accent: v('--accent'), bad: v('--bad'), line: v('--line'), muted: v('--muted'), fg: v('--fg'), surface: v('--surface') }
}

/** mode is what the user picked ('light' | 'dark' | 'system'); theme is what is showing ('light' | 'dark'). */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'system'
    } catch {
      return 'system'
    }
  })
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)
  const [colors, setColors] = useState(readColors)

  useEffect(() => {
    const mq = darkQuery()
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useLayoutEffect(() => {
    const root = document.documentElement
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', mode)
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      // storage blocked: choice lasts for this visit
    }
    setColors(readColors())
  }, [mode, theme])

  return <ThemeContext.Provider value={{ mode, setMode, theme, colors }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
