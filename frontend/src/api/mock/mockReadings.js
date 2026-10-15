// PLACEHOLDER — Data Ingestion: made-up air readings, used until the real backend is connected.

const KEY = 'be.mockScenario'

const REGIONS = [
  { id: 'north', name: 'North', lat: 1.41803, lng: 103.82 },
  { id: 'south', name: 'South', lat: 1.29587, lng: 103.82 },
  { id: 'east', name: 'East', lat: 1.35735, lng: 103.94 },
  { id: 'west', name: 'West', lat: 1.35735, lng: 103.7 },
  { id: 'central', name: 'Central', lat: 1.35735, lng: 103.82 },
]

const SCENARIOS = {
  clear: {
    start: 0.9,
    psi24: { north: 35, south: 38, east: 41, west: 33, central: 38 },
    pm25: { north: 8, south: 9, east: 11, west: 7, central: 9 },
  },
  moderate: {
    start: 0.8,
    psi24: { north: 61, south: 66, east: 72, west: 58, central: 68 },
    pm25: { north: 18, south: 22, east: 27, west: 16, central: 24 },
  },
  haze: {
    start: 0.62,
    psi24: { north: 118, south: 96, east: 151, west: 104, central: 122 },
    pm25: { north: 52, south: 44, east: 78, west: 49, central: 60 },
  },
}

/** Sample situations you can switch between while testing the UI. */
export const MOCK_SCENARIOS = [
  { id: 'clear', label: 'Clear' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'haze', label: 'Haze' },
]

export function getMockScenario() {
  try {
    const s = localStorage.getItem(KEY)
    return SCENARIOS[s] ? s : 'moderate'
  } catch {
    return 'moderate'
  }
}

export function setMockScenario(id) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // storage blocked: still applies until reload
  }
  window.dispatchEvent(new Event('be:mock-change'))
}

export async function mockGetReadings() {
  await new Promise((r) => setTimeout(r, 350))
  const s = SCENARIOS[getMockScenario()]
  const now = new Date()
  now.setMinutes(0, 0, 0)

  const history = []
  for (let h = 24; h >= 0; h--) {
    const frac = (24 - h) / 24
    const point = { time: new Date(now.getTime() - h * 3600_000).toISOString(), psi24: {}, pm25: {} }
    REGIONS.forEach((r, i) => {
      for (const m of ['psi24', 'pm25']) {
        const end = s[m][r.id]
        const start = end * s.start
        const wiggle = h === 0 ? 0 : Math.sin(h * 1.3 + i) * end * 0.04
        point[m][r.id] = Math.max(1, Math.round(start + (end - start) * frac ** 1.4 + wiggle))
      }
    })
    history.push(point)
  }

  return {
    isPlaceholder: true,
    updatedAt: now.toISOString(),
    regions: REGIONS.map((r) => ({ ...r, psi24: s.psi24[r.id], pm25: s.pm25[r.id] })),
    history,
  }
}
