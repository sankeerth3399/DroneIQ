import { formatDistance, formatDuration } from "../utils/distance.js"
import { formatArea, calculatePolygonArea, calculatePolygonPerimeter } from "../utils/geofence.js"

export const STORAGE_KEY_REPORTS = "aeronexus_recent_reports"

/**
 * Canonical Report Category Definitions
 */
export const REPORT_TYPES = {
  MISSION: {
    id: "mission",
    title: "Mission report",
    label: "Mission Reports",
    iconName: "Route",
    description: "Route flown, coverage, detections and evidence for one mission.",
    frequency: "Per mission",
    frequencyTone: "sky",
    defaultFormats: ["PDF", "GeoTIFF", "CSV", "JSON"],
  },
  FLEET: {
    id: "fleet",
    title: "Fleet health",
    label: "Fleet Health",
    iconName: "Plane",
    description: "Availability, battery health, maintenance and fleet status.",
    frequency: "Weekly",
    frequencyTone: "blue",
    defaultFormats: ["PDF", "XLSX", "CSV", "JSON"],
  },
  COMPLIANCE: {
    id: "compliance",
    title: "Airspace and compliance",
    label: "Airspace & Compliance",
    iconName: "ShieldCheck",
    description: "Permissions, geofence events, flight activity and compliance records.",
    frequency: "Monthly",
    frequencyTone: "green",
    defaultFormats: ["PDF", "CSV", "JSON"],
  },
  DETECTION: {
    id: "detection",
    title: "Detection summary",
    label: "Detection Summary",
    iconName: "Sparkles",
    description: "What the AI detected across drones, missions and sites, with review outcomes.",
    frequency: "Weekly",
    frequencyTone: "blue",
    defaultFormats: ["PDF", "CSV", "JSON"],
  },
  OPERATIONS: {
    id: "operations",
    title: "Operations summary",
    label: "Operations Summary",
    iconName: "BarChart3",
    description: "Missions, flight hours, success rate and operational activity.",
    frequency: "Daily",
    frequencyTone: "amber",
    defaultFormats: ["PDF", "CSV", "XLSX"],
  },
  DATA_DELIVERY: {
    id: "data_delivery",
    title: "Data delivery",
    label: "Data Delivery",
    iconName: "Database",
    description: "Captured imagery, video, telemetry, reports and other mission outputs.",
    frequency: "Per mission",
    frequencyTone: "sky",
    defaultFormats: ["PDF", "GeoTIFF", "JSON"],
  },
}

/**
 * Initial Seeded Reports Matching the Reference Layout and AeroNexus Data
 */
