/**
 * geo.ts
 * Geolocation helpers and distance calculation utilities.
 */

export interface Coords {
  lat: number;
  lng: number;
}

/** Request the device's current GPS position. Returns a promise. */
export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

/**
 * Haversine distance between two lat/lng points in kilometres.
 */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2Lat = Math.sin(dLat / 2) ** 2;
  const sin2Lng = Math.sin(dLng / 2) ** 2;
  const h =
    sin2Lat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sin2Lng;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/** Format coordinates for display. */
export function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/** Time remaining until expiry, formatted as MM:SS. */
export function timeRemaining(expiresAt: Date): string {
  const diff = Math.max(0, expiresAt.getTime() - Date.now());
  const totalMins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (totalMins >= 60) {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  }
  return `${String(totalMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
