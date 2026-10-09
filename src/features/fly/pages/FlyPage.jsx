import { useState, useCallback, useEffect, useMemo } from "react";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useMission } from "@/hooks/useMission.js";
import DualJoystickOverlay from "@/features/mession/components/joysticks/DualJoystickOverlay.jsx";
import FlightInstrumentsWidget from "@/features/mession/components/widgets/FlightInstrumentsWidget.jsx";
import CameraWidget from "@/features/fly/components/CameraWidget.jsx";
import FlightModeDropdown from "@/features/fly/components/FlightModeDropdown.jsx";
import { LayoutGrid, ShieldAlert, X as CloseIcon } from "lucide-react";

import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";
import { DEFAULT_SHOW_JOYSTICKS } from "@/services/telemetry/telemetryTypes.js";

const pipClass =
  "absolute right-2 top-2 sm:right-4 sm:top-4 z-20 flex cursor-pointer flex-col overflow-hidden rounded-[5px] border border-[#D2DCE7] bg-white shadow-[0_8px_26px_rgba(18,42,72,0.22)] backdrop-blur-md transition-all duration-300 h-[124px] w-[155px] sm:h-[156px] sm:w-[205px] md:h-[188px] md:w-[245px]";
const fullClass = "absolute inset-0 z-0 overflow-hidden";

const toggleBtn = (active) =>
  `text-[8px] sm:text-[8.5px] font-mono font-semibold rounded-[4px] px-2 sm:px-2.5 py-0.5 transition ${
    active
      ? "bg-[#E7F2FC] border border-[#B8D2EC] text-[#176DB5]"
      : "text-[#718197] hover:text-[#244768]"
  }`;

const MapStyleBar = ({ options, value, onChange }) => (
  <div
    className="flex h-[22px] sm:h-[25px] shrink-0 items-center justify-center gap-1 sm:gap-1.5 bg-[#0A0E12F2] border-t border-[#1C2834]"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        className={toggleBtn(value === option.id)}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
];

