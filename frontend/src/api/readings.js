// Gets the air readings for all regions: made-up data until the backend address is set, then Data Ingestion's GET /api/readings.
import { config } from '../config'
import { NEA_REGIONS } from '../lib/geo'
import { apiFetch } from './client'
import { mockGetReadings } from './mock/mockReadings'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Converts Data Ingestion's GET /api/readings (backend/psi_api) into the shape the dashboard draws.
 * Theirs: hourly snapshots, oldest first, each a { region: value } object:
 *   { psi_24: [{ north, south, ... }], pm25_1: [{ north, ... }], timestamps: ['2026-10-28T13:00:00+08:00', ...] }
 * Ours: { updatedAt, regions: [{ id, name, lat, lng, psi24, pm25 }], history: [{ time, psi24: {...}, pm25: {...} }] }
 */
function fromDataIngestion(raw) {
  const times = raw.timestamps || []
  const history = times.map((time, i) => ({ time, psi24: raw.psi_24?.[i] || {}, pm25: raw.pm25_1?.[i] || {} }))
  const latest = history[history.length - 1]
  return {
    updatedAt: latest?.time,
    // The latest snapshot gives the "now" values; positions are NEA's fixed region labels.
    regions: latest ? NEA_REGIONS.map((r) => ({ ...r, psi24: latest.psi24[r.id], pm25: latest.pm25[r.id] })) : [],
    history,
  }
}

/**
 * Checks the response has what the dashboard draws, so a wrong shape shows the
 * "didn't load" notice instead of a blank page. Missing history only empties the trend charts.
 */
function checkReadings(data) {
  const problem =
    !data || typeof data !== 'object'
      ? 'response is not a JSON object'
      : !Array.isArray(data.regions) || data.regions.length === 0
        ? '`regions` is missing or empty'
        : data.regions.find((r) => !r?.id || !isNum(r.lat) || !isNum(r.lng) || !isNum(r.psi24) || !isNum(r.pm25))
          ? 'a region is missing id, lat, lng, psi24 or pm25 (numbers)'
          : Number.isNaN(Date.parse(data.updatedAt))
            ? '`updatedAt` is not an ISO time'
            : null
  if (problem) {
    console.error('Unexpected /api/readings response:', problem, data)
    throw new Error(`Readings response has the wrong shape: ${problem}`)
  }
  return { ...data, history: Array.isArray(data.history) ? data.history : [] }
}

/**
 * Air-quality readings for the whole of Singapore (public, no login).
 * The shape the dashboard expects is documented in frontend/INTEGRATION.md.
 */
export async function getReadings({ signal } = {}) {
  if (config.useMock) return checkReadings(await mockGetReadings())
  const raw = await apiFetch('/api/readings', { signal })
  // Accept either shape, so the dashboard keeps working if the backend later sends ours directly.
  return checkReadings(Array.isArray(raw?.regions) ? raw : fromDataIngestion(raw))
}
