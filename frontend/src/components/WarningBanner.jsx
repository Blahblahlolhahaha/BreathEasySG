// Warning bar at the top of the page while a location is over the user's limit.
import { TriangleAlert, X } from 'lucide-react'
import { METRICS } from '../lib/aq'

const describe = (b) => `${METRICS[b.metric].short} ${b.value}${METRICS[b.metric].unit ? ` ${METRICS[b.metric].unit}` : ''} (your limit is ${b.limit})`

/** In-app warning shown at the top of every signed-in page while a location is over the user's limit. */
export function WarningBanner({ current, overPlaces, onDismiss }) {
  const title = current.length ? 'The air near you is above your limit' : `${overPlaces.map((p) => p.label).join(', ')} ${overPlaces.length > 1 ? 'are' : 'is'} above your limit`

  return (
    <div className="banner" role="alert">
      <TriangleAlert size={20} aria-hidden="true" />
      <div className="banner-body">
        <strong>{title}</strong>
        {current.length > 0 && <span>{current.map(describe).join(' · ')}. Cut down on long or strenuous outdoor activity.</span>}
        {current.length > 0 && overPlaces.length > 0 && <span>Also over your limit: {overPlaces.map((p) => p.label).join(', ')}.</span>}
      </div>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Hide warning until the next update">
        <X size={18} />
      </button>
    </div>
  )
}