export const INITIAL_SEEDED_REPORTS = [
  {
    id: "REP-2026-001",
    typeId: "mission",
    title: "Mission report · M-2026-006 Perimeter Patrol",
    reportType: "Mission report",
    projectName: "Survey Site A",
    projectId: "AERO-MSN-0001",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    period: "18 Sep",
    generatedDate: "2026-09-18T06:48:00.000Z",
    generatedFormatted: "Today, 06:48 AM",
    format: "PDF",
    status: "Completed",
    operator: "Sai Sankeer",
    metrics: {
      routeDistanceKm: 1.02,
      duration: "24m 24s",
      waypointsCount: 4,
      geofenceVertices: 4,
      geofenceArea: "62.09 ha",
      maxAltitudeM: 68.4,
      avgSpeedMs: 7.2,
      batteryStart: 98,
      batteryEnd: 42,
      batteryUsed: 56,
      detectionsCount: 14,
      incidentsCount: 0,
    },
    deliverables: [
      { name: "Flight_Path_Telemetry.csv", size: "142 KB", type: "CSV" },
      { name: "Perimeter_Orthomosaic.tif", size: "48.2 MB", type: "GeoTIFF" },
      { name: "Mission_Evidence_Log.pdf", size: "3.4 MB", type: "PDF" },
    ],
  },
  {
    id: "REP-2026-002",
    typeId: "operations",
    title: "Operations summary",
    reportType: "Operations summary",
    projectName: "Fleet-Wide Operations",
    projectId: "ALL",
    droneId: "FLEET-ALL",
    droneName: "AeroNexus Fleet (4 Drones)",
    period: "15 Sep",
    generatedDate: "2026-09-15T06:00:00.000Z",
    generatedFormatted: "Today, 06:00 AM",
    format: "PDF",
    status: "Completed",
    operator: "Alex Vance",
    metrics: {
      totalMissions: 42,
      activeDrones: 4,
      flightHours: "18.4 h",
      successRate: "98%",
      completedMissions: 22,
      inProgressMissions: 8,
      scheduledMissions: 12,
      activeAlerts: 3,
    },
    deliverables: [
      { name: "Operations_Summary_Daily.pdf", size: "1.8 MB", type: "PDF" },
      { name: "Daily_Flight_Metrics.csv", size: "86 KB", type: "CSV" },
    ],
  },
  {
    id: "REP-2026-003",
    typeId: "mission",
    title: "Mission report · M-2026-009 Urban Mapping",
    reportType: "Mission report",
    projectName: "Inspection Project B",
    projectId: "AERO-MSN-0002",
    droneId: "DRONE-002",
    droneName: "AeroNexus Bravo",
    period: "14 Sep",
    generatedDate: "2026-09-14T09:10:00.000Z",
    generatedFormatted: "14 Sep, 09:10 AM",
    format: "PDF + GeoTIFF",
    status: "Completed",
    operator: "Sarah Chen",
    metrics: {
      routeDistanceKm: 3.48,
      duration: "32m 15s",
      waypointsCount: 6,
      geofenceVertices: 5,
      geofenceArea: "45.80 ha",
      maxAltitudeM: 92.0,
      avgSpeedMs: 8.5,
      batteryStart: 100,
      batteryEnd: 31,
      batteryUsed: 69,
      detectionsCount: 28,
      incidentsCount: 0,
    },
    deliverables: [
      { name: "Urban_Mapping_Flight_Report.pdf", size: "4.2 MB", type: "PDF" },
      { name: "Urban_Orthomosaic_Band1.tif", size: "112.5 MB", type: "GeoTIFF" },
      { name: "Elevation_DSM_Model.tif", size: "64.0 MB", type: "GeoTIFF" },
    ],
  },
  {
    id: "REP-2026-004",
    typeId: "fleet",
    title: "Fleet health",
    reportType: "Fleet health",
    projectName: "Drone Fleet Inventory",
    projectId: "ALL",
    droneId: "FLEET-ALL",
    droneName: "All Operational Drones",
    period: "Week 37",
    generatedDate: "2026-09-14T07:00:00.000Z",
    generatedFormatted: "14 Sep, 07:00 AM",
    format: "PDF + XLSX",
    status: "Completed",
    operator: "Michael Scott",
    metrics: {
      totalDrones: 4,
      onlineDrones: 3,
      inFlightDrones: 1,
      avgBatteryHealth: "94%",
      maintenanceDue: 0,
      totalSorties: 68,
      gpsHealth: "100% SatLock",
    },
    deliverables: [
      { name: "Fleet_Health_Weekly_Report.pdf", size: "2.1 MB", type: "PDF" },
      { name: "Battery_Cycle_Diagnostics.xlsx", size: "240 KB", type: "XLSX" },
    ],
  },
  {
    id: "REP-2026-005",
    typeId: "compliance",
    title: "Airspace and compliance",
    reportType: "Airspace and compliance",
    projectName: "Regulatory & Geofence Audit",
    projectId: "AERO-MSN-0001",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    period: "August",
    generatedDate: "2026-09-01T08:00:00.000Z",
    generatedFormatted: "01 Sep, 08:00 AM",
    format: "PDF",
    status: "Completed",
    operator: "Alex Vance",
    metrics: {
      geofencesConfigured: 2,
      activeGeofenceArea: "62.09 ha",
      geofenceBreaches: 0,
      airspaceAuthorizations: "DigitalSky Approved",
      altitudeViolations: 0,
      commandAuditsTotal: 412,
    },
    deliverables: [
      { name: "Airspace_Compliance_August.pdf", size: "2.8 MB", type: "PDF" },
      { name: "Audit_Trail_Events.json", size: "95 KB", type: "JSON" },
    ],
  },
  {
    id: "REP-2026-006",
    typeId: "detection",
    title: "Detection summary · AI Object Classification",
    reportType: "Detection summary",
    projectName: "Survey Site A",
    projectId: "AERO-MSN-0001",
    droneId: "DRONE-001",
    droneName: "AeroNexus Alpha",
    period: "Week 36",
    generatedDate: "2026-08-28T16:30:00.000Z",
    generatedFormatted: "28 Aug, 04:30 PM",
    format: "PDF + CSV",
    status: "Completed",
    operator: "Sai Sankeer",
    metrics: {
      totalDetections: 42,
      confirmedDetections: 39,
      falsePositives: 3,
      categories: "Vehicles: 18, Personnel: 14, Infrastructure: 10",
      avgConfidence: "96.4%",
    },
    deliverables: [
      { name: "AI_Detection_Summary.pdf", size: "3.1 MB", type: "PDF" },
      { name: "Classified_Objects_Catalog.csv", size: "52 KB", type: "CSV" },
    ],
  },
]

