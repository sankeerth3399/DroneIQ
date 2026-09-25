/**
 * Telemetry Types and Constants matching DroneIQ Backend Contract (FRONTEND_INTEGRATION.md)
 */

export const ConnectionState = {
  DISCONNECTED: "DISCONNECTED",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  AUTHENTICATED: "AUTHENTICATED",
  AUTH_FAILURE: "AUTH_FAILURE",
  STALE: "STALE",
  BACKEND_UNAVAILABLE: "BACKEND_UNAVAILABLE",
}

export const DEFAULT_FLIGHT_MODE = "GUIDED"
export const DEFAULT_ARMED_STATE = false
export const DEFAULT_SHOW_JOYSTICKS = false

// Neutral global/world center and maximum practical zoomed-out view for initial load
export const GLOBAL_DEFAULT_CENTER = {
  latitude: 20,
  longitude: 0,
}
export const GLOBAL_DEFAULT_ZOOM = 2

export const DEFAULT_MAP_CENTER = [GLOBAL_DEFAULT_CENTER.latitude, GLOBAL_DEFAULT_CENTER.longitude]
export const DEFAULT_MAP_ZOOM = GLOBAL_DEFAULT_ZOOM
export const OPERATIONAL_MAP_ZOOM = 15
export const TELEMETRY_STALE_THRESHOLD_MS = 6000

// Centralized temporary fallback location for development (EASY TO REMOVE LATER)
export const FALLBACK_DRONE_LOCATION = {
  latitude: 17.3850,
  longitude: 78.4867,
}

export const FALLBACK_MAP_ZOOM = GLOBAL_DEFAULT_ZOOM

export const MAP_CONFIG = {
  fly: {
    defaultCenter: [GLOBAL_DEFAULT_CENTER.latitude, GLOBAL_DEFAULT_CENTER.longitude],
    defaultZoom: GLOBAL_DEFAULT_ZOOM,
    operationalZoom: OPERATIONAL_MAP_ZOOM,
  },
  geofence: {
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude],
    defaultZoom: OPERATIONAL_MAP_ZOOM,
    operationalZoom: OPERATIONAL_MAP_ZOOM,
  },
  waypoints: {
    defaultCenter: [FALLBACK_DRONE_LOCATION.latitude, FALLBACK_DRONE_LOCATION.longitude],
    defaultZoom: OPERATIONAL_MAP_ZOOM,
    operationalZoom: OPERATIONAL_MAP_ZOOM,
  },
}

export const PositionSource = {
  HYDERABAD_FALLBACK: "HYDERABAD_FALLBACK",
  LIVE: "LIVE",
}

/**
 * Strict live GPS coordinate validation
 * Validates finite numbers within valid geographic latitude/longitude bounds,
 * rejecting null, undefined, NaN, and (0,0) null-island zero placeholders.
 */
export const isValidGpsCoordinate = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false
  }
  if (typeof latitude === "string" && latitude.trim() === "") {
    return false
  }
  if (typeof longitude === "string" && longitude.trim() === "") {
    return false
  }
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false
  }
  // Reject zero-placeholder coordinates (e.g. 0.0, 0.0)
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return false
  }
  return true
}

export const createDefaultTelemetry = (droneId = "DRONE-001") => ({
  droneId,
  timestamp: null,
  latitude: FALLBACK_DRONE_LOCATION.latitude,
  longitude: FALLBACK_DRONE_LOCATION.longitude,
  positionSource: PositionSource.HYDERABAD_FALLBACK,
  altitude: 0.0,
  heading: 0.0,
  speed: 0.0,
  groundSpeed: 0.0,
  verticalSpeed: 0.0,
  climbRate: 0.0,
  roll: 0.0,
  pitch: 0.0,
  yaw: 0.0,
  batteryPercentage: null,
  gpsSatellites: 0,
  flightMode: DEFAULT_FLIGHT_MODE,
  armed: DEFAULT_ARMED_STATE,
  isArmed: DEFAULT_ARMED_STATE,
  status: "DISCONNECTED",
  droneConnected: false,
  droneGPSValid: false,
  isLive: false,
  isStale: false,
  metadata: {},
})
