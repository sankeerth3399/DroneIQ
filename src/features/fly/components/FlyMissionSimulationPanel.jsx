import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  FastForward,
  ChevronUp,
  ChevronDown,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LocateFixed,
  Route,
  Clock,
  Sparkles,
} from "lucide-react";
import { calculateDistance, formatDuration } from "@/utils/distance.js";
import { validateMissionAgainstGeofence } from "@/utils/geofence.js";

/**
 * FlyMissionSimulationPanel
 * High-precision mission route flight simulation control overlay for the Fly Page.
 * Visualizes simulated digital twin flight along saved waypoint route and geofence.
 * Strictly decoupled from physical drone telemetry and flight controls.
 */
export const FlyMissionSimulationPanel = ({
  waypoints = [],
  geofence = null,
  currentProject = null,
  onSimUpdate,
  followSimDrone = false,
  onToggleFollow,
  onOpenWaypointPlanning,
}) => {
  // Speed multiplier options
  const speedOptions = [1, 2, 5, 10];
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const speedMultiplierRef = useRef(speedMultiplier);
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // Panel state: "IDLE" | "PLAYING" | "PAUSED" | "COMPLETED"
  const [playbackState, setPlaybackState] = useState("IDLE");
  const [simTime, setSimTime] = useState(0); // Elapsed simulation seconds
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Animation frame and timing refs
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const totalDurationRef = useRef(0);

  // Extract geofence polygon vertices
  const geofenceCoords = useMemo(() => {
    if (!geofence) return [];
    if (Array.isArray(geofence)) return geofence;
    if (Array.isArray(geofence.vertices)) return geofence.vertices;
    if (Array.isArray(geofence.polygon)) return geofence.polygon;
    if (Array.isArray(geofence.coordinates)) return geofence.coordinates;
    return [];
  }, [geofence]);

  // Mission validation against geofence & waypoint count
  const missionValidation = useMemo(() => {
    if (!waypoints || waypoints.length === 0) {
      return {
        valid: false,
        reason: "NO_WAYPOINTS",
        message: "No saved waypoints in active mission.",
      };
    }
    if (waypoints.length < 2) {
      return {
        valid: false,
        reason: "INSUFFICIENT_WAYPOINTS",
        message: "At least 2 waypoints are required to form an operational flight path.",
      };
    }
    if (!geofenceCoords || geofenceCoords.length < 3) {
      return {
        valid: false,
        reason: "NO_GEOFENCE",
        message: "A saved mission geofence boundary is required before simulation.",
      };
    }
    const result = validateMissionAgainstGeofence(waypoints, geofenceCoords);
    if (!result.isValid || (result.violations && result.violations.length > 0)) {
      return {
        valid: false,
        reason: "GEOFENCE_BREACH",
        message: `${result.violations?.length || 1} waypoint/route segment(s) breach the saved geofence boundary.`,
        violatingSegments: result.violatingSegments || [],
      };
    }
    return { valid: true };
  }, [waypoints, geofenceCoords]);

  // Base planning flight speed from mission settings (default: 10 m/s)
  const defaultSpeed = useMemo(() => {
    const s = currentProject?.mission?.settings?.flightSpeed || currentProject?.mission?.settings?.speed;
    return typeof s === "number" && s > 0 ? s : 10;
  }, [currentProject]);

  // Route segments pre-calculation: distances, speeds, segment times, and cumulative timeline
  const routeSegments = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return [];
    const segments = [];
    let cumulative = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const dist = calculateDistance(from, to);
      const segSpeed = typeof to.speed === "number" && to.speed > 0 ? to.speed : defaultSpeed;
      const duration = dist > 0 && segSpeed > 0 ? dist / segSpeed : 2;
      const startTime = cumulative;
      const endTime = cumulative + duration;
      cumulative = endTime;

      // Bearing from `from` to `to`
      const dLat = to.lat - from.lat;
      const dLng = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180);
      const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

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
      });
    }

    return segments;
  }, [waypoints, defaultSpeed]);

  // Total mission duration in seconds
  const totalDuration = useMemo(() => {
    if (routeSegments.length === 0) return 0;
    return routeSegments[routeSegments.length - 1].endTime;
  }, [routeSegments]);

  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  // Calculate simulated state at any given elapsed time
  const calculateSimStateAtTime = useCallback(
    (time) => {
      if (routeSegments.length === 0 || waypoints.length < 2) return null;

      const clampedTime = Math.max(0, Math.min(totalDuration, time));

      // Reached final waypoint
      if (clampedTime >= totalDuration) {
        const lastWp = waypoints[waypoints.length - 1];
        const lastSeg = routeSegments[routeSegments.length - 1];
        return {
          lat: lastWp.lat,
          lng: lastWp.lng,
          altitude: lastWp.alt || 50,
          speed: 0,
          heading: lastSeg?.heading || 0,
          currentWp: lastWp,
          nextWp: null,
          currentSegIndex: routeSegments.length - 1,
          legDistanceRemaining: 0,
          progressPercent: 100,
          activeSimWaypointId: lastWp.id,
          completedCoordinates: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
        };
      }

      // Find active segment
      let seg = routeSegments.find((s) => clampedTime >= s.startTime && clampedTime < s.endTime);
      if (!seg) seg = routeSegments[routeSegments.length - 1];

      const segProgress = seg.duration > 0 ? (clampedTime - seg.startTime) / seg.duration : 0;
      const alpha = Math.max(0, Math.min(1, segProgress));

      const lat = seg.from.lat + (seg.to.lat - seg.from.lat) * alpha;
      const lng = seg.from.lng + (seg.to.lng - seg.from.lng) * alpha;
      const fromAlt = seg.from.alt || 50;
      const toAlt = seg.to.alt || 50;
      const altitude = fromAlt + (toAlt - fromAlt) * alpha;
      const legDistRem = seg.distance * (1 - alpha);
      const progressPercent = totalDuration > 0 ? (clampedTime / totalDuration) * 100 : 0;

      // Completed route path: all waypoints up to current segment `from`, plus current interpolated position
      const completedCoords = [];
      for (let i = 0; i <= seg.index; i++) {
        completedCoords.push({ lat: waypoints[i].lat, lng: waypoints[i].lng });
      }
      completedCoords.push({ lat, lng });

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
      };
    },
    [routeSegments, waypoints, totalDuration]
  );

  // Active simulated state derived from current simTime
  const activeSimState = useMemo(() => {
    return calculateSimStateAtTime(simTime);
  }, [calculateSimStateAtTime, simTime]);

  // Synchronize simulated state with mapContainer via callback
  useEffect(() => {
    if (!onSimUpdate) return;

    if (playbackState === "IDLE" || !activeSimState) {
      onSimUpdate(null);
    } else {
      onSimUpdate({
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
      });
    }
  }, [playbackState, activeSimState, onSimUpdate]);

  // Stop simulation on unmount or when project changes
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Reset when active project mission changes
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setPlaybackState("IDLE");
    setSimTime(0);
    lastTimeRef.current = null;
    if (onSimUpdate) onSimUpdate(null);
  }, [currentProject?.id, onSimUpdate]);

  // Main 60 FPS animation loop
  useEffect(() => {
    if (playbackState === "PLAYING") {
      lastTimeRef.current = performance.now();

      const loop = (now) => {
        const deltaMs = now - lastTimeRef.current;
        lastTimeRef.current = now;

        const deltaSec = (deltaMs / 1000) * speedMultiplierRef.current;

        setSimTime((prevTime) => {
          const next = prevTime + deltaSec;
          if (next >= totalDurationRef.current) {
            setPlaybackState("COMPLETED");
            return totalDurationRef.current;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playbackState]);

  // Play / Pause / Resume action handler
  const handleTogglePlay = () => {
    if (!missionValidation.valid) return;

    if (playbackState === "PLAYING") {
      setPlaybackState("PAUSED");
    } else if (playbackState === "PAUSED") {
      setPlaybackState("PLAYING");
    } else if (playbackState === "COMPLETED") {
      setSimTime(0);
      setPlaybackState("PLAYING");
    } else {
      // IDLE -> PLAY
      setSimTime(0);
      setPlaybackState("PLAYING");
    }
  };

  // Restart handler
  const handleRestart = () => {
    if (!missionValidation.valid) return;
    setSimTime(0);
    setPlaybackState("PLAYING");
  };

  // Stop handler
  const handleStop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setPlaybackState("IDLE");
    setSimTime(0);
    lastTimeRef.current = null;
    if (onSimUpdate) onSimUpdate(null);
  };

  // Timeline scrubber drag handler
  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    const targetTime = (val / 100) * totalDuration;
    setSimTime(targetTime);
    if (playbackState === "COMPLETED" && val < 100) {
      setPlaybackState("PAUSED");
    }
  };

  // Render when active mission has no waypoints
  if (!waypoints || waypoints.length === 0) {
    return (
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[540px] px-3 pointer-events-auto">
        <div className="rounded-xl border border-[#22354A] bg-[#0A111DF5] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Route className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <span>No saved mission route. Create waypoints to enable flight simulation.</span>
          </div>
          <button
            type="button"
            onClick={onOpenWaypointPlanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold transition shrink-0 cursor-pointer shadow-xs"
          >
            <span>Waypoint Planning</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Render when route fails geofence validation
  if (!missionValidation.valid) {
    return (
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[580px] px-3 pointer-events-auto">
        <div className="rounded-xl border border-[#7F1D1D] bg-[#1A0B0DF5] p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-start gap-2.5 text-[#FCA5A5]">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#F87171] uppercase tracking-wide">
                Simulation Locked · Geofence Validation Failed
              </div>
              <div className="text-[11px] text-[#E2E8F0] mt-0.5">
                {missionValidation.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWaypointPlanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold transition shrink-0 cursor-pointer shadow-xs self-end sm:self-auto text-[11px]"
          >
            <span>Correct in Waypoint Planning</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Collapsed Micro-Pill View (Allows user to minimize the panel to clear map view)
  if (isCollapsed) {
    return (
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full border border-[#7E22CE] bg-[#120822F5] px-3.5 py-1.5 text-xs font-mono shadow-[0_6px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                playbackState === "PLAYING" ? "bg-[#C084FC] opacity-75" : "bg-[#64748B] opacity-0"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                playbackState === "PLAYING"
                  ? "bg-[#C084FC]"
                  : playbackState === "PAUSED"
                  ? "bg-[#F59E0B]"
                  : playbackState === "COMPLETED"
                  ? "bg-[#10B981]"
                  : "bg-[#94A3B8]"
              }`}
            />
          </span>

          <span className="font-bold text-[#E9D5FF] tracking-wider text-[11px]">
            {playbackState === "PLAYING"
              ? "SIMULATING"
              : playbackState === "PAUSED"
              ? "PAUSED"
              : playbackState === "COMPLETED"
              ? "COMPLETED"
              : "SIMULATION"}
          </span>

          <span className="text-[#6B21A8]">·</span>

          <span className="text-[#DDD6FE] text-[11px]">
            {formatDuration(simTime)} / {formatDuration(totalDuration)}
          </span>

          <span className="text-[#6B21A8]">·</span>

          <button
            type="button"
            onClick={handleTogglePlay}
            className="p-1 rounded text-[#E9D5FF] hover:text-white transition cursor-pointer"
            title={playbackState === "PLAYING" ? "Pause" : "Play"}
          >
            {playbackState === "PLAYING" ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1 text-[10px] text-[#A855F7] hover:text-[#C084FC] pl-1 font-bold cursor-pointer"
            title="Expand simulation toolbar"
          >
            <span>Expand</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Full Simulation Control Dashboard
  return (
    <div
      className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[640px] max-w-[calc(100vw-16px)] pointer-events-auto select-none"
      role="region"
      aria-label="Mission flight simulation controls"
    >
      <div className="rounded-xl border border-[#3B1F64] bg-[#0E061AF5] shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-md overflow-hidden">
        {/* Top Header Strip: Mode, Status, Project, and Action Icons */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#170B2CF0] border-b border-[#2C144E] text-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            {/* Pulsing indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  playbackState === "PLAYING"
                    ? "bg-[#C084FC] opacity-75"
                    : "bg-[#64748B] opacity-0"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  playbackState === "PLAYING"
                    ? "bg-[#C084FC]"
                    : playbackState === "PAUSED"
                    ? "bg-[#F59E0B]"
                    : playbackState === "COMPLETED"
                    ? "bg-[#10B981]"
                    : "bg-[#94A3B8]"
                }`}
              />
            </span>

            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C084FC] px-1.5 py-0.5 rounded bg-[#3B1F64] border border-[#7E22CE]">
              SIMULATION
            </span>

            <span className="text-[#E2E8F0] font-bold truncate max-w-[140px] sm:max-w-[190px] text-[11px]">
              {currentProject?.name || "Active Mission"}
            </span>

            <span className="text-[#7E22CE]">·</span>

            <span className="text-[#DDD6FE] text-[10.5px]">
              {waypoints.length} WPs
            </span>

            {playbackState === "COMPLETED" && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#064E3B] px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" />
                <span>COMPLETE</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Follow Sim Drone Toggle */}
            <button
              type="button"
              onClick={onToggleFollow}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                followSimDrone
                  ? "bg-[#7E22CE] text-white border border-[#A855F7]"
                  : "bg-[#1E1035] text-[#A855F7] hover:text-[#DDD6FE] border border-transparent"
              }`}
              title={followSimDrone ? "Camera actively following simulated drone" : "Click to auto-follow simulated drone"}
            >
              <LocateFixed className="w-3 h-3" />
              <span className="hidden sm:inline">Follow Sim</span>
            </button>

            {/* Minimize / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-[#9333EA] hover:text-[#C084FC] transition cursor-pointer"
              title="Minimize simulation panel"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Section: Scrubbing Progress Timeline & Timestamps */}
        <div className="px-3.5 pt-2 pb-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#DDD6FE] mb-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#C084FC]" />
              <span className="text-[#F3E8FF]">{formatDuration(simTime)}</span>
              <span className="text-[#7E22CE]">/</span>
              <span className="text-[#A855F7]">{formatDuration(totalDuration)}</span>
              <span className="text-[9.5px] font-normal text-[#9333EA] hidden sm:inline">
                (Est. @ {defaultSpeed}m/s)
              </span>
            </div>

            <div className="text-[11px] font-bold text-[#C084FC]">
              {totalDuration > 0 ? Math.round((simTime / totalDuration) * 100) : 0}%
            </div>
          </div>

          {/* Interactive Scrub Slider */}
          <div className="relative flex items-center h-4">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={totalDuration > 0 ? (simTime / totalDuration) * 100 : 0}
              onChange={handleSliderChange}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              onTouchStart={() => setIsScrubbing(true)}
              onTouchEnd={() => setIsScrubbing(false)}
              className="w-full h-1.5 bg-[#25103E] rounded-lg appearance-none cursor-pointer accent-[#C084FC] focus:outline-none"
              style={{
                background: `linear-gradient(to right, #A855F7 0%, #C084FC ${
                  totalDuration > 0 ? (simTime / totalDuration) * 100 : 0
                }%, #25103E ${
                  totalDuration > 0 ? (simTime / totalDuration) * 100 : 0
                }%, #25103E 100%)`,
              }}
            />
          </div>
        </div>

        {/* Bottom Section: Flight Nav Metrics Strip + Playback Controls Bar */}
        <div className="px-3 pb-2.5 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#220E3C]">
          {/* Active Navigation Metrics (Current WP -> Next WP, Alt, Heading) */}
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[10.5px] font-mono text-[#DDD6FE] min-w-0 flex-wrap">
            <div className="flex items-center gap-1 font-bold">
              <span className="text-[#A855F7]">WP:</span>
              <span className="text-[#F3E8FF]">
                {activeSimState?.currentWp?.label || `WP${(activeSimState?.currentSegIndex || 0) + 1}`}
              </span>
              <Navigation className="w-2.5 h-2.5 text-[#C084FC] rotate-90 mx-0.5" />
              <span className="text-[#C084FC]">
                {activeSimState?.nextWp?.label || (playbackState === "COMPLETED" ? "END" : "NEXT")}
              </span>
            </div>

            <span className="h-3 w-px bg-[#3B1F64] hidden sm:block" />

            <div className="whitespace-nowrap">
              <span className="text-[#A855F7]">ALT: </span>
              <strong className="text-[#F3E8FF] font-bold">
                {activeSimState ? `${activeSimState.altitude}m` : "—"}
              </strong>
            </div>

            <span className="h-3 w-px bg-[#3B1F64] hidden sm:block" />

            <div className="whitespace-nowrap">
              <span className="text-[#A855F7]">HDG: </span>
              <strong className="text-[#F3E8FF] font-bold">
                {activeSimState ? `${activeSimState.heading}°` : "—"}
              </strong>
            </div>

            {activeSimState?.legDistanceRemaining > 0 && (
              <>
                <span className="h-3 w-px bg-[#3B1F64] hidden sm:block" />
                <div className="whitespace-nowrap text-[#A855F7] text-[10px]">
                  <span>Leg Rem: </span>
                  <strong className="text-[#DDD6FE]">
                    {activeSimState.legDistanceRemaining}m
                  </strong>
                </div>
              </>
            )}
          </div>

          {/* Controls: Play/Pause, Restart, Stop, Speed */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {/* Speed Multiplier Pill */}
            <div className="flex items-center gap-0.5 rounded-lg border border-[#3B1F64] bg-[#160B2A] p-0.5 text-[10px] font-mono font-bold mr-1">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    speedMultiplier === s
                      ? "bg-[#7E22CE] text-white shadow-xs"
                      : "text-[#A855F7] hover:text-[#DDD6FE]"
                  }`}
                  title={`${s}x simulation playback speed`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Restart Button */}
            <button
              type="button"
              onClick={handleRestart}
              className="p-1.5 rounded-lg border border-[#3B1F64] bg-[#1A0C32] text-[#DDD6FE] hover:text-white hover:bg-[#2C144E] transition cursor-pointer"
              title="Restart simulation from WP1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Stop Button */}
            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg border border-[#3B1F64] bg-[#1A0C32] text-[#DDD6FE] hover:text-[#EF4444] hover:bg-[#2C144E] transition cursor-pointer"
              title="Stop simulation and reset marker"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Primary Play / Pause / Resume Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer shadow-md ${
                playbackState === "PLAYING"
                  ? "bg-[#D97706] hover:bg-[#B45309] text-white border border-[#F59E0B]"
                  : "bg-[#7E22CE] hover:bg-[#6B21A8] text-white border border-[#A855F7]"
              }`}
            >
              {playbackState === "PLAYING" ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-white" />
                  <span>Pause</span>
                </>
              ) : playbackState === "PAUSED" ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Resume</span>
                </>
              ) : playbackState === "COMPLETED" ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Simulate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlyMissionSimulationPanel;