const FlyPage = () => {
  const [mapIsLarge, setMapIsLarge] = useState(true);
  const [camSelected, setCamSelected] = useState("main");
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "normal";
    } catch {
      return "normal";
    }
  });

  const handleMapStyleChange = useCallback((newStyle) => {
    setMapStyle(newStyle);
    try {
      localStorage.setItem("aeronexus_map_style", newStyle);
    } catch {
      // Ignore
    }
  }, []);

  // Dual Virtual Joysticks visibility state (Mandatory Default: HIDDEN / false)
  const [joysticksVisible, setJoysticksVisible] = useState(DEFAULT_SHOW_JOYSTICKS);

  // Canonical central mission, project, and geofence state (single source of truth)
  const { currentProject, currentProjectId, projects, selectProject } = useMission();

  // Canonical mission waypoints from active project (exact coordinates, sequence, and labels)
  const mapWaypoints = useMemo(() => {
    if (!currentProject?.mission) return [];
    const raw = currentProject.mission.waypoints || currentProject.mission.items || [];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((wp) => wp && (typeof wp.lat === "number" || typeof wp.latitude === "number"))
      .map((wp, index) => {
        const lat = typeof wp.lat === "number" ? wp.lat : Number(wp.latitude);
        const lng = typeof wp.lng === "number" ? wp.lng : Number(wp.longitude);
        const alt = typeof wp.alt === "number" ? wp.alt : Number(wp.altitude || 50);
        const seq = index + 1;
        return {
          ...wp,
          id: wp.id || `wp-${seq}`,
          seq,
          sequence: seq,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          alt: Math.round(alt),
          type: wp.type || "WAYPOINT",
          label: `WP${seq}`,
        };
      })
      .filter((wp) => !isNaN(wp.lat) && !isNaN(wp.lng) && (wp.lat !== 0 || wp.lng !== 0));
  }, [currentProject]);

  // Canonical geofence polygon from active project
  const mapGeofence = useMemo(() => {
    return currentProject?.geofence || null;
  }, [currentProject]);

  const [selectedWaypointId, setSelectedWaypointId] = useState(null);

  // Clear selected waypoint if it is no longer part of the mission
  useEffect(() => {
    if (selectedWaypointId && !mapWaypoints.some((wp) => wp.id === selectedWaypointId)) {
      setSelectedWaypointId(null);
    }
  }, [mapWaypoints, selectedWaypointId]);

  const selectedWaypoint = useMemo(() => {
    return mapWaypoints.find((wp) => wp.id === selectedWaypointId) || null;
  }, [mapWaypoints, selectedWaypointId]);

  // RBAC permissions and role inspection
  const { hasPermission, role } = useAuth();
  const canExecuteFlight = hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS);
  const isViewer = role === Roles.VIEWER;

  // Single source of truth telemetry & physics simulation hook
  const {
    telemetry,
    updateStickInputs,
    gimbalState,
    setGimbalRoll,
    centerGimbal,
    selectedDroneId,
  } = useDroneTelemetry();

  const handleRequestCenterGimbal = useCallback(() => {
    centerGimbal(telemetry?.heading || 0);
  }, [telemetry, centerGimbal]);

  const handleRequestLevelRoll = useCallback(() => {
    setGimbalRoll(0);
  }, [setGimbalRoll]);

  // Desktop Keyboard Flight Controls (WASD: Throttle/Yaw, Arrow Keys: Pitch/Roll, Space: Hover)
  // Strictly gated by EXECUTE_FLIGHT_COMMANDS permission
  useEffect(() => {
    if (!canExecuteFlight) return;

    const keysDown = new Set();

    const updateFromKeys = () => {
      let thr = 0;
      let yaw = 0;
      let pit = 0;
      let rol = 0;

      // Mode 2 Left Stick (Throttle & Yaw)
      if (keysDown.has("KeyW")) thr += 1;
      if (keysDown.has("KeyS")) thr -= 1;
      if (keysDown.has("KeyA")) yaw -= 1;
      if (keysDown.has("KeyD")) yaw += 1;

      // Mode 2 Right Stick (Pitch & Roll)
      if (keysDown.has("ArrowUp")) pit += 1;
      if (keysDown.has("ArrowDown")) pit -= 1;
      if (keysDown.has("ArrowLeft")) rol -= 1;
      if (keysDown.has("ArrowRight")) rol += 1;

      updateStickInputs({
        throttle: thr,
        yaw: yaw,
        pitch: pit,
        roll: rol,
      });
    };

    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const valid = ["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
      if (valid.includes(e.code)) {
        e.preventDefault();
        if (e.code === "Space") {
          keysDown.clear();
          updateFromKeys();
          return;
        }
        keysDown.add(e.code);
        updateFromKeys();
      }
    };

    const handleKeyUp = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (keysDown.has(e.code)) {
        keysDown.delete(e.code);
        updateFromKeys();
      }
    };

    const handleBlur = () => {
      if (keysDown.size > 0) {
        keysDown.clear();
        updateFromKeys();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [updateStickInputs, canExecuteFlight]);

  // Shutter flash states: full-screen vs drone-feed-scoped
  const [isScreenFlashing, setIsScreenFlashing] = useState(false);
  const [isDroneFlashing, setIsDroneFlashing] = useState(false);

  const triggerDroneFlash = useCallback(() => {
    setIsDroneFlashing(true);
    setTimeout(() => {
      setIsDroneFlashing(false);
    }, 180);
  }, []);

  const triggerScreenFlash = useCallback(() => {
    setIsScreenFlashing(true);
    setTimeout(() => {
      setIsScreenFlashing(false);
    }, 220);
  }, []);

  // Reset all draggable widget positions to default
  const handleResetLayout = () => {
    try {
      localStorage.removeItem("aeronexus_widget_pos_flight_instruments");
      localStorage.removeItem("aeronexus_widget_min_flight_instruments");
      localStorage.removeItem("aeronexus_widget_pos_compass");
      localStorage.removeItem("aeronexus_widget_pos_attitude");
      localStorage.removeItem("aeronexus_widget_pos_capture_controls");
      localStorage.removeItem("aeronexus_widget_min_capture_controls");
      localStorage.removeItem("aeronexus_widget_pos_gimbal");
      localStorage.removeItem("aeronexus_widget_min_gimbal");
      window.location.reload();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#E9EFF5] select-none">
      {/* SCREENSHOT FULL SCREEN FLASH OVERLAY */}
      {isScreenFlashing && (
        <div className="absolute inset-0 z-50 bg-white/95 pointer-events-none transition-opacity duration-200 animate-out fade-out" />
      )}

      {/* MAP LAYER (Full screen or PiP) */}
      <div className={mapIsLarge ? fullClass : pipClass}>
        <div className={`relative ${mapIsLarge ? "h-full w-full" : "min-h-0 flex-1"}`}>
          <MapLoad
            mapStyle={mapStyle}
            telemetry={telemetry}
            pageType="fly"
            waypoints={mapWaypoints}
            showMissionRoute={true}
            geofence={mapGeofence}
            selectedWaypointId={selectedWaypointId}
            onWaypointSelect={setSelectedWaypointId}
          />
          {!mapIsLarge && (
            <button
              type="button"
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 hover:bg-black/40 transition group"
              onClick={() => setMapIsLarge(true)}
              aria-label="Show map full screen"
            >
              <span className="opacity-0 group-hover:opacity-100 bg-[#080C14D9] text-[#35E0FF] text-[10px] font-mono px-2 py-1 rounded border border-[#35E0FF4D] transition">
                Click to Expand Map
              </span>
            </button>
          )}
        </div>
        {!mapIsLarge && (
          <MapStyleBar
            options={mapStyleOptions}
            value={mapStyle}
            onChange={handleMapStyleChange}
          />
        )}
      </div>

      {/* LIVE DRONE CAMERA FEED WIDGET (Composed Preview, Tabs, Capture Banner, and Integrated Gimbal Roll & Center) */}
      <CameraWidget
        mapIsLarge={mapIsLarge}
        onToggleLarge={() => setMapIsLarge(false)}
        camSelected={camSelected}
        onChangeCam={setCamSelected}
        telemetry={telemetry}
        gimbalState={gimbalState}
        onSetRoll={handleRequestLevelRoll}
        onNudgeRoll={(delta) => setGimbalRoll((gimbalState?.roll || 0) + delta)}
        onCenterGimbal={handleRequestCenterGimbal}
        onTriggerDroneFlash={triggerDroneFlash}
        onTriggerScreenFlash={triggerScreenFlash}
        isDroneFlashing={isDroneFlashing}
        droneId={selectedDroneId || telemetry?.droneId || "DRONE-001"}
      />

      {/* FLOATING HUD FLIGHT INSTRUMENTS */}
      <FlightInstrumentsWidget telemetry={telemetry} />

      {/* DUAL QGC-STYLE VIRTUAL JOYSTICKS (Left: Throttle/Yaw, Right: Pitch/Roll) */}
      {/* Strictly enabled only for authorized roles (SUPER_ADMIN, FLIGHT_OPERATOR) */}
      {canExecuteFlight && (
        <DualJoystickOverlay
          onStickUpdate={updateStickInputs}
          visible={joysticksVisible}
          onToggleVisible={() => setJoysticksVisible((prev) => !prev)}
          camSelected={camSelected}
          mapIsLarge={mapIsLarge}
        />
      )}

      {/* VIEWER AUDITOR MODE BANNER */}
      {isViewer && (
        <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-25 pointer-events-auto px-3.5 py-1.5 rounded-md bg-[#0B1017F2] border border-[#5E2222] shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-[#FF8585] animate-in fade-in slide-in-from-top-1">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF4141] shrink-0" />
          <span className="font-semibold tracking-wide">
            AUDITOR MODE: Flight command controls are inhibited for your role.
          </span>
        </div>
      )}

      {/* OPERATIONAL MISSION & GEOFENCE HUD OVERLAY (TOP-LEFT) */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-25 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-[5px] border border-[#2A3C50] bg-[#101923F5] px-2.5 py-1 text-xs font-mono shadow-[0_6px_22px_rgba(0,0,0,0.38)] backdrop-blur-md">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                mapWaypoints.length > 0 ? "bg-[#35E0FF] shadow-[0_0_8px_#35E0FF]" : "bg-[#64748B]"
              }`}
            />
            {projects && projects.length > 1 ? (
              <select
                value={currentProjectId || ""}
                onChange={(e) => selectProject(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#E2E8F0] outline-none cursor-pointer pr-1 truncate max-w-[130px] sm:max-w-[190px]"
                title="Switch active mission project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#101923] text-white">
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] font-bold text-[#E2E8F0] tracking-wide truncate max-w-[130px] sm:max-w-[190px]">
                {currentProject?.name || "Active Mission"}
              </span>
            )}
          </div>
          <span className="h-3 w-px shrink-0 bg-[#35465A]" />
          <span className="whitespace-nowrap text-[10px] sm:text-[10.5px] font-semibold text-[#8CC8FF]">
            {mapWaypoints.length > 0 ? `${mapWaypoints.length} WPs` : "0 WPs"}
          </span>
          {mapGeofence && (
            <>
              <span className="h-3 w-px shrink-0 bg-[#35465A]" />
              <span className="whitespace-nowrap text-[9.5px] sm:text-[10px] font-semibold text-[#57D99A]">
                Geofence
              </span>
            </>
          )}
        </div>

        {/* Selected Waypoint Inspection Chip */}
        {selectedWaypoint && (
          <div className="flex items-center gap-2 rounded-[5px] border border-[#35E0FF]/40 bg-[#0E1926F5] px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-[#E2E8F0] shadow-lg backdrop-blur-md animate-in fade-in">
            <span className="font-bold text-[#35E0FF]">
              {selectedWaypoint.label || `WP${selectedWaypoint.seq || 1}`}
            </span>
            <span className="text-[#91A0B2]">·</span>
            <span>LAT {selectedWaypoint.lat.toFixed(6)}</span>
            <span>LNG {selectedWaypoint.lng.toFixed(6)}</span>
            <span className="font-bold text-[#35E0FF]">{selectedWaypoint.alt}m</span>
            <button
              type="button"
              onClick={() => setSelectedWaypointId(null)}
              className="ml-1 p-0.5 text-[#8E9EAA] transition hover:text-white"
              title="Deselect waypoint"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* UNIFIED FLIGHT MODE, TELEMETRY, MAP STYLE, AND LAYOUT STRIP */}
      <div
        className="fly-telemetry-strip absolute left-1/2 top-2 z-25 h-[34px] w-[580px] max-w-[calc(100vw-16px)] -translate-x-1/2 overflow-x-auto overflow-y-hidden rounded-[5px] border border-[#2A3C50] bg-[#101923F5] px-2 shadow-[0_6px_22px_rgba(0,0,0,0.38)] backdrop-blur-md sm:top-3"
        role="group"
        aria-label="Flight mode, telemetry, and map controls"
      >
        <div className="fly-telemetry-content flex h-full min-w-max items-center gap-1.5 px-0.5 font-mono text-[8px] text-[#91A0B2] sm:gap-2 sm:text-[9px]">
          <div className="fly-strip-flight-group flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                telemetry.isLive
                  ? "bg-[#2FE089] shadow-[0_0_6px_#2FE089]"
                  : telemetry.isStale
                  ? "bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]"
                  : "bg-[#38BDF8]"
              }`}
              title={telemetry.isLive ? "Live telemetry" : telemetry.isStale ? "Telemetry stale" : "Telemetry unavailable"}
            />
            <FlightModeDropdown />
            <span className="fly-strip-divider h-3 w-px shrink-0 bg-[#35465A]" />
            <span className="shrink-0 whitespace-nowrap">
              ALT: <strong className="text-[#35E0FF]">{typeof telemetry.altitude === "number" ? telemetry.altitude.toFixed(1) : (telemetry.altitude || "0.0")}m</strong>
            </span>
            <span className="shrink-0 whitespace-nowrap">
              SPD: <strong className="text-[#EEF4F8]">{typeof telemetry.speed === "number" ? Math.round(telemetry.speed) : typeof telemetry.groundSpeed === "number" ? Math.round(telemetry.groundSpeed) : 0}m/s</strong>
            </span>
          </div>
          <span className="fly-strip-divider h-3 w-px shrink-0 bg-[#35465A]" />
          <div className="fly-strip-position-group flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="shrink-0 whitespace-nowrap">
              LAT: <strong className="font-mono text-[#35E0FF]">{typeof telemetry.latitude === "number" ? telemetry.latitude.toFixed(6) : "—"}</strong>
            </span>
            <span className="shrink-0 whitespace-nowrap">
              LNG: <strong className="font-mono text-[#35E0FF]">{typeof telemetry.longitude === "number" ? telemetry.longitude.toFixed(6) : "—"}</strong>
            </span>
          </div>
          <span className="fly-strip-divider h-3 w-px shrink-0 bg-[#35465A]" />
          <div className="fly-strip-actions-group flex shrink-0 items-center gap-1.5">
            <div className="flex shrink-0 items-center gap-0.5 rounded-[3px] border border-[#25364A] bg-[#080F18] p-0.5">
            <button
              type="button"
              onClick={() => handleMapStyleChange("normal")}
              className={`whitespace-nowrap rounded-[2px] border px-1.5 py-0.5 text-[8px] font-semibold transition sm:text-[9px] ${
                mapStyle === "normal"
                  ? "border-[#287D92] bg-[#153542] text-[#54E4F1]"
                  : "border-transparent text-[#8594A7] hover:text-[#D8E4EF]"
              }`}
              title="Switch map to standard vector view"
            >
              NORMAL
            </button>
            <button
              type="button"
              onClick={() => handleMapStyleChange("satellite")}
              className={`whitespace-nowrap rounded-[2px] border px-1.5 py-0.5 text-[8px] font-semibold transition sm:text-[9px] ${
                mapStyle === "satellite"
                  ? "border-[#287D92] bg-[#153542] text-[#54E4F1]"
                  : "border-transparent text-[#8594A7] hover:text-[#D8E4EF]"
              }`}
              title="Switch map to satellite imagery view"
            >
              SATELLITE
            </button>
          </div>
            <button
              type="button"
              onClick={handleResetLayout}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[8px] text-[#91A0B2] transition hover:text-[#35E0FF] sm:text-[9px]"
              title="Reset all draggable widgets to default positions"
            >
              <LayoutGrid className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlyPage;
