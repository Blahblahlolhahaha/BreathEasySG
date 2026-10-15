// The frame around every signed-in page: sidebar on desktop, bottom tabs on phones, and the over-limit warnings.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Bell, LayoutDashboard, Map as MapIcon, MessageSquare, User } from 'lucide-react'
import { config } from '../config'
import { ProfileProvider, useProfile } from '../data/ProfileContext'
import { LocationProvider } from '../data/LocationContext'
import { useReadings } from '../data/ReadingsContext'
import { useLimitStatus } from '../data/useLimitStatus'
import { METRICS } from '../lib/aq'
import { Logo } from './Logo'
import { MockScenarioPicker } from './MockScenarioPicker'
import { ThemeToggle } from './ThemeToggle'
import { Toasts } from './Toasts'
import { WarningBanner } from './WarningBanner'

const NAV = [
  { to: '/dashboard', label: 'Overview', short: 'Overview', Icon: LayoutDashboard },
  { to: '/map', label: 'Map', short: 'Map', Icon: MapIcon },
  { to: '/alerts', label: 'Places & alerts', short: 'Alerts', Icon: Bell },
  { to: '/profile', label: 'Profile', short: 'Profile', Icon: User },
]

/** Layout for every signed-in page: sidebar (desktop), top bar + bottom tabs (phone), in-app warnings. */
export function AppShell() {
  return (
    <ProfileProvider>
      <LocationProvider>
        <Shell />
      </LocationProvider>
    </ProfileProvider>
  )
}

function Shell() {
  const { data } = useReadings()
  const { places, profile } = useProfile()
  const status = useLimitStatus()
  const overPlaces = places.filter((p) => status.places[p.id]?.length)

  // Banner: hidden by the user until the readings or the situation change.
  const situation = `${data?.updatedAt}|${status.current.map((b) => b.metric + b.value).join()}|${overPlaces.map((p) => p.id).join()}`
  const [dismissed, setDismissed] = useState(null)
  const showBanner = (status.current.length > 0 || overPlaces.length > 0) && dismissed !== situation

  // Pop-up: once each time the current location newly goes over a limit.
  const [toasts, setToasts] = useState([])
  const lastAlerted = useRef('')
  const closeToast = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])
  useEffect(() => {
    const key = status.current.map((b) => b.metric).join()
    if (key && key !== lastAlerted.current) {
      const b = status.current[0]
      const m = METRICS[b.metric]
      setToasts((ts) => [
        ...ts,
        { id: Date.now(), title: `${m.short} near you just passed your limit`, body: `It's now ${b.value}${m.unit ? ` ${m.unit}` : ''}. Your limit is ${b.limit}.` },
      ])
    }
    lastAlerted.current = key
  }, [status])

  const initials = (profile?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="sidebar-logo">
          <Logo />
        </Link>
        <nav className="side-nav" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className="side-link">
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <MockScenarioPicker />
          {config.feedbackUrl && (
            <a className="side-link" href={config.feedbackUrl} target="_blank" rel="noopener noreferrer">
              <MessageSquare size={18} aria-hidden="true" /> Give feedback
            </a>
          )}
          <ThemeToggle />
          <Link to="/profile" className="me">
            <span className="avatar">{initials}</span>
            <span className="me-name">{profile?.name || 'Your account'}</span>
          </Link>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <div className="row gap-8">
            <ThemeToggle compact />
            <Link to="/profile" className="avatar" aria-label="Profile">
              {initials}
            </Link>
          </div>
        </header>
        {showBanner && <WarningBanner current={status.current} overPlaces={overPlaces} onDismiss={() => setDismissed(situation)} />}
        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {NAV.map(({ to, short, Icon }) => (
          <NavLink key={to} to={to} className="tab">
            <Icon size={20} aria-hidden="true" />
            {short}
          </NavLink>
        ))}
      </nav>

      <Toasts toasts={toasts} onClose={closeToast} />
    </div>
  )
}
