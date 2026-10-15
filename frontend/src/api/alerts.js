// PLACEHOLDER — Location & Alerts: works out which of the user's locations are over their limits. Returns made-up results for now.
import { getMockScenario } from './mock/mockReadings'

const SAMPLE_BREACHES = {
  haze: {
    regions: {
      east: [{ metric: 'psi24', value: 151, limit: 100 }, { metric: 'pm25', value: 78, limit: 55 }],
      central: [{ metric: 'psi24', value: 122, limit: 100 }, { metric: 'pm25', value: 60, limit: 55 }],
      north: [{ metric: 'psi24', value: 118, limit: 100 }],
      west: [{ metric: 'psi24', value: 104, limit: 100 }],
    },
    places: {
      home: [{ metric: 'psi24', value: 122, limit: 100 }, { metric: 'pm25', value: 60, limit: 55 }],
      school: [{ metric: 'psi24', value: 96, limit: 50 }, { metric: 'pm25', value: 44, limit: 35 }],
    },
  },
  moderate: { regions: {}, places: { school: [{ metric: 'psi24', value: 66, limit: 50 }] } },
  clear: { regions: {}, places: {} },
}

// PLACEHOLDER — Location & Alerts: threshold check (which locations are over the user's limits).
// In: { regionId, placeIds }. Out: { current: [{ metric, value, limit }], places: { [placeId]: [{ metric, value, limit }] } }.
export async function getLimitBreaches({ regionId, placeIds = [] }) {
  const s = SAMPLE_BREACHES[getMockScenario()]
  const places = Object.fromEntries(placeIds.map((id) => [id, s.places[id] || []]))
  return { current: (regionId && s.regions[regionId]) || [], places }
}
