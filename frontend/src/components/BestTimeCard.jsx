// "Best time to go out" card: when the air near the user is likely within their limits over the next few hours.
import { Clock, CloudFog, LocateFixed, Sun } from 'lucide-react'
import { METRICS } from '../lib/aq'
import { bestTimeFor } from '../lib/forecast'
import { formatHour } from '../lib/format'
import { Skeleton } from './States'

/** psi24 / pm25 are the 24-hour series for the user's area; limits are the user's thresholds. */
export function BestTimeCard({ psi24, pm25, limits, regionName, loading }) {
  const best = loading ? null : bestTimeFor({ psi24, pm25, limits })

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2 className="card-title">Best time to go out</h2>
          <p className="card-sub">
            Next few hours{regionName && ` · ${regionName} region`} · your limits PSI {limits.psi24}, PM2.5 {limits.pm25}
          </p>
        </div>
        {best && <span className="pill pill-muted">Estimate</span>}
      </header>

      {loading ? (
        <Skeleton height={96} radius={10} />
      ) : !best ? (
        <div className="chart-empty besttime-empty">
          <LocateFixed size={18} aria-hidden="true" />
          {regionName ? 'Not enough recent readings to estimate yet.' : 'Set your location above to see the best time to go out.'}
        </div>
      ) : (
        <>
          <Summary best={best} limits={limits} />
          <ol className="besttime-strip" aria-label="Estimated air for each hour">
            {best.hours.map((h, i) => (
              <li key={h.time} className={h.ok ? 'is-ok' : 'is-over'}>
                <span className="besttime-bar" />
                <span>{i === 0 ? 'Now' : formatHour(h.time)}</span>
                <span className="sr-only">{h.ok ? 'within your limits' : 'over your limit'}</span>
              </li>
            ))}
          </ol>
          <p className="besttime-note">From the trend of the last {best.fitHours} hours. Not an official NEA forecast.</p>
        </>
      )}
    </section>
  )
}

function Summary({ best, limits }) {
  const m = best.metric && METRICS[best.metric]
  const over = m && `${m.short} may be over your limit of ${limits[best.metric]}`
  const time = best.time && formatHour(best.time)
  const text = {
    clear: { Icon: Sun, title: `Good to go for the next ${best.hoursAhead} hours`, sub: 'The air is likely to stay within your limits.' },
    until: { Icon: Sun, title: `Good to go until about ${time}`, sub: `After that, ${over}.` },
    from: { Icon: Clock, title: `Better after about ${time}`, sub: `Right now ${over}, but it's likely to drop back under.` },
    over: { Icon: CloudFog, title: `Likely over your limit for the next ${best.hoursAhead} hours`, sub: `${m?.short} is over your limit of ${limits[best.metric]}. Keep outdoor plans short.` },
  }[best.kind]

  return (
    <div className={`besttime-summary is-${best.kind}`}>
      <text.Icon size={22} aria-hidden="true" />
      <div>
        <strong>{text.title}</strong>
        <span>{text.sub}</span>
      </div>
    </div>
  )
}
