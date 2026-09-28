import { useState, useEffect, useRef, useCallback } from "react";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import { flightControlService } from "@/services/control/flightControlService.js";
import { normalizeHeading, getCardinalDirection } from "@/utils/heading.js";
import { getJoystickDirectionLabel } from "@/utils/joystick.js";
import {
  DEFAULT_FLIGHT_MODE,
  isValidGpsCoordinate,
  FALLBACK_DRONE_LOCATION,
  PositionSource,
} from "@/services/telemetry/telemetryTypes.js";

const DEADZONE = 0.08;
const applyDeadzone = (v) => (Math.abs(v) < DEADZONE ? 0 : v);

export { getJoystickDirectionLabel };

const MAX_SPEED = 24.0; // Max horizontal speed in m/s (crisp and visible on map)
const MAX_CLIMB_RATE = 7.0; // Max vertical climb/descent rate in m/s
const YAW_RATE = 80.0; // Max yaw rotation in deg/s
const MAX_PITCH_DEG = 24.0; // Max pitch tilt angle
const MAX_ROLL_DEG = 28.0; // Max roll tilt angle
const MIN_ALTITUDE = 0.0;
const MAX_ALTITUDE = 500.0;

/**
 * Standard Drone Telemetry & Interactive Simulation Hook
 * Bridges live WebSocket telemetry from DroneIQ backend to UI components,
 * while providing authoritative local physics simulation when live telemetry is offline.
 */
