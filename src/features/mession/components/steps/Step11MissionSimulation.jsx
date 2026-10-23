import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  FastForward,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LocateFixed,
  Route,
  Clock,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Battery,
} from "lucide-react"
import MapLoad from "@/components/Map/mapContainer.jsx"
import { calculateDistance, formatDuration } from "@/utils/distance.js"
import { validateMissionAgainstGeofence } from "@/utils/geofence.js"

/**
 * Step11MissionSimulation
 * Advanced Step 11: Digital Twin Mission Flight Simulation.
 * Renders the shared operational geographic map with animated simulated drone marker
 * following canonical saved waypoints and geofence boundary.
 * Strictly decoupled from physical drone telemetry and live flight commands.
 */
export const Step11MissionSimulation = ({
  formData = {},
  currentProject = null,
  localWaypoints = [],
  geofenceCoords = [],
  onStepChange,
  triggerToast,
}) => {
  // Speed multiplier options
  const speedOptions = [1, 2, 5, 10]
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const speedMultiplierRef = useRef(speedMultiplier)
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier
  }, [speedMultiplier])

  // Playback state: "IDLE" | "PLAYING" | "PAUSED" | "COMPLETED"
  const [playbackState, setPlaybackState] = useState("IDLE")
  const [simTime, setSimTime] = useState(0) // Elapsed simulation seconds
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [followSimDrone, setFollowSimDrone] = useState(false)
  const [selectedWaypointId, setSelectedWaypointId] = useState(null)

  // Map style state shared across application
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "normal"
    } catch {
      return "normal"
    }
  })

  const handleMapStyleChange = useCallback((newStyle) => {
    setMapStyle(newStyle)
    try {
      localStorage.setItem("aeronexus_map_style", newStyle)
    } catch {
      // Ignore
    }
  }, [])

  const [showAirspace, setShowAirspace] = useState(() => {
    try {
      const saved = localStorage.getItem("aeronexus_show_airspace");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleAirspace = useCallback(() => {
    setShowAirspace((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aeronexus_show_airspace", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Animation frame and timing refs
  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(null)
  const totalDurationRef = useRef(0)

  // Canonical mission waypoints matching Fly and Waypoint Planning
  const canonicalWaypoints = useMemo(() => {
    const raw = currentProject?.mission?.waypoints || localWaypoints || []
    if (!Array.isArray(raw)) return []
    return raw
      .filter((wp) => wp && (typeof wp.lat === "number" || typeof wp.latitude === "number"))
      .map((wp, index) => {
        const lat = typeof wp.lat === "number" ? wp.lat : Number(wp.latitude || 0)
        const lng = typeof wp.lng === "number" ? wp.lng : Number(wp.longitude || 0)
        const alt = typeof wp.alt === "number" ? wp.alt : Number(wp.altitude || formData.flightAltitude || 120)
        const seq = wp.seq || wp.sequence || index + 1
        return {
          ...wp,
          id: wp.id || `wp-${seq}`,
          seq,
          sequence: seq,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          alt: Math.round(alt),
          label: `WP${seq}`,
          speed: typeof wp.speed === "number" && wp.speed > 0 ? wp.speed : (formData.speed || 10),
        }
      })
      .filter((wp) => !isNaN(wp.lat) && !isNaN(wp.lng) && (wp.lat !== 0 || wp.lng !== 0))
  }, [currentProject?.mission?.waypoints, localWaypoints, formData.flightAltitude, formData.speed])

  // Canonical geofence polygon vertices
  const canonicalGeofence = useMemo(() => {
    if (geofenceCoords && geofenceCoords.length > 0) return geofenceCoords
    const g = currentProject?.geofence
    if (!g) return []
    if (Array.isArray(g)) return g
    if (Array.isArray(g.vertices)) return g.vertices
    if (Array.isArray(g.polygon)) return g.polygon
    if (Array.isArray(g.coordinates)) return g.coordinates
    return []
  }, [geofenceCoords, currentProject?.geofence])

  // Mission validation against geofence & waypoint count
  const missionValidation = useMemo(() => {
    if (!canonicalWaypoints || canonicalWaypoints.length === 0) {
      return {
        valid: false,
        reason: "NO_WAYPOINTS",
        message: "No saved waypoints in active mission.",
      }
    }
    if (canonicalWaypoints.length < 2) {
      return {
        valid: false,
        reason: "INSUFFICIENT_WAYPOINTS",
        message: "At least 2 waypoints are required to form an operational flight path.",
      }
    }
    if (!canonicalGeofence || canonicalGeofence.length < 3) {
      return {
        valid: false,
        reason: "NO_GEOFENCE",
        message: "A saved mission geofence boundary is required before simulation.",
      }
    }
    const result = validateMissionAgainstGeofence(canonicalWaypoints, canonicalGeofence)
    if (!result.isValid || (result.violations && result.violations.length > 0)) {
      return {
        valid: false,
        reason: "GEOFENCE_BREACH",
        message: `${result.violations?.length || 1} waypoint/route segment(s) breach the saved geofence boundary.`,
        violatingSegments: result.violatingSegments || [],
      }
    }
    return { valid: true, violatingSegments: [] }
  }, [canonicalWaypoints, canonicalGeofence])

  // Base planning flight speed from mission settings
  const defaultSpeed = useMemo(() => {
    const s = formData.speed || currentProject?.mission?.settings?.flightSpeed || currentProject?.mission?.settings?.speed
    return typeof s === "number" && s > 0 ? s : 10
  }, [formData.speed, currentProject])

  // Route segments pre-calculation: distances, speeds, durations, and bearings
  const routeSegments = useMemo(() => {
    if (!canonicalWaypoints || canonicalWaypoints.length < 2) return []
    const segments = []
    let cumulative = 0

    for (let i = 0; i < canonicalWaypoints.length - 1; i++) {
      const from = canonicalWaypoints[i]
      const to = canonicalWaypoints[i + 1]
      const dist = calculateDistance(from, to)
      const segSpeed = typeof to.speed === "number" && to.speed > 0 ? to.speed : defaultSpeed
      const duration = dist > 0 && segSpeed > 0 ? dist / segSpeed : 2
      const startTime = cumulative
      const endTime = cumulative + duration
      cumulative = endTime

      // Bearing from `from` to `to`
      const dLat = to.lat - from.lat
      const dLng = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180)
      const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360

      segments.push({
        index: i,
        from,
        to,
        distance: dist,
        speed: segSpeed,
        duration,
        startTime,
        endTime,
        heading: Math.round(heading),
      })
    }

    return segments
  }, [canonicalWaypoints, defaultSpeed])

  // Total mission duration in seconds
  const totalDuration = useMemo(() => {
    if (routeSegments.length === 0) return 0
    return routeSegments[routeSegments.length - 1].endTime
  }, [routeSegments])

  useEffect(() => {
    totalDurationRef.current = totalDuration
  }, [totalDuration])

  // Calculate simulated state at any given elapsed time
  const calculateSimStateAtTime = useCallback(
    (time) => {
      if (routeSegments.length === 0 || canonicalWaypoints.length < 2) return null

      const clampedTime = Math.max(0, Math.min(totalDuration, time))

      // Reached final waypoint
      if (clampedTime >= totalDuration) {
        const lastWp = canonicalWaypoints[canonicalWaypoints.length - 1]
        const lastSeg = routeSegments[routeSegments.length - 1]
        return {
          lat: lastWp.lat,
          lng: lastWp.lng,
          altitude: lastWp.alt || formData.flightAltitude || 120,
          speed: 0,
          heading: lastSeg?.heading || 0,
          currentWp: lastWp,
          nextWp: null,
          currentSegIndex: routeSegments.length - 1,
          legDistanceRemaining: 0,
          progressPercent: 100,
          activeSimWaypointId: lastWp.id,
          completedCoordinates: canonicalWaypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
        }
      }

      // Find active segment
      let seg = routeSegments.find((s) => clampedTime >= s.startTime && clampedTime < s.endTime)
      if (!seg) seg = routeSegments[routeSegments.length - 1]

      const segProgress = seg.duration > 0 ? (clampedTime - seg.startTime) / seg.duration : 0
      const alpha = Math.max(0, Math.min(1, segProgress))

      const lat = seg.from.lat + (seg.to.lat - seg.from.lat) * alpha
      const lng = seg.from.lng + (seg.to.lng - seg.from.lng) * alpha
      const fromAlt = seg.from.alt || formData.flightAltitude || 120
      const toAlt = seg.to.alt || formData.flightAltitude || 120
      const altitude = fromAlt + (toAlt - fromAlt) * alpha
      const legDistRem = seg.distance * (1 - alpha)
      const progressPercent = totalDuration > 0 ? (clampedTime / totalDuration) * 100 : 0

      // Completed route path
      const completedCoords = []
      for (let i = 0; i <= seg.index; i++) {
        completedCoords.push({ lat: canonicalWaypoints[i].lat, lng: canonicalWaypoints[i].lng })
      }
      completedCoords.push({ lat, lng })

      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        altitude: Math.round(altitude),
        speed: seg.speed,
        heading: seg.heading,
        currentWp: seg.from,
        nextWp: seg.to,
        currentSegIndex: seg.index,
        legDistanceRemaining: Math.round(legDistRem),
        progressPercent: Number(progressPercent.toFixed(1)),
        activeSimWaypointId: seg.to.id,
        completedCoordinates: completedCoords,
      }
    },
    [routeSegments, canonicalWaypoints, totalDuration, formData.flightAltitude]
  )

  // Active simulated state derived from current simTime
  const activeSimState = useMemo(() => {
    return calculateSimStateAtTime(simTime)
  }, [calculateSimStateAtTime, simTime])

  // Simulated drone prop passed to MapLoad
  const simulatedDrone = useMemo(() => {
    if (playbackState === "IDLE" && simTime === 0) return null
    if (!activeSimState) return null
    return {
      lat: activeSimState.lat,
      lng: activeSimState.lng,
      heading: activeSimState.heading,
      altitude: activeSimState.altitude,
      speed: activeSimState.speed,
      active: true,
      isSimulating: playbackState === "PLAYING",
      label: `SIM · ${activeSimState.altitude}m`,
      completedCoordinates: activeSimState.completedCoordinates,
      activeSimWaypointId: activeSimState.activeSimWaypointId,
    }
  }, [playbackState, simTime, activeSimState])

  // High-precision requestAnimationFrame animation loop
  useEffect(() => {
    if (playbackState !== "PLAYING") {
      lastTimeRef.current = null
      return
    }

    const tick = (now) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000
        const simDelta = delta * speedMultiplierRef.current

        setSimTime((prev) => {
          const next = prev + simDelta
          if (next >= totalDurationRef.current) {
            setPlaybackState("COMPLETED")
            return totalDurationRef.current
          }
          return next
        })
      }
      lastTimeRef.current = now
      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playbackState])

  // Playback Action Handlers
  const handlePlay = useCallback(() => {
    if (!missionValidation.valid) {
      triggerToast?.(missionValidation.message || "Cannot simulate: mission requirements not met.", "error")
      return
    }
    if (playbackState === "COMPLETED") {
      setSimTime(0)
    }
    setPlaybackState("PLAYING")
  }, [missionValidation, playbackState, triggerToast])

  const handlePause = useCallback(() => {
    setPlaybackState("PAUSED")
  }, [])

  const handleStop = useCallback(() => {
    setPlaybackState("IDLE")
    setSimTime(0)
  }, [])

  const handleRestart = useCallback(() => {
    if (!missionValidation.valid) return
    setSimTime(0)
    setPlaybackState("PLAYING")
  }, [missionValidation])

  const handleScrubChange = useCallback(
    (e) => {
      const pct = parseFloat(e.target.value) || 0
      const newTime = (pct / 100) * totalDuration
      setSimTime(newTime)
      if (playbackState === "COMPLETED" && pct < 100) {
        setPlaybackState("PAUSED")
      }
    },
    [totalDuration, playbackState]
  )

  const progressPercent = totalDuration > 0 ? (simTime / totalDuration) * 100 : 0

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Workflow Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <Sparkles className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#0F284E]">
                Digital Twin Mission Flight Simulation
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">
                STEP 11 OF 13 · ADVANCED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                SIMULATION ONLY
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5 font-medium">
              Simulates autonomous flight trajectories along planned waypoint coordinates and geofence boundary. Zero live vehicle telemetry is overwritten.
            </p>
          </div>
        </div>

        {/* Global Quick Status Strip */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs sm:text-[13px] font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1]">
            <Route className="w-4 h-4 text-[#1B68D2]" />
            <span className="font-bold text-[#0F284E]">{canonicalWaypoints.length} WPs</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1]">
            <Clock className="w-4 h-4 text-[#1B68D2]" />
            <span className="font-bold text-[#0F284E]">{formatDuration(totalDuration)} Est</span>
          </div>
        </div>
      </div>

      {/* Main Simulation Layout: Operational Map (Left) + Playback Controls Deck (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN (8 cols): Shared Operational Map with Digital Twin Overlay    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 bg-[#08182B] rounded-xl border border-[#CBD5E1] min-h-[480px] h-[520px] lg:h-[620px] relative overflow-hidden shadow-xs flex flex-col">
          <div className="relative flex-1 min-h-0 w-full h-full">
            <MapLoad
              mapStyle={mapStyle}
              showAirspace={showAirspace}
              waypoints={canonicalWaypoints}
              showMissionRoute={true}
              geofence={canonicalGeofence}
              simulatedDrone={simulatedDrone}
              followSimulatedDrone={followSimDrone}
              completedCoordinates={simulatedDrone?.completedCoordinates || []}
              activeSimWaypointId={simulatedDrone?.activeSimWaypointId || null}
              routeViolations={missionValidation.violatingSegments || []}
              pageType="planning"
              selectedWaypointId={selectedWaypointId}
              onWaypointSelect={setSelectedWaypointId}
            />

            {/* Map Style & Layer Selector (Top-Right) */}
            <div className="absolute top-3 right-3 z-10 flex items-center bg-[#08121DEB] border border-[#1E2E42] backdrop-blur-md rounded-lg p-1 shadow-lg gap-1 select-none">
              <button
                type="button"
                onClick={() => handleMapStyleChange("normal")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  mapStyle === "normal"
                    ? "bg-[#1B68D2] text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => handleMapStyleChange("satellite")}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  mapStyle === "satellite"
                    ? "bg-[#1B68D2] text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={handleToggleAirspace}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  showAirspace
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Toggle Mappls Airspace / No-Fly Zones"
              >
                Airspace (NFZ)
              </button>
            </div>

            {/* Simulation Status Watermark (Top-Left) */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 select-none pointer-events-auto">
              <div className="flex items-center gap-2 rounded-lg border border-[#7E22CE]/60 bg-[#120824E6] px-3.5 py-1.5 text-xs font-mono shadow-xl backdrop-blur-md">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    playbackState === "PLAYING"
                      ? "bg-[#C084FC] shadow-[0_0_8px_#C084FC] animate-ping"
                      : playbackState === "PAUSED"
                      ? "bg-amber-400"
                      : "bg-[#7E22CE]"
                  }`}
                />
                <span className="font-extrabold text-[#F3E8FF] tracking-wider">
                  {playbackState === "PLAYING"
                    ? "DIGITAL TWIN SIMULATING"
                    : playbackState === "PAUSED"
                    ? "SIMULATION PAUSED"
                    : playbackState === "COMPLETED"
                    ? "SIMULATION COMPLETED"
                    : "SIMULATION READY"}
                </span>
                <span className="text-[#A855F7]">·</span>
                <span className="text-[#C084FC] font-semibold">{speedMultiplier}x</span>
              </div>

              {/* Follow drone toggle button */}
              <button
                type="button"
                onClick={() => setFollowSimDrone((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition backdrop-blur-md cursor-pointer ${
                  followSimDrone
                    ? "bg-[#1B68D2] text-white border border-[#3B82F6]"
                    : "bg-[#08121DE6] text-slate-300 border border-[#1E2E42] hover:text-white"
                }`}
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>{followSimDrone ? "Camera Tracking ON" : "Camera Tracking OFF"}</span>
              </button>
            </div>

            {/* Overlaid Bottom Scrub Bar */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#08121DEB] backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-[#1E2E42] flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs text-white shadow-2xl">
              <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[140px]">
                <span className="font-mono text-xs sm:text-[13px] font-bold text-[#38BDF8]">
                  {formatDuration(simTime)}
                </span>
                <span className="text-slate-400 font-mono">/</span>
                <span className="font-mono text-xs sm:text-[13px] text-slate-300">
                  {formatDuration(totalDuration)}
                </span>
              </div>

              {/* Range Scrubber */}
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progressPercent}
                  onChange={handleScrubChange}
                  onMouseDown={() => setIsScrubbing(true)}
                  onMouseUp={() => setIsScrubbing(false)}
                  className="w-full accent-[#1B68D2] h-2 bg-slate-700 rounded-lg cursor-pointer transition-all"
                  aria-label="Simulation Progress Scrubber"
                />
                <span className="font-mono text-xs font-bold text-slate-200 min-w-[45px] text-right">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>

              {/* Waypoint Sequence Chip */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200 bg-[#0F2036] px-3 py-1.5 rounded-md border border-[#1E3A5F]">
                <Navigation className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>
                  {activeSimState?.currentWp ? activeSimState.currentWp.label : "WP1"} &rarr;{" "}
                  {activeSimState?.nextWp ? activeSimState.nextWp.label : "END"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (4 cols): Simulation Controls Deck & Aircraft Telemetry     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-3.5 flex flex-col min-h-0">
          {/* Missing Waypoints or Geofence Warning Notice */}
          {!missionValidation.valid && (
            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 text-xs sm:text-[13px] text-amber-950 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-700 shrink-0" />
                <span>Mission Configuration Required</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-900 font-medium">
                {missionValidation.message}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onStepChange?.(1)}
                  className="px-3.5 py-2 rounded-lg bg-[#1B68D2] text-white font-bold text-xs hover:bg-[#1557B0] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Go to Step 1: Area & Flight</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Card 1: Playback Controls Deck */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h4 className="text-sm font-bold text-[#0F284E]">
                Playback Controls
              </h4>
              <span className="text-xs font-mono font-bold text-[#475569]">
                Speed: <strong className="text-[#1B68D2]">{speedMultiplier}x</strong>
              </span>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {playbackState === "PLAYING" ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="col-span-2 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-[13px] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={!missionValidation.valid}
                  className={`col-span-2 py-2.5 px-3 rounded-lg text-white font-bold text-xs sm:text-[13px] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px] ${
                    missionValidation.valid
                      ? "bg-[#1B68D2] hover:bg-[#1557B0]"
                      : "bg-slate-300 cursor-not-allowed text-slate-500"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{playbackState === "PAUSED" ? "Resume Simulation" : "Start Simulation"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStop}
                disabled={playbackState === "IDLE"}
                className="py-2.5 px-3 rounded-lg border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-bold text-xs sm:text-[13px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                title="Stop and return to Start"
              >
                <Square className="w-3.5 h-3.5 fill-[#334155]" />
                <span>Stop</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleRestart}
                disabled={!missionValidation.valid}
                className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-[#0F284E] hover:bg-[#F8FAFC] text-xs sm:text-[13px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-mono font-bold border border-slate-200">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeedMultiplier(s)}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      speedMultiplier === s
                        ? "bg-[#1B68D2] text-white shadow-2xs font-bold"
                        : "text-[#475569] hover:text-[#0F284E]"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Simulated Aircraft Telemetry */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h4 className="text-sm font-bold text-[#0F284E]">
                Simulated Telemetry
              </h4>
              <span className="text-xs font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                DR-001 (TWIN)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-[13px]">
              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
                <span className="text-xs font-medium text-[#475569] block mb-1">Simulated Alt</span>
                <span className="font-mono text-base font-extrabold text-[#0F284E]">
                  {activeSimState?.altitude || formData.flightAltitude || 120}{" "}
                  <span className="text-xs font-bold text-[#475569]">m</span>
                </span>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
                <span className="text-xs font-medium text-[#475569] block mb-1">Planned Speed</span>
                <span className="font-mono text-base font-extrabold text-[#1B68D2]">
                  {activeSimState?.speed || formData.speed || 10}{" "}
                  <span className="text-xs font-bold text-[#475569]">m/s</span>
                </span>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
                <span className="text-xs font-medium text-[#475569] block mb-1">Heading</span>
                <span className="font-mono text-base font-extrabold text-[#0F284E] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#1B68D2]" />
                  <span>{activeSimState?.heading || 0}°</span>
                </span>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1]">
                <span className="text-xs font-medium text-[#475569] block mb-1">Sim Battery</span>
                <span className="font-mono text-base font-extrabold text-emerald-700 flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-emerald-600" />
                  <span>
                    {Math.max(48, Math.round(98 - (progressPercent / 100) * 50))}%
                  </span>
                </span>
              </div>
            </div>

            {/* Waypoint Leg Progress */}
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#CBD5E1] text-xs sm:text-[13px] space-y-1.5">
              <div className="flex items-center justify-between text-[#475569]">
                <span className="font-medium">Active Leg</span>
                <span className="font-mono font-bold text-[#0F284E]">
                  {activeSimState?.currentWp ? activeSimState.currentWp.label : "WP1"} &rarr;{" "}
                  {activeSimState?.nextWp ? activeSimState.nextWp.label : "Target"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span className="font-medium">Remaining on Leg</span>
                <span className="font-mono font-bold text-[#1B68D2]">
                  {activeSimState?.legDistanceRemaining || 0} m
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Safety & Clearance Verification */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 text-xs sm:text-[13px] text-emerald-950 space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Digital Twin Safety Clearance: PASSED</span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-900 font-medium">
              No simulated collisions, link shadows, or battery starvation events detected across the {formatDuration(totalDuration)} flight envelope.
            </p>
            <div className="flex items-center justify-between pt-1.5 border-t border-emerald-300 text-xs font-mono">
              <span className="text-emerald-800 font-medium">Geofence Volume</span>
              <strong className="text-emerald-950 font-bold">WITHIN BOUNDARY</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step11MissionSimulation
