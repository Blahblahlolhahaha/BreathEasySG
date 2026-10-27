// Rough estimates from the trend of the last 6 hours: the 3-hour line on the trend charts and the "best time to go out" card.

const HOUR = 3600_000
const FIT_HOURS = 6
const AHEAD_HOURS = 3

/**
 * Estimate where a reading is heading. Not an NEA forecast: NEA's real-time API has none.
 * 24-hour PSI is a rolling average, so it moves smoothly and a straight line is a fair guess
 * for the next few hours; 1-hour PM2.5 is noisier, so its estimate is rougher.
 *
 * series: [{ time, value }] hourly, oldest first (from seriesFor).
 * Returns null when there are fewer than 4 recent readings, otherwise
 * { direction: 'rising' | 'falling' | 'steady', value, hoursAhead, fitHours, points: [{ time, value }] }.
 */
export function forecastFor(series, { fitHours = FIT_HOURS, hoursAhead = AHEAD_HOURS } = {}) {
  const recent = series.slice(-fitHours)
  if (recent.length < 4) return null

  // Least-squares slope, in units per hour. Uses real timestamps so a missing hour doesn't skew it.
  const t0 = Date.parse(recent[0].time)
  const xs = recent.map((p) => (Date.parse(p.time) - t0) / HOUR)
  const ys = recent.map((p) => p.value)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my)
    den += (x - mx) ** 2
  })
  const slope = num / den
  if (!Number.isFinite(slope)) return null

  // Start from the latest reading so the dashed line joins the end of the chart.
  const last = series[series.length - 1]
  const lastT = Date.parse(last.time)
  const points = []
  for (let h = 1; h <= hoursAhead; h++) {
    points.push({ time: new Date(lastT + h * HOUR).toISOString(), value: Math.max(0, Math.round(last.value + slope * h)) })
  }

  const value = points[points.length - 1].value
  const change = value - last.value
  // Changes smaller than 2 points or 3% read as "steady", so tiny wobbles don't say "rising".
  const direction = Math.abs(change) < Math.max(2, last.value * 0.03) ? 'steady' : change > 0 ? 'rising' : 'falling'
  return { direction, value, hoursAhead, fitHours, points }
}

/**
 * "Best time to go out": follows the PSI and PM2.5 estimates hour by hour and finds when the air
 * crosses the user's limits. An hour is "ok" when both readings are at or under their limits.
 *
 * Returns null without enough data, otherwise { hoursAhead, fitHours, hours, kind, time, metric }:
 * - hours: [{ time, psi24, pm25, ok }] for now and each hour ahead
 * - kind:  'clear' (ok the whole time) · 'until' (ok now, goes over at `time`)
 *          'from' (over now, back under at `time`) · 'over' (over the whole time)
 * - metric: the reading that's over at the change ('psi24' | 'pm25'), for the wording
 */
export function bestTimeFor({ psi24, pm25, limits, hoursAhead = 6 }) {
  const psiEst = forecastFor(psi24, { hoursAhead })
  const pmEst = forecastFor(pm25, { hoursAhead })
  if (!psiEst || !pmEst) return null

  const at = (series, est, h) => (h === 0 ? series[series.length - 1].value : est.points[h - 1].value)
  const hours = []
  for (let h = 0; h <= hoursAhead; h++) {
    const p = at(psi24, psiEst, h)
    const m = at(pm25, pmEst, h)
    const time = h === 0 ? psi24[psi24.length - 1].time : psiEst.points[h - 1].time
    hours.push({ time, psi24: p, pm25: m, ok: p <= limits.psi24 && m <= limits.pm25 })
  }

  const overMetric = (hr) => (hr.psi24 > limits.psi24 ? 'psi24' : 'pm25')
  const nowOk = hours[0].ok
  const change = hours.findIndex((hr) => hr.ok !== nowOk)
  let kind
  if (change === -1) kind = nowOk ? 'clear' : 'over'
  else kind = nowOk ? 'until' : 'from'
  const turn = change === -1 ? null : hours[change]
  const metric = kind === 'until' ? overMetric(turn) : kind === 'clear' ? null : overMetric(hours[0])

  return { hoursAhead, fitHours: psiEst.fitHours, hours, kind, time: turn?.time ?? null, metric }
}
