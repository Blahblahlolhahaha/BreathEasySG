// Card with one 24-hour chart, how much it changed, and a rough estimate for the next 3 hours.
import { LocateFixed, MoveRight, TrendingDown, TrendingUp } from 'lucide-react'
import { METRICS } from '../lib/aq'
import { forecastFor } from '../lib/forecast'
import { Skeleton } from './States'
import { TrendChart } from './TrendChart'

const DIRECTION = {
  rising: { label: 'Rising', Icon: TrendingUp },
  falling: { label: 'Falling', Icon: TrendingDown },
  steady: { label: 'Steady', Icon: MoveRight },
}

/** Card wrapping a 24-hour trend chart, with the change over the last 24 hours and a few-hours-ahead estimate. */
export function TrendCard({ metric, series, limit, regionName, loading }) {
  const m = METRICS[metric]
  const change = series.length > 1 ? series[series.length - 1].value - series[0].value : null
  const forecast = forecastFor(series)
  const dir = forecast && DIRECTION[forecast.direction]

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2 className="card-title">
            {m.short} · last 24 hours
          </h2>
          <p className="card-sub">
            {m.label}
            {m.unit && ` (${m.unit})`}
            {regionName && ` · ${regionName} region`}
          </p>
        </div>
        {change != null && (
          <span className={`pill ${change > 0 ? 'pill-bad' : 'pill-ok'}`}>
            {change > 0 ? '+' : ''}
            {change} in 24 h
          </span>
        )}
      </header>
      {loading ? (
        <Skeleton height={200} radius={10} />
      ) : series.length ? (
        <TrendChart series={series} metric={metric} limit={limit} forecast={forecast?.points} />
      ) : (
        <div className="chart-empty">
          <LocateFixed size={18} aria-hidden="true" />
          {regionName ? 'No readings from the last 24 hours yet.' : 'Set your location above to see the trend.'}
        </div>
      )}
      {!loading && forecast && (
        <p className="forecast">
          <dir.Icon size={16} aria-hidden="true" />
          <span>
            <strong>{dir.label}</strong>, likely around {forecast.value}
            {m.unit && ` ${m.unit}`} in {forecast.hoursAhead} hours
          </span>
          <span className="pill pill-muted" title={`Estimated from the trend over the last ${forecast.fitHours} hours. Not an official NEA forecast.`}>
            Estimate
          </span>
        </p>
      )}
    </section>
  )
}