export function useDroneTelemetry() {
  const {
    telemetry: liveTelemetry,
    flightMode: canonicalFlightMode,
    setFlightMode,
    isLive,
    connectionState,
    selectedDroneId,
    selectDrone,
    isArmed,
    gimbalState,
    setGimbalPitch,
    setGimbalRoll,
    setGimbalYaw,
    setGimbalOrientation,
    centerGimbal,
  } = useTelemetry();

  // Local simulated telemetry state (Single Source of Truth when offline)
  const [simTelemetry, setSimTelemetry] = useState({
    latitude: FALLBACK_DRONE_LOCATION.latitude,
    longitude: FALLBACK_DRONE_LOCATION.longitude,
    altitude: 0.0,
    heading: 0.0,
    pitch: 0.0,
    roll: 0.0,
    speed: 0.0,
    groundSpeed: 0.0,
    verticalSpeed: 0.0,
    climbRate: 0.0,
    battery: null,
    voltage: null,
    satellites: 0,
    gpsFix: "No Fix",
    armed: isArmed ?? false,
    isArmed: isArmed ?? false,
    flightMode: canonicalFlightMode || DEFAULT_FLIGHT_MODE,
    status: "DISCONNECTED",
    droneConnected: false,
    droneGPSValid: false,
    isLive: false,
  });

  // Authoritative simulation state reference for 60 FPS physics integration
  const simStateRef = useRef({
    latitude: FALLBACK_DRONE_LOCATION.latitude,
    longitude: FALLBACK_DRONE_LOCATION.longitude,
    altitude: 0.0,
    heading: 0.0,
    pitch: 0.0,
    roll: 0.0,
    forwardSpeed: 0.0,
    lateralSpeed: 0.0,
    verticalSpeed: 0.0,
    speed: 0.0,
    flightMode: canonicalFlightMode || DEFAULT_FLIGHT_MODE,
  });

  // Synchronize canonical flightMode from TelemetryContext
  const hasSettledRef = useRef(false);
  const lastUnarmedWarnRef = useRef(0);

  useEffect(() => {
    if (canonicalFlightMode) {
      simStateRef.current.flightMode = canonicalFlightMode;
      hasSettledRef.current = false;
    }
  }, [canonicalFlightMode]);

  useEffect(() => {
    const handleModeChange = (e) => {
      if (e.detail?.mode) {
        simStateRef.current.flightMode = e.detail.mode;
        hasSettledRef.current = false;
      }
    };
    window.addEventListener("aeronexus:flight-mode-change", handleModeChange);
    return () => window.removeEventListener("aeronexus:flight-mode-change", handleModeChange);
  }, []);

  // Real-time flight movement debug verification reference
  const debugFlightInfoRef = useRef({
    droneHeading: 0.0,
    arrowDirection: "N",
    joystickX: 0.0,
    joystickY: 0.0,
    joystickDirection: "NEUTRAL",
    calculatedMovementHeading: 0.0,
    calculatedMovementDirection: "N",
    latitude: FALLBACK_DRONE_LOCATION.latitude,
    longitude: FALLBACK_DRONE_LOCATION.longitude,
    speed: 0.0,
    isArmed: isArmed ?? false,
  });

  // Raw joystick input: normalized [-1.00, +1.00]
  const stickInputRef = useRef({
    throttle: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });
  const [stickInputs, setStickInputs] = useState({
    throttle: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  // Authoritative development simulation switch (Enabled for interactive manual flight)
  const [simulationEnabled, setSimulationEnabled] = useState(true);
  const [simMode, setSimMode] = useState("interactive");

  const movementFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const lastUiSyncRef = useRef(0);
  const isArmedRef = useRef(isArmed ?? false);
  const simulationEnabledRef = useRef(simulationEnabled);
  const canonicalFlightModeRef = useRef(canonicalFlightMode);
  const isLiveRef = useRef(isLive);
  const liveTelemetryRef = useRef(liveTelemetry);

  useEffect(() => {
    simulationEnabledRef.current = simulationEnabled;
  }, [simulationEnabled]);

  useEffect(() => {
    canonicalFlightModeRef.current = canonicalFlightMode;
  }, [canonicalFlightMode]);

  useEffect(() => {
    isLiveRef.current = isLive;
    liveTelemetryRef.current = liveTelemetry;
  }, [isLive, liveTelemetry]);

  // Clean stop of the movement animation loop
  const stopMovementLoop = useCallback(() => {
    if (movementFrameRef.current !== null) {
      cancelAnimationFrame(movementFrameRef.current);
      movementFrameRef.current = null;
    }
  }, []);

  // Immediate disarm flight stoppage: freeze position, zero all velocities, and stop loop
  useEffect(() => {
    isArmedRef.current = isArmed ?? false;
    hasSettledRef.current = false;
    if (!isArmed) {
      stopMovementLoop();
      // 1. Reset stick inputs & notify flightControlService
      const zeroSticks = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      stickInputRef.current = zeroSticks;
      flightControlService.sendControlCommand(zeroSticks);

      // 2. Zero all physics velocities in simStateRef
      const state = simStateRef.current;
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.verticalSpeed = 0;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;

      // Schedule state reset without cascading synchronous render
      queueMicrotask(() => {
        setStickInputs(zeroSticks);
        setSimTelemetry((prev) => ({
          ...prev,
          speed: 0,
          groundSpeed: 0,
          verticalSpeed: 0,
          climbRate: 0,
          pitch: 0,
          roll: 0,
          armed: false,
          isArmed: false,
        }));
      });
    }
  }, [isArmed, stopMovementLoop]);

  const stepMovementRef = useRef(null);

  // Physics simulation step callback
  const stepMovement = useCallback((currentTime) => {
    // 1. If live WebSocket data is actively flowing with valid coordinates from a real drone, bypass local simulation
    const live = liveTelemetryRef.current;
    if (
      isLiveRef.current &&
      live &&
      isValidGpsCoordinate(live.latitude, live.longitude) &&
      live.positionSource === PositionSource.LIVE
    ) {
      stopMovementLoop();
      return;
    }

    // 2. HARD ARMED/UNARMED LOCK: When UNARMED or simulation disabled, stop immediately
    if (!isArmedRef.current || !simulationEnabledRef.current) {
      const state = simStateRef.current;
      state.speed = 0;
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.verticalSpeed = 0;
      state.pitch = 0;
      state.roll = 0;
      stopMovementLoop();
      return;
    }

    const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = currentTime;

    const state = simStateRef.current;

    // 3. Inspect user stick inputs
    const rawSticks = stickInputRef.current;
    const throttleInput = applyDeadzone(rawSticks.throttle || 0);
    const yawInput = applyDeadzone(rawSticks.yaw || 0);
    const pitchInput = applyDeadzone(rawSticks.pitch || 0);
    const rollInput = applyDeadzone(rawSticks.roll || 0);

    const hasHorizontalStick = pitchInput !== 0 || rollInput !== 0;
    const hasVerticalStick = throttleInput !== 0;
    const hasYawStick = yawInput !== 0;
    const hasActiveStick = hasHorizontalStick || hasVerticalStick || hasYawStick;

    // If sticks are released to center/deadzone: IMMEDIATELY stop movement
    if (!hasActiveStick) {
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.verticalSpeed = 0;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;

      hasSettledRef.current = true;
      stopMovementLoop();

      // Sync neutral state to React once
      const safeLat = typeof state.latitude === "number" ? state.latitude : FALLBACK_DRONE_LOCATION.latitude;
      const safeLng = typeof state.longitude === "number" ? state.longitude : FALLBACK_DRONE_LOCATION.longitude;
      const safeHeading = typeof state.heading === "number" ? state.heading : 0;
      const safeAlt = typeof state.altitude === "number" ? state.altitude : 0;

      const settledDebug = {
        droneHeading: Number(safeHeading.toFixed(1)),
        arrowDirection: getCardinalDirection(safeHeading),
        joystickX: 0,
        joystickY: 0,
        joystickDirection: "NEUTRAL",
        calculatedMovementHeading: Number(safeHeading.toFixed(1)),
        calculatedMovementDirection: getCardinalDirection(safeHeading),
        latitude: Number(safeLat.toFixed(6)),
        longitude: Number(safeLng.toFixed(6)),
        speed: 0,
        isArmed: true,
      };
      debugFlightInfoRef.current = settledDebug;

      if (typeof window !== "undefined") {
        window.__DRONE_STATE__ = {
          latitude: Number(safeLat.toFixed(6)),
          longitude: Number(safeLng.toFixed(6)),
          heading: Number(safeHeading.toFixed(1)),
          altitude: Number(safeAlt.toFixed(1)),
          speed: 0,
          roll: 0,
          pitch: 0,
          yaw: 0,
          armed: true,
          arrowDirection: getCardinalDirection(safeHeading),
          calculatedMovementHeading: Number(safeHeading.toFixed(1)),
          calculatedMovementDirection: getCardinalDirection(safeHeading),
        };
      }

      setSimTelemetry((prev) => ({
        ...prev,
        latitude: Number(safeLat.toFixed(6)),
        longitude: Number(safeLng.toFixed(6)),
        altitude: Number(safeAlt.toFixed(1)),
        heading: Number(safeHeading.toFixed(1)),
        pitch: 0,
        roll: 0,
        speed: 0,
        groundSpeed: 0,
        verticalSpeed: 0,
        climbRate: 0,
        battery: 84,
        voltage: 24.2,
        satellites: 18,
        gpsFix: "3D Fix",
        armed: true,
        isArmed: true,
        flightMode: state.flightMode || canonicalFlightModeRef.current || "GUIDED",
        status: "OK",
        flightMovementDebug: settledDebug,
      }));
      return;
    }

    // Active sticks: perform movement integration
    hasSettledRef.current = false;

    // Handle yaw rotation (independent of position)
    if (hasYawStick) {
      state.heading = normalizeHeading(state.heading + yawInput * YAW_RATE * dt);
    }

    // Handle vertical throttle (independent of horizontal position)
    if (hasVerticalStick) {
      const targetVsi = throttleInput * MAX_CLIMB_RATE;
      state.verticalSpeed += (targetVsi - state.verticalSpeed) * Math.min(1, dt * 7.0);
      state.altitude = Math.max(
        MIN_ALTITUDE,
        Math.min(MAX_ALTITUDE, state.altitude + state.verticalSpeed * dt)
      );
    } else {
      state.verticalSpeed = 0;
    }

    if (state.altitude <= MIN_ALTITUDE && state.verticalSpeed < 0) {
      state.verticalSpeed = 0;
    }

    let calculatedMovementHeading = state.heading;

    // HORIZONTAL MOVEMENT: Body-relative to current heading
    if (hasHorizontalStick) {
      const targetPitch = -pitchInput * MAX_PITCH_DEG;
      const targetRoll = rollInput * MAX_ROLL_DEG;
      state.pitch = targetPitch;
      state.roll = targetRoll;

      state.forwardSpeed = pitchInput * MAX_SPEED;
      state.lateralSpeed = rollInput * MAX_SPEED;
      state.speed = Math.hypot(state.forwardSpeed, state.lateralSpeed);

      const headingRad = (state.heading * Math.PI) / 180;
      const vNorth =
        state.forwardSpeed * Math.cos(headingRad) -
        state.lateralSpeed * Math.sin(headingRad);
      const vEast =
        state.forwardSpeed * Math.sin(headingRad) +
        state.lateralSpeed * Math.cos(headingRad);

      calculatedMovementHeading = ((Math.atan2(vEast, vNorth) * 180) / Math.PI + 360) % 360;

      const metersPerDegLat = 111320;
      const metersPerDegLng =
        111320 * Math.cos((state.latitude * Math.PI) / 180);

      const prevLat = state.latitude;
      const prevLng = state.longitude;

      state.latitude += (vNorth * dt) / metersPerDegLat;
      state.longitude += (vEast * dt) / metersPerDegLng;

      if (import.meta.env?.DEV) {
        console.debug(`[DRONE POSITION UPDATE] source: JOYSTICK previous: ${prevLat.toFixed(6)},${prevLng.toFixed(6)} next: ${state.latitude.toFixed(6)},${state.longitude.toFixed(6)} armed: true joystick: ${pitchInput.toFixed(2)},${rollInput.toFixed(2)} reason: ACTIVE_JOYSTICK_INPUT`);
      }
    } else {
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;
    }

    const debugInfo = {
      droneHeading: Number(state.heading.toFixed(1)),
      arrowDirection: getCardinalDirection(state.heading),
      joystickX: Number((rawSticks.roll || 0).toFixed(2)),
      joystickY: Number((rawSticks.pitch || 0).toFixed(2)),
      joystickDirection: getJoystickDirectionLabel(
        rawSticks.pitch || 0,
        rawSticks.roll || 0,
        rawSticks.throttle || 0,
        rawSticks.yaw || 0
      ),
      calculatedMovementHeading: Number(calculatedMovementHeading.toFixed(1)),
      calculatedMovementDirection: hasHorizontalStick
        ? getCardinalDirection(calculatedMovementHeading)
        : getCardinalDirection(state.heading),
      latitude: Number(state.latitude.toFixed(6)),
      longitude: Number(state.longitude.toFixed(6)),
      speed: Number(state.speed.toFixed(1)),
      isArmed: true,
    };
    debugFlightInfoRef.current = debugInfo;

    if (typeof window !== "undefined") {
      window.__DRONE_STATE__ = {
        latitude: Number(state.latitude.toFixed(6)),
        longitude: Number(state.longitude.toFixed(6)),
        heading: Number(state.heading.toFixed(1)),
        altitude: Number(state.altitude.toFixed(1)),
        speed: Number(state.speed.toFixed(1)),
        roll: Number(state.roll.toFixed(1)),
        pitch: Number(state.pitch.toFixed(1)),
        yaw: Number((rawSticks.yaw || 0).toFixed(2)),
        armed: true,
        arrowDirection: getCardinalDirection(state.heading),
        calculatedMovementHeading: Number(calculatedMovementHeading.toFixed(1)),
        calculatedMovementDirection: debugInfo.calculatedMovementDirection,
      };
    }

    // Synchronize to React state at ~30 FPS throttle
    if (currentTime - lastUiSyncRef.current >= 33) {
      lastUiSyncRef.current = currentTime;
      const safeLat = typeof state.latitude === "number" ? state.latitude : FALLBACK_DRONE_LOCATION.latitude;
      const safeLng = typeof state.longitude === "number" ? state.longitude : FALLBACK_DRONE_LOCATION.longitude;
      const safeHeading = typeof state.heading === "number" ? state.heading : 0;
      const safeAlt = typeof state.altitude === "number" ? state.altitude : 0;

      setSimTelemetry((prev) => ({
        ...prev,
        latitude: Number(safeLat.toFixed(6)),
        longitude: Number(safeLng.toFixed(6)),
        altitude: Number(safeAlt.toFixed(1)),
        heading: Number(safeHeading.toFixed(1)),
        pitch: Number(state.pitch.toFixed(1)),
        roll: Number(state.roll.toFixed(1)),
        speed: Number(state.speed.toFixed(1)),
        groundSpeed: Number(state.speed.toFixed(1)),
        verticalSpeed: Number(state.verticalSpeed.toFixed(2)),
        climbRate: Number(state.verticalSpeed.toFixed(2)),
        battery: 84,
        voltage: 24.2,
        satellites: 18,
        gpsFix: "3D Fix",
        armed: true,
        isArmed: true,
        flightMode: state.flightMode || canonicalFlightModeRef.current || "GUIDED",
        status: "OK",
        flightMovementDebug: debugInfo,
      }));
    }

    // Continue physics loop while pilot holds sticks
    if (stepMovementRef.current) {
      movementFrameRef.current = requestAnimationFrame(stepMovementRef.current);
    }
  }, [stopMovementLoop]);

  useEffect(() => {
    stepMovementRef.current = stepMovement;
  }, [stepMovement]);

  // Start movement loop safely (no duplicates)
  const startMovementLoop = useCallback(() => {
    if (movementFrameRef.current !== null) return;
    lastTimeRef.current = performance.now();
    if (stepMovementRef.current) {
      movementFrameRef.current = requestAnimationFrame(stepMovementRef.current);
    }
  }, []);

  /**
   * Update stick inputs from virtual joysticks or keyboard
   * @param {Object} sticks - { throttle, yaw, pitch, roll }
   */
  const updateStickInputs = useCallback((sticks) => {
    const rawSticks = {
      throttle: sticks.throttle || 0,
      yaw: sticks.yaw || 0,
      pitch: sticks.pitch || 0,
      roll: sticks.roll || 0,
    };

    const nextSticks = {
      throttle: applyDeadzone(rawSticks.throttle),
      yaw: applyDeadzone(rawSticks.yaw),
      pitch: applyDeadzone(rawSticks.pitch),
      roll: applyDeadzone(rawSticks.roll),
    };

    const hasInput =
      nextSticks.throttle !== 0 ||
      nextSticks.yaw !== 0 ||
      nextSticks.pitch !== 0 ||
      nextSticks.roll !== 0;

    // Update stick inputs so the joystick knobs and HUD reflect active pilot touch/key inputs
    stickInputRef.current = nextSticks;
    setStickInputs(nextSticks);

    // CRITICAL HARD INVARIANT: When UNARMED, reject physical position movement immediately.
    // Display pilot stick activity in HUD and UI, but freeze velocities and geographical coordinates.
    if (!isArmedRef.current) {
      stopMovementLoop();
      // Hard lock: guarantee zero movement velocities in simulation state
      const state = simStateRef.current;
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.verticalSpeed = 0;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;

      // Ensure no physical commands are dispatched while unarmed
      flightControlService.sendControlCommand({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });
      return;
    }

    // In autonomous / safety priority modes (RTL, LAND, AUTO, BRAKE), joystick input is inhibited while active
    const activeMode = simStateRef.current.flightMode || canonicalFlightModeRef.current || "GUIDED";
    const isAutonomousMode =
      activeMode === "RTL" ||
      activeMode === "LAND" ||
      activeMode === "AUTO" ||
      activeMode === "BRAKE";

    if (isAutonomousMode) {
      stopMovementLoop();
      const zeroSticks = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      stickInputRef.current = zeroSticks;
      setStickInputs(zeroSticks);
      flightControlService.sendControlCommand(zeroSticks);
      return;
    }

    // Forward to flight control service abstraction
    flightControlService.sendControlCommand(nextSticks);

    // Start movement loop if armed and active stick input exists
    if (hasInput && simulationEnabledRef.current) {
      startMovementLoop();
    }
  }, [stopMovementLoop, startMovementLoop]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      stopMovementLoop();
    };
  }, [stopMovementLoop]);


  // Takeoff command with authoritative safety guard
  const takeoff = useCallback(() => {
    if (!isArmed) {
      return false;
    }
    const state = simStateRef.current;
    state.verticalSpeed = 2.5;
    state.flightMode = "TAKEOFF";
    return true;
  }, [isArmed]);

  // Active authoritative telemetry: Live WebSocket data takes priority ONLY if real connection and valid GPS fix exist
  const hasLiveGps = Boolean(
    isLive &&
    liveTelemetry &&
    isValidGpsCoordinate(liveTelemetry.latitude, liveTelemetry.longitude) &&
    liveTelemetry.positionSource === PositionSource.LIVE
  );

  const activeTelemetry = hasLiveGps
    ? {
        ...liveTelemetry,
        pitch: isArmed ? (typeof liveTelemetry.pitch === "number" ? liveTelemetry.pitch : 0) : 0,
        roll: isArmed ? (typeof liveTelemetry.roll === "number" ? liveTelemetry.roll : 0) : 0,
        heading:
          typeof liveTelemetry.heading === "number"
            ? liveTelemetry.heading
            : liveTelemetry.yaw || 0,
        altitude:
          typeof liveTelemetry.altitude === "number" ? liveTelemetry.altitude : 0,
        verticalSpeed: isArmed
          ? (typeof liveTelemetry.verticalSpeed === "number"
              ? liveTelemetry.verticalSpeed
              : liveTelemetry.climbRate || 0)
          : 0,
        climbRate: isArmed
          ? (typeof liveTelemetry.climbRate === "number"
              ? liveTelemetry.climbRate
              : liveTelemetry.verticalSpeed || 0)
          : 0,
        speed: isArmed
          ? (typeof liveTelemetry.speed === "number"
              ? liveTelemetry.speed
              : liveTelemetry.groundSpeed || 0)
          : 0,
        groundSpeed: isArmed
          ? (typeof liveTelemetry.groundSpeed === "number"
              ? liveTelemetry.groundSpeed
              : liveTelemetry.speed || 0)
          : 0,
        battery:
          typeof liveTelemetry.batteryPercentage === "number"
            ? liveTelemetry.batteryPercentage
            : 84,
        flightMode: canonicalFlightMode || DEFAULT_FLIGHT_MODE,
        armed: isArmed,
        isArmed: isArmed,
        status: liveTelemetry.status || "OK",
        satellites: liveTelemetry.gpsSatellites || 18,
        gpsSatellites: liveTelemetry.gpsSatellites || 18,
        gpsFix: "3D Fix",
        latitude: liveTelemetry.latitude,
        longitude: liveTelemetry.longitude,
        positionSource: PositionSource.LIVE,
        droneConnected: true,
        droneGPSValid: true,
        isLive: true,
        flightMovementDebug: {
          droneHeading: typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0,
          arrowDirection: getCardinalDirection(typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0),
          joystickX: stickInputs.roll || 0,
          joystickY: stickInputs.pitch || 0,
          joystickDirection: "LIVE",
          calculatedMovementHeading: typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0,
          calculatedMovementDirection: getCardinalDirection(typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0),
          latitude: liveTelemetry.latitude,
          longitude: liveTelemetry.longitude,
          speed: typeof liveTelemetry.speed === "number" ? liveTelemetry.speed : 0,
          isArmed,
        },
      }
    : {
        ...simTelemetry,
        latitude: typeof simTelemetry.latitude === "number" ? simTelemetry.latitude : FALLBACK_DRONE_LOCATION.latitude,
        longitude: typeof simTelemetry.longitude === "number" ? simTelemetry.longitude : FALLBACK_DRONE_LOCATION.longitude,
        heading: typeof simTelemetry.heading === "number" ? simTelemetry.heading : 0,
        altitude: typeof simTelemetry.altitude === "number" ? simTelemetry.altitude : 0,
        positionSource: PositionSource.HYDERABAD_FALLBACK,
        droneConnected: Boolean(isLive),
        droneGPSValid: false,
        isLive: false,
        status: isLive ? "NO_GPS" : "DISCONNECTED",
        speed: isArmed ? (simTelemetry.speed || 0) : 0,
        groundSpeed: isArmed ? (simTelemetry.groundSpeed || 0) : 0,
        verticalSpeed: isArmed ? (simTelemetry.verticalSpeed || 0) : 0,
        climbRate: isArmed ? (simTelemetry.climbRate || 0) : 0,
        pitch: isArmed ? (simTelemetry.pitch || 0) : 0,
        roll: isArmed ? (simTelemetry.roll || 0) : 0,
        armed: isArmed,
        isArmed: isArmed,
        gimbal: gimbalState,
        flightMovementDebug: simTelemetry.flightMovementDebug || {
          droneHeading: simTelemetry.heading || 0,
          arrowDirection: getCardinalDirection(simTelemetry.heading || 0),
          joystickX: stickInputs.roll || 0,
          joystickY: stickInputs.pitch || 0,
          joystickDirection: getJoystickDirectionLabel(
            stickInputs.pitch || 0,
            stickInputs.roll || 0,
            stickInputs.throttle || 0,
            stickInputs.yaw || 0
          ),
          calculatedMovementHeading: simTelemetry.heading || 0,
          calculatedMovementDirection: isArmed
            ? getCardinalDirection(simTelemetry.heading || 0)
            : "LOCKED (UNARMED)",
          latitude: simTelemetry.latitude ?? FALLBACK_DRONE_LOCATION.latitude,
          longitude: simTelemetry.longitude ?? FALLBACK_DRONE_LOCATION.longitude,
          speed: isArmed ? (simTelemetry.speed || 0) : 0,
          isArmed,
        },
      };

  return {
    telemetry: {
      ...activeTelemetry,
      gimbal: activeTelemetry.gimbal || gimbalState,
    },
    positionSource: activeTelemetry.positionSource,
    flightMode: activeTelemetry.flightMode,
    setFlightMode,
    updateStickInputs,
    stickInputs,
    simMode,
    setSimMode,
    simulationEnabled,
    setSimulationEnabled,
    takeoff,
    isArmed,
    isLive,
    connectionState,
    selectedDroneId,
    selectDrone,
    gimbalState,
    setGimbalPitch,
    setGimbalRoll,
    setGimbalYaw,
    setGimbalOrientation,
    centerGimbal,
  };
}

export default useDroneTelemetry;
