
export async function getLimitBreaches({ coords, places = [] }) {
  try {
    const response = await fetch('/api/alerts/check', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` // Include auth token
      },
      body: JSON.stringify({
        coords: coords ? { latitude: coords.lat, longitude: coords.lng } : null,
        places: places
      }),
    })

    if (!response.ok) {
      throw new Error(`Alert check failed: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error checking alerts:', error)
    return { current: [], places: {} }
  }
}

// Helper to get auth token (adjust based on your auth implementation)
function getAuthToken() {
  // Get from localStorage, cookie, or your auth context
  return localStorage.getItem('authToken') || ''
}