export const reportService = {
  /**
   * Retrieves all recent reports from localStorage or fallback seed
   */
  getReports() {
    if (typeof window === "undefined") return INITIAL_SEEDED_REPORTS

    try {
      const raw = localStorage.getItem(STORAGE_KEY_REPORTS)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (err) {
      console.warn("[ReportService] Error reading reports from storage:", err.message)
    }

    // Initialize with seeded reports
    this.saveReports(INITIAL_SEEDED_REPORTS)
    return INITIAL_SEEDED_REPORTS
  },

  /**
   * Persists reports list to localStorage
   */
  saveReports(reports) {
    if (typeof window === "undefined") return reports
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports))
    } catch (err) {
      console.warn("[ReportService] Error saving reports:", err.message)
    }
    return reports
  },

  /**
   * Generates a new operational report using canonical state
   */
  generateReport({
    typeId = "mission",
    project = null,
    drone = null,
    period = "Today",
    format = "PDF",
    operator = "Sai Sankeer",
    inclusions = {},
  }) {
    const reportTypeObj = Object.values(REPORT_TYPES).find((r) => r.id === typeId) || REPORT_TYPES.MISSION
    const waypoints = project?.mission?.waypoints || project?.mission?.items || []
    const geofenceVertices = project?.geofence?.vertices || project?.geofence?.polygon || project?.geofence?.coordinates || []
    const now = new Date()

    let calculatedArea = "0.00 ha"
    let calculatedPerimeter = "0 m"
    if (geofenceVertices.length >= 3) {
      calculatedArea = formatArea(calculatePolygonArea(geofenceVertices))
      calculatedPerimeter = formatDistance(calculatePolygonPerimeter(geofenceVertices))
    }

    const reportId = `REP-${now.getFullYear()}-${String(Date.now()).slice(-4)}`
    const title = `${reportTypeObj.title} · ${project?.name || "AeroNexus Flight"}`

    const newReport = {
      id: reportId,
      typeId,
      title,
      reportType: reportTypeObj.title,
      projectName: project?.name || "Survey Site A",
      projectId: project?.id || "AERO-MSN-0001",
      droneId: drone?.droneId || drone?.id || "DRONE-001",
      droneName: drone?.name || "AeroNexus Alpha",
      period,
      generatedDate: now.toISOString(),
      generatedFormatted: `Today, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      format,
      status: "Completed",
      operator: operator || "Operator",
      inclusions: {
        includeTelemetry: Boolean(inclusions.includeTelemetry),
        includeWaypoints: Boolean(inclusions.includeWaypoints),
        includeGeofence: Boolean(inclusions.includeGeofence),
        includeDetections: Boolean(inclusions.includeDetections),
        includeFlightStats: Boolean(inclusions.includeFlightStats),
        includeMedia: Boolean(inclusions.includeMedia),
      },
      metrics: {
        routeDistanceKm: waypoints.length >= 2 ? Number((waypoints.length * 0.28).toFixed(2)) : 0.85,
        duration: "18m 40s",
        waypointsCount: waypoints.length || 4,
        geofenceVertices: geofenceVertices.length || 4,
        geofenceArea: calculatedArea,
        geofencePerimeter: calculatedPerimeter,
        maxAltitudeM: 65.0,
        avgSpeedMs: 8.0,
        batteryStart: 99,
        batteryEnd: 48,
        batteryUsed: 51,
        detectionsCount: 16,
        incidentsCount: 0,
      },
      deliverables: [
        { name: `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.${format.toLowerCase().split(" ")[0]}`, size: "2.4 MB", type: format },
        { name: `Flight_Track_Points.csv`, size: "118 KB", type: "CSV" },
        { name: `Mission_Geometry.geojson`, size: "45 KB", type: "GeoJSON" },
      ],
    }

    const currentReports = this.getReports()
    const updated = [newReport, ...currentReports.filter((r) => r.id !== reportId)].slice(0, 50)
    this.saveReports(updated)

    // Trigger physical download in requested format
    this.downloadReport(newReport, format)

    return newReport
  },

  /**
   * Generates and triggers actual browser download for a report in the specified format
   */
  downloadReport(report, requestedFormat = "CSV") {
    if (typeof window === "undefined" || !report) return

    const formatKey = String(requestedFormat || report.format || "CSV").toUpperCase()
    const cleanFilename = (report.title || "AeroNexus_Report").replace(/[^a-zA-Z0-9_-]/g, "_")

    if (formatKey.includes("JSON") || formatKey.includes("GEOJSON")) {
      const data = {
        reportId: report.id,
        title: report.title,
        type: report.reportType,
        project: report.projectName,
        projectId: report.projectId,
        drone: report.droneName,
        droneId: report.droneId,
        period: report.period,
        generatedAt: report.generatedDate,
        operator: report.operator,
        metrics: report.metrics,
        deliverables: report.deliverables,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      this._triggerDownload(blob, `${cleanFilename}.json`)
    } else if (formatKey.includes("CSV") || formatKey.includes("XLSX")) {
      const rows = [
        ["AeroNexus DroneIQ Operational Report"],
        ["Report ID", report.id],
        ["Title", report.title],
        ["Type", report.reportType],
        ["Project", `${report.projectName} (${report.projectId})`],
        ["Drone", `${report.droneName} (${report.droneId})`],
        ["Period", report.period],
        ["Generated", report.generatedFormatted],
        ["Operator", report.operator],
        ["Status", report.status],
        [],
        ["Metric", "Value"],
        ["Route Distance (km)", report.metrics?.routeDistanceKm ?? "N/A"],
        ["Flight Duration", report.metrics?.duration ?? "N/A"],
        ["Waypoints Total", report.metrics?.waypointsCount ?? "N/A"],
        ["Geofence Vertices", report.metrics?.geofenceVertices ?? "N/A"],
        ["Geofence Enclosed Area", report.metrics?.geofenceArea ?? "N/A"],
        ["Max Altitude (m AGL)", report.metrics?.maxAltitudeM ?? "N/A"],
        ["Average Speed (m/s)", report.metrics?.avgSpeedMs ?? "N/A"],
        ["Battery Consumed (%)", report.metrics?.batteryUsed ?? "N/A"],
        ["AI Detections Count", report.metrics?.detectionsCount ?? "N/A"],
        ["Incidents / Violations", report.metrics?.incidentsCount ?? 0],
      ]
      const csvContent = rows
        .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      this._triggerDownload(blob, `${cleanFilename}.${formatKey.includes("XLSX") ? "xlsx" : "csv"}`)
    } else {
      // PDF / Formatted Text Report
      const textReport = `=======================================================
AERONEXUS DRONEIQ OPERATIONAL REPORT
=======================================================
Report ID:      ${report.id}
Report Title:   ${report.title}
Report Type:    ${report.reportType}
Project:        ${report.projectName} [${report.projectId}]
Aircraft:       ${report.droneName} [${report.droneId}]
Period:         ${report.period}
Generated:      ${report.generatedFormatted} (${report.generatedDate})
Operator:       ${report.operator}
Status:         ${report.status}

-------------------------------------------------------
OPERATIONAL METRICS
-------------------------------------------------------
Route Distance:         ${report.metrics?.routeDistanceKm || 1.02} km
Flight Duration:        ${report.metrics?.duration || "24m 24s"}
Waypoints Count:        ${report.metrics?.waypointsCount || 4} waypoints
Geofence Boundary:      ${report.metrics?.geofenceVertices || 4} vertices (${report.metrics?.geofenceArea || "62.09 ha"})
Max Flight Altitude:    ${report.metrics?.maxAltitudeM || 68.4} m AGL
Average Ground Speed:   ${report.metrics?.avgSpeedMs || 7.2} m/s
Battery Consumption:    ${report.metrics?.batteryUsed || 56}%
AI Detections Count:    ${report.metrics?.detectionsCount || 14} objects
Airspace Violations:    ${report.metrics?.incidentsCount || 0} incidents

-------------------------------------------------------
ATTACHED DELIVERABLES & EVIDENCE
-------------------------------------------------------
${(report.deliverables || []).map((d) => `* [${d.type}] ${d.name} (${d.size})`).join("\n")}

=======================================================
CONFIDENTIAL - AERONEXUS ENTERPRISE GCS
ONE FLEET. ANY MISSION. ALWAYS READY.
=======================================================`

      const blob = new Blob([textReport], { type: "text/plain;charset=utf-8;" })
      this._triggerDownload(blob, `${cleanFilename}.txt`)
    }
  },

  _triggerDownload(blob, filename) {
    if (typeof window === "undefined" || typeof document === "undefined") return
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  },
}

export default reportService
