import {
  GLOBAL_DEFAULT_CENTER,
  GLOBAL_DEFAULT_ZOOM,
  OPERATIONAL_MAP_ZOOM,
  FALLBACK_DRONE_LOCATION,
} from "@/services/telemetry/telemetryTypes.js";

/**
 * Page-Specific Map Configuration Matrix
 * Isolates zoom levels and default centers so that global zoom-out ONLY applies to the Fly page.
 *
 * Requirements:
 * - Fly Page: Global/world overview (Zoom ~2, Center [20, 0]), with Hyderabad marker visible.
 * - Create Geofence: Operational editing zoom (Zoom 14-16, Default 15).
 * - Waypoint Planning: Operational editing zoom (Zoom 14-16, Default 15).
 * - Analytics: Operational overview zoom (Zoom 14).
 */
export const MAP_CONFIG = {
  fly: {
    name: "fly",
    defaultCenter: [GLOBAL_DEFAULT_CENTER.latitude, GLOBAL_DEFAULT_CENTER.longitude], // [20, 0]
    defaultZoom: GLOBAL_DEFAULT_ZOOM, // 2 (Global / World View)
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: true,
  },

  geofence: {
    name: "geofence",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15 (Practical Operational Editing Zoom: 14-16)
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: false,
  },

  waypoints: {
    name: "waypoints",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15 (Practical Operational Editing Zoom: 14-16)
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: false,
  },

  analytics: {
    name: "analytics",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: 14,
    operationalZoom: 14,
    followDroneOnLiveFix: false,
  },
};

/**
 * Helper to compute the centroid of a set of coordinates, or fallback if empty
 * @param {Array} coords - Array of points ({lat, lng} or [lat, lng])
 * @param {Array} fallback - [lat, lng] default
 * @returns {Array} [lat, lng]
 */
export function getCoordinatesCentroid(
  coords,
  fallback = [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude]
) {
  if (!Array.isArray(coords) || coords.length === 0) return fallback;
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const pt of coords) {
    const lat = Number(pt?.lat ?? pt?.latitude ?? (Array.isArray(pt) ? pt[0] : null));
    const lng = Number(pt?.lng ?? pt?.longitude ?? (Array.isArray(pt) ? pt[1] : null));
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)
    ) {
      sumLat += lat;
      sumLng += lng;
      count++;
    }
  }

  if (count === 0) return fallback;
  return [Number((sumLat / count).toFixed(6)), Number((sumLng / count).toFixed(6))];
}

/**
 * Resolves page-aware initial center and zoom
 * @param {Object} params
 * @param {string} [params.pageType="fly"] - "fly" | "geofence" | "waypoints" | "analytics"
 * @param {boolean} [params.hasLiveDroneLocation=false] - true if real drone connected with valid GPS
 * @param {number} [params.activeLat] - active drone latitude
 * @param {number} [params.activeLng] - active drone longitude
 * @param {Array} [params.geofenceCoords] - active geofence polygon vertices
 * @param {Array} [params.waypoints] - active mission waypoints
 * @param {Array} [params.customCenter] - user-provided custom center override
 * @param {number} [params.customZoom] - user-provided custom zoom override
 * @returns {{ center: [number, number], zoom: number }}
 */
export function resolveInitialMapState({
  pageType = "fly",
  hasLiveDroneLocation = false,
  activeLat = FALLBACK_DRONE_LOCATION.latitude,
  activeLng = FALLBACK_DRONE_LOCATION.longitude,
  geofenceCoords = [],
  waypoints = [],
  customCenter = null,
  customZoom = null,
}) {
  // 1. Explicit user prop overrides take highest precedence
  if (customCenter && customZoom !== null && customZoom !== undefined) {
    return { center: customCenter, zoom: customZoom };
  }

  const effectivePage = (pageType || "fly").toLowerCase().trim();
  const config = MAP_CONFIG[effectivePage] || MAP_CONFIG.fly;

  // 2. FLY PAGE: Global world overview unless real drone is live with valid GPS fix
  if (effectivePage === "fly") {
    if (hasLiveDroneLocation) {
      return {
        center: customCenter || [activeLat, activeLng],
        zoom: customZoom ?? config.operationalZoom,
      };
    }
    return {
      center: customCenter || config.defaultCenter, // [20, 0]
      zoom: customZoom ?? config.defaultZoom, // 2
    };
  }

  // 3. GEOFENCE PAGE: Operational editing zoom (15).
  // Centered on existing geofence vertices if present, otherwise Hyderabad fallback [17.3850, 78.4867]
  if (effectivePage === "geofence") {
    const center = customCenter || getCoordinatesCentroid(geofenceCoords, config.defaultCenter);
    const zoom = customZoom ?? config.defaultZoom; // 15
    return { center, zoom };
  }

  // 4. WAYPOINT PLANNING PAGE: Operational editing zoom (15).
  // Centered on existing waypoints or geofence if present, otherwise Hyderabad fallback [17.3850, 78.4867]
  if (effectivePage === "waypoints") {
    let center = customCenter;
    if (!center) {
      if (Array.isArray(waypoints) && waypoints.length > 0) {
        center = getCoordinatesCentroid(waypoints, config.defaultCenter);
      } else if (Array.isArray(geofenceCoords) && geofenceCoords.length > 0) {
        center = getCoordinatesCentroid(geofenceCoords, config.defaultCenter);
      } else {
        center = config.defaultCenter;
      }
    }
    const zoom = customZoom ?? config.defaultZoom; // 15
    return { center, zoom };
  }

  // 5. ANALYTICS / OTHER
  let center = customCenter;
  if (!center) {
    if (Array.isArray(waypoints) && waypoints.length > 0) {
      center = getCoordinatesCentroid(waypoints, config.defaultCenter);
    } else if (Array.isArray(geofenceCoords) && geofenceCoords.length > 0) {
      center = getCoordinatesCentroid(geofenceCoords, config.defaultCenter);
    } else {
      center = config.defaultCenter;
    }
  }
  const zoom = customZoom ?? config.defaultZoom;
  return { center, zoom };
}

export default MAP_CONFIG;
