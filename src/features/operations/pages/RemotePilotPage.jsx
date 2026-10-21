import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import sampleImg from "@/assets/images/sampleImg.png";
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg";
import AttitudeIndicator from "@/features/mession/components/instruments/AttitudeIndicator.jsx";
import CompassIndicator from "@/features/mession/components/instruments/CompassIndicator.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import {
  Gamepad2,
  Radio,
  Shield,
  Plane,
  RotateCcw,
  Camera,
  Video,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Sliders,
  Compass,
  Crosshair,
  Zap,
  BarChart3,
  Flame,
} from "lucide-react";

/**
 * RemotePilotPage
 * Dedicated manual flight cockpit with dual virtual joysticks, live axis feedback,
 * FPV targeting reticle, position geofence radar, artificial horizon, button map, and command log.
 * Faithfully matches media_1791545034571.png reference.
 */
const RemotePilotPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { telemetry } = useDroneTelemetry();
  const {
    isArmed,
    executeArmCommand,
    selectedDroneId,
    selectDrone,
    registeredDrones,
    activeDrone,
    flightMode: contextFlightMode,
    isLive,
  } = useTelemetry();

  const [flightMode, setFlightMode] = useState("MANUAL - Pos Hold");
  const [isRecording, setIsRecording] = useState(true);

  // Live joystick axis state (-100 to 100)
  const [axes, setAxes] = useState({
    lxYaw: 0,
    lyThrottle: 0,
    rxRoll: 0,
    ryPitch: 0,
  });

  // Simulated drone offset for position radar
  const [dronePosOffset, setDronePosOffset] = useState({ x: 0, y: 0 });

  // Attitude & heading state
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [heading, setHeading] = useState(45);

  // Command logs timeline
  const [commandLogs, setCommandLogs] = useState([
    { id: 1, time: "08:42:17", msg: "Manual control taken from Auto" },
    { id: 2, time: "08:42:01", msg: "Arm sequence verified by ground station" },
    { id: 3, time: "08:41:48", msg: "Position hold engaged within mission fence" },
  ]);

  const addLog = useCallback((msg) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    setCommandLogs((prev) => [{ id: Date.now(), time: timeStr, msg }, ...prev.slice(0, 10)]);
  }, []);

  // Keyboard controls listener (W/A/S/D and Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      let updated = false;
      setAxes((prev) => {
        const next = { ...prev };
        if (e.key === "w" || e.key === "W") { next.lyThrottle = Math.min(100, next.lyThrottle + 25); updated = true; }
        if (e.key === "s" || e.key === "S") { next.lyThrottle = Math.max(-100, next.lyThrottle - 25); updated = true; }
        if (e.key === "a" || e.key === "A") { next.lxYaw = Math.max(-100, next.lxYaw - 25); updated = true; }
        if (e.key === "d" || e.key === "D") { next.lxYaw = Math.min(100, next.lxYaw + 25); updated = true; }
        if (e.key === "ArrowUp") { next.ryPitch = Math.max(-100, next.ryPitch - 25); updated = true; }
        if (e.key === "ArrowDown") { next.ryPitch = Math.min(100, next.ryPitch + 25); updated = true; }
        if (e.key === "ArrowLeft") { next.rxRoll = Math.max(-100, next.rxRoll - 25); updated = true; }
        if (e.key === "ArrowRight") { next.rxRoll = Math.min(100, next.rxRoll + 25); updated = true; }
        return next;
      });

      if (e.key === " ") {
        // Spacebar = Emergency Brake
        setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
        addLog("Emergency brake engaged · Sticks centered");
      }
    };

    const handleKeyUp = (e) => {
      setAxes((prev) => {
        const next = { ...prev };
        if (["w", "s", "W", "S"].includes(e.key)) next.lyThrottle = 0;
        if (["a", "d", "A", "D"].includes(e.key)) next.lxYaw = 0;
        if (["ArrowUp", "ArrowDown"].includes(e.key)) next.ryPitch = 0;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) next.rxRoll = 0;
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [addLog]);

  // Update attitude indicators based on axes (movement only active when drone is armed)
  useEffect(() => {
    setPitch(-axes.ryPitch * 0.3);
    setRoll(axes.rxRoll * 0.4);
    setHeading((prev) => (prev + axes.lxYaw * 0.05 + 360) % 360);
    if (isArmed) {
      setDronePosOffset((prev) => ({
        x: Math.max(-25, Math.min(25, prev.x + axes.rxRoll * 0.05)),
        y: Math.max(-25, Math.min(25, prev.y - axes.ryPitch * 0.05)),
      }));
    }
  }, [axes, isArmed]);

  // Controller Button Click Handler
  const handleButtonAction = async (btn, actionName) => {
    if (btn === "Start") {
      addLog(isArmed ? "Disarming vehicle..." : "Arming vehicle...");
      if (typeof executeArmCommand === "function") {
        try {
          await executeArmCommand({ arm: !isArmed, droneId: selectedDroneId || "DRONE-001" });
          addLog(!isArmed ? "Motors Armed · Ready for flight" : "Motors Disarmed · Safe");
        } catch (err) {
          addLog(`Arm/Disarm command failed: ${err.message}`);
        }
      }
      return;
    }
    if (btn === "Back") {
      setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
      addLog("Emergency brake applied");
      return;
    }
    if (btn === "X") {
      addLog("High-res photo captured (Sony RX1R II)");
      return;
    }
    if (btn === "Y") {
      setIsRecording((prev) => {
        const next = !prev;
        addLog(next ? "Video recording started" : "Video clip saved to media");
        return next;
      });
      return;
    }
    if (btn === "B") {
      addLog("Return to Launch commanded · Ascending to 150m RTH altitude");
      return;
    }
    addLog(`Button ${btn} triggered: ${actionName}`);
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#060D17] text-[#EEF2F6] font-sans scroll-smooth">
      <div className="p-3 sm:p-4 lg:p-5 max-w-[1720px] w-full mx-auto space-y-4">
        {/* ======================================================================= */}
        {/* 1. HEADER ROW WITH DRONE SELECTOR & STATUS CARDS                        */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#38BDF8] animate-pulse" />
              Remote Pilot
            </h1>
            <p className="text-xs text-[#8E9EAA] mt-0.5">
              Connect a joystick and fly a drone by hand, with every safety rule still in force.
            </p>
          </div>

          {/* Top Right Drone Selector Pills */}
          <div className="flex items-center gap-1.5 bg-[#0C1624] p-1 rounded-lg border border-[#1C2C42] overflow-x-auto max-w-[320px]">
            {(registeredDrones || []).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  selectDrone(d.id);
                  addLog(`Connected remote control to ${d.id}`);
                }}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition cursor-pointer whitespace-nowrap ${
                  selectedDroneId === d.id
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-[#8E9EAA] hover:text-white"
                }`}
              >
                {d.id}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Status Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Joystick Connection */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Demo joystick</div>
              <div className="text-[10.5px] text-[#8E9EAA]">Plug in any USB or Bluetooth gamepad to fly with it</div>
            </div>
          </div>

          {/* Card 2: Drone Model Specs */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#34D399] shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {activeDrone?.id || selectedDroneId}{activeDrone?.name && activeDrone.name !== activeDrone.id ? ` · ${activeDrone.name}` : ""}{activeDrone?.model ? ` - ${activeDrone.model}` : ""}
              </div>
              <div className="text-[10.5px] text-[#8E9EAA]">
                {isArmed ? "ARMED" : "UNARMED"}{activeDrone?.role ? ` · ${activeDrone.role}` : ""}{activeDrone?.mission ? ` · ${activeDrone.mission}` : ""} · link {isLive ? "strong" : "standby"} · battery {typeof telemetry?.batteryPercentage === "number" ? Math.round(telemetry.batteryPercentage) : (activeDrone?.battery ?? 100)}%
              </div>
            </div>
          </div>

          {/* Card 3: Safety Guardrails */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Safety rules stay on</div>
              <div className="text-[10.5px] text-[#8E9EAA]">Geofence, 120 m ceiling and 25% reserve still apply to manual flight</div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. THREE-COLUMN WORKSPACE                                               */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT COLUMN: CONTROLLER WIDGET & AXES (lg:col-span-3)                 */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Controller Joysticks Box */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1C2C42] pb-2">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-[#38BDF8]" /> Controller
                </h3>
                <span className="text-[10px] text-[#10B981] font-mono font-bold">READY</span>
              </div>

              {/* Dual Virtual Joysticks Visual */}
              <div className="grid grid-cols-2 gap-2 text-center py-2">
                {/* Left Stick: Throttle / Yaw */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 rounded-full border-2 border-[#1C2C42] bg-[#07101C] flex items-center justify-center shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-[#1C2C42]" />
                      <div className="h-full w-px bg-[#1C2C42] absolute" />
                    </div>
                    {/* Draggable/Animated Stick Head */}
                    <div
                      className="w-10 h-10 rounded-full bg-[#2563EB] border-2 border-[#93C5FD] shadow-lg flex items-center justify-center text-[10px] font-bold text-white transition-transform duration-75"
                      style={{
                        transform: `translate(${(axes.lxYaw / 100) * 28}px, ${(-axes.lyThrottle / 100) * 28}px)`,
                      }}
                    >
                      L
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#C1D0E4] mt-1.5">Throttle / Yaw</span>
                  <span className="text-[9px] text-[#8E9EAA]">W / S / A / D</span>
                </div>

                {/* Right Stick: Pitch / Roll */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 rounded-full border-2 border-[#1C2C42] bg-[#07101C] flex items-center justify-center shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-[#1C2C42]" />
                      <div className="h-full w-px bg-[#1C2C42] absolute" />
                    </div>
                    {/* Draggable/Animated Stick Head */}
                    <div
                      className="w-10 h-10 rounded-full bg-[#2563EB] border-2 border-[#93C5FD] shadow-lg flex items-center justify-center text-[10px] font-bold text-white transition-transform duration-75"
                      style={{
                        transform: `translate(${(axes.rxRoll / 100) * 28}px, ${(axes.ryPitch / 100) * 28}px)`,
                      }}
                    >
                      R
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#C1D0E4] mt-1.5">Pitch / Roll</span>
                  <span className="text-[9px] text-[#8E9EAA]">Arrow Keys</span>
                </div>
              </div>

              {/* Gamepad Buttons Strip */}
              <div className="flex flex-wrap items-center justify-center gap-1 pt-1 border-t border-[#1C2C42]">
                {[
                  { k: "A", action: "Take off / Land" },
                  { k: "B", action: "Return to Launch" },
                  { k: "X", action: "Capture photo" },
                  { k: "Y", action: "Start/stop recording" },
                  { k: "LB", action: "Gimbal down" },
                  { k: "RB", action: "Gimbal up" },
                  { k: "LT", action: "Slow mode" },
                  { k: "RT", action: "Sport mode" },
                  { k: "Start", action: "Arm / Disarm" },
                  { k: "Back", action: "Emergency brake" },
                ].map((btn) => (
                  <button
                    key={btn.k}
                    type="button"
                    onClick={() => handleButtonAction(btn.k, btn.action)}
                    className="px-2 py-0.5 rounded bg-[#07101C] border border-[#1C2C42] text-[10px] font-mono font-bold text-[#CBD5E1] hover:bg-[#2563EB] hover:text-white transition cursor-pointer"
                  >
                    {btn.k}
                  </button>
                ))}
              </div>
              <div className="text-[9.5px] text-center text-[#8E9EAA]">Demo joystick · simulated input</div>
            </div>

            {/* Live Axes Meters Box */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase">Axes</h3>

              <div className="space-y-2 text-xs">
                {/* LX - Yaw */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#CBD5E1] font-mono mb-0.5">
                    <span>LX - Yaw</span>
                    <span className="font-bold">{axes.lxYaw}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1C2C42] overflow-hidden">
                    <div
                      className="h-full bg-[#38BDF8] transition-all"
                      style={{ width: `${Math.abs(axes.lxYaw)}%`, marginLeft: axes.lxYaw < 0 ? 0 : "50%" }}
                    />
                  </div>
                </div>

                {/* LY - Throttle */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#CBD5E1] font-mono mb-0.5">
                    <span>LY - Throttle</span>
                    <span className="font-bold">{axes.lyThrottle}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1C2C42] overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] transition-all"
                      style={{ width: `${Math.abs(axes.lyThrottle)}%` }}
                    />
                  </div>
                </div>

                {/* RX - Roll */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#CBD5E1] font-mono mb-0.5">
                    <span>RX - Roll</span>
                    <span className="font-bold">{axes.rxRoll}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1C2C42] overflow-hidden">
                    <div
                      className="h-full bg-[#A855F7] transition-all"
                      style={{ width: `${Math.abs(axes.rxRoll)}%` }}
                    />
                  </div>
                </div>

                {/* RY - Pitch */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#CBD5E1] font-mono mb-0.5">
                    <span>RY - Pitch</span>
                    <span className="font-bold">{axes.ryPitch}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1C2C42] overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] transition-all"
                      style={{ width: `${Math.abs(axes.ryPitch)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[9.5px] text-[#8E9EAA] pt-1 border-t border-[#1C2C42]">
                Dead zone 6%. Expo 30%. Rates: normal.
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* CENTER COLUMN: LIVE FPV FEED & POSITION RADAR (lg:col-span-6)         */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            {/* FPV Live Video Window with HUD Reticle */}
            <div className="relative h-[340px] sm:h-[380px] rounded-xl overflow-hidden border border-[#1C2C42] bg-[#050B12] group shadow-sm">
              <img
                src={sampleImg || droneLandscapeImg}
                alt="FPV Video Feed"
                className="w-full h-full object-cover opacity-90 transition-transform duration-200"
                style={{
                  transform: `scale(1.05) translate(${-axes.rxRoll * 0.08}px, ${axes.ryPitch * 0.08}px)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* FPV Header Tags */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] text-white">
                <div className="flex items-center gap-2 font-mono font-bold">
                  <span className="text-[#38BDF8]">FPV · {activeDrone?.id || selectedDroneId}</span>
                  <span className={isArmed ? "text-[#EF4444] font-bold" : "text-[#10B981]"}>
                    · {isArmed ? "ARMED" : "UNARMED"}
                  </span>
                  <span className="text-[#8E9EAA]">· {contextFlightMode || flightMode}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  {isRecording && <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />}
                  <span className="text-[#EF4444]">● REC</span>
                </div>
              </div>

              {/* Targeting HUD Reticle / Green Framing Brackets */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-32 border border-[#10B981]/40 rounded">
                  {/* Corner notches */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#10B981]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#10B981]" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#10B981]" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#10B981]" />
                  {/* Center Crosshair Circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-[#10B981] rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  </div>
                </div>
              </div>

              {/* Bottom Flight Mode & Guidance Strip */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-[#07101CEE] border border-[#1C2C42] rounded-lg px-2.5 py-1.5 text-[10px] backdrop-blur-md">
                <span className={`px-1.5 py-0.5 rounded ${isArmed ? "bg-[#10B981] text-black" : "bg-[#374151] text-[#CBD5E1]"} font-extrabold text-[9px] uppercase tracking-wider shrink-0`}>
                  {isArmed ? (contextFlightMode || flightMode) : "UNARMED - POS HOLD"}
                </span>
                <span className="text-[#CBD5E1] truncate">
                  {isArmed ? "Release the sticks and the drone holds position. Fence, ceiling and reserve rules apply." : "Drone is UNARMED. Motors are disengaged. Press Start to initiate ARM sequence."}
                </span>
              </div>
            </div>

            {/* Position Radar Mini-Map (Matching reference screenshot) */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Position</h3>
                <span className="text-[10px] text-[#38BDF8] font-mono">Inside Mission Boundary</span>
              </div>

              {/* Coordinate Grid Box */}
              <div className="relative h-32 rounded-lg bg-[#050C16] border border-[#1C2C42] overflow-hidden flex items-center justify-center">
                {/* Geofence polygon overlay */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                  <polygon
                    points="60,95 80,30 220,25 250,85 180,105 100,105"
                    fill="rgba(37, 99, 235, 0.15)"
                    stroke="#2563EB"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  {/* Drone dot */}
                  <circle
                    cx={150 + dronePosOffset.x * 2.5}
                    cy={60 + dronePosOffset.y * 1.5}
                    r="5"
                    fill="#38BDF8"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </svg>

                <div className="absolute bottom-1 right-2 text-[9px] text-[#8E9EAA] font-mono">
                  * Manual flight inside the mission fence
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: FLIGHT HUD, BUTTON MAP & COMMAND LOG (lg:col-span-3)   */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Flight HUD: Attitude & Heading Instruments */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2 shadow-sm">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase">Flight HUD</h3>
              <div className="grid grid-cols-2 gap-2 items-center justify-items-center py-1">
                {/* Artificial Horizon Attitude Indicator */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-[#1C2C42] shadow-inner bg-[#07101C]">
                    <AttitudeIndicator pitch={pitch} roll={roll} size={80} />
                  </div>
                  <span className="text-[9.5px] text-[#8E9EAA] mt-1 font-mono">Attitude</span>
                </div>

                {/* Compass Heading Rose */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-[#1C2C42] shadow-inner bg-[#07101C]">
                    <CompassIndicator heading={heading} size={80} />
                  </div>
                  <span className="text-[9.5px] text-[#8E9EAA] mt-1 font-mono">Heading {Math.round(heading)}°</span>
                </div>
              </div>
            </div>

            {/* Button Map Reference Table */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Button map</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => addLog("Joystick calibration checked · OK")}
                    className="px-2 py-0.5 rounded bg-[#07101C] border border-[#1C2C42] text-[9.5px] font-bold text-[#38BDF8] hover:bg-[#102A50]"
                  >
                    Calibrate
                  </button>
                  <button
                    type="button"
                    onClick={() => addLog("Custom remap modal opened")}
                    className="px-2 py-0.5 rounded bg-[#07101C] border border-[#1C2C42] text-[9.5px] font-bold text-[#CBD5E1] hover:bg-[#102A50]"
                  >
                    Remap
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="max-h-44 overflow-y-auto border border-[#1C2C42] rounded-lg">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-[#07101C] text-[#8E9EAA] sticky top-0 border-b border-[#1C2C42]">
                    <tr>
                      <th className="py-1 px-2 font-mono">Button</th>
                      <th className="py-1 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2C42] text-[#CBD5E1]">
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">A</td><td className="py-0.5 px-2">Take off / Land</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">B</td><td className="py-0.5 px-2">Return to Launch</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">X</td><td className="py-0.5 px-2">Capture photo</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">Y</td><td className="py-0.5 px-2">Start / stop recording</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">LB</td><td className="py-0.5 px-2">Gimbal down</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">RB</td><td className="py-0.5 px-2">Gimbal up</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">LT</td><td className="py-0.5 px-2">Slow mode</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">RT</td><td className="py-0.5 px-2">Sport mode</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">Start</td><td className="py-0.5 px-2">Arm / Disarm</td></tr>
                    <tr><td className="py-0.5 px-2 font-mono font-bold text-[#38BDF8]">Back</td><td className="py-0.5 px-2">Emergency brake</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Command Log */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2 shadow-sm flex-1">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase">Command log</h3>
              <div className="space-y-1.5 text-[10.5px] font-mono max-h-28 overflow-y-auto">
                {commandLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5 text-[#CBD5E1]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1 shrink-0" />
                    <span className="text-[#38BDF8] font-bold">{log.time}</span>
                    <span className="truncate">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. FOOTER VALUES / ASSURANCE STRIP                                     */}
        {/* ======================================================================= */}
        <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-[#1C2C42]">
            <div className="flex items-center gap-2.5 px-2">
              <Compass className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Plan with Confidence</span>
                <span className="text-[10px] text-[#8E9EAA]">Accurate, efficient and safe missions.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Zap className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Multi-Drone, Multi-Use</span>
                <span className="text-[10px] text-[#8E9EAA]">Any industry. Any environment.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <BarChart3 className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">From Data to Decisions</span>
                <span className="text-[10px] text-[#8E9EAA]">Turn aerial data into real value.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Shield className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Safer Operations</span>
                <span className="text-[10px] text-[#8E9EAA]">People. Assets. Communities.</span>
              </div>
            </div>
            <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
              <span className="text-[10px] font-mono tracking-widest font-extrabold text-[#CBD5E1] uppercase">
                One Fleet. Any Mission.
              </span>
              <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                Always Ready.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemotePilotPage;
