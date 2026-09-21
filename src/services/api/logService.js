import { projectService } from "../projectService.js"
import { SEEDED_FLIGHT_HISTORY, SEEDED_INCIDENTS } from "./analyticsService.js"

export const STORAGE_KEY_MISSION_LOGS = "aeronexus_mission_logs"

/**
 * Helper to parse and format dates
 */
export const formatLogTime = (isoString) => {
  if (!isoString) return "--:--:--"
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return isoString
  }
}

export const formatLogDate = (isoString) => {
  if (!isoString) return "----/--/--"
  try {
    const d = new Date(isoString)
    return d.toISOString().slice(0, 10)
  } catch {
    return isoString
  }
}

/**
 * Filter utility across log collections
 */
function applyCommonFilters(logs, filters = {}) {
  return logs.filter((item) => {
    // Text search
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim()
      const matchText = [
        item.missionId,
        item.missionName,
        item.projectName,
        item.droneId,
        item.operator,
        item.event,
        item.details,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      if (!matchText.includes(q)) return false
    }

    // Specific filters
    if (filters.missionId && filters.missionId !== "ALL" && item.missionId !== filters.missionId) {
      return false
    }
    if (filters.droneId && filters.droneId !== "ALL" && item.droneId !== filters.droneId) {
      return false
    }
    if (filters.operator && filters.operator !== "ALL" && item.operator !== filters.operator && item.operatorUsername !== filters.operator) {
      return false
    }
    if (filters.event && filters.event !== "ALL" && item.event !== filters.event) {
      return false
    }
    if (filters.status && filters.status !== "ALL" && item.status?.toUpperCase() !== filters.status.toUpperCase()) {
      return false
    }
    if (filters.flightMode && filters.flightMode !== "ALL" && item.flightMode !== filters.flightMode) {
      return false
    }

    // Date filtering
    if (filters.range && filters.range !== "ALL") {
      const logTime = new Date(item.timestamp).getTime()
      const now = Date.now()

      if (filters.range === "Today") {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        if (logTime < startOfDay.getTime()) return false
      } else if (filters.range === "Last 24 Hours") {
        if (logTime < now - 24 * 60 * 60 * 1000) return false
      } else if (filters.range === "7 Days") {
        if (logTime < now - 7 * 24 * 60 * 60 * 1000) return false
      } else if (filters.range === "30 Days") {
        if (logTime < now - 30 * 24 * 60 * 60 * 1000) return false
      }
    }

    return true
  })
}

/**
 * Builds authentic mission logs dynamically from actual projects in projectService and flight history
 */
