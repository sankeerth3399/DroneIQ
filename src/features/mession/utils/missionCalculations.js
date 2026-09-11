/**
 * Mission Calculations & Geodesic Geometry Utilities
 * High-precision geodesic distance, flight duration, and waypoint formatting
 */

/**
 * Calculates the great-circle distance between two GPS coordinates in meters using the Haversine formula
 * @param {{ lat: number, lng: number }} coord1 
 * @param {{ lat: number, lng: number }} coord2 
 * @returns {number} Distance in meters
 */
export function haversineDistance(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  if (typeof coord1.lat !== "number" || typeof coord1.lng !== "number") return 0;
  if (typeof coord2.lat !== "number" || typeof coord2.lng !== "number") return 0;

  const R = 6371000; // Earth's radius in meters
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates total route distance across sequential mission items
 * @param {Array<Object>} items 
 * @returns {number} Total distance in meters
 */
export function calculateMissionDistance(items = []) {
  if (!Array.isArray(items) || items.length < 2) return 0;
  let totalDistance = 0;

  for (let i = 0; i < items.length - 1; i++) {
    totalDistance += haversineDistance(items[i], items[i + 1]);
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
 * Sums: (segment_distance / segment_speed) + waypoint_hold_time
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
      const dist = haversineDistance(item, nextItem);
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

/**
 * Calculates maximum planned altitude
 * @param {Array<Object>} items 
 * @returns {number} Max altitude in meters
 */
export function calculateMaxAltitude(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return Math.max(...items.map((it) => (typeof it.alt === "number" ? it.alt : 0)), 0);
}

/**
 * Formats sequentially numbered names for waypoints while keeping commands distinct
 * e.g. TAKEOFF -> WP1 -> WP2 -> WP3 -> LAND
 * @param {Array<Object>} items 
 * @returns {Array<Object>} Items with sequential labels and sequence numbers
 */
export function renumberMissionItems(items = []) {
  let wpIndex = 1;
  return items.map((item, idx) => {
    let label = item.label;
    if (item.type === "WAYPOINT") {
      label = `WP${wpIndex}`;
      wpIndex++;
    } else if (item.type === "TAKEOFF") {
      label = "TAKEOFF";
    } else if (item.type === "LAND") {
      label = "LAND";
    } else if (item.type === "RTL") {
      label = "RTL";
    }

    return {
      ...item,
      seq: idx + 1,
      label: label || `WP${idx + 1}`,
    };
  });
}

/**
 * Validates a mission plan for safety constraints
 * @param {Array<Object>} items 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMissionPlan(items = []) {
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("At least one mission item or waypoint must be added.");
    return { valid: false, errors };
  }

  items.forEach((it, idx) => {
    const itemNum = it.seq || idx + 1;
    const itemName = it.label || `Item ${itemNum}`;

    if (typeof it.lat !== "number" || isNaN(it.lat) || it.lat < -90 || it.lat > 90) {
      errors.push(`${itemName}: Invalid latitude (${it.lat}). Must be between -90 and 90.`);
    }

    if (typeof it.lng !== "number" || isNaN(it.lng) || it.lng < -180 || it.lng > 180) {
      errors.push(`${itemName}: Invalid longitude (${it.lng}). Must be between -180 and 180.`);
    }

    if (it.type === "WAYPOINT" && (typeof it.alt !== "number" || it.alt <= 0)) {
      errors.push(`${itemName}: Altitude must be greater than 0 m.`);
    }

    if (it.type === "TAKEOFF" && (typeof it.alt !== "number" || it.alt <= 0)) {
      errors.push(`${itemName}: Takeoff altitude must be greater than 0 m.`);
    }

    if (typeof it.speed === "number" && it.speed <= 0) {
      errors.push(`${itemName}: Speed must be greater than 0 m/s.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
