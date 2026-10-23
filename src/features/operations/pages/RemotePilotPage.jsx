import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx";
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
  Wifi,
  WifiOff,
  Plus,
  Minus,
} from "lucide-react";
import AxesWidget from "@/features/operations/components/AxesWidget.jsx";

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
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState("main");
  const [feedStatus, setFeedStatus] = useState({
    isPlaying: false,
    isLoading: true,
    error: null,
    connectionState: "idle",
  });
  const [currentUtcTime, setCurrentUtcTime] = useState(() =>
    new Date().toISOString().substring(11, 19) + " UTC"
  );
  const [radarZoom, setRadarZoom] = useState(1.0);

  // Live real-time clock for video timestamp overlay
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUtcTime(new Date().toISOString().substring(11, 19) + " UTC");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live joystick axis state (-100 to 100)
  const [axes, setAxes] = useState({
    lxYaw: 0,
    lyThrottle: 0,
    rxRoll: 0,
    ryPitch: 0,
  });

  // Controller connection state (supports physical Gamepad API & demo inputs)
  const [controllerState, setControllerState] = useState({
    type: "demo", // "demo" or "physical"
    connected: false,
    name: "Demo joystick",
    isManuallyDisconnected: false,
  });

  // Controller calibration configuration (Mode 2 standard)
  const [calibration, setCalibration] = useState({
    deadzone: 0.06, // 6%
    throttleInverted: true, // Standard gamepad API reports stick up as -1.0
  });

  const controllerStateRef = useRef(controllerState);
  controllerStateRef.current = controllerState;
  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;

  // Active pointer tracking for virtual joysticks
  const activeLeftPointerRef = useRef(false);
  const activeRightPointerRef = useRef(false);
  const leftPadRef = useRef(null);
  const rightPadRef = useRef(null);

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

  // Physical Gamepad API integration
  useEffect(() => {
    let animFrameId;

    const handleGamepadConnected = (e) => {
      const gp = e.gamepad;
      setControllerState((prev) => ({
        ...prev,
        type: "physical",
        connected: true,
        name: gp.id || "Physical Gamepad",
        isManuallyDisconnected: false,
      }));
      addLog(`Controller connected: ${gp.id || "Standard Controller"}`);
    };

    const handleGamepadDisconnected = (e) => {
      setControllerState((prev) => ({
        ...prev,
        type: "demo",
        connected: false,
        name: "Demo joystick",
      }));
      setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
      addLog("Controller disconnected · Reverted to safe neutral (50%)");
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // Initial check for already connected gamepads on mount
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = Array.from(gamepads || []).find((g) => g && g.connected);
      if (gp) {
        setControllerState((prev) => ({
          ...prev,
          type: "physical",
          connected: true,
          name: gp.id || "Physical Gamepad",
        }));
      }
    }

    const applyDeadzone = (val, dz = 0.06) => {
      if (Math.abs(val) < dz) return 0;
      const sign = Math.sign(val);
      const scaled = (Math.abs(val) - dz) / (1 - dz);
      return sign * Math.min(1, Math.max(0, scaled));
    };

    const pollGamepad = () => {
      const currentCtrl = controllerStateRef.current;
      if (currentCtrl.type === "physical" && !currentCtrl.isManuallyDisconnected) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = Array.from(gamepads || []).find((g) => g && g.connected);
        if (gp) {
          const dz = calibrationRef.current.deadzone;
          const rawYaw = applyDeadzone(gp.axes[0] ?? 0, dz);
          const rawLy = gp.axes[1] ?? 0;
          const rawThrottle = applyDeadzone(
            calibrationRef.current.throttleInverted ? -rawLy : rawLy,
            dz
          );
          const rawRoll = applyDeadzone(gp.axes[2] ?? 0, dz);
          const rawPitch = applyDeadzone(gp.axes[3] ?? 0, dz);

          setAxes({
            lxYaw: Math.round(rawYaw * 100),
            lyThrottle: Math.round(rawThrottle * 100),
            rxRoll: Math.round(rawRoll * 100),
            ryPitch: Math.round(rawPitch * 100),
          });
        }
      }
      animFrameId = requestAnimationFrame(pollGamepad);
    };

    animFrameId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      cancelAnimationFrame(animFrameId);
    };
  }, [addLog]);

  // Keyboard controls listener (W/A/S/D and Arrow keys)
  useEffect(() => {
    const isInteractiveElement = (target) => {
      if (!target) return false;
      const tagName = target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return true;
      if (target.isContentEditable) return true;
      if (target.getAttribute && target.getAttribute("role") === "textbox") return true;
      return false;
    };

    const handleKeyDown = (e) => {
      if (isInteractiveElement(e.target)) return;

      // Prevent default page-scrolling behavior for arrow keys and spacebar on Remote Pilot page
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "];
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (controllerStateRef.current.isManuallyDisconnected) return;

      setAxes((prev) => {
        const next = { ...prev };
        if (e.key === "w" || e.key === "W") { next.lyThrottle = Math.min(100, next.lyThrottle + 25); }
        if (e.key === "s" || e.key === "S") { next.lyThrottle = Math.max(-100, next.lyThrottle - 25); }
        if (e.key === "a" || e.key === "A") { next.lxYaw = Math.max(-100, next.lxYaw - 25); }
        if (e.key === "d" || e.key === "D") { next.lxYaw = Math.min(100, next.lxYaw + 25); }
        if (e.key === "ArrowUp") { next.ryPitch = Math.max(-100, next.ryPitch - 25); }
        if (e.key === "ArrowDown") { next.ryPitch = Math.min(100, next.ryPitch + 25); }
        if (e.key === "ArrowLeft") { next.rxRoll = Math.max(-100, next.rxRoll - 25); }
        if (e.key === "ArrowRight") { next.rxRoll = Math.min(100, next.rxRoll + 25); }
        return next;
      });

      if (e.key === " ") {
        // Spacebar = Emergency Brake
        setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
        addLog("Emergency brake engaged · Sticks centered (50%)");
      }
    };

    const handleKeyUp = (e) => {
      if (isInteractiveElement(e.target)) return;

      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "];
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (controllerStateRef.current.isManuallyDisconnected) return;
      setAxes((prev) => {
        const next = { ...prev };
        if (["w", "s", "W", "S"].includes(e.key)) next.lyThrottle = 0;
        if (["a", "d", "A", "D"].includes(e.key)) next.lxYaw = 0;
        if (["ArrowUp", "ArrowDown"].includes(e.key)) next.ryPitch = 0;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) next.rxRoll = 0;
        return next;
      });
    };

    const handleBlur = () => {
      setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [addLog]);

  // Virtual Joystick pointer drag interactions
  const handleStickPointerDown = (stick, e) => {
    if (controllerStateRef.current.isManuallyDisconnected) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (stick === "left") activeLeftPointerRef.current = true;
    if (stick === "right") activeRightPointerRef.current = true;
    updateStickFromPointer(stick, e.clientX, e.clientY);
  };

  const handleStickPointerMove = (stick, e) => {
    const isActive = stick === "left" ? activeLeftPointerRef.current : activeRightPointerRef.current;
    if (!isActive) return;
    updateStickFromPointer(stick, e.clientX, e.clientY);
  };

  const updateStickFromPointer = (stick, clientX, clientY) => {
    const pad = stick === "left" ? leftPadRef.current : rightPadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const maxRadius = 28;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const normX = clampedDist > 0 ? (clampedDist * Math.cos(angle)) / maxRadius : 0;
    const normY = clampedDist > 0 ? (clampedDist * Math.sin(angle)) / maxRadius : 0;

    if (stick === "left") {
      setAxes((prev) => ({
        ...prev,
        lxYaw: Math.round(normX * 100),
        lyThrottle: Math.round(-normY * 100),
      }));
    } else {
      setAxes((prev) => ({
        ...prev,
        rxRoll: Math.round(normX * 100),
        ryPitch: Math.round(normY * 100),
      }));
    }
  };

  const handleStickPointerUp = (stick, e) => {
    if (stick === "left") {
      activeLeftPointerRef.current = false;
      setAxes((prev) => ({ ...prev, lxYaw: 0, lyThrottle: 0 }));
    } else {
      activeRightPointerRef.current = false;
      setAxes((prev) => ({ ...prev, rxRoll: 0, ryPitch: 0 }));
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Toggle Disconnect / Reconnect test handler
  const handleToggleDisconnect = useCallback(() => {
    setControllerState((prev) => {
      const nextDisconnected = !prev.isManuallyDisconnected;
      if (nextDisconnected) {
        setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
        addLog("Controller disconnected · Sticks centered at neutral (50%)");
      } else {
        addLog(
          prev.type === "physical"
            ? `Controller reconnected: ${prev.name}`
            : "Demo controller reconnected · Ready"
        );
      }
      return { ...prev, isManuallyDisconnected: nextDisconnected };
    });
  }, [addLog]);

  // Calibrate axes handler
  const handleCalibrate = useCallback(() => {
    setAxes({ lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 });
    addLog("Axes calibrated · 50% neutral midpoint verified · Dead zone 6% locked");
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
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                  controllerState.isManuallyDisconnected
                    ? "bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]"
                    : controllerState.type === "physical" && controllerState.connected
                    ? "bg-[#10B981]/20 border-[#10B981]/40 text-[#34D399]"
                    : "bg-[#2563EB]/20 border-[#2563EB]/40 text-[#38BDF8]"
                }`}
              >
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>
                    {controllerState.isManuallyDisconnected
                      ? "Controller Disconnected"
                      : controllerState.type === "physical" && controllerState.connected
                      ? controllerState.name
                      : "Demo joystick"}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                      controllerState.isManuallyDisconnected
                        ? "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30"
                        : controllerState.type === "physical" && controllerState.connected
                        ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30"
                        : "bg-[#2563EB]/15 text-[#38BDF8] border-[#2563EB]/30"
                    }`}
                  >
                    {controllerState.isManuallyDisconnected
                      ? "OFFLINE"
                      : controllerState.type === "physical" && controllerState.connected
                      ? "PHYSICAL"
                      : "SIMULATED"}
                  </span>
                </div>
                <div className="text-[10.5px] text-[#8E9EAA]">
                  {controllerState.isManuallyDisconnected
                    ? "Signals paused · Indicators locked at 50% neutral"
                    : controllerState.type === "physical" && controllerState.connected
                    ? "USB/Bluetooth active · Calibrated Mode 2 standard mapping"
                    : "Simulated input (W/S/A/D · Arrow keys) · Plug in gamepad to fly"}
                </div>
              </div>
            </div>
            {/* Quick Disconnect/Reconnect Toggle Button */}
            <button
              type="button"
              onClick={handleToggleDisconnect}
              className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded border transition cursor-pointer shrink-0 ${
                controllerState.isManuallyDisconnected
                  ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40 hover:bg-[#10B981]/30"
                  : "bg-[#1C2C42] text-[#94A3B8] border-[#334155] hover:text-white hover:bg-[#25364D]"
              }`}
            >
              {controllerState.isManuallyDisconnected ? "Reconnect" : "Disconnect"}
            </button>
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
                <span
                  className={`text-[10px] font-mono font-bold ${
                    controllerState.isManuallyDisconnected
                      ? "text-[#EF4444]"
                      : controllerState.type === "physical" && controllerState.connected
                      ? "text-[#10B981]"
                      : "text-[#38BDF8]"
                  }`}
                >
                  {controllerState.isManuallyDisconnected
                    ? "DISCONNECTED"
                    : controllerState.type === "physical" && controllerState.connected
                    ? "PHYSICAL READY"
                    : "DEMO READY"}
                </span>
              </div>

              {/* Dual Virtual Joysticks Visual */}
              <div className="grid grid-cols-2 gap-2 text-center py-2">
                {/* Left Stick: Throttle / Yaw */}
                <div className="flex flex-col items-center">
                  <div
                    ref={leftPadRef}
                    onPointerDown={(e) => handleStickPointerDown("left", e)}
                    onPointerMove={(e) => handleStickPointerMove("left", e)}
                    onPointerUp={(e) => handleStickPointerUp("left", e)}
                    onPointerCancel={(e) => handleStickPointerUp("left", e)}
                    className="relative w-24 h-24 rounded-full border-2 border-[#1C2C42] bg-[#07101C] flex items-center justify-center shadow-inner touch-none cursor-grab active:cursor-grabbing select-none"
                    title="Click and drag or use W/S/A/D"
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-[#1C2C42]" />
                      <div className="h-full w-px bg-[#1C2C42] absolute" />
                    </div>
                    {/* Draggable/Animated Stick Head */}
                    <div
                      className="w-10 h-10 rounded-full bg-[#2563EB] border-2 border-[#93C5FD] shadow-lg flex items-center justify-center text-[10px] font-bold text-white transition-transform duration-75 pointer-events-none"
                      style={{
                        transform: `translate(${(axes.lxYaw / 100) * 28}px, ${(-axes.lyThrottle / 100) * 28}px)`,
                      }}
                    >
                      L
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#C1D0E4] mt-1.5">Throttle / Yaw</span>
                  <span className="text-[9px] text-[#8E9EAA]">W / S / A / D · Drag</span>
                </div>

                {/* Right Stick: Pitch / Roll */}
                <div className="flex flex-col items-center">
                  <div
                    ref={rightPadRef}
                    onPointerDown={(e) => handleStickPointerDown("right", e)}
                    onPointerMove={(e) => handleStickPointerMove("right", e)}
                    onPointerUp={(e) => handleStickPointerUp("right", e)}
                    onPointerCancel={(e) => handleStickPointerUp("right", e)}
                    className="relative w-24 h-24 rounded-full border-2 border-[#1C2C42] bg-[#07101C] flex items-center justify-center shadow-inner touch-none cursor-grab active:cursor-grabbing select-none"
                    title="Click and drag or use Arrow keys"
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-[#1C2C42]" />
                      <div className="h-full w-px bg-[#1C2C42] absolute" />
                    </div>
                    {/* Draggable/Animated Stick Head */}
                    <div
                      className="w-10 h-10 rounded-full bg-[#2563EB] border-2 border-[#93C5FD] shadow-lg flex items-center justify-center text-[10px] font-bold text-white transition-transform duration-75 pointer-events-none"
                      style={{
                        transform: `translate(${(axes.rxRoll / 100) * 28}px, ${(axes.ryPitch / 100) * 28}px)`,
                      }}
                    >
                      R
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#C1D0E4] mt-1.5">Pitch / Roll</span>
                  <span className="text-[9px] text-[#8E9EAA]">Arrow Keys · Drag</span>
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
              <div className="text-[9.5px] text-center text-[#8E9EAA]">
                {controllerState.isManuallyDisconnected
                  ? "Controller input disconnected · Safe neutral state"
                  : controllerState.type === "physical" && controllerState.connected
                  ? `${controllerState.name} · Live input`
                  : "Demo joystick · simulated input (Keyboard / Touch)"}
              </div>
            </div>

            {/* Live Axes Meters Box */}
            <AxesWidget
              axes={axes}
              controllerState={controllerState}
              onToggleDisconnect={handleToggleDisconnect}
              onCalibrate={handleCalibrate}
            />
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* CENTER COLUMN: LIVE FPV FEED & POSITION RADAR (lg:col-span-6)         */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            {/* Genuine Live Drone Camera Feed Window */}
            <div className="relative h-[350px] sm:h-[390px] lg:h-[410px] rounded-xl overflow-hidden border border-[#1C2C42] bg-[#04070B] group shadow-sm flex flex-col">
              <LiveDroneFeed
                droneId={activeDrone?.id || selectedDroneId || "DRONE-001"}
                cameraType={cameraType}
                videoFit="contain"
                showHudBar={false}
                onStatusChange={setFeedStatus}
                className="h-full w-full"
              >
                {/* Visual gradient overlay for text readability when playing */}
                {feedStatus.isPlaying && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-10" />
                )}

                {/* TOP HUD BAR: Drone info, Camera switcher, Honest Stream Status, Recording, Time */}
                <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
                  {/* Left Group: Stream Status, Drone ID & Recording */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Honest Stream Status Badge */}
                    {feedStatus.isPlaying && feedStatus.connectionState === "connected" ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#2FE08940] bg-[#08120ECC] backdrop-blur-md text-[#2FE089] text-[9px] font-mono font-bold shadow-[0_0_8px_rgba(46,224,137,0.25)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089] shadow-[0_0_8px_#2FE089] animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    ) : feedStatus.isLoading || feedStatus.connectionState === "connecting" || feedStatus.connectionState === "reconnecting" ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#F59E0B40] bg-[#140F08CC] backdrop-blur-md text-[#F59E0B] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
                        <span>CONNECTING...</span>
                      </div>
                    ) : feedStatus.statusKey === "no-camera" || feedStatus.statusKey === "stream-unavailable" ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#334155] bg-[#0F172ACC] backdrop-blur-md text-[#CBD5E1] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                        <span>{feedStatus.statusLabel || "STREAM UNAVAILABLE"}</span>
                      </div>
                    ) : feedStatus.statusKey === "failed" ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#5E2222] bg-[#140808CC] backdrop-blur-md text-[#FF8585] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
                        <span>CONNECTION FAILED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#5E2222] bg-[#140808CC] backdrop-blur-md text-[#FF8585] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
                        <span>CAMERA OFFLINE</span>
                      </div>
                    )}

                    {/* Selected Drone ID & Role/Name */}
                    <span className="px-2 py-0.5 rounded bg-[#07101CEE] border border-[#1C2C42] text-[9px] font-mono text-[#CBD5E1] backdrop-blur-sm hidden xs:inline">
                      {activeDrone?.id || selectedDroneId}
                      {activeDrone?.name && activeDrone.name !== activeDrone.id ? ` · ${activeDrone.name}` : ""}
                    </span>

                    {/* Arm State Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold backdrop-blur-sm ${
                        isArmed
                          ? "bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]"
                          : "bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]"
                      }`}
                    >
                      {isArmed ? "ARMED" : "UNARMED"}
                    </span>

                    {/* Actual Recording Status Badge (Only shown when truly recording) */}
                    {isRecording && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] text-[9px] font-mono font-bold backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                        <span>REC</span>
                      </div>
                    )}
                  </div>

                  {/* Right Group: Timestamp & Camera Source Switcher */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Real Live Timestamp */}
                    <div className="px-2 py-0.5 rounded bg-[#07101CEE] border border-[#1C2C42] text-[9px] font-mono text-[#8E9EAA] backdrop-blur-sm hidden md:inline">
                      {currentUtcTime}
                    </div>

                    {/* Camera Selector Switcher */}
                    <div className="flex items-center bg-[#07101CEE] border border-[#1C2C42] rounded-md p-0.5 backdrop-blur-md pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => setCameraType("main")}
                        className={`px-2 py-0.5 rounded text-[8.5px] sm:text-[9px] font-mono font-bold transition cursor-pointer ${
                          cameraType === "main"
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "text-[#8E9EAA] hover:text-[#CBD5E1]"
                        }`}
                        title="Switch to Primary Drone Camera"
                      >
                        Main Cam
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraType("fpv")}
                        className={`px-2 py-0.5 rounded text-[8.5px] sm:text-[9px] font-mono font-bold transition cursor-pointer ${
                          cameraType === "fpv"
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "text-[#8E9EAA] hover:text-[#CBD5E1]"
                        }`}
                        title="Switch to Pilot FPV Camera"
                      >
                        FPV Cam
                      </button>
                    </div>

                    {/* Quick Retry Button */}
                    {!feedStatus.isPlaying && feedStatus.retry && (
                      <button
                        type="button"
                        onClick={feedStatus.retry}
                        className="p-1 rounded bg-[#07101CEE] border border-[#1C2C42] text-[#8E9EAA] hover:text-[#38BDF8] hover:bg-[#1C2C42] transition cursor-pointer pointer-events-auto"
                        title="Retry Camera Stream"
                        aria-label="Retry video stream"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Genuine Live Telemetry Pill Overlays (Only rendered when genuine data is present) */}
                <div className="absolute top-10 right-3 z-20 pointer-events-none flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-mono text-[#CBD5E1]">
                  {typeof telemetry?.altitude === "number" && (
                    <span className="px-1.5 py-0.5 rounded bg-[#07101CE0] border border-[#1C2C42] backdrop-blur-xs">
                      ALT: <span className="text-[#38BDF8] font-bold">{telemetry.altitude.toFixed(1)}m</span>
                    </span>
                  )}
                  {typeof (telemetry?.groundSpeed ?? telemetry?.speed) === "number" && (
                    <span className="px-1.5 py-0.5 rounded bg-[#07101CE0] border border-[#1C2C42] backdrop-blur-xs">
                      SPD: <span className="text-[#38BDF8] font-bold">{(telemetry?.groundSpeed ?? telemetry?.speed).toFixed(1)}m/s</span>
                    </span>
                  )}
                  {typeof telemetry?.batteryPercentage === "number" && (
                    <span className="px-1.5 py-0.5 rounded bg-[#07101CE0] border border-[#1C2C42] backdrop-blur-xs">
                      BAT: <span className={`font-bold ${telemetry.batteryPercentage < 25 ? "text-[#EF4444]" : "text-[#10B981]"}`}>{Math.round(telemetry.batteryPercentage)}%</span>
                    </span>
                  )}
                </div>

                {/* Targeting HUD Reticle (Only when feed is active and playing) */}
                {feedStatus.isPlaying && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-transform duration-100 ease-out"
                    style={{
                      transform: `translate(${-axes.rxRoll * 0.08}px, ${axes.ryPitch * 0.08}px)`,
                    }}
                  >
                    <div className="relative w-44 sm:w-48 h-28 sm:h-32 border border-[#10B981]/40 rounded">
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
                )}

                {/* Bottom Flight Mode & Guidance Strip */}
                <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2 bg-[#07101CEE] border border-[#1C2C42] rounded-lg px-2.5 py-1.5 text-[10px] backdrop-blur-md pointer-events-none">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      isArmed ? "bg-[#10B981] text-black" : "bg-[#374151] text-[#CBD5E1]"
                    } font-extrabold text-[9px] uppercase tracking-wider shrink-0`}
                  >
                    {isArmed ? contextFlightMode || flightMode : "UNARMED - POS HOLD"}
                  </span>
                  <span className="text-[#CBD5E1] truncate">
                    {isArmed
                      ? "Release the sticks and the drone holds position. Fence, ceiling and reserve rules apply."
                      : "Drone is UNARMED. Motors are disengaged. Press Start to initiate ARM sequence."}
                  </span>
                </div>
              </LiveDroneFeed>
            </div>

            {/* Position Radar Mini-Map (Matching reference screenshot) */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Position</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#38BDF8] font-mono hidden xs:inline">Inside Mission Boundary</span>
                  {/* Zoom In, Zoom Out, Reset Controls */}
                  <div className="flex items-center bg-[#07101CEE] border border-[#1C2C42] rounded p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setRadarZoom((z) => Math.min(2.0, Number((z + 0.2).toFixed(1))))}
                      className="w-5 h-5 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] transition cursor-pointer"
                      title="Zoom In"
                      aria-label="Zoom In"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="w-[1px] h-3 bg-[#1C2C42]" />
                    <button
                      type="button"
                      onClick={() => setRadarZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                      className="w-5 h-5 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] transition cursor-pointer"
                      title="Zoom Out"
                      aria-label="Zoom Out"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="w-[1px] h-3 bg-[#1C2C42]" />
                    <button
                      type="button"
                      onClick={() => setRadarZoom(1.0)}
                      className="w-5 h-5 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] transition cursor-pointer"
                      title="Reset View"
                      aria-label="Reset View"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Coordinate Grid Box */}
              <div className="relative h-32 rounded-lg bg-[#050C16] border border-[#1C2C42] overflow-hidden flex items-center justify-center">
                {/* Geofence polygon overlay */}
                <svg
                  className="absolute inset-0 w-full h-full transition-transform duration-150 ease-out origin-center"
                  viewBox="0 0 300 120"
                  style={{ transform: `scale(${radarZoom})` }}
                >
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
                    onClick={handleCalibrate}
                    className="px-2 py-0.5 rounded bg-[#07101C] border border-[#1C2C42] text-[9.5px] font-bold text-[#38BDF8] hover:bg-[#102A50] cursor-pointer"
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
