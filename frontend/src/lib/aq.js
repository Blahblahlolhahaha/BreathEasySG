// Air-quality helpers: NEA levels, map colours and health advice.

/** Limits shown until the user sets their own (top of NEA "Moderate" PSI and PM2.5 Band I). */
export const DEFAULT_LIMITS = { psi24: 100, pm25: 55 }

// NEA 24-hour PSI bands
const PSI_BANDS = [
  { max: 50, label: 'Good', color: '#2FA36B' },
  { max: 100, label: 'Moderate', color: '#D9A21B' },
  { max: 200, label: 'Unhealthy', color: '#E5683A' },
  { max: 300, label: 'Very unhealthy', color: '#C93C3C' },
  { max: Infinity, label: 'Hazardous', color: '#7E2E5E' },
]

// NEA 1-hour PM2.5 bands (µg/m³)
const PM25_BANDS = [
  { max: 55, label: 'Normal', color: '#2FA36B' },
  { max: 150, label: 'Elevated', color: '#D9A21B' },
  { max: 250, label: 'High', color: '#E5683A' },
  { max: Infinity, label: 'Very high', color: '#C93C3C' },
]

export const METRICS = {
  psi24: {
    key: 'psi24',
    short: 'PSI',
    label: '24-hour PSI',
    unit: '',
    bands: PSI_BANDS,
    // Colour ramp for the map gradient: [value, hex]
    ramp: [[0, '#2FA36B'], [50, '#8CC152'], [75, '#E6C440'], [100, '#F0A23A'], [150, '#E5683A'], [200, '#C93C3C'], [300, '#7E2E5E']],
    ticks: [0, 50, 100, 200, 300],
  },
  pm25: {
    key: 'pm25',
    short: 'PM2.5',
    label: '1-hour PM2.5',
    unit: 'µg/m³',
    bands: PM25_BANDS,
    ramp: [[0, '#2FA36B'], [30, '#8CC152'], [55, '#E6C440'], [100, '#F0A23A'], [150, '#E5683A'], [250, '#C93C3C'], [350, '#7E2E5E']],
    ticks: [0, 55, 150, 250, 350],
  },
}

export const bandFor = (metric, value) => METRICS[metric].bands.find((b) => value <= b.max)

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Map colour for a value, as [r, g, b]. */
export function rampColor(metric, value) {
  const ramp = METRICS[metric].ramp
  const v = Math.max(ramp[0][0], Math.min(ramp[ramp.length - 1][0], value))
  for (let i = 1; i < ramp.length; i++) {
    const [b, cb] = ramp[i]
    if (v <= b) {
      const [a, ca] = ramp[i - 1]
      const t = (v - a) / (b - a)
      const A = hexToRgb(ca)
      const B = hexToRgb(cb)
      return A.map((c, j) => Math.round(c + (B[j] - c) * t))
    }
  }
  return hexToRgb(ramp[ramp.length - 1][1])
}

/** CSS gradient matching the map colours, for the legend. */
export function rampGradient(metric) {
  const ramp = METRICS[metric].ramp
  const max = ramp[ramp.length - 1][0]
  return `linear-gradient(90deg, ${ramp.map(([v, c]) => `${c} ${(v / max) * 100}%`).join(', ')})`
}

/** Plain-language advice based on NEA's health advisory for the general public. */
export function adviceFor(psi24) {
  if (psi24 <= 50) return 'Air is good. Enjoy your usual outdoor activities.'
  if (psi24 <= 100) return 'Air is moderate. Normal activities are fine.'
  if (psi24 <= 200)
    return 'Cut down on long or strenuous outdoor activity. Seniors, children and people with heart or lung conditions should keep it to a minimum.'
  if (psi24 <= 300) return 'Avoid long or strenuous outdoor activity. Sensitive groups should stay indoors.'
  return 'Stay indoors as much as possible and keep windows closed.'
}
