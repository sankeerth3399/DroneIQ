import { useState, useCallback, useEffect } from "react";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import DualJoystickOverlay from "@/features/mession/components/joysticks/DualJoystickOverlay.jsx";
import FlightInstrumentsWidget from "@/features/mession/components/widgets/FlightInstrumentsWidget.jsx";
import CameraWidget from "@/features/fly/components/CameraWidget.jsx";
import FlightModeDropdown from "@/features/fly/components/FlightModeDropdown.jsx";
import CaptureToast from "@/features/mession/components/toast/CaptureToast.jsx";
import { Plane, LayoutGrid, ShieldAlert } from "lucide-react";

import { useTelemetry } from "@/hooks/useTelemetry.js";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";
import { DEFAULT_SHOW_JOYSTICKS } from "@/services/telemetry/telemetryTypes.js";

const pipClass =
  "absolute right-2 top-2 sm:right-4 sm:top-4 z-20 flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27B2] shadow-2xl backdrop-blur-md transition-all duration-300 h-[124px] w-[155px] sm:h-[156px] sm:w-[205px] md:h-[188px] md:w-[245px]";
const fullClass = "absolute inset-0 z-0 overflow-hidden";

const toggleBtn = (active) =>
  `text-[8px] sm:text-[8.5px] font-mono font-semibold rounded-[4px] px-2 sm:px-2.5 py-0.5 transition ${
    active
      ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.2)]"
      : "text-[#5D707C] hover:text-[#94A3B8]"
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

  // RBAC permissions and role inspection
  const { hasPermission, role } = useAuth();
  const canExecuteFlight = hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS);
  const isViewer = role === Roles.VIEWER;

  // Single source of truth telemetry & physics simulation hook
  const {
    telemetry,
    updateStickInputs,
    simMode,
    setSimMode,
    isLive,
    isArmed,
    gimbalState,
    setGimbalRoll,
    centerGimbal,
  } = useDroneTelemetry();
  const { showToast } = useTelemetry();

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

  // Capture toast notification state
  const [toast, setToast] = useState(null);

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
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* SCREENSHOT FULL SCREEN FLASH OVERLAY */}
      {isScreenFlashing && (
        <div className="absolute inset-0 z-50 bg-white/95 pointer-events-none transition-opacity duration-200 animate-out fade-out" />
      )}

      {/* NON-BLOCKING CAPTURE CONFIRMATION TOAST */}
      <CaptureToast toast={toast} onDismiss={() => setToast(null)} />

      {/* MAP LAYER (Full screen or PiP) */}
      <div className={mapIsLarge ? fullClass : pipClass}>
        <div className={`relative ${mapIsLarge ? "h-full w-full" : "min-h-0 flex-1"}`}>
          <MapLoad mapStyle={mapStyle} telemetry={telemetry} />
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
        onSetRoll={setGimbalRoll}
        onNudgeRoll={(delta) => setGimbalRoll((gimbalState?.roll || 0) + delta)}
        onCenterGimbal={() => centerGimbal(telemetry.heading || 0)}
        onCaptureToast={setToast}
        onTriggerDroneFlash={triggerDroneFlash}
        onTriggerScreenFlash={triggerScreenFlash}
        isDroneFlashing={isDroneFlashing}
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

      {/* TOP-CENTER MISSION TELEMETRY HUD STRIP */}
      <div className="absolute top-1.5 sm:top-3 left-1/2 -translate-x-1/2 z-25 pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1 rounded-md bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md shadow-lg text-[8.5px] sm:text-[10px] font-mono max-w-[calc(100vw-30px)] sm:max-w-none overflow-visible">
        {/* Live Stream vs Sim Status */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isLive
                ? "bg-[#2FE089] shadow-[0_0_6px_#2FE089] animate-pulse"
                : "bg-[#35E0FF] shadow-[0_0_6px_#35E0FF]"
            }`}
          />
          <span className={`font-semibold hidden xs:inline ${isLive ? "text-[#2FE089]" : "text-[#B7F3FF]"}`}>
            {isLive ? "LIVE" : "SIM"}
          </span>
        </div>

        <div className="w-[1px] h-2.5 bg-[#223240] shrink-0" />

        {/* FUNCTIONAL FLIGHT MODE DROPDOWN (10 Canonical Modes) */}
        <FlightModeDropdown />

        <div className="w-[1px] h-2.5 bg-[#223240] shrink-0" />

        {/* Altitude & Speed */}
        <div className="flex items-center gap-1 sm:gap-2 text-[#8E9EAA] shrink-0">
          <span>
            ALT: <strong className="text-[#35E0FF]">{typeof telemetry.altitude === "number" ? telemetry.altitude.toFixed(1) : (telemetry.altitude || "0.0")}m</strong>
          </span>
          <span>
            SPD: <strong className="text-[#EEF4F8]">{typeof telemetry.speed === "number" ? Math.round(telemetry.speed) : typeof telemetry.groundSpeed === "number" ? Math.round(telemetry.groundSpeed) : 0}m/s</strong>
          </span>
        </div>

        <div className="w-[1px] h-2.5 bg-[#223240] shrink-0" />

        {/* Live GPS Coordinates (LAT & LNG) */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[#8E9EAA] shrink-0">
          <span>
            LAT: <strong className="text-[#35E0FF] font-mono">{typeof telemetry.latitude === "number" ? telemetry.latitude.toFixed(6) : (telemetry.lat !== undefined ? Number(telemetry.lat).toFixed(6) : "17.385590")}</strong>
          </span>
          <span>
            LNG: <strong className="text-[#35E0FF] font-mono">{typeof telemetry.longitude === "number" ? telemetry.longitude.toFixed(6) : (telemetry.lng !== undefined ? Number(telemetry.lng).toFixed(6) : "78.485519")}</strong>
          </span>
        </div>

        {/* Interactive Simulation Mode Switcher (Authorized flight execution roles only) */}
        {!isLive && canExecuteFlight && (
          <>
            <div className="w-[1px] h-2.5 bg-[#223240] hidden md:block shrink-0" />
            <button
              type="button"
              onClick={() => {
                if (!isArmed) {
                  showToast("Drone is UNARMED — Arm the drone before flying.", "warning");
                  return;
                }
                setSimMode((prev) => (prev === "interactive" ? "patrol" : "interactive"));
              }}
              className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9.5px] transition ${
                simMode === "interactive"
                  ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                  : "bg-[#2FE0891A] text-[#2FE089] border border-[#2FE0894D]"
              }`}
              title="Click to toggle between Manual Joysticks and Autonomous Orbit Demo"
            >
              <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{simMode === "interactive" ? "Manual Sticks" : "Auto Patrol"}</span>
            </button>
          </>
        )}

        <div className="w-[1px] h-2.5 bg-[#223240] hidden sm:block shrink-0" />

        {/* Quick Map Style (Normal / Satellite) */}
        <div className="flex items-center gap-0.5 bg-[#05080DB3] p-0.5 rounded border border-[#1E293B] shrink-0">
          <button
            type="button"
            onClick={() => handleMapStyleChange("normal")}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-semibold transition ${
              mapStyle === "normal"
                ? "bg-[#35E0FF26] text-[#35E0FF] border border-[#1A5A68]"
                : "text-[#5D707C] hover:text-[#94A3B8]"
            }`}
            title="Switch map to standard vector view"
          >
            NORMAL
          </button>
          <button
            type="button"
            onClick={() => handleMapStyleChange("satellite")}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-semibold transition ${
              mapStyle === "satellite"
                ? "bg-[#35E0FF26] text-[#35E0FF] border border-[#1A5A68]"
                : "text-[#5D707C] hover:text-[#94A3B8]"
            }`}
            title="Switch map to satellite imagery view"
          >
            SATELLITE
          </button>
        </div>

        <div className="w-[1px] h-2.5 bg-[#223240] hidden sm:block shrink-0" />

        {/* Reset Layout Button */}
        <button
          type="button"
          onClick={handleResetLayout}
          className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] text-[#8E9EAA] hover:text-[#35E0FF] transition shrink-0 cursor-pointer"
          title="Reset all draggable widgets to default positions"
        >
          <LayoutGrid className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* REAL-TIME FLIGHT MOVEMENT & HEADING VECTOR DEBUG HUD */}
      {canExecuteFlight && (
        <div
          id="flight-movement-debug-hud"
          className="absolute top-11 sm:top-12 left-1/2 -translate-x-1/2 z-15 pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-[#080C14E6] border border-[#1E293B] shadow-xl backdrop-blur-md text-[8px] sm:text-[9.5px] font-mono select-none max-w-[calc(100vw-24px)] sm:max-w-none"
        >
          <div className="flex items-center gap-1">
            <span className="text-[#8E9EAA]">HEADING:</span>
            <strong className="text-[#EEF4F8]">
              {telemetry.flightMovementDebug?.droneHeading ?? Math.round(telemetry.heading || 0)}°
            </strong>
          </div>
          <div className="w-[1px] h-2.5 bg-[#223240]" />
          <div className="flex items-center gap-1">
            <span className="text-[#8E9EAA]">ARROW:</span>
            <strong className="text-[#35E0FF]">
              {telemetry.flightMovementDebug?.arrowDirection || "N"}
            </strong>
          </div>
          <div className="w-[1px] h-2.5 bg-[#223240]" />
          <div className="flex items-center gap-1">
            <span className="text-[#8E9EAA]">JOYSTICK:</span>
            <strong className="text-[#EEF4F8]">
              {telemetry.flightMovementDebug?.joystickDirection || "NEUTRAL"}
            </strong>
          </div>
          <div className="w-[1px] h-2.5 bg-[#223240]" />
          <div className="flex items-center gap-1">
            <span className="text-[#8E9EAA]">MOVEMENT:</span>
            <strong className="text-[#2FE089]">
              {telemetry.flightMovementDebug?.calculatedMovementDirection || telemetry.flightMovementDebug?.arrowDirection || "N"}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlyPage;
