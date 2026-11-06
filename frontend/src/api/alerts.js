import { apiFetch } from './client'

const ALERTS_API_URL = import.meta.env.VITE_ALERTS_API_URL

export async function getLimitBreaches({ coords } = {}) {
  try {
    return await apiFetch('/api/alerts/check', {
      method: 'POST',
      auth: true,
      baseUrl: ALERTS_API_URL,
      body: {
        coords: coords
          ? {
              latitude: coords.lat,
              longitude: coords.lng,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error checking alerts:', error)

    return {
      current: [],
      places: {},
      new_alerts: [],
      recovered: [],
      channels: {},
    }
  }
}