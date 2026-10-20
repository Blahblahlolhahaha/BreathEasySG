// PLACEHOLDER — Location & Alerts: finds which NEA region the user's GPS position is in. Always returns 'east' for now.

// PLACEHOLDER — Location & Alerts: GPS → NEA region matching (e.g. the existing POST /api/psi).
// In: { lat, lng, accuracy }. Out: 'north' | 'south' | 'east' | 'west' | 'central'.

// NEA region centers for automatic coordinate-to-region matching
export const REGIONS = [
  { id: "north", name: "North", lat: 1.41803, lng: 103.82 },
  { id: "south", name: "South", lat: 1.29587, lng: 103.82 },
  { id: "east", name: "East", lat: 1.35735, lng: 103.94 },
  { id: "west", name: "West", lat: 1.35735, lng: 103.7 },
  { id: "central", name: "Central", lat: 1.35735, lng: 103.82 },
];

export async function findRegionForCoords(lat, lng) {
  let closest = REGIONS[0];
  let minDst = Infinity;
  for (const r of REGIONS) {
    const dst = Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2);
    if (dst < minDst) {
      minDst = dst;
      closest = r;
    }
  }
  return closest.id;
}
