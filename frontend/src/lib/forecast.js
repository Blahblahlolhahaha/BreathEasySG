// Makes the rough 3-hour estimate on the trend charts by following the trend of the last 6 hours.

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
