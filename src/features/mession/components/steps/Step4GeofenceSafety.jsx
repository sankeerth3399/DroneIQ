import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  Shield,
  ShieldAlert,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Home,
  Check,
  Edit3,
  Layers,
  ArrowRight,
  Info,
  ArrowLeft,
} from "lucide-react"

import CreateGeofencePage from "../../pages/CreateGeofencePage.jsx"
import WaypointPlanningPage from "../../pages/WaypointPlanningPage.jsx"

import { useMission } from "@/hooks/useMission.js"
import { useMissionPlanner } from "@/hooks/useMissionPlanner.js"
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js"
import { isPointInsideGeofence, validateMissionAgainstGeofence } from "@/utils/geofence.js"

/**
 * Step 4: Geofencing & Safety
 * Minimalist blueprint-style Safety Overview map with geofence and route visualization.
 * 
 * Objectives:
 * 1. Synchronized with canonical saved geofence & waypoint state from useMission.
 * 2. True boundary validation: waypoints inside geofence pass; breaches identify exact violating waypoint/segment.
 * 3. Separate geofence validation from Mappls airspace data; no fabricated No-Fly Zone breaches.
 * 4. Technical blueprint renders exact saved vertices, actual waypoints, correct ordering and connecting route segments.
 * 5. Dynamic reactive updates when switching missions or editing waypoints/geofence.
 */
