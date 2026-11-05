import { apiFetch } from './client'
import { config } from "../config"

export async function getLimitBreaches({ coords } = {}) {
  try {
    return await apiFetch('/api/alerts/check', {
      method: 'POST',
      auth: true,
      baseUrl: config.alertsApiUrl,
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