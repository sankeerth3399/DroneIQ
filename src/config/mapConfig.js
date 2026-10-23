import {
  FALLBACK_DRONE_LOCATION,
  OPERATIONAL_MAP_ZOOM,
} from "../services/telemetry/telemetryTypes.js";

/**
 * Page-Specific Map Configuration Matrix
 * Establishes consistent operational zoom levels (14-16) and prevents automatic global zoom-out
 * across all DroneIQ pages (Fly, Geofence, Waypoints, Mission Planning, Analytics, Dashboard).
 *
 * Operational Standards:
 * - Fly Page: Operational view (Zoom 14-16, Default 15, Center: Mission Geometry -> Live Drone -> Hyderabad fallback).
 * - Create Geofence: Operational editing zoom (Zoom 14-16, Default 15).
 * - Waypoint Planning: Operational editing zoom (Zoom 14-16, Default 15).
 * - Mission Planning: Operational view (Zoom 14-16, Default 15).
 * - Analytics: Operational overview zoom (Zoom 14).
 * - Dashboard / Command Center: Operational overview zoom (Zoom 15).
 */
export const MAP_CONFIG = {
  fly: {
    name: "fly",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: true,
  },

  geofence: {
    name: "geofence",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: false,
  },

  waypoints: {
    name: "waypoints",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
    followDroneOnLiveFix: false,
  },

  planning: {
    name: "planning",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15
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

  dashboard: {
    name: "dashboard",
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude], // [17.3850, 78.4867]
    defaultZoom: OPERATIONAL_MAP_ZOOM, // 15
    operationalZoom: OPERATIONAL_MAP_ZOOM, // 15
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
 * Calculates the bounding box center and fitted operational zoom level for a set of points.
 * Ensures the map opens at a useful operational zoom level (clamped between 11 and 16, typically 14-15)
 * without ever zooming out to a global / world view.
 * @param {Array} points - Array of points ({lat, lng} or [lat, lng])
 * @param {Array} fallbackCenter - [lat, lng]
 * @param {number} fallbackZoom - Default zoom level (15)
 * @returns {{ center: [number, number], zoom: number }}
 */
export function getBoundsCenterAndZoom(
  points,
  fallbackCenter = [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude],
  fallbackZoom = OPERATIONAL_MAP_ZOOM
) {
  if (!Array.isArray(points) || points.length === 0) {
    return { center: fallbackCenter, zoom: fallbackZoom };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let validCount = 0;

  for (const pt of points) {
    const lat = Number(pt?.lat ?? pt?.latitude ?? (Array.isArray(pt) ? pt[0] : null));
    const lng = Number(pt?.lng ?? pt?.longitude ?? (Array.isArray(pt) ? pt[1] : null));
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)
    ) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      validCount++;
    }
  }

  if (validCount === 0) {
    return { center: fallbackCenter, zoom: fallbackZoom };
  }

  const centerLat = Number(((minLat + maxLat) / 2).toFixed(6));
  const centerLng = Number(((minLng + maxLng) / 2).toFixed(6));

  const dLat = Math.abs(maxLat - minLat);
  const dLng = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(dLat, dLng);

  // Determine operational zoom level with appropriate padding:
  // Tight area (< 350m): zoom 16
  // Small field (< 1km): zoom 15
  // Medium operational zone (< 3km): zoom 14
  // Regional area (< 8km): zoom 13
  // Extended corridor (< 20km): zoom 12
  // Large mission bounds: clamp to 11 (never global / world view)
  let zoom = 15;
  if (maxSpan < 0.003) {
    zoom = 16;
  } else if (maxSpan < 0.01) {
    zoom = 15;
  } else if (maxSpan < 0.03) {
    zoom = 14;
  } else if (maxSpan < 0.08) {
    zoom = 13;
  } else if (maxSpan < 0.2) {
    zoom = 12;
  } else {
    zoom = 11;
  }

  return {
    center: [centerLat, centerLng],
    zoom,
  };
}

/**
 * Resolves page-aware initial center and zoom.
 * Guarantees that:
 * 1. Saved mission with geofence / waypoints opens positioned at the operational area (bounding box fit).
 * 2. Active live drone with valid GPS opens centered on drone at operational zoom (15).
 * 3. Default fallback uses Hyderabad location at local operational zoom (15).
 * 4. Never uses browser/IP/device location.
 * 5. Never defaults to global/world zoom (zoom 2, [20, 0]).
 *
 * @param {Object} params
 * @param {string} [params.pageType="fly"] - "fly" | "geofence" | "waypoints" | "planning" | "analytics" | "dashboard"
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

  // Gather mission geometry (waypoints & geofence polygon vertices)
  const allMissionPoints = [
    ...(Array.isArray(waypoints) ? waypoints : []),
    ...(Array.isArray(geofenceCoords) ? geofenceCoords : []),
  ];

  // 2. If mission geometry (geofence or waypoints) exists:
  // Position the map to show the selected mission's operational area clearly with fitted bounding box
  if (allMissionPoints.length > 0) {
    const { center: missionCenter, zoom: missionZoom } = getBoundsCenterAndZoom(
      allMissionPoints,
      [activeLat, activeLng],
      config.operationalZoom || OPERATIONAL_MAP_ZOOM
    );
    return {
      center: customCenter || missionCenter,
      zoom: customZoom ?? missionZoom,
    };
  }

  // 3. If a live real drone is connected with valid GPS, center on drone at operational zoom
  if (hasLiveDroneLocation) {
    return {
      center: customCenter || [activeLat, activeLng],
      zoom: customZoom ?? (config.operationalZoom || OPERATIONAL_MAP_ZOOM),
    };
  }

  // 4. Fallback to Hyderabad location at local operational zoom level (never global zoom)
  return {
    center: customCenter || config.defaultCenter, // [17.3850, 78.4867]
    zoom: customZoom ?? config.defaultZoom, // 15
  };
}

export default MAP_CONFIG;
