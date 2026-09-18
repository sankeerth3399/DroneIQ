/**
 * 10 Canonical Flight Modes for AeroNexus GCS
 */
export const FLIGHT_MODES = [
  { id: "STABILIZE", label: "Stabilize", desc: "Manual flight control with self-leveling attitude" },
  { id: "ALT_HOLD", label: "Alt Hold", desc: "Maintains current altitude when throttle is centered" },
  { id: "POS_HOLD", label: "Pos Hold", desc: "Maintains GPS position and altitude when sticks released" },
  { id: "LOITER", label: "Loiter", desc: "Autonomous GPS position hold with altitude stabilization" },
  { id: "GUIDED", label: "Guided", desc: "Interactive point-and-click or stick-nudged flight control" },
  { id: "RTL", label: "RTL", desc: "Autonomous Return-to-Launch to home coordinates" },
  { id: "LAND", label: "Land", desc: "Autonomous descent and landing at current position" },
  { id: "AUTO", label: "Auto", desc: "Autonomous mission execution and waypoint sequence traversal" },
  { id: "BRAKE", label: "Brake", desc: "Immediate horizontal braking to zero velocity and station-keep" },
  { id: "MANUAL", label: "Manual", desc: "Direct manual joystick flight control with body-relative heading" },
]

export const getFlightModeLabel = (modeId) => {
  if (!modeId) return "Guided"
  const normalized = String(modeId).toUpperCase().replace(/\s+/g, "_")
  const found = FLIGHT_MODES.find((m) => m.id === normalized)
  return found ? found.label : modeId
}