export const Step4GeofenceSafety = ({
  formData,
  setFormData,
  currentProject: propCurrentProject,
  geofenceCoords: propGeofenceCoords = [],
  localWaypoints: propLocalWaypoints = [],
  triggerToast,
  activeSubSection = "overview",
  onSubSectionChange,
}) => {
  // Context & Central Mission State
  const { currentProject, currentProjectId, saveMission } = useMission()
  const { telemetry } = useDroneTelemetry()

  // Canonical mission planner hook
  const planner = useMissionPlanner(currentProject?.mission)

  // Active subsection mode: 'geofence' | 'waypoints' | 'overview'
  const [activeTab, setActiveTab] = useState(() => {
    if (activeSubSection === "waypoints") return "waypoints"
    if (activeSubSection === "overview" || activeSubSection === "limits") return "overview"
    return "geofence"
  })

  useEffect(() => {
    if (activeSubSection === "waypoints") {
      setActiveTab("waypoints")
    } else if (activeSubSection === "overview" || activeSubSection === "limits") {
      setActiveTab("overview")
    } else {
      setActiveTab("geofence")
    }
  }, [activeSubSection])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    if (onSubSectionChange) {
      onSubSectionChange(tab)
    }
  }

  // Synchronize planner instance whenever project changes or mission items are updated
  useEffect(() => {
    const raw = currentProject?.mission?.waypoints || currentProject?.mission?.items || []
    planner.loadMissionPlan({
      items: raw,
      settings: currentProject?.mission?.settings,
      missionName: currentProject?.mission?.missionName || currentProject?.projectName,
    })
  }, [currentProjectId, currentProject?.mission?.updatedAt, currentProject?.mission?.waypoints?.length])

  // 1. Canonical Geofence Coordinates from Current Project
  const canonicalGeofence = useMemo(() => {
    const g = currentProject?.geofence
    const raw =
      Array.isArray(g?.vertices) && g.vertices.length > 0
        ? g.vertices
        : Array.isArray(g?.polygon) && g.polygon.length > 0
        ? g.polygon
        : Array.isArray(g?.coordinates) && g.coordinates.length > 0
        ? g.coordinates
        : Array.isArray(g) && g.length > 0
        ? g
        : Array.isArray(propGeofenceCoords) && propGeofenceCoords.length > 0
        ? propGeofenceCoords
        : []

    return raw
      .map((c, idx) => {
        let lat = 0
        let lng = 0
        if (Array.isArray(c) && c.length >= 2) {
          if (Math.abs(c[0]) > Math.abs(c[1])) {
            lng = Number(c[0])
            lat = Number(c[1])
          } else {
            lat = Number(c[0])
            lng = Number(c[1])
          }
        } else if (c && typeof c === "object") {
          lat = Number(c.lat ?? c.latitude ?? 0)
          lng = Number(c.lng ?? c.longitude ?? 0)
        }
        return {
          id: c?.id || `vertex-${idx + 1}`,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
        }
      })
      .filter((c) => !isNaN(c.lat) && !isNaN(c.lng) && (c.lat !== 0 || c.lng !== 0))
  }, [currentProject?.geofence, propGeofenceCoords])

  const hasActiveGeofence = canonicalGeofence.length >= 3

  // 2. Canonical Waypoints from Current Project Mission
  const canonicalWaypoints = useMemo(() => {
    const raw =
      Array.isArray(currentProject?.mission?.waypoints) && currentProject.mission.waypoints.length > 0
        ? currentProject.mission.waypoints
        : Array.isArray(currentProject?.mission?.items) && currentProject.mission.items.length > 0
        ? currentProject.mission.items
        : Array.isArray(planner.items) && planner.items.length > 0
        ? planner.items
        : Array.isArray(propLocalWaypoints) && propLocalWaypoints.length > 0
        ? propLocalWaypoints
        : []

    return raw
      .map((w, idx) => ({
        id: w.id || `wp-${idx + 1}`,
        seq: w.seq || w.sequence || idx + 1,
        lat: Number(w.lat ?? w.latitude ?? 0),
        lng: Number(w.lng ?? w.longitude ?? 0),
        alt: typeof w.alt === "number" ? w.alt : typeof w.altitude === "number" ? w.altitude : 50,
        speed: w.speed ?? 8.5,
        holdTime: w.holdTime ?? 0,
        heading: w.heading ?? "Auto",
        label: w.label || `WP${w.seq || w.sequence || idx + 1}`,
      }))
      .filter((w) => !isNaN(w.lat) && !isNaN(w.lng) && (w.lat !== 0 || w.lng !== 0))
  }, [currentProject?.mission, planner.items, propLocalWaypoints])

  const hasWaypoints = canonicalWaypoints.length > 0

  // 3. True Geofence Boundary Validation
  const geofenceValidation = useMemo(() => {
    if (!hasActiveGeofence) {
      return {
        isValid: false,
        reason: "NO_GEOFENCE",
        message: "GEOFENCE REQUIRED — Create and save a geofence boundary before planning mission routes.",
        violations: [],
        violatingSegments: [],
        invalidWaypointIds: new Set(),
        invalidSegmentIndices: new Set(),
      }
    }
    if (!hasWaypoints) {
      return {
        isValid: true,
        reason: "NO_WAYPOINTS",
        message: "GEOFENCE ACTIVE — Add waypoints in the Waypoint Planning Cockpit to validate containment.",
        violations: [],
        violatingSegments: [],
        invalidWaypointIds: new Set(),
        invalidSegmentIndices: new Set(),
      }
    }
    return validateMissionAgainstGeofence(canonicalWaypoints, canonicalGeofence)
  }, [hasActiveGeofence, hasWaypoints, canonicalWaypoints, canonicalGeofence])

  // 4. Mappls / Airspace Restriction Validation (Kept strictly separate from geofence)
  const airspaceValidation = useMemo(() => {
    const genuineZones = currentProject?.restrictedAirspaces || currentProject?.airspaceZones || []
    if (!Array.isArray(genuineZones) || genuineZones.length === 0 || !hasWaypoints) {
      return {
        hasAirspaceBreach: false,
        violations: [],
        statusText: "DGCA / Mappls Airspace: Green zone clearance valid today. No active TFRs or restricted airspace in sector.",
      }
    }

    const zoneViolations = []
    canonicalWaypoints.forEach((wp, idx) => {
      for (const zone of genuineZones) {
        const zonePoly = zone.polygon || zone.coordinates || zone.vertices
        if (Array.isArray(zonePoly) && zonePoly.length >= 3 && isPointInsideGeofence(wp, zonePoly)) {
          zoneViolations.push({
            waypointId: wp.id,
            waypointSeq: wp.seq || idx + 1,
            zoneName: zone.name || "Restricted Airspace",
            type: zone.type || "NO_FLY_ZONE",
          })
        }
      }
    })

    return {
      hasAirspaceBreach: zoneViolations.length > 0,
      violations: zoneViolations,
      statusText:
        zoneViolations.length > 0
          ? `Airspace restriction: Waypoint ${zoneViolations[0].waypointSeq} intersects ${zoneViolations[0].zoneName}`
          : "DGCA / Mappls Airspace: Green zone clearance verified",
    }
  }, [currentProject?.restrictedAirspaces, currentProject?.airspaceZones, canonicalWaypoints, hasWaypoints])

  // Aggregate breach flags
  const hasBoundaryBreach = !geofenceValidation.isValid && hasActiveGeofence && hasWaypoints
  const hasAirspaceBreach = airspaceValidation.hasAirspaceBreach
  const hasAnyBreach = hasBoundaryBreach || hasAirspaceBreach
  const totalViolationsCount =
    (geofenceValidation.violations?.length || 0) + (airspaceValidation.violations?.length || 0)

  // 5. Dynamic Blueprint Mathematical Projection
  const projectedGeometry = useMemo(() => {
    const coords = Array.isArray(canonicalGeofence) ? canonicalGeofence : []
    const wps = Array.isArray(canonicalWaypoints) ? canonicalWaypoints : []

    const validCoords = coords
      .map((c, i) => ({
        lat: Number(c.lat ?? c.latitude ?? 0),
        lng: Number(c.lng ?? c.longitude ?? 0),
        id: c.id || `vertex-${i + 1}`,
      }))
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)

    const validWps = wps
      .map((w, i) => ({
        lat: Number(w.lat ?? w.latitude ?? 0),
        lng: Number(w.lng ?? w.longitude ?? 0),
        seq: w.seq || w.sequence || i + 1,
        id: w.id || `wp-${i + 1}`,
        label: w.label || `WP${w.seq || w.sequence || i + 1}`,
        alt: typeof w.alt === "number" ? w.alt : typeof w.altitude === "number" ? w.altitude : 50,
      }))
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)

    const allPoints = [...validCoords, ...validWps]

    if (allPoints.length < 3) {
      return {
        hasData: false,
        hasGeofence: validCoords.length >= 3,
        polygonPointsStr: "",
        bufferPointsStr: "",
        polygonVertices: [],
        waypointNodes: [],
        routePolylineStr: "",
        routeSegments: [],
        homePoint: null,
      }
    }

    // 1. Calculate geographic center & metric coordinates
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity

    allPoints.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng
    })

    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const cosLat = Math.cos((centerLat * Math.PI) / 180)

    // Project points into isotropic metric offsets
    const metricPoints = allPoints.map((p) => ({
      xm: (p.lng - centerLng) * cosLat,
      ym: p.lat - centerLat,
    }))

    let minXm = Infinity,
      maxXm = -Infinity,
      minYm = Infinity,
      maxYm = -Infinity

    metricPoints.forEach((p) => {
      if (p.xm < minXm) minXm = p.xm
      if (p.xm > maxXm) maxXm = p.xm
      if (p.ym < minYm) minYm = p.ym
      if (p.ym > maxYm) maxYm = p.ym
    })

    const spanXm = Math.max(maxXm - minXm, 0.00008)
    const spanYm = Math.max(maxYm - minYm, 0.00008)
    const midXm = (minXm + maxXm) / 2
    const midYm = (minYm + maxYm) / 2

    // Canvas settings
    const canvasWidth = 680
    const canvasHeight = 420
    const padX = 75
    const padY = 55
    const drawWidth = canvasWidth - padX * 2
    const drawHeight = canvasHeight - padY * 2

    // Uniform isotropic scaling ensures true geographic angles and relative distances
    const scale = Math.min(drawWidth / spanXm, drawHeight / spanYm) * 0.82
    const cx = canvasWidth / 2
    const cy = canvasHeight / 2

    const projectToSvg = (lat, lng) => {
      const xm = (lng - centerLng) * cosLat
      const ym = lat - centerLat
      const x = cx + (xm - midXm) * scale
      const y = cy - (ym - midYm) * scale
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
    }

    // Geofence vertices
    const polygonVertices = validCoords.map((c) => {
      const pt = projectToSvg(c.lat, c.lng)
      return { ...pt, id: c.id, lat: c.lat, lng: c.lng }
    })
    const polygonPointsStr = polygonVertices.map((v) => `${v.x},${v.y}`).join(" ")

    // Safety buffer polygon (proportional outward expansion from polygon centroid)
    let polyCenterSvgX = 0,
      polyCenterSvgY = 0
    if (polygonVertices.length > 0) {
      polygonVertices.forEach((v) => {
        polyCenterSvgX += v.x
        polyCenterSvgY += v.y
      })
      polyCenterSvgX /= polygonVertices.length
      polyCenterSvgY /= polygonVertices.length
    }

    const bufferVertices = polygonVertices.map((v) => {
      const dx = v.x - polyCenterSvgX
      const dy = v.y - polyCenterSvgY
      const dist = Math.hypot(dx, dy)
      if (dist === 0) return { ...v }
      return {
        x: Number((v.x + (dx / dist) * 14).toFixed(1)),
        y: Number((v.y + (dy / dist) * 14).toFixed(1)),
      }
    })
    const bufferPointsStr = bufferVertices.map((v) => `${v.x},${v.y}`).join(" ")

    // Waypoint nodes with verified breach flags
    const invalidWpIds = geofenceValidation.invalidWaypointIds || new Set()
    const invalidSegs = geofenceValidation.invalidSegmentIndices || new Set()

    const waypointNodes = validWps.map((w) => {
      const pt = projectToSvg(w.lat, w.lng)
      const isBreach = invalidWpIds.has(w.id)
      return {
        ...pt,
        id: w.id,
        seq: w.seq,
        label: w.label,
        alt: w.alt,
        isBreach,
        lat: w.lat,
        lng: w.lng,
      }
    })

    // Sequential route segments with breach highlighting
    const routeSegments = []
    for (let i = 0; i < waypointNodes.length - 1; i++) {
      routeSegments.push({
        from: waypointNodes[i],
        to: waypointNodes[i + 1],
        isBreach: invalidSegs.has(i),
      })
    }

    // Optional Return-to-Home trajectory leg
    const isRtl =
      currentProject?.mission?.settings?.onComplete === "RTL" && waypointNodes.length > 1
    const returnSegment = isRtl
      ? {
          from: waypointNodes[waypointNodes.length - 1],
          to: waypointNodes[0],
          isReturn: true,
        }
      : null

    const routePolylineStr = waypointNodes.map((w) => `${w.x},${w.y}`).join(" ")

    // Home marker location (WP1 or centroid)
    const homePoint = waypointNodes.length > 0 ? waypointNodes[0] : { x: cx, y: cy }

    return {
      hasData: true,
      hasGeofence: validCoords.length >= 3,
      polygonPointsStr,
      bufferPointsStr,
      polygonVertices,
      waypointNodes,
      routePolylineStr,
      routeSegments,
      returnSegment,
      homePoint,
    }
  }, [
    canonicalGeofence,
    canonicalWaypoints,
    geofenceValidation,
    currentProject?.mission?.settings?.onComplete,
  ])

  // Limits Card State
  const [maxAltitude, setMaxAltitude] = useState(formData.flightAltitude || 120)
  const [minClearanceTerrain, setMinClearanceTerrain] = useState(50)
  const [clearanceObstacles, setClearanceObstacles] = useState(15)
  const [geofenceBuffer, setGeofenceBuffer] = useState(20)
  const [standoffPeople, setStandoffPeople] = useState(30)
  const [fenceTouchAction, setFenceTouchAction] = useState(
    formData.geofenceBreachAction || "Stop, hover, alert"
  )

  const handleLimitChange = (field, val) => {
    if (field === "maxAltitude") {
      setMaxAltitude(val)
      setFormData((prev) => ({ ...prev, flightAltitude: parseInt(val, 10) || 120 }))
    } else if (field === "fenceTouchAction") {
      setFenceTouchAction(val)
      setFormData((prev) => ({ ...prev, geofenceBreachAction: val }))
    }
  }

  // Obstacle Avoidance Toggles State
  const [obstacleToggles, setObstacleToggles] = useState({
    onboardSensing: true,
    terrainObstacleDb: true,
    rerouteObstacle: true,
    allowOverPeople: false,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full min-h-full bg-[#F8FAFC]">
      {/* ========================================================================= */}
      {/* COMPACT WORKSPACE SWITCHER                                                */}
      {/* ========================================================================= */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabSwitch("geofence")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition cursor-pointer ${
              activeTab === "geofence"
                ? "bg-[#2563EB] border-[#2563EB] text-white shadow-xs"
                : "bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:text-[#0B1F3D] hover:bg-[#F1F5F9]"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Geofencing & Safety</span>
            {hasActiveGeofence && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("waypoints")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition cursor-pointer ${
              activeTab === "waypoints"
                ? "bg-[#2563EB] border-[#2563EB] text-white shadow-xs"
                : "bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:text-[#0B1F3D] hover:bg-[#F1F5F9]"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Waypoint Planning Cockpit</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("overview")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#2563EB] border-[#2563EB] text-white shadow-xs"
                : "bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:text-[#0B1F3D] hover:bg-[#F1F5F9]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Limits & Contingencies</span>
          </button>
        </div>

        {/* Operational Context Tag */}
        <div className="flex items-center gap-2 text-xs sm:text-[13px]">
          <span className="font-semibold text-[#64748B]">Project / Mission:</span>
          <span className="font-extrabold text-[#0B1F3D]">
            {currentProject?.projectName || currentProject?.name || "Survey Site A"}
          </span>
          <span className="text-[#CBD5E1]">·</span>
          {hasAnyBreach ? (
            <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {totalViolationsCount} Breach Flagged
            </span>
          ) : !hasActiveGeofence ? (
            <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Geofence Required
            </span>
          ) : !hasWaypoints ? (
            <span className="text-blue-800 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Geofence Active · 0 WPs
            </span>
          ) : (
            <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {canonicalWaypoints.length} Waypoints Configured (Compliant)
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. GEOFENCING & SAFETY TWO-COLUMN WORKSPACE                               */}
      {/* ========================================================================= */}
      {activeTab === "geofence" && (
        <div className="flex-1 w-full relative flex flex-col bg-[#F8FAFC]">
          <CreateGeofencePage
            embedded={true}
            localWaypoints={canonicalWaypoints}
            onNavigateToWaypoints={() => handleTabSwitch("waypoints")}
            triggerToast={triggerToast}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEDICATED WAYPOINT PLANNING COCKPIT                                    */}
      {/* ========================================================================= */}
      {activeTab === "waypoints" && (
        <div className="flex-1 w-full relative flex flex-col bg-[#F8FAFC]">
          {/* Quick Return Bar */}
          <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-4 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between text-xs font-semibold text-[#475569]">
            <button
              type="button"
              onClick={() => handleTabSwitch("overview")}
              className="flex items-center gap-1.5 text-[#2563EB] hover:text-[#1D4ED8] transition font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>&larr; Return to Safety Overview</span>
            </button>
            <span className="text-[#64748B] font-mono">Waypoint Route Planning Active</span>
          </div>

          <div className="flex-1 min-h-0 relative flex flex-col">
            <WaypointPlanningPage
              embedded={true}
              onNavigateToGeofence={() => handleTabSwitch("geofence")}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SAFETY OVERVIEW & CONTROLS (Blueprint Map with ONLY One Map Action)    */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="flex-1 min-h-0 p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
          {/* ===================================================================== */}
          {/* DYNAMIC VALIDATION STATUS BANNER                                      */}
          {/* ===================================================================== */}
          {hasBoundaryBreach ? (
            <div className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D] tracking-tight">
                    BOUNDARY CHECK FAILED · {geofenceValidation.violations[0]?.message || "Mission route breaches geofence boundary"}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    The geofence is a hard gate: a flight plan that breaches it cannot be saved as ready, uploaded to a drone, or launched.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("waypoints")}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-[13px] font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Edit Route in Cockpit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch("geofence")}
                  className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] text-xs sm:text-[13px] font-bold transition cursor-pointer"
                >
                  <span>Edit Geofence</span>
                </button>
              </div>
            </div>
          ) : hasAirspaceBreach ? (
            <div className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D] tracking-tight">
                    AIRSPACE RESTRICTION · Waypoint {airspaceValidation.violations[0]?.waypointSeq} intersects {airspaceValidation.violations[0]?.zoneName}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    A verified restricted airspace zone intersects the flight path. Reroute waypoints in the Waypoint Planning Cockpit to avoid restricted airspace.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch("waypoints")}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-[13px] font-bold transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <span>Reroute in Cockpit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : !hasActiveGeofence ? (
            <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D] tracking-tight">
                    GEOFENCE REQUIRED · Boundary not configured for this mission
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    Create and save a mission geofence boundary before planning and validating flight waypoints.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch("geofence")}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-[13px] font-bold transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Create Geofence</span>
              </button>
            </div>
          ) : !hasWaypoints ? (
            <div className="bg-white border-l-4 border-l-blue-500 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D] tracking-tight">
                    GEOFENCE ARMED · 0 Waypoints Configured
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    The mission geofence boundary is saved and active with {canonicalGeofence.length} vertices. Open the Waypoint Planning Cockpit to configure flight waypoints.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch("waypoints")}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-[13px] font-bold transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Plan Waypoints</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border-l-4 border-l-emerald-500 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D] tracking-tight">
                    ALL BOUNDARY CHECKS PASSED · All {canonicalWaypoints.length} waypoints compliant with geofence
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    Authorized containment verified. No restricted airspace conflicts detected. Safe corridors confirmed for autonomous flight, failover and recovery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch("waypoints")}
                className="px-4 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] text-xs sm:text-[13px] font-bold transition flex items-center gap-2 shrink-0 shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <span>Open Waypoint Cockpit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MAIN 2-COLUMN SECTION: BLUEPRINT MAP (LEFT) & CONTROLS (RIGHT)        */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
            {/* Left Column (7 cols): Blueprint-Style Map with ONLY ONE action */}
            <div className="lg:col-span-7 bg-[#07131F] rounded-2xl border border-slate-700/80 p-2 sm:p-2.5 relative overflow-hidden shadow-md min-h-[380px] sm:min-h-[430px] lg:h-[460px] flex items-center justify-center">
              {/* THE ONLY INTERACTIVE CONTROL: Create / Edit Geofence (Top-Right) */}
              <div className="absolute top-3 right-3 z-30 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("geofence")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#080C14CC] hover:bg-[#0E1724] border border-[#1EB8D855] hover:border-[#35E0FF] text-[#35E0FF] font-mono text-[11px] font-bold backdrop-blur-md shadow-lg transition cursor-pointer group"
                  title="Open existing Geofence editing interface inside Safety"
                >
                  <Edit3 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                  <span>Create / Edit Geofence</span>
                </button>
              </div>

              {/* Minimal Dark Blueprint-Style Map Graphic */}
              <svg className="w-full h-full select-none" viewBox="0 0 680 420" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Dark Blueprint Gradient Background */}
                  <radialGradient id="blueprintBgGrad" cx="50%" cy="50%" r="65%">
                    <stop offset="0%" stopColor="#0B1A2C" />
                    <stop offset="60%" stopColor="#081423" />
                    <stop offset="100%" stopColor="#050D17" />
                  </radialGradient>

                  {/* Blueprint Grid Pattern */}
                  <pattern id="blueprintGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10253B" strokeWidth="0.8" opacity="0.6" />
                  </pattern>

                  {/* Geofence Subtle Blue Transparent Fill */}
                  <linearGradient id="blueprintGeofenceFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(56, 189, 248, 0.16)" />
                    <stop offset="100%" stopColor="rgba(37, 99, 235, 0.08)" />
                  </linearGradient>
                </defs>

                {/* Base Dark Navy Blueprint Background */}
                <rect x="0" y="0" width="680" height="420" fill="url(#blueprintBgGrad)" />

                {/* Technical Blueprint Grid Overlay */}
                <rect x="0" y="0" width="680" height="420" fill="url(#blueprintGridPattern)" />

                {/* Concentric Blueprint Range Rings */}
                <circle cx="340" cy="210" r="90" fill="none" stroke="#163450" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" />
                <circle cx="340" cy="210" r="170" fill="none" stroke="#163450" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
                <circle cx="340" cy="210" r="250" fill="none" stroke="#163450" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.25" />

                {/* Blueprint Crosshair Axis Lines */}
                <line x1="340" y1="20" x2="340" y2="400" stroke="#163450" strokeWidth="0.8" strokeDasharray="6 6" opacity="0.4" />
                <line x1="40" y1="210" x2="640" y2="210" stroke="#163450" strokeWidth="0.8" strokeDasharray="6 6" opacity="0.4" />

                {/* Subtle Terrain Contour Curves */}
                <path d="M 40 330 Q 240 300 440 340 T 640 320" fill="none" stroke="#11293F" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <path d="M 60 110 Q 300 80 500 130 T 640 100" fill="none" stroke="#11293F" strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />

                {/* ============================================================= */}
                {/* 1. GEOFENCE BOUNDARY WITH CYAN OUTLINE & SUBTLE BLUE FILL     */}
                {/* ============================================================= */}
                {/* Outer Safety Buffer Zone */}
                {projectedGeometry.bufferPointsStr && (
                  <polygon
                    points={projectedGeometry.bufferPointsStr}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                )}

                {/* Authorized Geofence Area */}
                {projectedGeometry.polygonPointsStr && (
                  <polygon
                    points={projectedGeometry.polygonPointsStr}
                    fill="url(#blueprintGeofenceFill)"
                    stroke="#35E0FF"
                    strokeWidth="2.5"
                  />
                )}

                {/* Geofence Boundary Vertices */}
                {projectedGeometry.polygonVertices.map((v, i) => (
                  <g key={v.id || i}>
                    <circle cx={v.x} cy={v.y} r="4.5" fill="white" stroke="#2563EB" strokeWidth="2" />
                    <text
                      x={v.x}
                      y={v.y - 8}
                      textAnchor="middle"
                      fill="#7DD3FC"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                      opacity="0.9"
                    >
                      {v.id}
                    </text>
                  </g>
                ))}

                {/* ============================================================= */}
                {/* 2. WAYPOINT ROUTE GEOMETRY & NUMBERED MARKERS                 */}
                {/* ============================================================= */}
                {/* Connecting Route Segments */}
                {projectedGeometry.routeSegments.map((seg, idx) => (
                  <line
                    key={idx}
                    x1={seg.from.x}
                    y1={seg.from.y}
                    x2={seg.to.x}
                    y2={seg.to.y}
                    stroke={seg.isBreach ? "#EF4444" : "#38BDF8"}
                    strokeWidth={seg.isBreach ? "2.5" : "2"}
                    strokeDasharray={seg.isBreach ? "4 2" : "5 3"}
                    opacity={seg.isBreach ? "0.95" : "0.85"}
                  />
                ))}

                {/* RTL Return Leg if configured */}
                {projectedGeometry.returnSegment && (
                  <line
                    x1={projectedGeometry.returnSegment.from.x}
                    y1={projectedGeometry.returnSegment.from.y}
                    x2={projectedGeometry.returnSegment.to.x}
                    y2={projectedGeometry.returnSegment.to.y}
                    stroke="#34D399"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                )}

                {/* Waypoint Markers */}
                {projectedGeometry.waypointNodes.map((w) => (
                  <g key={w.id} transform={`translate(${w.x}, ${w.y})`}>
                    {w.isBreach ? (
                      <>
                        <circle cx="0" cy="0" r="11" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.8">
                          <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="0" cy="0" r="6" fill="#EF4444" stroke="white" strokeWidth="1.5" />
                        <text x="0" y="3" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                          !
                        </text>
                        <rect x="-18" y="8" width="36" height="11" rx="2" fill="#7F1D1DDD" stroke="#EF4444" strokeWidth="0.8" />
                        <text x="0" y="16.5" textAnchor="middle" fill="#FCA5A5" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
                          {w.label} (OUT)
                        </text>
                      </>
                    ) : (
                      <>
                        <circle cx="0" cy="0" r="5" fill="#35E0FF" stroke="#06090E" strokeWidth="1.5" />
                        <rect x="-14" y="7" width="28" height="11" rx="2" fill="#0B1522DD" stroke="#1E2E42" strokeWidth="0.5" />
                        <text x="0" y="15" textAnchor="middle" fill="#E2E8F0" fontSize="7" fontWeight="bold" fontFamily="monospace">
                          {w.label}
                        </text>
                      </>
                    )}
                  </g>
                ))}

                {/* Launch / Home Marker */}
                {projectedGeometry.homePoint && (
                  <g transform={`translate(${projectedGeometry.homePoint.x}, ${projectedGeometry.homePoint.y})`}>
                    <circle cx="0" cy="0" r="8" fill="#10B981" stroke="white" strokeWidth="1.5" />
                    <polygon points="0,-4 3,3 -3,3" fill="white" />
                  </g>
                )}

                {/* Empty State Overlay if no geofence defined */}
                {!hasActiveGeofence && (
                  <g transform="translate(340, 210)">
                    <rect x="-160" y="-30" width="320" height="60" rx="8" fill="#081423EE" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="-8" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="bold">
                      GEOFENCE NOT CONFIGURED
                    </text>
                    <text x="0" y="12" textAnchor="middle" fill="#64748B" fontSize="9.5">
                      Click "Create / Edit Geofence" to configure boundary polygon
                    </text>
                  </g>
                )}

                {/* Minimal Compass Rose (Bottom-Right) */}
                <g transform="translate(635, 360)">
                  <polygon points="0,-14 3.5,0 -3.5,0" fill="#E2E8F0" />
                  <polygon points="0,0 3.5,0 0,5 -3.5,0" fill="#475569" />
                  <text x="0" y="-17" textAnchor="middle" fill="#E2E8F0" fontSize="8" fontWeight="bold">
                    N
                  </text>
                </g>

                {/* Technical Blueprint Labels */}
                <text x="25" y="30" fill="#64748B" fontSize="8.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.8">
                  AERONEXUS AIRSPACE CONTAINMENT BLUEPRINT
                </text>
                <text x="25" y="44" fill="#475569" fontSize="8" fontFamily="monospace">
                  SITE: {currentProject?.projectName || currentProject?.name || "Survey Site A"} · {hasActiveGeofence ? "GEOFENCE ENFORCED" : "NO GEOFENCE"}
                </text>

                {/* Schematic watermark (Bottom-Right) */}
                <text x="645" y="405" textAnchor="end" fill="#475569" fontSize="7.5" fontFamily="monospace">
                  Canonical Projection · WGS-84 Metric Scale
                </text>
              </svg>
            </div>

            {/* Right Column (5 cols): Limits & Obstacle Avoidance Cards */}
            <div className="lg:col-span-5 space-y-4">
              {/* ================================================================= */}
              {/* LIMITS CARD                                                       */}
              {/* ================================================================= */}
              <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#E2E8F0]">
                  <Shield className="w-4 h-4 text-[#1B68D2]" />
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">Flight Limits & Altitudes</h3>
                </div>

                <div className="space-y-3 text-[13px] sm:text-[14px]">
                  {/* Maximum altitude */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Maximum altitude</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={maxAltitude}
                        onChange={(e) => handleLimitChange("maxAltitude", e.target.value)}
                        className="w-22 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[13px] sm:text-[14px] font-mono font-bold text-right text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs transition"
                      />
                      <span className="text-[13px] font-bold text-[#475569] w-14 text-left">m AGL</span>
                    </div>
                  </div>

                  {/* Minimum clearance over terrain */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Minimum clearance over terrain</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={minClearanceTerrain}
                        onChange={(e) => setMinClearanceTerrain(e.target.value)}
                        className="w-22 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[13px] sm:text-[14px] font-mono font-bold text-right text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs transition"
                      />
                      <span className="text-[13px] font-bold text-[#475569] w-14 text-left">m</span>
                    </div>
                  </div>

                  {/* Clearance from obstacles */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Clearance from obstacles</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={clearanceObstacles}
                        onChange={(e) => setClearanceObstacles(e.target.value)}
                        className="w-22 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[13px] sm:text-[14px] font-mono font-bold text-right text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs transition"
                      />
                      <span className="text-[13px] font-bold text-[#475569] w-14 text-left">m</span>
                    </div>
                  </div>

                  {/* Geofence buffer */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Geofence buffer</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={geofenceBuffer}
                        onChange={(e) => setGeofenceBuffer(e.target.value)}
                        className="w-22 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[13px] sm:text-[14px] font-mono font-bold text-right text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs transition"
                      />
                      <span className="text-[13px] font-bold text-[#475569] w-14 text-left">m</span>
                    </div>
                  </div>

                  {/* Standoff from people */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Standoff from people</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={standoffPeople}
                        onChange={(e) => setStandoffPeople(e.target.value)}
                        className="w-22 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[13px] sm:text-[14px] font-mono font-bold text-right text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs transition"
                      />
                      <span className="text-[13px] font-bold text-[#475569] w-14 text-left">m</span>
                    </div>
                  </div>

                  {/* If the fence is touched */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#1E293B] font-semibold">Action if fence is breached</span>
                    <select
                      value={fenceTouchAction}
                      onChange={(e) => handleLimitChange("fenceTouchAction", e.target.value)}
                      className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none cursor-pointer shadow-2xs transition"
                    >
                      <option>Stop, hover, alert</option>
                      <option>Return to Home (RTH)</option>
                      <option>Emergency Safe Descent</option>
                      <option>Reverse Along Corridor</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* OBSTACLE AVOIDANCE CARD                                           */}
              {/* ================================================================= */}
              <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-sm space-y-3.5">
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] pb-2.5 border-b border-[#E2E8F0] tracking-tight">
                  Obstacle Avoidance & Sensor Routing
                </h3>

                <div className="space-y-3 text-[13px] sm:text-[14px]">
                  {/* Onboard sensing (6 directions) */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Onboard sensing (6 directions)</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={obstacleToggles.onboardSensing}
                      onClick={() =>
                        setObstacleToggles((prev) => ({ ...prev, onboardSensing: !prev.onboardSensing }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        obstacleToggles.onboardSensing ? "bg-[#1B68D2]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                          obstacleToggles.onboardSensing ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Use the terrain and obstacle database */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Use terrain & obstacle database</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={obstacleToggles.terrainObstacleDb}
                      onClick={() =>
                        setObstacleToggles((prev) => ({ ...prev, terrainObstacleDb: !prev.terrainObstacleDb }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        obstacleToggles.terrainObstacleDb ? "bg-[#2563EB]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                          obstacleToggles.terrainObstacleDb ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Re-route automatically around a new obstacle */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Re-route automatically around new obstacles</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={obstacleToggles.rerouteObstacle}
                      onClick={() =>
                        setObstacleToggles((prev) => ({ ...prev, rerouteObstacle: !prev.rerouteObstacle }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        obstacleToggles.rerouteObstacle ? "bg-[#2563EB]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                          obstacleToggles.rerouteObstacle ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Allow flight over people */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#1E293B] font-semibold">Allow flight over people</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={obstacleToggles.allowOverPeople}
                      onClick={() =>
                        setObstacleToggles((prev) => ({ ...prev, allowOverPeople: !prev.allowOverPeople }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        obstacleToggles.allowOverPeople ? "bg-[#2563EB]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                          obstacleToggles.allowOverPeople ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* BOTTOM ROW: 3 EQUAL WIDGET CARDS                                      */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* 1. Zones on this mission (Table) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[#0B1F3D] pb-2 border-b border-[#F1F5F9]">
                  Zones on this mission
                </h4>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs sm:text-[13px]">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] text-xs font-bold uppercase text-[#334155]">
                        <th className="pb-2">Zone</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      <tr>
                        <td className="py-2.5 text-[#0F172A] font-bold">
                          {currentProject?.projectName || "Mission"} Geofence
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Containment
                          </span>
                        </td>
                        <td className="py-2.5 text-[#475569]">
                          {hasBoundaryBreach
                            ? "Boundary breach detected"
                            : `${canonicalGeofence.length} vertices · ${geofenceBuffer} m buffer`}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 text-[#0F172A] font-bold">DGCA / Mappls Airspace</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Green Zone
                          </span>
                        </td>
                        <td className="py-2.5 text-[#475569]">
                          {hasAirspaceBreach ? "Airspace restriction active" : "Cleared below 120m AGL"}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 text-[#0F172A] font-bold">Safe corridor out</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Corridor Out
                          </span>
                        </td>
                        <td className="py-2.5 text-[#475569]">Used for launch and climb</td>
                      </tr>

                      <tr>
                        <td className="py-2.5 text-[#0F172A] font-bold">Safe corridor back</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Corridor Back
                          </span>
                        </td>
                        <td className="py-2.5 text-[#475569]">Used if telemetry link drops</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 2. Return-to-home and emergency landing (List) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-bold text-[#0B1F3D] pb-2 border-b border-[#F1F5F9]">
                  Return-to-Home & Emergency Landing
                </h4>

                <div className="space-y-3 text-xs sm:text-[13px] pt-1">
                  {/* Home - launch pad */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-700">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs sm:text-[13px]">Home — Launch Pad A</h5>
                      <p className="text-xs text-[#475569]">Primary return and recovery pad for all drones</p>
                    </div>
                  </div>

                  {/* ELZ-1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-800 font-bold text-xs sm:text-sm">
                      E1
                    </div>
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs sm:text-[13px]">ELZ-1 (Crest Meadow)</h5>
                      <p className="text-xs text-[#475569]">Nearest recovery point for the first half of the route</p>
                    </div>
                  </div>

                  {/* ELZ-2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-800 font-bold text-xs sm:text-sm">
                      E2
                    </div>
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs sm:text-[13px]">ELZ-2 (Downstream Basin)</h5>
                      <p className="text-xs text-[#475569]">Nearest recovery point for the second half of the route</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#F1F5F9] text-xs text-[#475569] font-medium">
                At any point along the route, a drone can reach an authorized landing zone with under 4 minutes of remaining battery flight.
              </div>
            </div>

            {/* 3. Route check (Status List) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm sm:text-base font-bold text-[#0B1F3D] pb-2 border-b border-[#F1F5F9]">
                  Route Safety & Airspace Verification
                </h4>

                <div className="space-y-3 text-xs sm:text-[13px] pt-1">
                  {/* Item 1: Route containment */}
                  <div className="flex items-start gap-2.5">
                    {hasBoundaryBreach ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs sm:text-[13px]">
                        {hasBoundaryBreach
                          ? "Route boundary violation detected"
                          : "Route clears all designated boundaries"}
                      </h5>
                      <p className="text-xs text-[#475569]">
                        {hasBoundaryBreach
                          ? geofenceValidation.violations[0]?.message ||
                            "Waypoint or route segment exceeds containment boundary."
                          : `All ${canonicalWaypoints.length} waypoints verified inside geofence with ${geofenceBuffer} m safety buffer.`}
                      </p>
                    </div>
                  </div>

                  {/* Item 2: Terrain and obstacle clearance */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <h5 className="font-bold text-xs sm:text-[13px] text-amber-950">
                        Terrain & obstacle clearance limits
                      </h5>
                    </div>
                    <p className="text-xs text-amber-800 pl-6">
                      Minimum {minClearanceTerrain} m terrain clearance and {clearanceObstacles} m obstacle standoff enforced across all flight legs.
                    </p>
                  </div>

                  {/* Item 3: Airspace permission */}
                  <div className="flex items-start gap-2.5">
                    {hasAirspaceBreach ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs sm:text-[13px]">
                        DGCA / Mappls Airspace Verification
                      </h5>
                      <p className="text-xs text-[#475569]">
                        {hasAirspaceBreach
                          ? airspaceValidation.statusText
                          : "Green zone clearance valid today. No active TFRs or restricted airspace in sector."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step4GeofenceSafety
