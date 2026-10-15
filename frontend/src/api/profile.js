// PLACEHOLDER — Auth & Settings: loads the user's profile, limits and saved places. Returns sample data for now.
import { DEFAULT_LIMITS } from '../lib/aq'

const SETUP_KEY = 'be.placeholder.setup'

const SAMPLE_PLACES = [
  { id: 'home', label: 'Home', type: 'home', address: 'Bishan (sample)', lat: 1.3508, lng: 103.8485, regionId: 'central' },
  { id: 'school', label: 'School', type: 'school', address: 'Kent Ridge (sample)', lat: 1.2966, lng: 103.7764, regionId: 'south', limits: { psi24: 50, pm25: 35 } },
  { id: 'office', label: 'Office', type: 'office', address: 'Raffles Place (sample)', lat: 1.284, lng: 103.8515, regionId: 'south' },
]

/** 'done' | 'skipped' | null — set by the placeholder setup page. */
export function getSetupState() {
  try {
    return localStorage.getItem(SETUP_KEY)
  } catch {
    return null
  }
}
export function setSetupState(value) {
  try {
    localStorage.setItem(SETUP_KEY, value)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('be:mock-change'))
}

// PLACEHOLDER — Auth & Settings: GET /api/me (profile, limits, alert channels, saved places).
export async function getMe() {
  const done = getSetupState() === 'done'
  return { name: 'Demo user', email: 'demo@example.com', setupComplete: done, limits: DEFAULT_LIMITS, channels: { push: true, email: true }, places: done ? SAMPLE_PLACES : [] }
}
