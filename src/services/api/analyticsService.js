import { apiClient } from "./apiClient.js"
import { droneService } from "./droneService.js"
import { projectService } from "../projectService.js"
import { userService } from "./userService.js"

/**
 * Seeded Flight Log Sorties for Historical Analytics
 * Corresponds to registered drones, real projects, and realistic telemetry profiles
 */
export const SEEDED_FLIGHT_HISTORY = [
  {
    id: "FLT-20260918-001",
    flightNumber: "AF-101",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    operator: "Alex Vance",
    operatorUsername: "superadmin",
    missionId: "AERO-MSN-0001",
    missionName: "Survey Site A",
    startTime: "2026-09-18T10:14:00.000Z",
    endTime: "2026-09-18T10:38:24.000Z",
    durationSeconds: 1464, // 24m 24s
    durationFormatted: "24m 24s",
    distanceKm: 4.82,
    maxAltitudeM: 68.4,
    avgAltitudeM: 52.1,
    maxSpeedMs: 12.4,
    avgSpeedMs: 7.2,
    batteryStart: 98,
    batteryEnd: 42,
    batteryUsed: 56,
    flightMode: "AUTO",
    status: "Completed",
    waypointsTotal: 8,
    waypointsCompleted: 8,
    gpsSatellitesAvg: 17,
    packetLossPct: 0.12,
    incidentsCount: 0,
    startCoords: { lat: 17.385000, lng: 78.486700 },
    endCoords: { lat: 17.385100, lng: 78.486800 },
    timelineEvents: [
      { time: "10:14:02", event: "ARMED", detail: "Motors armed in GUIDED mode", type: "info" },
      { time: "10:14:15", event: "TAKEOFF", detail: "Ascent to 30m AGL initiated", type: "info" },
      { time: "10:16:30", event: "MODE_CHANGE", detail: "Switched to AUTO mission navigation", type: "info" },
      { time: "10:22:10", event: "WAYPOINT_REACHED", detail: "WP 4 reached (Speed 8.5m/s)", type: "success" },
      { time: "10:34:00", event: "RTL_TRIGGERED", detail: "Mission complete, RTL auto-activated", type: "info" },
      { time: "10:38:20", event: "LANDED", detail: "Touchdown at Home coordinates", type: "success" },
      { time: "10:38:24", event: "DISARMED", detail: "Motors stopped successfully", type: "info" },
    ],
  },
  {
    id: "FLT-20260917-004",
    flightNumber: "AF-102",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    operator: "Sarah Chen",
    operatorUsername: "pilot",
    missionId: "AERO-MSN-0001",
    missionName: "Survey Site A",
    startTime: "2026-09-17T14:20:00.000Z",
    endTime: "2026-09-17T14:48:10.000Z",
    durationSeconds: 1690, // 28m 10s
    durationFormatted: "28m 10s",
    distanceKm: 5.94,
    maxAltitudeM: 84.0,
    avgAltitudeM: 61.5,
    maxSpeedMs: 14.2,
    avgSpeedMs: 8.6,
    batteryStart: 100,
    batteryEnd: 24,
    batteryUsed: 76,
    flightMode: "GUIDED",
    status: "Completed",
    waypointsTotal: 12,
    waypointsCompleted: 12,
    gpsSatellitesAvg: 16,
    packetLossPct: 0.25,
    incidentsCount: 1,
    startCoords: { lat: 17.388500, lng: 78.483000 },
    endCoords: { lat: 17.388400, lng: 78.483100 },
    timelineEvents: [
      { time: "14:20:05", event: "ARMED", detail: "Manual Arm pre-check cleared", type: "info" },
      { time: "14:20:45", event: "TAKEOFF", detail: "Ascent to cruising altitude 60m", type: "info" },
      { time: "14:42:15", event: "LOW_BATTERY_WARNING", detail: "Battery level below 30% (28%)", type: "warning" },
      { time: "14:44:00", event: "RTL", detail: "Low battery RTL fail-safe initiated", type: "warning" },
      { time: "14:48:10", event: "LANDED", detail: "Safely recovered on landing pad", type: "success" },
    ],
  },
  {
    id: "FLT-20260916-002",
    flightNumber: "AF-103",
    droneId: "DRONE-002",
    droneName: "Heavy-Hex 6",
    operator: "Marcus Brody",
    operatorUsername: "fleet_manager",
    missionId: "AERO-MSN-0002",
    missionName: "Perimeter Security Inspection",
    startTime: "2026-09-16T09:05:00.000Z",
    endTime: "2026-09-16T09:23:45.000Z",
    durationSeconds: 1125, // 18m 45s
    durationFormatted: "18m 45s",
    distanceKm: 3.65,
    maxAltitudeM: 45.0,
    avgAltitudeM: 35.0,
    maxSpeedMs: 10.0,
    avgSpeedMs: 6.4,
    batteryStart: 95,
    batteryEnd: 58,
    batteryUsed: 37,
    flightMode: "LOITER",
    status: "Completed",
    waypointsTotal: 6,
    waypointsCompleted: 6,
    gpsSatellitesAvg: 18,
    packetLossPct: 0.05,
    incidentsCount: 0,
    startCoords: { lat: 17.381500, lng: 78.490500 },
    endCoords: { lat: 17.381500, lng: 78.490500 },
    timelineEvents: [
      { time: "09:05:02", event: "ARMED", detail: "Pre-flight checks verified OK", type: "info" },
      { time: "09:05:30", event: "TAKEOFF", detail: "Hover verification at 5m", type: "info" },
      { time: "09:12:00", event: "GEOFENCE_CHECK", detail: "Within Hyderabad Core Polygon", type: "info" },
      { time: "09:23:45", event: "LANDED", detail: "Mission complete", type: "success" },
    ],
  },
  {
    id: "FLT-20260915-005",
    flightNumber: "AF-104",
    droneId: "DRONE-003",
    droneName: "Scout VTOL",
    operator: "Sarah Chen",
    operatorUsername: "pilot",
    missionId: "AERO-MSN-0003",
    missionName: "Long-Range Corridor Mapping",
    startTime: "2026-09-15T11:10:00.000Z",
    endTime: "2026-09-15T11:46:20.000Z",
    durationSeconds: 2180, // 36m 20s
    durationFormatted: "36m 20s",
    distanceKm: 9.85,
    maxAltitudeM: 110.0,
    avgAltitudeM: 85.0,
    maxSpeedMs: 16.5,
    avgSpeedMs: 11.2,
    batteryStart: 100,
    batteryEnd: 18,
    batteryUsed: 82,
    flightMode: "AUTO",
    status: "Completed",
    waypointsTotal: 18,
    waypointsCompleted: 18,
    gpsSatellitesAvg: 19,
    packetLossPct: 0.18,
    incidentsCount: 1,
    startCoords: { lat: 17.383500, lng: 78.485000 },
    endCoords: { lat: 17.383500, lng: 78.485000 },
    timelineEvents: [
      { time: "11:10:10", event: "ARMED", detail: "Autonomous sequence started", type: "info" },
      { time: "11:28:40", event: "GEOFENCE_NEAR", detail: "Within 20m of polygon boundary", type: "warning" },
      { time: "11:44:00", event: "RTL", detail: "Corridor survey completed, return path engaged", type: "info" },
      { time: "11:46:20", event: "LANDED", detail: "Landed safely", type: "success" },
    ],
  },
  {
    id: "FLT-20260914-001",
    flightNumber: "AF-105",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    operator: "Alex Vance",
    operatorUsername: "superadmin",
    missionId: "AERO-MSN-0001",
    missionName: "Survey Site A",
    startTime: "2026-09-14T16:00:00.000Z",
    endTime: "2026-09-14T16:15:30.000Z",
    durationSeconds: 930, // 15m 30s
    durationFormatted: "15m 30s",
    distanceKm: 2.85,
    maxAltitudeM: 55.0,
    avgAltitudeM: 48.0,
    maxSpeedMs: 11.0,
    avgSpeedMs: 6.8,
    batteryStart: 88,
    batteryEnd: 54,
    batteryUsed: 34,
    flightMode: "POSHOLD",
    status: "Completed",
    waypointsTotal: 5,
    waypointsCompleted: 5,
    gpsSatellitesAvg: 16,
    packetLossPct: 0.08,
    incidentsCount: 0,
    startCoords: { lat: 17.385000, lng: 78.486700 },
    endCoords: { lat: 17.385000, lng: 78.486700 },
    timelineEvents: [
      { time: "16:00:00", event: "ARMED", detail: "Armed in PosHold", type: "info" },
      { time: "16:15:30", event: "DISARMED", detail: "Manual disarm after landing", type: "info" },
    ],
  },
  {
    id: "FLT-20260912-003",
    flightNumber: "AF-106",
    droneId: "DRONE-002",
    droneName: "Heavy-Hex 6",
    operator: "Elena Rostova",
    operatorUsername: "viewer",
    missionId: "AERO-MSN-0002",
    missionName: "Perimeter Security Inspection",
    startTime: "2026-09-12T08:00:00.000Z",
    endTime: "2026-09-12T08:11:15.000Z",
    durationSeconds: 675, // 11m 15s
    durationFormatted: "11m 15s",
    distanceKm: 1.95,
    maxAltitudeM: 40.0,
    avgAltitudeM: 32.0,
    maxSpeedMs: 9.5,
    avgSpeedMs: 5.8,
    batteryStart: 92,
    batteryEnd: 68,
    batteryUsed: 24,
    flightMode: "ALT_HOLD",
    status: "Aborted",
    waypointsTotal: 8,
    waypointsCompleted: 3,
    gpsSatellitesAvg: 14,
    packetLossPct: 0.45,
    incidentsCount: 1,
    startCoords: { lat: 17.388500, lng: 78.490500 },
    endCoords: { lat: 17.388500, lng: 78.490500 },
    timelineEvents: [
      { time: "08:00:00", event: "ARMED", detail: "Sortie initiated", type: "info" },
      { time: "08:08:20", event: "COMMUNICATION_LOSS", detail: "Telemetry signal dipped below threshold", type: "error" },
      { time: "08:09:00", event: "FAILSAFE_LAND", detail: "Operator triggered safety abort", type: "warning" },
      { time: "08:11:15", event: "DISARMED", detail: "Recovered and disarmed", type: "info" },
    ],
  },
]

