// Public home page (/): the haze map anyone can see without logging in.
import { Link } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import { AirMap } from '../components/AirMap'
import { BandGuide } from '../components/BandGuide'
import { DataMeta } from '../components/DataMeta'
import { Logo } from '../components/Logo'
import { RegionList } from '../components/RegionList'
import { ErrorNotice, Skeleton } from '../components/States'
import { ThemeToggle } from '../components/ThemeToggle'
import { useReadings } from '../data/ReadingsContext'
import { useAuth } from '../auth/AuthContext'

/** The haze map anyone can see without logging in. */
export default function PublicMapPage() {
  const { data, error, refresh } = useReadings()
  const { isAuthenticated, loading: authLoading } = useAuth()

  return (
    <div className="public">
      <header className="public-head">
        <Logo />
        <div className="row gap-8">
          <ThemeToggle compact />
          {authLoading ? null : isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-sm">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="public-main">
        <div className="public-intro">
          <h1 className="hero-title">Singapore haze map</h1>
          <p>Live PSI and PM2.5 for the five NEA regions. Hover over a region for details, or open the map full screen to zoom in.</p>
          <DataMeta showPicker />
        </div>

        {error && !data && <ErrorNotice onRetry={refresh} />}

        <div className="map-layout">
          <div className="card card-map map-main">{data ? <AirMap variant="inline" regions={data.regions} /> : <Skeleton height="100%" radius={12} />}</div>
          <aside className="map-side">
            <section className="card">
              <h2 className="card-title">Regions now</h2>
              {data ? <RegionList regions={data.regions} /> : <Skeleton height={180} />}
            </section>
            {!authLoading && !isAuthenticated && (
              <section className="card cta">
                <span className="cta-icon">
                  <Bell size={20} aria-hidden="true" />
                </span>
                <h2 className="card-title">Get alerts for the places you care about</h2>
                <ul>
                  <li>
                    <Check size={16} aria-hidden="true" /> Live readings and 24-hour trends where you are
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Push and email alerts for Home, School or Office
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Your own limits, stricter if you're sensitive to haze
                  </li>
                </ul>
                <Link to="/signup" className="btn">
                  Sign up free
                </Link>
              </section>
            )}
            <BandGuide />
          </aside>
        </div>
      </main>

      <footer className="public-foot">Readings: National Environment Agency via data.gov.sg · Map: OneMap, Singapore Land Authority</footer>
    </div>
  )
}
