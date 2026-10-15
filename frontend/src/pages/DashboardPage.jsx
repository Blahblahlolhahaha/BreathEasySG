// Main signed-in page (/dashboard): air near you, 24-hour charts, map and My places.
import { Link } from 'react-router-dom'
import { ChevronRight, CloudOff, RefreshCw, Sparkles } from 'lucide-react'
import { AirMap } from '../components/AirMap'
import { CurrentLocationCard } from '../components/CurrentLocationCard'
import { DataMeta } from '../components/DataMeta'
import { PageHeader } from '../components/PageHeader'
import { PlacesPanel } from '../components/PlacesPanel'
import { ErrorNotice, Skeleton, StaleNotice } from '../components/States'
import { TrendCard } from '../components/TrendCard'
import { useLocation } from '../data/LocationContext'
import { useProfile } from '../data/ProfileContext'
import { seriesFor, useReadings } from '../data/ReadingsContext'
import { useLimitStatus } from '../data/useLimitStatus'

export default function DashboardPage() {
  const { data, error, refresh } = useReadings()
  const { limits, places, setupComplete, loading: profileLoading, error: profileError, refresh: refreshProfile } = useProfile()
  const loc = useLocation()
  const status = useLimitStatus()
  const region = data?.regions.find((r) => r.id === loc.regionId)

  return (
    <div className="page">
      <PageHeader title="Overview">
        <DataMeta />
      </PageHeader>

      {error && !data && <ErrorNotice onRetry={refresh} />}
      {error && data && <StaleNotice updatedAt={data.updatedAt} onRetry={refresh} />}

      {profileError && (
        <div className="notice" role="status">
          <CloudOff size={18} aria-hidden="true" />
          <p>Your places and limits didn't load, so default limits are shown.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshProfile}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {!profileLoading && !profileError && !setupComplete && (
        <div className="notice notice-info">
          <Sparkles size={18} aria-hidden="true" />
          <p>Finish setting up to get alerts for Home, School or Office, with limits that suit you.</p>
          <Link to="/setup" className="btn btn-sm">
            Finish setup
          </Link>
        </div>
      )}

      <CurrentLocationCard regions={data?.regions} limits={limits} />

      <div className="grid-2">
        <TrendCard metric="psi24" series={seriesFor(data, region?.id, 'psi24')} limit={limits.psi24} regionName={region?.name} loading={!data} />
        <TrendCard metric="pm25" series={seriesFor(data, region?.id, 'pm25')} limit={limits.pm25} regionName={region?.name} loading={!data} />
      </div>

      <div className="grid-map">
        <section className="card card-map">
          <header className="card-head">
            <div>
              <h2 className="card-title">Across Singapore</h2>
              <p className="card-sub">Click the map to explore it full screen</p>
            </div>
            <Link to="/map" className="link">
              Open map <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </header>
          {data ? <AirMap variant="preview" regions={data.regions} places={places} current={loc.coords} /> : <Skeleton height={300} radius={12} />}
        </section>
        <PlacesPanel places={places} regions={data?.regions} breaches={status.places} loading={profileLoading} />
      </div>
    </div>
  )
}