export const SEEDED_INCIDENTS = [
  {
    id: "INC-2026-001",
    timestamp: "2026-09-17T14:42:15.000Z",
    droneId: "DRONE-001",
    flightId: "FLT-20260917-004",
    type: "Low Battery",
    severity: "Warning",
    status: "Resolved",
    description: "Battery reached critical threshold (28%), automated RTL engaged.",
    actionTaken: "Failsafe RTL triggered, drone landed safely at home base.",
  },
  {
    id: "INC-2026-002",
    timestamp: "2026-09-15T11:28:40.000Z",
    droneId: "DRONE-003",
    flightId: "FLT-20260915-005",
    type: "Geofence Violation",
    severity: "Warning",
    status: "Resolved",
    description: "Proximity to Hyderabad Core Polygon boundary within 20m safety buffer.",
    actionTaken: "Autopilot adjusted heading to remain inside designated corridor.",
  },
  {
    id: "INC-2026-003",
    timestamp: "2026-09-12T08:08:20.000Z",
    droneId: "DRONE-002",
    flightId: "FLT-20260912-003",
    type: "Communication Loss",
    severity: "Critical",
    status: "Resolved",
    description: "Telemetry packet loss reached 45% during high-interference segment.",
    actionTaken: "Flight Operator initiated safe emergency LAND sequence.",
  },
  {
    id: "INC-2026-004",
    timestamp: "2026-09-10T16:22:00.000Z",
    droneId: "DRONE-001",
    flightId: "FLT-20260910-001",
    type: "GPS Loss",
    severity: "Warning",
    status: "Resolved",
    description: "Temporary satellite count drop from 18 to 9 satellites.",
    actionTaken: "Optical flow sensor assisted position hold until fix recovered.",
  },
]

