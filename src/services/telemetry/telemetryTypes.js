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

export const createDefaultTelemetry = (droneId = "DRONE-001") => ({
  droneId,
  timestamp: new Date().toISOString(),
  latitude: 17.385,
  longitude: 78.4867,
  altitude: 48.5,
  heading: 42.0,
  speed: 5.2,
  roll: 0.0,
  pitch: 0.0,
  yaw: 42.0,
  batteryPercentage: 84.0,
  gpsSatellites: 16,
  flightMode: "AUTO",
  armed: true,
  status: "OK",
  metadata: {
    simulator: true,
    engineTempC: 42.5,
  },
})
