// The list of pages and their URLs. Signed-in pages send logged-out visitors to the login page.
import { Navigate, Outlet, Route, Routes, useLocation as useRouterLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Logo } from './components/Logo'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import NotFoundPage from './pages/NotFoundPage'
import PublicMapPage from './pages/PublicMapPage'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import AlertsPage from './pages/AlertsPage'
import ProfilePage from './pages/ProfilePage'
import { useAuth } from './auth/AuthContext'

/** Sends signed-out visitors to the login page, then back where they were going. Waits while the login is being restored. */
function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useRouterLocation()
  if (loading) {
    return (
      <div className="center-page" aria-busy="true">
        <div className="center-logo">
          <Logo />
        </div>
        <p className="muted">Checking your login…</p>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      {/* Public: anyone can see the haze map */}
      <Route path="/" element={<PublicMapPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} />

      {/* Signed-in only */}
      <Route element={<RequireAuth />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