function generateSynthesizedMissionLogs() {
  const projects = projectService.getProjects() || []
  const generatedLogs = []

  projects.forEach((p) => {
    const waypoints = p.mission?.waypoints || p.mission?.items || []
    const geofence = p.geofence
    const pCreatedAt = p.createdAt || "2026-09-12T08:30:00.000Z"
    const pUpdatedAt = p.updatedAt || pCreatedAt
    const associatedFlight = SEEDED_FLIGHT_HISTORY.find((f) => f.missionId === p.id) || SEEDED_FLIGHT_HISTORY[0]

    // 1. MISSION CREATED Event
    generatedLogs.push({
      id: `LOG-${p.id}-001`,
      missionId: p.id,
      missionName: p.name || p.projectName || "Survey Mission",
      projectName: p.projectName || p.name || "Survey Mission",
      droneId: associatedFlight.droneId,
      operator: p.userName || "Alex Vance",
      operatorUsername: "superadmin",
      event: "MISSION CREATED",
      timestamp: pCreatedAt,
      status: "Draft",
      flightMode: "GUIDED",
      severity: "INFO",
      duration: "--",
      distance: "--",
      waypointCount: waypoints.length,
      completedWaypoints: 0,
      missionResult: "Project created in mission registry",
      details: `Project "${p.name}" initialized with target use-case: ${p.useCase || "Survey"}.`,
      flightId: null,
      geofence: null,
      waypoint: null,
    })

    // 2. GEOFENCE CREATED / SAVED Event (if project has geofence)
    if (geofence && geofence.polygon && geofence.polygon.length > 0) {
      generatedLogs.push({
        id: `LOG-${p.id}-002`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: p.userName || "Alex Vance",
        operatorUsername: "superadmin",
        event: "GEOFENCE CREATED",
        timestamp: geofence.createdAt || pCreatedAt,
        status: "Draft",
        flightMode: "GUIDED",
        severity: "INFO",
        duration: "--",
        distance: "--",
        waypointCount: waypoints.length,
        completedWaypoints: 0,
        missionResult: "Geofence containment verified",
        details: `Configured ${geofence.type || "polygon"} geofence with ${geofence.polygon.length} perimeter coordinates (${Math.round((geofence.areaM2 || 579000) / 10000)} ha).`,
        flightId: null,
        geofence,
        waypoint: null,
      })
    }

    // 3. WAYPOINT ADDED / UPDATED Event (if waypoints exist)
    if (waypoints.length > 0) {
      generatedLogs.push({
        id: `LOG-${p.id}-003`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: p.userName || "Alex Vance",
        operatorUsername: "superadmin",
        event: "WAYPOINT ADDED",
        timestamp: pUpdatedAt,
        status: "Ready",
        flightMode: "GUIDED",
        severity: "INFO",
        duration: "--",
        distance: `${associatedFlight.distanceKm} km`,
        waypointCount: waypoints.length,
        completedWaypoints: 0,
        missionResult: "Autonomous flight path staged",
        details: `Loaded ${waypoints.length} flight waypoints at default altitude ${waypoints[0]?.alt || 50}m AGL.`,
        flightId: null,
        geofence,
        waypoints,
      })

      // 4. MISSION UPLOADED Event
      generatedLogs.push({
        id: `LOG-${p.id}-004`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: associatedFlight.operator || "Sarah Chen",
        operatorUsername: associatedFlight.operatorUsername || "pilot",
        event: "MISSION UPLOADED",
        timestamp: associatedFlight.startTime,
        status: "Ready",
        flightMode: "GUIDED",
        severity: "SUCCESS",
        duration: "--",
        distance: `${associatedFlight.distanceKm} km`,
        waypointCount: waypoints.length,
        completedWaypoints: 0,
        missionResult: "Flight plan uploaded to aircraft autopilot",
        details: `MAVLink mission items synchronized to ${associatedFlight.droneId}. CRC validation passed.`,
        flightId: associatedFlight.id,
        geofence,
        waypoints,
      })

      // 5. MISSION STARTED Event
      generatedLogs.push({
        id: `LOG-${p.id}-005`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: associatedFlight.operator,
        operatorUsername: associatedFlight.operatorUsername,
        event: "MISSION STARTED",
        timestamp: associatedFlight.startTime,
        status: "Running",
        flightMode: "AUTO",
        severity: "INFO",
        duration: "00m 00s",
        distance: "0.00 km",
        waypointCount: waypoints.length,
        completedWaypoints: 0,
        missionResult: "Takeoff executed, proceeding to WP 1",
        details: `Autonomous navigation initiated on ${associatedFlight.droneId} in AUTO mode.`,
        flightId: associatedFlight.id,
        geofence,
        waypoints,
      })

      // 6. Intermediate WAYPOINT REACHED events
      waypoints.slice(0, 3).forEach((wp, idx) => {
        generatedLogs.push({
          id: `LOG-${p.id}-WP-${idx + 1}`,
          missionId: p.id,
          missionName: p.name,
          projectName: p.projectName || p.name,
          droneId: associatedFlight.droneId,
          operator: associatedFlight.operator,
          operatorUsername: associatedFlight.operatorUsername,
          event: "WAYPOINT REACHED",
          timestamp: new Date(new Date(associatedFlight.startTime).getTime() + (idx + 1) * 360000).toISOString(),
          status: "Running",
          flightMode: "AUTO",
          severity: "SUCCESS",
          duration: `${(idx + 1) * 6}m 00s`,
          distance: `${((associatedFlight.distanceKm / waypoints.length) * (idx + 1)).toFixed(2)} km`,
          waypointCount: waypoints.length,
          completedWaypoints: idx + 1,
          missionResult: `Waypoint ${wp.seq || idx + 1} reached`,
          details: `Target coordinates [${wp.lat}, ${wp.lng}] reached at ${wp.alt || 50}m AGL. Hold: ${wp.holdTime || 0}s.`,
          flightId: associatedFlight.id,
          waypoint: wp,
        })
      })

      // 7. GEOFENCE CHECK Event
      generatedLogs.push({
        id: `LOG-${p.id}-006`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: associatedFlight.operator,
        operatorUsername: associatedFlight.operatorUsername,
        event: "GEOFENCE UPDATED",
        timestamp: new Date(new Date(associatedFlight.startTime).getTime() + 900000).toISOString(),
        status: "Running",
        flightMode: "AUTO",
        severity: "INFO",
        duration: "15m 00s",
        distance: `${(associatedFlight.distanceKm * 0.6).toFixed(2)} km`,
        waypointCount: waypoints.length,
        completedWaypoints: Math.ceil(waypoints.length * 0.6),
        missionResult: "Aircraft containment within boundaries confirmed",
        details: "Continuous polygon containment verify OK. Lateral buffer 48m from boundary.",
        flightId: associatedFlight.id,
        geofence,
      })

      // 8. MISSION COMPLETED Event
      generatedLogs.push({
        id: `LOG-${p.id}-007`,
        missionId: p.id,
        missionName: p.name,
        projectName: p.projectName || p.name,
        droneId: associatedFlight.droneId,
        operator: associatedFlight.operator,
        operatorUsername: associatedFlight.operatorUsername,
        event: "MISSION COMPLETED",
        timestamp: associatedFlight.endTime,
        status: associatedFlight.status === "Aborted" ? "Failed" : "Completed",
        flightMode: "AUTO",
        severity: associatedFlight.status === "Aborted" ? "ERROR" : "SUCCESS",
        duration: associatedFlight.durationFormatted,
        distance: `${associatedFlight.distanceKm} km`,
        waypointCount: waypoints.length,
        completedWaypoints: associatedFlight.waypointsCompleted || waypoints.length,
        missionResult: associatedFlight.status === "Aborted" ? "Mission aborted by failsafe" : "All waypoints successfully mapped",
        details: associatedFlight.status === "Aborted"
          ? "Sortie aborted due to communication telemetry loss. Aircraft landed safely."
          : `Touchdown completed at Home point. Battery expended: ${associatedFlight.batteryUsed}%.`,
        flightId: associatedFlight.id,
        geofence,
        waypoints,
        batteryUsed: `${associatedFlight.batteryUsed}%`,
        startLocation: associatedFlight.startCoords,
        endLocation: associatedFlight.endCoords,
      })
    }
  })

  // Read any client-side user action logs recorded in localStorage
  if (typeof window !== "undefined") {
    try {
      const userLogsRaw = localStorage.getItem(STORAGE_KEY_MISSION_LOGS)
      if (userLogsRaw) {
        const userLogs = JSON.parse(userLogsRaw)
        if (Array.isArray(userLogs)) {
          generatedLogs.push(...userLogs)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Sort descending by timestamp
  return generatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Log Service for Mission, Flight, Telemetry, Command, System, and Incident Logs
 */
export const logService = {
  /**
   * Fetch Mission Logs with filtering and pagination
   */
  getMissionLogs(filters = {}) {
    const allLogs = generateSynthesizedMissionLogs()
    return applyCommonFilters(allLogs, filters)
  },

  /**
   * Summary KPI metrics for Mission Logs
   */
  getMissionSummary() {
    const projects = projectService.getProjects() || []
    const allLogs = generateSynthesizedMissionLogs()

    const completed = projects.filter((p) => {
      const fl = SEEDED_FLIGHT_HISTORY.find((f) => f.missionId === p.id)
      return fl && fl.status === "Completed"
    }).length

    const failed = projects.filter((p) => {
      const fl = SEEDED_FLIGHT_HISTORY.find((f) => f.missionId === p.id)
      return fl && (fl.status === "Aborted" || fl.status === "Failed")
    }).length

    const active = Math.max(0, projects.length - completed - failed)

    return {
      totalMissions: projects.length,
      activeMissions: active,
      completedMissions: completed,
      failedMissions: failed,
      cancelledMissions: 0,
      missionEvents: allLogs.length,
    }
  },

  /**
   * Chronological audit trail for a specific mission
   */
  getMissionTimeline(missionId) {
    if (!missionId) return []
    const allLogs = generateSynthesizedMissionLogs()
    return allLogs
      .filter((l) => l.missionId === missionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },

  /**
   * Fetch Flight Logs (preserving existing entries and adding seeded sorties)
   */
  getFlightLogs(filters = {}) {
    // Existing base flight logs
    const baseLogs = [
      {
        id: "FLIGHT-LOG-20260910-001",
        flightId: "FLIGHT-LOG-20260910-001",
        missionId: "AERO-MSN-0001",
        missionName: "Survey Site A",
        date: "2026-09-10 15:42",
        timestamp: "2026-09-10T15:42:00.000Z",
        callsign: "DRONE-001",
        droneId: "DRONE-001",
        duration: "18m 34s",
        maxAlt: "64.2m",
        dist: "3.42 km",
        batteryDelta: "84% -> 38%",
        size: "4.8 MB",
        status: "Completed",
        category: "FLIGHT",
      },
      {
        id: "FLIGHT-LOG-20260909-003",
        flightId: "FLIGHT-LOG-20260909-003",
        missionId: "AERO-MSN-0001",
        missionName: "Survey Site A",
        date: "2026-09-09 11:20",
        timestamp: "2026-09-09T11:20:00.000Z",
        callsign: "DRONE-001",
        droneId: "DRONE-001",
        duration: "24m 10s",
        maxAlt: "82.0m",
        dist: "5.18 km",
        batteryDelta: "98% -> 22%",
        size: "6.2 MB",
        status: "Completed",
        category: "FLIGHT",
      },
      {
        id: "FLIGHT-LOG-20260908-002",
        flightId: "FLIGHT-LOG-20260908-002",
        missionId: "AERO-MSN-0002",
        missionName: "Perimeter Security Inspection",
        date: "2026-09-08 17:05",
        timestamp: "2026-09-08T17:05:00.000Z",
        callsign: "DRONE-002",
        droneId: "DRONE-002",
        duration: "12m 45s",
        maxAlt: "45.0m",
        dist: "2.10 km",
        batteryDelta: "95% -> 58%",
        size: "3.1 MB",
        status: "Completed",
        category: "FLIGHT",
      },
    ]

    // Convert seeded flight history into full flight log entries
    const seededLogs = SEEDED_FLIGHT_HISTORY.map((f) => ({
      id: f.id,
      flightId: f.id,
      missionId: f.missionId,
      missionName: f.missionName,
      date: formatLogDate(f.startTime) + " " + formatLogTime(f.startTime),
      timestamp: f.startTime,
      callsign: f.droneId,
      droneId: f.droneId,
      duration: f.durationFormatted,
      maxAlt: `${f.maxAltitudeM}m`,
      dist: `${f.distanceKm} km`,
      batteryDelta: `${f.batteryStart}% -> ${f.batteryEnd}%`,
      size: `${(f.durationSeconds * 0.0035).toFixed(1)} MB`,
      status: f.status,
      category: "FLIGHT",
      operator: f.operator,
      flightMode: f.flightMode,
    }))

    const combined = [...baseLogs, ...seededLogs]
    return applyCommonFilters(combined, filters)
  },

  /**
   * Fetch Telemetry Logs
   */
  getTelemetryLogs(filters = {}) {
    const telemLogs = [
      {
        id: "TEL-20260918-001",
        timestamp: "2026-09-18T10:35:00.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        event: "GNSS_FIX_ACQUIRED",
        category: "TELEMETRY",
        severity: "SUCCESS",
        details: "3D RTK Differential fix acquired (18 satellites). HDOP 0.6.",
        status: "Healthy",
      },
      {
        id: "TEL-20260918-002",
        timestamp: "2026-09-18T10:25:00.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        event: "STREAM_RATE_SAMPLE",
        category: "TELEMETRY",
        severity: "INFO",
        details: "MAVLink payload delivery rate nominal at 20.4 Hz. Packet loss 0.08%.",
        status: "Healthy",
      },
      {
        id: "TEL-20260917-003",
        timestamp: "2026-09-17T14:40:00.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        event: "LINK_LATENCY_PEAK",
        category: "TELEMETRY",
        severity: "WARNING",
        details: "Telemetry link round-trip ping spike to 54ms during perimeter waypoint turn.",
        status: "Warning",
      },
      {
        id: "TEL-20260916-004",
        timestamp: "2026-09-16T09:15:00.000Z",
        droneId: "DRONE-002",
        missionId: "AERO-MSN-0002",
        event: "BATTERY_CELL_CHECK",
        category: "TELEMETRY",
        severity: "INFO",
        details: "6S LiPo cell delta 0.012V. Internal resistance 1.8 mOhm nominal.",
        status: "Healthy",
      },
    ]
    return applyCommonFilters(telemLogs, filters)
  },

  /**
   * Fetch Command Logs
   */
  getCommandLogs(filters = {}) {
    const cmdLogs = [
      {
        id: "CMD-20260918-101",
        timestamp: "2026-09-18T10:14:02.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        operator: "Alex Vance",
        event: "COMMAND_ARM_MOTORS",
        category: "COMMAND",
        severity: "INFO",
        flightMode: "GUIDED",
        details: "MAV_CMD_COMPONENT_ARM_DISARM (Param1=1, Force=0). Prearm checks passed.",
        status: "Executed",
      },
      {
        id: "CMD-20260918-102",
        timestamp: "2026-09-18T10:14:15.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        operator: "Alex Vance",
        event: "COMMAND_TAKEOFF",
        category: "COMMAND",
        severity: "INFO",
        flightMode: "GUIDED",
        details: "MAV_CMD_NAV_TAKEOFF (Altitude=30m, Pitch=0.0). Takeoff initiated.",
        status: "Executed",
      },
      {
        id: "CMD-20260918-103",
        timestamp: "2026-09-18T10:16:30.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        operator: "Alex Vance",
        event: "COMMAND_SET_MODE",
        category: "COMMAND",
        severity: "INFO",
        flightMode: "AUTO",
        details: "SET_MODE to AUTO. Autonomous flight sequence engaged.",
        status: "Executed",
      },
      {
        id: "CMD-20260917-104",
        timestamp: "2026-09-17T14:44:00.000Z",
        droneId: "DRONE-001",
        missionId: "AERO-MSN-0001",
        operator: "Sarah Chen",
        event: "COMMAND_TRIGGER_RTL",
        category: "COMMAND",
        severity: "WARNING",
        flightMode: "RTL",
        details: "MAV_CMD_NAV_RETURN_TO_LAUNCH executed following low-battery warning.",
        status: "Executed",
      },
    ]
    return applyCommonFilters(cmdLogs, filters)
  },

  /**
   * Fetch System Logs
   */
  getSystemLogs(filters = {}) {
    const sysLogs = [
      {
        id: "SYS-20260921-001",
        timestamp: "2026-09-21T10:00:00.000Z",
        event: "GCS_SUBSYSTEM_BOOT",
        category: "SYSTEM",
        severity: "INFO",
        operator: "System Daemon",
        details: "AeroNexus GCS core runtime initialized. IndexedDB cache validated.",
        status: "Success",
      },
      {
        id: "SYS-20260921-002",
        timestamp: "2026-09-21T10:00:05.000Z",
        event: "WEBSOCKET_CONNECTED",
        category: "SYSTEM",
        severity: "SUCCESS",
        operator: "System Daemon",
        details: "WebSocket telemetry channel established to wss://droneiq.onrender.com/ws/telemetry.",
        status: "Active",
      },
      {
        id: "SYS-20260921-003",
        timestamp: "2026-09-21T10:02:15.000Z",
        event: "AUTH_SESSION_VERIFIED",
        category: "SYSTEM",
        severity: "INFO",
        operator: "Alex Vance",
        details: "JWT session authenticated for user 'superadmin' with role 'SUPER_ADMIN'.",
        status: "Authorized",
      },
      {
        id: "SYS-20260921-004",
        timestamp: "2026-09-21T10:15:30.000Z",
        event: "PROJECT_CACHE_SYNC",
        category: "SYSTEM",
        severity: "INFO",
        operator: "System Daemon",
        details: "Synchronized local survey projects storage with active mission schemas.",
        status: "Success",
      },
    ]
    return applyCommonFilters(sysLogs, filters)
  },

  /**
   * Fetch Incident Logs
   */
  getIncidentLogs(filters = {}) {
    const incLogs = SEEDED_INCIDENTS.map((inc) => ({
      id: inc.id,
      timestamp: inc.timestamp,
      droneId: inc.droneId,
      flightId: inc.flightId,
      missionId: "AERO-MSN-0001",
      event: `INCIDENT_${inc.type.toUpperCase().replace(/\s+/g, "_")}`,
      category: "INCIDENT",
      severity: inc.severity === "Critical" ? "CRITICAL" : "WARNING",
      status: inc.status,
      details: `${inc.description} Action taken: ${inc.actionTaken}`,
      actionTaken: inc.actionTaken,
    }))
    return applyCommonFilters(incLogs, filters)
  },

  /**
   * Fetch Unified All Logs Stream
   */
  getAllLogs(filters = {}) {
    const missionLogs = this.getMissionLogs(filters).map((l) => ({ ...l, category: "MISSION" }))
    const flightLogs = this.getFlightLogs(filters).map((l) => ({ ...l, category: "FLIGHT" }))
    const telemLogs = this.getTelemetryLogs(filters).map((l) => ({ ...l, category: "TELEMETRY" }))
    const cmdLogs = this.getCommandLogs(filters).map((l) => ({ ...l, category: "COMMAND" }))
    const sysLogs = this.getSystemLogs(filters).map((l) => ({ ...l, category: "SYSTEM" }))
    const incLogs = this.getIncidentLogs(filters).map((l) => ({ ...l, category: "INCIDENT" }))

    const combined = [...missionLogs, ...flightLogs, ...telemLogs, ...cmdLogs, ...sysLogs, ...incLogs]
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  /**
   * Appends a user-initiated mission event into localStorage
   */
  recordMissionEvent(entry) {
    if (typeof window === "undefined" || !entry) return
    try {
      const existing = localStorage.getItem(STORAGE_KEY_MISSION_LOGS)
      const list = existing ? JSON.parse(existing) : []
      const newEntry = {
        id: `LOG-USER-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: "Running",
        severity: "INFO",
        flightMode: "GUIDED",
        ...entry,
      }
      list.unshift(newEntry)
      localStorage.setItem(STORAGE_KEY_MISSION_LOGS, JSON.stringify(list.slice(0, 500)))
      return newEntry
    } catch (err) {
      console.error("[logService] Failed recording mission event:", err)
    }
  },

  /**
   * Export logs in CSV or JSON format
   */
  exportLogs(format = "csv", category = "mission", dataset = []) {
    if (typeof window === "undefined" || !Array.isArray(dataset) || dataset.length === 0) return

    let blob, ext
    const filename = `aeronexus_${category}_logs_${new Date().toISOString().slice(0, 10)}`

    if (format === "json") {
      blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" })
      ext = "json"
    } else {
      // CSV format
      const headers = Object.keys(dataset[0]).filter((k) => typeof dataset[0][k] !== "object")
      const rows = dataset.map((item) =>
        headers
          .map((h) => {
            const v = item[h] ?? ""
            return `"${String(v).replace(/"/g, '""')}"`
          })
          .join(",")
      )
      const csv = [headers.join(","), ...rows].join("\n")
      blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      ext = "csv"
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}

export default logService