/**
 * Filter flights based on standard criteria
 */
function filterFlights(flights, filters = {}) {
  return flights.filter((f) => {
    if (filters.droneId && filters.droneId !== "ALL" && f.droneId !== filters.droneId) {
      return false
    }
    if (filters.operator && filters.operator !== "ALL" && f.operatorUsername !== filters.operator && f.operator !== filters.operator) {
      return false
    }
    if (filters.flightMode && filters.flightMode !== "ALL" && f.flightMode !== filters.flightMode) {
      return false
    }
    if (filters.missionStatus && filters.missionStatus !== "ALL" && f.status.toUpperCase() !== filters.missionStatus.toUpperCase()) {
      return false
    }
    if (filters.missionId && filters.missionId !== "ALL" && f.missionId !== filters.missionId) {
      return false
    }
    if (filters.startDate) {
      const flightDate = new Date(f.startTime).getTime()
      const start = new Date(filters.startDate).getTime()
      if (flightDate < start) return false
    }
    if (filters.endDate) {
      const flightDate = new Date(f.startTime).getTime()
      const end = new Date(filters.endDate).getTime()
      if (flightDate > end) return false
    }
    return true
  })
}

/**
 * Centralized Analytics Service
 */
export const analyticsService = {
  /**
   * Fetch complete Fleet Overview KPIs & Analytics
   */
  async getFleetOverview(filters = {}) {
    try {
      const res = await apiClient("/api/analytics/overview", {
        method: "GET",
        suppressForbiddenToast: true,
        silent: true,
      })
      if (res && res.data) return res.data
    } catch {
      // Graceful aggregation fallback
    }

    // Dynamic aggregation over live system state
    const rawDrones = await droneService.getDrones()
    const drones = Array.isArray(rawDrones) && rawDrones.length > 0 ? rawDrones : [
      { id: "DRONE-001", name: "AeroNexus Alpha", status: "ONLINE", model: "QuadX Pro" },
      { id: "DRONE-002", name: "Heavy-Hex 6", status: "STANDBY", model: "HexaRotor" },
      { id: "DRONE-003", name: "Scout VTOL", status: "ONLINE", model: "VTOL Fixed-Wing" },
      { id: "DRONE-004", name: "Sentry Eagle", status: "MAINTENANCE", model: "Hexacopter" },
    ]

    const allProjects = projectService.getProjects()
    const flights = filterFlights(SEEDED_FLIGHT_HISTORY, filters)

    const totalDistance = flights.reduce((sum, f) => sum + (f.distanceKm || 0), 0)
    const totalDurationSeconds = flights.reduce((sum, f) => sum + (f.durationSeconds || 0), 0)
    const totalHours = (totalDurationSeconds / 3600).toFixed(1)

    const completedMissions = flights.filter((f) => f.status === "Completed").length
    const totalSorties = flights.length
    const successRate = totalSorties > 0 ? ((completedMissions / totalSorties) * 100).toFixed(1) : 0

    const totalIncidents = SEEDED_INCIDENTS.length

    // Active drones (online or in-flight)
    const activeDronesCount = drones.filter((d) => d.status === "ONLINE" || d.status === "IN-FLIGHT").length

    // Compute average battery consumption
    const avgBatteryUsed = totalSorties > 0
      ? (flights.reduce((sum, f) => sum + (f.batteryUsed || 0), 0) / totalSorties).toFixed(1)
      : 0

    // Time-series points for flight activity (last 7 days / slots)
    const activityTrend = [
      { date: "Sep 12", flights: 2, durationMinutes: 38, distanceKm: 5.4 },
      { date: "Sep 13", flights: 1, durationMinutes: 18, distanceKm: 2.8 },
      { date: "Sep 14", flights: 3, durationMinutes: 45, distanceKm: 7.2 },
      { date: "Sep 15", flights: 4, durationMinutes: 72, distanceKm: 14.5 },
      { date: "Sep 16", flights: 2, durationMinutes: 34, distanceKm: 6.1 },
      { date: "Sep 17", flights: 5, durationMinutes: 88, distanceKm: 18.2 },
      { date: "Sep 18", flights: 3, durationMinutes: 52, distanceKm: 11.6 },
    ]

    // Flight mode distribution
    const modeCounts = flights.reduce((acc, f) => {
      acc[f.flightMode] = (acc[f.flightMode] || 0) + 1
      return acc
    }, {})

    const flightModeDistribution = Object.entries(modeCounts).map(([mode, count]) => ({
      mode,
      count,
      pct: totalSorties > 0 ? Math.round((count / totalSorties) * 100) : 0,
    }))

    // Drone utilization
    const droneUtilization = drones.map((d) => {
      const droneFlights = flights.filter((f) => f.droneId === d.id)
      const hours = (droneFlights.reduce((sum, f) => sum + (f.durationSeconds || 0), 0) / 3600).toFixed(1)
      return {
        id: d.id,
        name: d.name || d.id,
        model: d.model || "QuadX",
        status: d.status || "STANDBY",
        flightsCount: droneFlights.length,
        flightHours: Number(hours),
        batteryHealth: 96,
      }
    })

    return {
      kpis: {
        totalDrones: drones.length,
        activeDrones: activeDronesCount,
        totalFlights: totalSorties,
        totalFlightHours: `${totalHours} h`,
        totalDistanceKm: `${totalDistance.toFixed(1)} km`,
        missionsCompleted: completedMissions,
        missionSuccessRate: `${successRate}%`,
        totalIncidents,
        avgBatteryConsumption: `${avgBatteryUsed}%`,
        telemetryAvailability: "99.4%",
      },
      activityTrend,
      flightModeDistribution,
      droneUtilization,
      recentEvents: SEEDED_FLIGHT_HISTORY.slice(0, 5),
      drones,
      missionsCount: allProjects.length,
    }
  },

  /**
   * Fetch Flight Analytics breakdown
   */
  async getFlightAnalytics(filters = {}) {
    const flights = filterFlights(SEEDED_FLIGHT_HISTORY, filters)
    const count = flights.length

    const avgDuration = count > 0 ? Math.round(flights.reduce((s, f) => s + f.durationSeconds, 0) / count / 60) : 0
    const maxDuration = count > 0 ? Math.round(Math.max(...flights.map((f) => f.durationSeconds)) / 60) : 0

    const avgDistance = count > 0 ? (flights.reduce((s, f) => s + f.distanceKm, 0) / count).toFixed(2) : 0
    const maxDistance = count > 0 ? Math.max(...flights.map((f) => f.distanceKm)).toFixed(2) : 0

    const avgSpeed = count > 0 ? (flights.reduce((s, f) => s + f.avgSpeedMs, 0) / count).toFixed(1) : 0
    const maxSpeed = count > 0 ? Math.max(...flights.map((f) => f.maxSpeedMs)).toFixed(1) : 0

    const avgAlt = count > 0 ? (flights.reduce((s, f) => s + f.avgAltitudeM, 0) / count).toFixed(1) : 0
    const maxAlt = count > 0 ? Math.max(...flights.map((f) => f.maxAltitudeM)).toFixed(1) : 0

    const totalDurationSeconds = flights.reduce((s, f) => s + f.durationSeconds, 0)
    const totalFlightHours = (totalDurationSeconds / 3600).toFixed(1)
    const totalDistance = flights.reduce((s, f) => s + (f.distanceKm || 0), 0).toFixed(1)

    // Flights grouped by drone
    const droneFlightCounts = flights.reduce((acc, f) => {
      acc[f.droneId] = (acc[f.droneId] || 0) + 1
      return acc
    }, {})
    const flightsByDrone = Object.entries(droneFlightCounts).map(([label, value]) => ({
      label,
      value,
    }))

    // Flight mode distribution for flights view
    const modeCounts = flights.reduce((acc, f) => {
      acc[f.flightMode] = (acc[f.flightMode] || 0) + 1
      return acc
    }, {})
    const flightModeDistribution = Object.entries(modeCounts).map(([mode, count]) => ({
      mode,
      count,
      pct: count > 0 ? Math.round((count / Math.max(1, count)) * 100) : 0,
    }))

    // Selectable activity trend (Flights, Duration, Distance)
    const activityTrend = [
      { date: "Sep 12", flights: 2, duration: 38, distance: 5.4 },
      { date: "Sep 13", flights: 1, duration: 18, distance: 2.8 },
      { date: "Sep 14", flights: 3, duration: 45, distance: 7.2 },
      { date: "Sep 15", flights: 4, duration: 72, distance: 14.5 },
      { date: "Sep 16", flights: 2, duration: 34, distance: 6.1 },
      { date: "Sep 17", flights: 5, duration: 88, distance: 18.2 },
      { date: "Sep 18", flights: 3, duration: 52, distance: 11.6 },
    ]

    // Duration distribution buckets
    const durationDistribution = [
      { label: "< 15 min", value: flights.filter((f) => f.durationSeconds < 900).length },
      { label: "15-30 min", value: flights.filter((f) => f.durationSeconds >= 900 && f.durationSeconds < 1800).length },
      { label: "30-45 min", value: flights.filter((f) => f.durationSeconds >= 1800 && f.durationSeconds < 2700).length },
      { label: "> 45 min", value: flights.filter((f) => f.durationSeconds >= 2700).length },
    ]

    // Hourly / daily distribution
    const hourlyDistribution = [
      { hour: "08:00", flights: 1 },
      { hour: "10:00", flights: 3 },
      { hour: "12:00", flights: 2 },
      { hour: "14:00", flights: 4 },
      { hour: "16:00", flights: 3 },
      { hour: "18:00", flights: 1 },
    ]

    const altitudeProfile = [
      { step: "0%", altitude: 0 },
      { step: "10%", altitude: 30 },
      { step: "25%", altitude: 65 },
      { step: "50%", altitude: 68 },
      { step: "75%", altitude: 64 },
      { step: "90%", altitude: 30 },
      { step: "100%", altitude: 0 },
    ]

    const speedProfile = [
      { step: "0%", speed: 0 },
      { step: "15%", speed: 5.4 },
      { step: "30%", speed: 8.5 },
      { step: "60%", speed: 11.2 },
      { step: "85%", speed: 6.8 },
      { step: "100%", speed: 0 },
    ]

    return {
      kpis: {
        totalFlights: count,
        flightHours: `${totalFlightHours} h`,
        totalDistance: `${totalDistance} km`,
        avgFlightDuration: `${avgDuration} min`,
        maxFlightDuration: `${maxDuration} min`,
        avgDistance: `${avgDistance} km`,
        maxDistance: `${maxDistance} km`,
        avgSpeed: `${avgSpeed} m/s`,
        maxSpeed: `${maxSpeed} m/s`,
        avgAltitude: `${avgAlt} m`,
        maxAltitude: `${maxAlt} m`,
      },
      flights,
      activityTrend,
      flightsByDrone,
      flightModeDistribution,
      durationDistribution,
      hourlyDistribution,
      altitudeProfile,
      speedProfile,
    }
  },

  /**
   * Fetch Individual Drone Performance Data
   */
  async getDronePerformance(droneId = "DRONE-001", filters = {}) {
    const droneFlights = filterFlights(SEEDED_FLIGHT_HISTORY, { ...filters, droneId })
    const count = droneFlights.length

    const flightHours = (droneFlights.reduce((sum, f) => sum + (f.durationSeconds || 0), 0) / 3600).toFixed(1)
    const totalDist = droneFlights.reduce((sum, f) => sum + (f.distanceKm || 0), 0).toFixed(1)
    const avgSpeed = count > 0 ? (droneFlights.reduce((s, f) => s + f.avgSpeedMs, 0) / count).toFixed(1) : 0
    const maxSpeed = count > 0 ? Math.max(...droneFlights.map((f) => f.maxSpeedMs)).toFixed(1) : 0
    const maxAlt = count > 0 ? Math.max(...droneFlights.map((f) => f.maxAltitudeM)).toFixed(1) : 0

    // Average battery usage
    const avgBat = count > 0 ? Math.round(droneFlights.reduce((s, f) => s + (f.batteryUsed || 45), 0) / count) : 48

    // Flight mode breakdown for this drone
    const modeCounts = droneFlights.reduce((acc, f) => {
      acc[f.flightMode] = (acc[f.flightMode] || 0) + 1
      return acc
    }, {})
    const flightModeDistribution = Object.entries(modeCounts).map(([mode, c]) => ({
      mode,
      count: c,
      pct: count > 0 ? Math.round((c / count) * 100) : 0,
    }))

    // Specific drone telemetry trends
    const telemetryTrends = [
      { time: "00:00", altitude: 0, speed: 0, battery: 100, satellites: 18 },
      { time: "05:00", altitude: 45, speed: 7.2, battery: 88, satellites: 18 },
      { time: "10:00", altitude: 68, speed: 11.4, battery: 74, satellites: 17 },
      { time: "15:00", altitude: 65, speed: 8.6, battery: 60, satellites: 17 },
      { time: "20:00", altitude: 50, speed: 6.1, battery: 45, satellites: 16 },
      { time: "25:00", altitude: 0, speed: 0, battery: 38, satellites: 17 },
    ]

    const activityTrend = [
      { date: "Sep 12", flights: 1, duration: 24, distance: 3.2 },
      { date: "Sep 13", flights: 0, duration: 0, distance: 0 },
      { date: "Sep 14", flights: 2, duration: 32, distance: 4.8 },
      { date: "Sep 15", flights: 3, duration: 54, distance: 8.4 },
      { date: "Sep 16", flights: 1, duration: 18, distance: 3.6 },
      { date: "Sep 17", flights: 4, duration: 68, distance: 12.2 },
      { date: "Sep 18", flights: 2, duration: 36, distance: 6.4 },
    ]

    return {
      droneId,
      status: "ONLINE",
      totalFlights: count,
      flightHours: `${flightHours} h`,
      distanceKm: `${totalDist} km`,
      batteryUsage: `${avgBat}%`,
      avgSpeed: `${avgSpeed} m/s`,
      maxSpeed: `${maxSpeed} m/s`,
      maxAltitude: `${maxAlt} m`,
      batteryHealth: 97,
      gpsAvailability: "99.8%",
      satelliteAverage: 17,
      telemetryAvailability: "99.5%",
      missionCompletionRate: count > 0 ? "100%" : "0%",
      incidents: SEEDED_INCIDENTS.filter((i) => i.droneId === droneId).length,
      telemetryTrends,
      flightModeDistribution,
      activityTrend,
      flights: droneFlights,
    }
  },

  /**
   * Fetch Mission Analytics
   */
  async getMissionAnalytics(filters = {}) {
    const projects = projectService.getProjects()
    const flights = filterFlights(SEEDED_FLIGHT_HISTORY, filters)

    const totalMissions = projects.length
    const completed = flights.filter((f) => f.status === "Completed").length
    const failed = flights.filter((f) => f.status === "Aborted" || f.status === "Failed").length
    const inProgress = totalMissions > completed ? totalMissions - completed : 0

    const successRate = flights.length > 0 ? ((completed / flights.length) * 100).toFixed(1) : 100

    const missionStatusDistribution = [
      { name: "Completed", value: completed, color: "#2FE089" },
      { name: "In Progress", value: inProgress, color: "#35E0FF" },
      { name: "Aborted", value: failed, color: "#FF4141" },
    ]

    const missionsTable = projects.map((p, idx) => {
      const associatedFlight = flights.find((f) => f.missionId === p.id) || flights[idx % flights.length]
      const waypointsCount = p.mission?.waypoints?.length || 8
      return {
        id: p.id,
        name: p.name || p.projectName || "Standard Survey Mission",
        droneId: associatedFlight ? associatedFlight.droneId : "DRONE-001",
        operator: p.userName || "Alex Vance",
        createdAt: p.createdAt || "2026-09-15T09:00:00Z",
        duration: associatedFlight ? associatedFlight.durationFormatted : "22m 10s",
        distanceKm: associatedFlight ? `${associatedFlight.distanceKm} km` : "4.2 km",
        waypoints: waypointsCount,
        status: associatedFlight ? associatedFlight.status : "Completed",
      }
    })

    const missionActivity = [
      { date: "Sep 12", missions: 1 },
      { date: "Sep 13", missions: 0 },
      { date: "Sep 14", missions: 2 },
      { date: "Sep 15", missions: 3 },
      { date: "Sep 16", missions: 1 },
      { date: "Sep 17", missions: 3 },
      { date: "Sep 18", missions: 2 },
    ]

    const missionDurationComparison = missionsTable.map((m) => ({
      label: m.name.length > 16 ? m.name.slice(0, 14) + "..." : m.name,
      value: parseInt(m.duration, 10) || 22,
    }))

    const missionDistanceComparison = missionsTable.map((m) => ({
      label: m.name.length > 16 ? m.name.slice(0, 14) + "..." : m.name,
      value: parseFloat(m.distanceKm) || 4.2,
    }))

    const waypointCompletionComparison = missionsTable.map((m) => ({
      label: m.id,
      value: m.waypoints,
    }))

    return {
      kpis: {
        totalMissions,
        completedMissions: completed,
        failedMissions: failed,
        activeMissions: inProgress,
        missionSuccessRate: `${successRate}%`,
        avgMissionDuration: "24m 15s",
        avgMissionDistance: "4.8 km",
        avgWaypoints: 9,
        waypointCompletionRate: "98.2%",
      },
      missionActivity,
      missionStatusDistribution,
      missionDurationComparison,
      missionDistanceComparison,
      waypointCompletionComparison,
      missionsTable,
    }
  },

  /**
   * Fetch Telemetry Health & Communication Statistics
   */
  async getTelemetryHealth() {
    return {
      metrics: {
        gpsFixRate: "99.8%",
        averageSatellites: 17.2,
        telemetryAvailability: "99.4%",
        wsStability: "Stable (99.9%)",
        packetRate: "20.4 Hz",
        packetLossPct: "0.12%",
        avgLatencyMs: "18 ms",
        missingFrames: "4 frames / 24h",
      },
      statusSummary: {
        gps: "Healthy",
        telemetry: "Healthy",
        link: "Healthy",
        radio: "Healthy",
      },
      timeSeries: [
        { time: "10:00", satellites: 16, latencyMs: 14, packetLoss: 0.05 },
        { time: "11:00", satellites: 18, latencyMs: 16, packetLoss: 0.10 },
        { time: "12:00", satellites: 18, latencyMs: 18, packetLoss: 0.15 },
        { time: "13:00", satellites: 17, latencyMs: 22, packetLoss: 0.22 },
        { time: "14:00", satellites: 15, latencyMs: 28, packetLoss: 0.35 },
        { time: "15:00", satellites: 17, latencyMs: 19, packetLoss: 0.12 },
        { time: "16:00", satellites: 18, latencyMs: 16, packetLoss: 0.08 },
      ],
    }
  },

  /**
   * Fetch Battery Analytics
   */
  async getBatteryAnalytics() {
    const usageByMission = [
      { label: "Survey Site A", value: 56 },
      { label: "Perimeter Security", value: 37 },
      { label: "Corridor Mapping", value: 82 },
      { label: "Thermal Inspection", value: 45 },
    ]

    const lowBatteryEventsTimeline = [
      { date: "Sep 12", events: 0 },
      { date: "Sep 13", events: 0 },
      { date: "Sep 14", events: 1 },
      { date: "Sep 15", events: 0 },
      { date: "Sep 16", events: 0 },
      { date: "Sep 17", events: 1 },
      { date: "Sep 18", events: 0 },
    ]

    return {
      kpis: {
        averageBattery: "84%",
        batteryConsumption: "48.5%",
        lowBatteryEvents: 2,
        criticalEvents: 0,
        batteryHealth: "98.2%",
        avgChargeCycles: "42 cycles",
      },
      dischargeProfile: [
        { minute: 0, batteryPct: 100, voltage: 25.2 },
        { minute: 5, batteryPct: 88, voltage: 24.6 },
        { minute: 10, batteryPct: 76, voltage: 23.9 },
        { minute: 15, batteryPct: 62, voltage: 23.2 },
        { minute: 20, batteryPct: 48, voltage: 22.8 },
        { minute: 25, batteryPct: 34, voltage: 22.4 },
        { minute: 30, batteryPct: 20, voltage: 21.9 },
      ],
      consumptionByDrone: [
        { droneId: "DRONE-001", avgUsed: 52, health: 98, flights: 18 },
        { droneId: "DRONE-002", avgUsed: 44, health: 96, flights: 12 },
        { droneId: "DRONE-003", avgUsed: 64, health: 99, flights: 9 },
      ],
      usageByMission,
      lowBatteryEventsTimeline,
    }
  },

  /**
   * Fetch Safety & Incident Analytics
   */
  async getSafetyIncidents(filters = {}) {
    let incidentItems = [...SEEDED_INCIDENTS]
    if (filters.droneId && filters.droneId !== "ALL") {
      incidentItems = incidentItems.filter((i) => i.droneId === filters.droneId)
    }

    const total = incidentItems.length
    const critical = incidentItems.filter((i) => i.severity === "Critical").length
    const warnings = incidentItems.filter((i) => i.severity === "Warning").length
    const resolved = incidentItems.filter((i) => i.status === "Resolved").length

    const incidentTypeBreakdown = [
      { type: "Low Battery", count: 1, color: "#F59E0B" },
      { type: "Geofence Violation", count: 1, color: "#38BDF8" },
      { type: "Communication Loss", count: 1, color: "#FF4141" },
      { type: "GPS Loss", count: 1, color: "#A855F7" },
    ]

    const incidentSeverityBreakdown = [
      { name: "Critical", value: critical, color: "#FF4141" },
      { name: "Warnings", value: warnings, color: "#F59E0B" },
    ]

    const incidentsOverTime = [
      { date: "Sep 12", incidents: 1 },
      { date: "Sep 13", incidents: 0 },
      { date: "Sep 14", incidents: 0 },
      { date: "Sep 15", incidents: 1 },
      { date: "Sep 16", incidents: 0 },
      { date: "Sep 17", incidents: 1 },
      { date: "Sep 18", incidents: 0 },
    ]

    const incidentsByDrone = [
      { label: "DRONE-001", value: 2 },
      { label: "DRONE-002", value: 1 },
      { label: "DRONE-003", value: 1 },
      { label: "DRONE-004", value: 0 },
    ]

    const geofenceViolations = [
      { date: "Sep 12", events: 0 },
      { date: "Sep 13", events: 0 },
      { date: "Sep 14", events: 0 },
      { date: "Sep 15", events: 1 },
      { date: "Sep 16", events: 0 },
      { date: "Sep 17", events: 0 },
      { date: "Sep 18", events: 0 },
    ]

    return {
      kpis: {
        totalIncidents: total,
        critical,
        warnings,
        resolvedIncidents: resolved,
        openIncidents: total - resolved,
        emergencyEvents: 2,
      },
      incidentsOverTime,
      incidentSeverityBreakdown,
      incidentTypeBreakdown,
      incidentsByDrone,
      geofenceViolations,
      incidentsList: SEEDED_INCIDENTS,
    }
  },

  /**
   * Fetch Operator Activity & Utilization
   */
  async getOperatorActivity(filters = {}) {
    const users = await userService.getUsers()
    const flights = filterFlights(SEEDED_FLIGHT_HISTORY, filters)

    const operatorStats = users.map((u) => {
      const opFlights = flights.filter(
        (f) => f.operatorUsername === u.username || f.operator === u.name
      )
      const hours = (opFlights.reduce((sum, f) => sum + (f.durationSeconds || 0), 0) / 3600).toFixed(1)
      const dist = opFlights.reduce((sum, f) => sum + (f.distanceKm || 0), 0).toFixed(1)

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        flightsCount: opFlights.length,
        flightHours: Number(hours),
        totalDistanceKm: Number(dist),
        missionsExecuted: opFlights.length,
        emergencyActions: opFlights.reduce((sum, f) => sum + (f.incidentsCount || 0), 0),
        commandsCount: opFlights.length * 28 + 14,
      }
    })

    const totalSorties = operatorStats.reduce((sum, o) => sum + o.flightsCount, 0)
    const totalHours = operatorStats.reduce((sum, o) => sum + o.flightHours, 0).toFixed(1)
    const totalCommands = operatorStats.reduce((sum, o) => sum + o.commandsCount, 0)

    const flightsByOperator = operatorStats.map((o) => ({
      label: o.name || o.username,
      value: o.flightsCount,
    }))

    const missionsByOperator = operatorStats.map((o) => ({
      label: o.name || o.username,
      value: o.missionsExecuted,
    }))

    const flightHoursByOperator = operatorStats.map((o) => ({
      label: o.name || o.username,
      value: o.flightHours,
    }))

    const commandActivity = [
      { date: "Sep 12", commands: 42 },
      { date: "Sep 13", commands: 18 },
      { date: "Sep 14", commands: 64 },
      { date: "Sep 15", commands: 86 },
      { date: "Sep 16", commands: 38 },
      { date: "Sep 17", commands: 112 },
      { date: "Sep 18", commands: 74 },
    ]

    return {
      kpis: {
        activeOperators: users.length,
        flights: totalSorties,
        missions: totalSorties,
        operationalHours: `${totalHours} h`,
        commands: totalCommands,
      },
      flightsByOperator,
      missionsByOperator,
      flightHoursByOperator,
      commandActivity,
      operators: operatorStats,
      totalOperators: users.length,
    }
  },

  /**
   * Fetch Full Flight History with Filtering and Pagination
   */
  async getFlightHistory(filters = {}, page = 1, pageSize = 10) {
    const filtered = filterFlights(SEEDED_FLIGHT_HISTORY, filters)
    const startIndex = (page - 1) * pageSize
    const paginated = filtered.slice(startIndex, startIndex + pageSize)

    return {
      flights: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    }
  },

  /**
   * Fetch Detailed Profile for a Single Flight
   */
  async getFlightDetail(flightId) {
    const flight = SEEDED_FLIGHT_HISTORY.find((f) => f.id === flightId) || SEEDED_FLIGHT_HISTORY[0]

    // Sample synchronized flight track telemetry points (Altitude, Speed, Battery, Pitch, Roll, Satellites)
    const telemetrySamples = [
      { time: "00:00", altitude: 0, speed: 0, battery: flight.batteryStart, pitch: 0.1, roll: -0.2, heading: 42, satellites: 16 },
      { time: "04:00", altitude: 28, speed: 5.4, battery: flight.batteryStart - 8, pitch: 4.2, roll: 1.1, heading: 45, satellites: 17 },
      { time: "08:00", altitude: 52, speed: 8.6, battery: flight.batteryStart - 18, pitch: -1.2, roll: -2.4, heading: 90, satellites: 17 },
      { time: "12:00", altitude: 68, speed: 12.1, battery: flight.batteryStart - 28, pitch: 0.5, roll: 0.8, heading: 180, satellites: 18 },
      { time: "16:00", altitude: 65, speed: 9.8, battery: flight.batteryStart - 38, pitch: 2.1, roll: -1.0, heading: 240, satellites: 17 },
      { time: "20:00", altitude: 42, speed: 6.2, battery: flight.batteryStart - 46, pitch: -3.8, roll: 0.4, heading: 310, satellites: 16 },
      { time: "24:00", altitude: 0, speed: 0, battery: flight.batteryEnd, pitch: 0.0, roll: 0.0, heading: 42, satellites: 16 },
    ]

    return {
      flight,
      telemetrySamples,
    }
  },

  /**
   * Export Analytics Data in CSV or JSON Format
   */
  exportData(format = "csv", dataset = [], filename = "aeronexus_analytics_export") {
    if (typeof window === "undefined") return

    let blob, fileExtension
    if (format === "json") {
      blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" })
      fileExtension = "json"
    } else {
      // CSV format
      if (!Array.isArray(dataset) || dataset.length === 0) return
      const headers = Object.keys(dataset[0]).join(",")
      const rows = dataset.map((item) =>
        Object.values(item)
          .map((val) => (typeof val === "object" ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${val}"`))
          .join(",")
      )
      const csvContent = [headers, ...rows].join("\n")
      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      fileExtension = "csv"
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.${fileExtension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}

export default analyticsService
