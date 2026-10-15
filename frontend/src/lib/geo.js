// Map settings and the maths that blends region colours across the map.

export const SG_CENTER = [1.3521, 103.8198]
/** Box around Singapore's land area, used for the colour overlay. */
export const LAND_BOUNDS = [
  [1.15, 103.59],
  [1.48, 104.1],
]
/** OneMap tiles only exist inside this box. */
export const MAP_MAX_BOUNDS = [
  [1.144, 103.535],
  [1.494, 104.502],
]

export const ONEMAP_ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'

export const onemapTiles = (theme) =>
  `https://www.onemap.gov.sg/maps/tiles/${theme === 'dark' ? 'Night' : 'Default'}/{z}/{x}/{y}.png`

/**
 * Inverse-distance blend of the five regional readings at a point.
 * Only used to paint a smooth gradient on the map; it is not a measured value.
 */
export function blendAt(lat, lng, regions, metric) {
  let num = 0
  let den = 0
  for (const r of regions) {
    const w = 1 / ((lat - r.lat) ** 2 + (lng - r.lng) ** 2 + 1e-7)
    num += r[metric] * w
    den += w
  }
  return num / den
}
