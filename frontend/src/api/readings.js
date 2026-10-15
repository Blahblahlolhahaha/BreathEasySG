// Gets the air readings for all regions: made-up data for now, the real backend once its address is set.
import { config } from '../config'
import { apiFetch } from './client'
import { mockGetReadings } from './mock/mockReadings'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

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
  // PLACEHOLDER — Data Ingestion: the real GET /api/readings endpoint (cached NEA data) replaces the mock.
  const data = config.useMock ? await mockGetReadings() : await apiFetch('/api/readings', { signal })
  return checkReadings(data)
}
