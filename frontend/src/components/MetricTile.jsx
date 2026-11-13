// One reading (PSI or PM2.5) with its level and a bar showing how close it is to the user's limit.
import { METRICS, bandFor } from '../lib/aq'

/** One big reading (PSI or PM2.5) with its NEA band and a bar showing how close it is to the user's limit. */
export function MetricTile({ metric, value, limit }) {
  const m = METRICS[metric]
  const band = bandFor(metric, value)
  const over = limit != null && value > limit
  // The bar runs to 1.5x the limit, so the limit marker sits two-thirds along.
  const pct = limit ? Math.min(value / (limit * 1.5), 1) * 100 : 0

  return (
    <div className={`metric${over ? ' is-over' : ''}`}>
      <div className="eyebrow">{m.label}</div>
      <div className="metric-value">
        {value}
        {m.unit && <span className="unit">{m.unit}</span>}
      </div>
      <div className="metric-band">
        <span className="dot" style={{ background: band.color }} aria-hidden="true" />
        {band.label}
      </div>
      {limit != null && (
        <div className="limit">
          <div className="limit-bar" role="img" aria-label={`${value} against your limit of ${limit}`}>
            <i style={{ width: `${pct}%` }} />
            <s />
          </div>
          <div className="limit-text">
            <span>Your limit {limit}</span>
            <span className={over ? 'text-bad' : 'text-ok'}>{over ? `${value - limit} over` : `${limit - value} below`}</span>
          </div>
        </div>
      )}
    </div>
  )
}
