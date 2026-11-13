// "Air near you" card: the readings where the user is, compared with their limits.
import { LocateFixed, MapPinOff, Navigation, RefreshCw } from 'lucide-react'
import { useLocation } from '../data/LocationContext'
import { adviceFor } from '../lib/aq'
import { MetricTile } from './MetricTile'
import { Skeleton } from './States'

const BLOCKED_TEXT = {
  denied: "Location access is blocked for this site. To turn it on, click the icon on the left of your browser's address bar, allow Location, then try again.",
  error: "We couldn't find your location. Check that location services are on for your device, then try again.",
  unsupported: "This browser can't share your location. Choose an area instead.",
}

function AreaSelect({ regions, value, onChange, label = 'Choose an area' }) {
  return (
    <label className="area-select">
      <span>{label}</span>
      <select id="area-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Select a region
        </option>
        {regions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Live PSI and PM2.5 where the user is, plus the ask-for-location and location-blocked states. */
export function CurrentLocationCard({ regions, limits }) {
  const loc = useLocation()
  const region = regions?.find((r) => r.id === loc.regionId)

  if (!regions || loc.status === 'checking' || loc.status === 'locating') {
    return (
      <section className="card current" aria-busy="true">
        <div className="current-head">
          <span className="current-place">
            <LocateFixed size={18} aria-hidden="true" />
            {loc.status === 'locating' ? 'Finding your location…' : 'Loading…'}
          </span>
        </div>
        <div className="metrics">
          <Skeleton height={150} radius={12} />
          <Skeleton height={150} radius={12} />
        </div>
      </section>
    )
  }

  if (!region) {
    const blocked = BLOCKED_TEXT[loc.status]
    return (
      <section className="card current current-ask">
        <span className="ask-icon">{blocked ? <MapPinOff size={22} aria-hidden="true" /> : <Navigation size={22} aria-hidden="true" />}</span>
        <div className="ask-body">
          <h2 className="card-title">{blocked ? 'Location is off' : 'See the air where you are'}</h2>
          <p>{blocked || "Allow location access and we'll show readings from the NEA region nearest to you. Your location isn't saved."}</p>
          <div className="row gap-12 wrap">
            {loc.status !== 'unsupported' && (
              <button type="button" className="btn" onClick={loc.locate}>
                <LocateFixed size={16} aria-hidden="true" /> {blocked ? 'Try again' : 'Use my location'}
              </button>
            )}
            <AreaSelect regions={regions} value={loc.regionId} onChange={loc.setChosenRegionId} label="or choose an area" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="card current">
      <div className="current-head">
        <span className="current-place">
          <LocateFixed size={18} aria-hidden="true" />
          {loc.source === 'gps' ? 'Your location' : 'Chosen area'} · {region.name} region
        </span>
        <div className="row gap-8 wrap">
          {loc.source === 'gps' ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={loc.locate}>
              <RefreshCw size={15} aria-hidden="true" /> Update location
            </button>
          ) : (
            <>
              <AreaSelect regions={regions} value={loc.regionId} onChange={loc.setChosenRegionId} label="Area" />
              {loc.status === 'prompt' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={loc.locate}>
                  <LocateFixed size={15} aria-hidden="true" /> Use my location
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="metrics">
        <MetricTile metric="psi24" value={region.psi24} limit={limits.psi24} />
        <MetricTile metric="pm25" value={region.pm25} limit={limits.pm25} />
      </div>
      <p className="advice">{adviceFor(region.psi24)}</p>
    </section>
  )
}
