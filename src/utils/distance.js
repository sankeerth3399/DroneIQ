/**
 * Distance & Flight Duration Utilities
 * High-precision geodesic calculations and time formatting
 */

/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula)
 * @param {{ lat: number, lng: number }} coord1 
 * @param {{ lat: number, lng: number }} coord2 
 * @returns {number} Distance in meters
 */
export function calculateDistance(coord1, coord2, maybeLat2, maybeLng2) {
  let c1, c2;
  if (
    typeof coord1 === "number" &&
    typeof coord2 === "number" &&
    typeof maybeLat2 === "number" &&
    typeof maybeLng2 === "number"
  ) {
    c1 = { lat: coord1, lng: coord2 };
    c2 = { lat: maybeLat2, lng: maybeLng2 };
  } else {
    c1 = coord1;
    c2 = coord2;
  }

  if (!c1 || !c2) return 0;
  if (typeof c1.lat !== "number" || typeof c1.lng !== "number") return 0;
  if (typeof c2.lat !== "number" || typeof c2.lng !== "number") return 0;

  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;

  const lat1 = (c1.lat * Math.PI) / 180;
  const lat2 = (c2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Alias for backwards compatibility
export const haversineDistance = calculateDistance;

/**
 * Calculates total route distance across sequential mission items
 * @param {Array<Object>} items 
 * @returns {number} Total distance in meters
 */
export function calculateMissionDistance(items = []) {
  if (!Array.isArray(items) || items.length < 2) return 0;
  let totalDistance = 0;

  for (let i = 0; i < items.length - 1; i++) {
    totalDistance += calculateDistance(items[i], items[i + 1]);
  }

  return totalDistance;
}

/**
 * Formats a distance in meters into human-readable km or m
 * @param {number} distanceMeters 
 * @returns {string} e.g. "1.42 km" or "850 m"
 */
export function formatDistance(distanceMeters) {
  if (!distanceMeters || distanceMeters < 0) return "0.0 m";
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

/**
 * Calculates estimated flight duration in seconds
 * @param {Array<Object>} items 
 * @param {number} defaultSpeed 
 * @returns {number} Duration in seconds
 */
export function calculateMissionDuration(items = [], defaultSpeed = 5.0) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let totalSeconds = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const holdTime = typeof item.holdTime === "number" ? item.holdTime : 0;
    totalSeconds += holdTime;

    if (i < items.length - 1) {
      const nextItem = items[i + 1];
      const dist = calculateDistance(item, nextItem);
      const speed = typeof nextItem.speed === "number" && nextItem.speed > 0 ? nextItem.speed : defaultSpeed;
      totalSeconds += dist / speed;
    }
  }

  return totalSeconds;
}

/**
 * Formats seconds into mm:ss or hh:mm:ss
 * @param {number} seconds 
 * @returns {string} e.g. "04:32" or "01:12:05"
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "00:00";
  const sec = Math.round(seconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;

  const pad = (n) => String(n).padStart(2, "0");

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(remSec)}`;
  }
  return `${pad(mins)}:${pad(remSec)}`;
}
