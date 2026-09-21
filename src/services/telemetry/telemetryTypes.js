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

export const createDefaultTelemetry = (droneId = "DRONE-001") => ({
  droneId,
  timestamp: new Date().toISOString(),
  latitude: 17.385,
  longitude: 78.4867,
  altitude: 48.5,
  heading: 0.0,
  speed: 0.0,
  groundSpeed: 0.0,
  verticalSpeed: 0.0,
  climbRate: 0.0,
  roll: 0.0,
  pitch: 0.0,
  yaw: 0.0,
  batteryPercentage: 84.0,
  gpsSatellites: 16,
  flightMode: DEFAULT_FLIGHT_MODE,
  armed: DEFAULT_ARMED_STATE,
  isArmed: DEFAULT_ARMED_STATE,
  status: "OK",
  metadata: {
    simulator: true,
    engineTempC: 42.5,
  },
})
