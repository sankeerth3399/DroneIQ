import { useState, useEffect, useRef, useCallback } from "react";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import { flightControlService } from "@/services/control/flightControlService.js";
import { normalizeHeading, getCardinalDirection } from "@/utils/heading.js";
import { getJoystickDirectionLabel } from "@/utils/joystick.js";
import { DEFAULT_FLIGHT_MODE } from "@/services/telemetry/telemetryTypes.js";

const DEADZONE = 0.04;
const applyDeadzone = (v) => (Math.abs(v) < DEADZONE ? 0 : v);

export { getJoystickDirectionLabel };

const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
    showToast,
    gimbalState,
    setGimbalPitch,
    setGimbalRoll,
    setGimbalYaw,
    setGimbalOrientation,
    centerGimbal,
  } = useTelemetry();

  // Local simulated telemetry state (Single Source of Truth when offline)
  const [simTelemetry, setSimTelemetry] = useState({
    latitude: 17.385000,
    longitude: 78.486700,
    altitude: 48.5,
    heading: 0.0,
    pitch: 0.0,
    roll: 0.0,
    speed: 0.0,
    groundSpeed: 0.0,
    verticalSpeed: 0.0,
    climbRate: 0.0,
    battery: 84,
    voltage: 24.2,
    satellites: 18,
    gpsFix: "3D Fix",
    armed: isArmed ?? false,
    isArmed: isArmed ?? false,
    flightMode: canonicalFlightMode || DEFAULT_FLIGHT_MODE,
    status: "OK",
  });

  // Stored home / launch location for RTL return
  const homePositionRef = useRef({
    latitude: 17.385000,
    longitude: 78.486700,
    altitude: 48.5,
  });

  // Authoritative simulation state reference for 60 FPS physics integration
  const simStateRef = useRef({
    latitude: 17.385000,
    longitude: 78.486700,
    altitude: 48.5,
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
    latitude: 17.385000,
    longitude: 78.486700,
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

  const hasSettledRef = useRef(false);
  const lastUnarmedWarnRef = useRef(0);

  // Mode: 'interactive' (joystick control) vs 'patrol' (autonomous orbit demo)
  const [simMode, setSimMode] = useState("interactive");

  // Immediate disarm flight stoppage: freeze position and zero all velocities immediately
  useEffect(() => {
    if (!isArmed) {
      // 1. Reset stick inputs & notify flight control service
      stickInputRef.current = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      flightControlService.sendControlCommand(stickInputRef.current);

      // 2. Zero all physics velocities in simStateRef
      const state = simStateRef.current;
      state.forwardSpeed = 0;
      state.lateralSpeed = 0;
      state.verticalSpeed = 0;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;
    }
  }, [isArmed]);

  /**
   * Update stick inputs from virtual joysticks or keyboard
   * @param {Object} sticks - { throttle, yaw, pitch, roll }
   */
  const updateStickInputs = useCallback((sticks) => {
    // CRITICAL: When UNARMED, reject stick input and notify user
    if (!isArmed) {
      const hasInput =
        Math.abs(sticks.throttle || 0) > DEADZONE ||
        Math.abs(sticks.yaw || 0) > DEADZONE ||
        Math.abs(sticks.pitch || 0) > DEADZONE ||
        Math.abs(sticks.roll || 0) > DEADZONE;

      if (hasInput) {
        const now = performance.now();
        if (now - lastUnarmedWarnRef.current > 2500) {
          lastUnarmedWarnRef.current = now;
          if (typeof showToast === "function") {
            showToast("Drone is UNARMED — Arm the drone before flying.", "warning");
          }
        }
      }

      stickInputRef.current = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      flightControlService.sendControlCommand(stickInputRef.current);
      return;
    }

    // In autonomous / safety priority modes (RTL, LAND, AUTO, BRAKE), joystick input is inhibited while active
    const activeMode = simStateRef.current.flightMode || "GUIDED";
    const isAutonomousMode =
      activeMode === "RTL" ||
      activeMode === "LAND" ||
      activeMode === "AUTO" ||
      activeMode === "BRAKE";

    if (isAutonomousMode) {
      stickInputRef.current = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
      flightControlService.sendControlCommand(stickInputRef.current);
      return;
    }

    stickInputRef.current = {
      ...stickInputRef.current,
      ...sticks,
    };

    // Forward to flight control service abstraction
    flightControlService.sendControlCommand(stickInputRef.current);
  }, [isArmed, showToast]);

  // Authoritative Physics Simulation Loop
  useEffect(() => {
    // If live WebSocket data is actively flowing with valid coordinates, bypass local simulation
    if (isLive && liveTelemetry && typeof liveTelemetry.latitude === "number" && liveTelemetry.latitude !== 0) return;

    let animFrameId;
    let lastTime = performance.now();
    let lastUiSync = 0;
    let ambientPhase = 0;

    const step = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      ambientPhase += dt * 1.5;

      const state = simStateRef.current;

      // CRITICAL FLIGHT SAFETY LOCK:
      // When UNARMED, all flight controls, physics movement, and attitude dynamics are strictly locked.
      if (!isArmed) {
        state.speed = 0;
        state.forwardSpeed = 0;
        state.lateralSpeed = 0;
        state.verticalSpeed = 0;
        state.pitch = 0;
        state.roll = 0;

        if (!hasSettledRef.current) {
          hasSettledRef.current = true;
          const settledDebug = {
            droneHeading: Number(state.heading.toFixed(1)),
            arrowDirection: getCardinalDirection(state.heading),
            joystickX: 0,
            joystickY: 0,
            joystickDirection: "NEUTRAL",
            calculatedMovementHeading: Number(state.heading.toFixed(1)),
            calculatedMovementDirection: getCardinalDirection(state.heading),
            latitude: Number(state.latitude.toFixed(6)),
            longitude: Number(state.longitude.toFixed(6)),
            speed: 0,
            isArmed: false,
          };
          debugFlightInfoRef.current = settledDebug;

          if (typeof window !== "undefined") {
            window.__DRONE_STATE__ = {
              latitude: Number(state.latitude.toFixed(6)),
              longitude: Number(state.longitude.toFixed(6)),
              heading: Number(state.heading.toFixed(1)),
              altitude: Number(state.altitude.toFixed(1)),
              speed: 0,
              roll: 0,
              pitch: 0,
              yaw: 0,
              armed: false,
              arrowDirection: getCardinalDirection(state.heading),
              calculatedMovementHeading: Number(state.heading.toFixed(1)),
              calculatedMovementDirection: getCardinalDirection(state.heading),
            };
          }

          setSimTelemetry({
            latitude: Number(state.latitude.toFixed(6)),
            longitude: Number(state.longitude.toFixed(6)),
            altitude: Number(state.altitude.toFixed(1)),
            heading: Number(state.heading.toFixed(1)),
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
            armed: false,
            isArmed: false,
            flightMode: state.flightMode || canonicalFlightMode || "GUIDED",
            status: "OK",
            flightMovementDebug: settledDebug,
          });
        }

        animFrameId = requestAnimationFrame(step);
        return;
      }

      const rawSticks = stickInputRef.current;

      const throttleInput = applyDeadzone(rawSticks.throttle || 0);
      const yawInput = applyDeadzone(rawSticks.yaw || 0);
      const pitchInput = applyDeadzone(rawSticks.pitch || 0);
      const rollInput = applyDeadzone(rawSticks.roll || 0);

      const hasActiveStick =
        throttleInput !== 0 || yawInput !== 0 || pitchInput !== 0 || rollInput !== 0;

      const currentMode = state.flightMode || canonicalFlightMode || "GUIDED";

      // -------------------------------------------------------------
      // FLIGHT MODE EXECUTION ENGINE (10 Canonical Modes)
      // -------------------------------------------------------------
      if (currentMode === "RTL") {
        // Return-To-Launch: Autonomous return toward stored home location
        const home = homePositionRef.current;
        const distToHome = calculateDistanceMeters(state.latitude, state.longitude, home.latitude, home.longitude);

        if (distToHome > 2.0) {
          const targetHeading = calculateBearing(state.latitude, state.longitude, home.latitude, home.longitude);
          const diff = ((targetHeading - state.heading + 540) % 360) - 180;
          state.heading = normalizeHeading(state.heading + Math.sign(diff) * Math.min(Math.abs(diff), YAW_RATE * dt));

          // Cruise forward speed ~10 m/s
          state.forwardSpeed += (10.0 - state.forwardSpeed) * Math.min(1, dt * 4.0);
          state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 5.0);

          const targetPitch = -14.0;
          state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 6.0);
          state.roll += (0 - state.roll) * Math.min(1, dt * 6.0);

          const returnAlt = Math.max(state.altitude, 48.5);
          state.verticalSpeed += ((returnAlt - state.altitude) * 0.8 - state.verticalSpeed) * Math.min(1, dt * 4.0);
          state.altitude = Math.max(MIN_ALTITUDE, Math.min(MAX_ALTITUDE, state.altitude + state.verticalSpeed * dt));
        } else {
          // Reached home area: stabilize and descend to land
          state.forwardSpeed += (0 - state.forwardSpeed) * Math.min(1, dt * 6.0);
          state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 6.0);
          state.pitch += (0 - state.pitch) * Math.min(1, dt * 6.0);
          state.roll += (0 - state.roll) * Math.min(1, dt * 6.0);

          state.verticalSpeed += (-1.5 - state.verticalSpeed) * Math.min(1, dt * 4.0);
          state.altitude = Math.max(0, state.altitude + state.verticalSpeed * dt);
          if (state.altitude <= 0.1) {
            state.altitude = 0;
            state.verticalSpeed = 0;
            state.speed = 0;
          }
        }
      } else if (currentMode === "LAND") {
        // Immediate descent and landing at current coordinates
        state.forwardSpeed += (0 - state.forwardSpeed) * Math.min(1, dt * 8.0);
        state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 8.0);
        state.pitch += (0 - state.pitch) * Math.min(1, dt * 8.0);
        state.roll += (0 - state.roll) * Math.min(1, dt * 8.0);

        if (state.altitude > 0) {
          state.verticalSpeed += (-1.6 - state.verticalSpeed) * Math.min(1, dt * 5.0);
          state.altitude = Math.max(0, state.altitude + state.verticalSpeed * dt);
        } else {
          state.altitude = 0;
          state.verticalSpeed = 0;
          state.speed = 0;
        }
      } else if (currentMode === "BRAKE") {
        // Emergency/Priority braking: bring all velocities rapidly to zero
        state.forwardSpeed += (0 - state.forwardSpeed) * Math.min(1, dt * 14.0);
        state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 14.0);
        state.verticalSpeed += (0 - state.verticalSpeed) * Math.min(1, dt * 12.0);
        state.pitch += (0 - state.pitch) * Math.min(1, dt * 10.0);
        state.roll += (0 - state.roll) * Math.min(1, dt * 10.0);
      } else if (currentMode === "AUTO") {
        // Autonomous Mission / Orbit Patrol
        const orbitRate = 12.0;
        state.heading = normalizeHeading(state.heading + orbitRate * dt);
        state.roll += (12.0 - state.roll) * (dt * 2.5);
        state.pitch += (Math.sin(ambientPhase * 0.6) * 2.5 - state.pitch) * (dt * 2.5);
        state.speed = 8.4 + Math.sin(ambientPhase) * 1.0;
        state.altitude = 48.5 + Math.sin(ambientPhase * 0.4) * 2.0;
        state.verticalSpeed = Math.cos(ambientPhase * 0.4) * 0.8;
      } else {
        // MANUAL, STABILIZE, ALT_HOLD, POS_HOLD, LOITER, GUIDED
        // 1. LEFT JOYSTICK - YAW (X-Axis): Rotate drone heading
        if (yawInput !== 0) {
          state.heading = normalizeHeading(state.heading + yawInput * YAW_RATE * dt);
        }

        // 2. LEFT JOYSTICK - THROTTLE (Y-Axis): Vertical Speed & Altitude
        if (currentMode === "ALT_HOLD" || currentMode === "POS_HOLD" || currentMode === "LOITER") {
          // Holds altitude when throttle is neutral
          if (throttleInput !== 0) {
            const targetVsi = throttleInput * MAX_CLIMB_RATE;
            state.verticalSpeed += (targetVsi - state.verticalSpeed) * Math.min(1, dt * 7.0);
            state.altitude = Math.max(
              MIN_ALTITUDE,
              Math.min(MAX_ALTITUDE, state.altitude + state.verticalSpeed * dt)
            );
          } else {
            state.verticalSpeed += (0 - state.verticalSpeed) * Math.min(1, dt * 8.0);
          }
        } else {
          // MANUAL, STABILIZE, GUIDED
          const targetVsi = throttleInput * MAX_CLIMB_RATE;
          state.verticalSpeed += (targetVsi - state.verticalSpeed) * Math.min(1, dt * 7.0);
          state.altitude = Math.max(
            MIN_ALTITUDE,
            Math.min(MAX_ALTITUDE, state.altitude + state.verticalSpeed * dt)
          );
        }

        if (state.altitude <= MIN_ALTITUDE && state.verticalSpeed < 0) {
          state.verticalSpeed = 0;
        }

        // 3. RIGHT JOYSTICK - PITCH & ROLL ATTITUDE (Horizontal movement)
        if (pitchInput !== 0 || rollInput !== 0) {
          const targetPitch = -pitchInput * MAX_PITCH_DEG;
          state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 8.0);

          const targetRoll = rollInput * MAX_ROLL_DEG;
          state.roll += (targetRoll - state.roll) * Math.min(1, dt * 8.0);

          const targetFwdSpeed = pitchInput * MAX_SPEED;
          const targetLatSpeed = rollInput * MAX_SPEED;

          state.forwardSpeed += (targetFwdSpeed - state.forwardSpeed) * Math.min(1, dt * 5.0);
          state.lateralSpeed += (targetLatSpeed - state.lateralSpeed) * Math.min(1, dt * 5.0);
        } else {
          // Neutral joysticks
          if (currentMode === "POS_HOLD" || currentMode === "LOITER") {
            // Swift braking to hold position
            state.forwardSpeed += (0 - state.forwardSpeed) * Math.min(1, dt * 9.0);
            state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 9.0);
            state.pitch += (0 - state.pitch) * Math.min(1, dt * 7.0);
            state.roll += (0 - state.roll) * Math.min(1, dt * 7.0);
          } else {
            // MANUAL, STABILIZE, GUIDED: self-leveling attitude with gentle ambient stabilization
            const ambientPitch = Math.sin(ambientPhase * 1.1) * 0.4;
            const ambientRoll = Math.cos(ambientPhase * 0.9) * 0.4;

            state.pitch += (ambientPitch - state.pitch) * Math.min(1, dt * 4.0);
            state.roll += (ambientRoll - state.roll) * Math.min(1, dt * 4.0);
            state.verticalSpeed += (0 - state.verticalSpeed) * Math.min(1, dt * 6.0);
            state.forwardSpeed += (0 - state.forwardSpeed) * Math.min(1, dt * 4.0);
            state.lateralSpeed += (0 - state.lateralSpeed) * Math.min(1, dt * 4.0);
          }
        }
      }

      state.speed = Math.hypot(state.forwardSpeed, state.lateralSpeed);
      if (state.speed < 0.04) {
        state.speed = 0;
        state.forwardSpeed = 0;
        state.lateralSpeed = 0;
      }
      if (Math.abs(state.verticalSpeed) < 0.04) state.verticalSpeed = 0;

      let calculatedMovementHeading = state.heading;
      // Apply continuous geographic displacement along heading vector
      if (state.speed > 0.02) {
        const headingRad = (state.heading * Math.PI) / 180;
        const vNorth =
          state.forwardSpeed * Math.cos(headingRad) -
          state.lateralSpeed * Math.sin(headingRad);
        const vEast =
          state.forwardSpeed * Math.sin(headingRad) +
          state.lateralSpeed * Math.cos(headingRad);

        calculatedMovementHeading = ((Math.atan2(vEast, vNorth) * 180) / Math.PI + 360) % 360;

        const metersPerDegLat = 111139;
        const metersPerDegLng =
          111139 * Math.cos((state.latitude * Math.PI) / 180);

        state.latitude += (vNorth * dt) / metersPerDegLat;
        state.longitude += (vEast * dt) / metersPerDegLng;
      }

      const debugInfo = {
        droneHeading: Number(state.heading.toFixed(1)),
        arrowDirection: getCardinalDirection(state.heading),
        joystickX: Number((rawSticks.roll || 0).toFixed(2)),
        joystickY: Number((rawSticks.pitch || 0).toFixed(2)),
        joystickDirection: getJoystickDirectionLabel(rawSticks.pitch, rawSticks.roll),
        calculatedMovementHeading: Number(calculatedMovementHeading.toFixed(1)),
        calculatedMovementDirection: getCardinalDirection(calculatedMovementHeading),
        latitude: Number(state.latitude.toFixed(6)),
        longitude: Number(state.longitude.toFixed(6)),
        speed: Number(state.speed.toFixed(1)),
        isArmed,
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
          armed: isArmed,
          arrowDirection: getCardinalDirection(state.heading),
          calculatedMovementHeading: Number(calculatedMovementHeading.toFixed(1)),
          calculatedMovementDirection: getCardinalDirection(calculatedMovementHeading),
        };
      }

      // Synchronize to React state at ~30 FPS only while moving or settling
      const isMoving =
        hasActiveStick ||
        state.speed > 0.01 ||
        Math.abs(state.verticalSpeed) > 0.01 ||
        Math.abs(state.pitch) > 0.2 ||
        Math.abs(state.roll) > 0.2 ||
        currentMode === "RTL" ||
        currentMode === "LAND" ||
        currentMode === "AUTO" ||
        currentMode === "BRAKE" ||
        simMode !== "interactive";

      if (isMoving) {
        hasSettledRef.current = false;
        if (currentTime - lastUiSync >= 33) {
          lastUiSync = currentTime;
          setSimTelemetry({
            latitude: Number(state.latitude.toFixed(6)),
            longitude: Number(state.longitude.toFixed(6)),
            altitude: Number(state.altitude.toFixed(1)),
            heading: Number(state.heading.toFixed(1)),
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
            armed: isArmed,
            isArmed: isArmed,
            flightMode: state.flightMode || canonicalFlightMode || "GUIDED",
            status: "OK",
            flightMovementDebug: debugFlightInfoRef.current,
          });
        }
      } else if (!hasSettledRef.current) {
        // Drone reached rest: sync final neutral telemetry once and pause React re-renders
        hasSettledRef.current = true;
        const settledDebug = {
          droneHeading: Number(state.heading.toFixed(1)),
          arrowDirection: getCardinalDirection(state.heading),
          joystickX: 0,
          joystickY: 0,
          joystickDirection: "NEUTRAL",
          calculatedMovementHeading: Number(state.heading.toFixed(1)),
          calculatedMovementDirection: getCardinalDirection(state.heading),
          latitude: Number(state.latitude.toFixed(6)),
          longitude: Number(state.longitude.toFixed(6)),
          speed: 0,
          isArmed,
        };
        debugFlightInfoRef.current = settledDebug;

        if (typeof window !== "undefined") {
          window.__DRONE_STATE__ = {
            latitude: Number(state.latitude.toFixed(6)),
            longitude: Number(state.longitude.toFixed(6)),
            heading: Number(state.heading.toFixed(1)),
            altitude: Number(state.altitude.toFixed(1)),
            speed: 0,
            roll: 0,
            pitch: 0,
            yaw: 0,
            armed: isArmed,
            arrowDirection: getCardinalDirection(state.heading),
            calculatedMovementHeading: Number(state.heading.toFixed(1)),
            calculatedMovementDirection: getCardinalDirection(state.heading),
          };
        }

        setSimTelemetry({
          latitude: Number(state.latitude.toFixed(6)),
          longitude: Number(state.longitude.toFixed(6)),
          altitude: Number(state.altitude.toFixed(1)),
          heading: Number(state.heading.toFixed(1)),
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
          armed: isArmed,
          isArmed: isArmed,
          flightMode: state.flightMode || canonicalFlightMode || "GUIDED",
          status: "OK",
          flightMovementDebug: settledDebug,
        });
      }

      animFrameId = requestAnimationFrame(step);
    };

    animFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameId);
  }, [isLive, liveTelemetry, simMode, isArmed, canonicalFlightMode]);

  // Takeoff command with authoritative safety guard
  const takeoff = useCallback(() => {
    if (!isArmed) {
      if (typeof showToast === "function") {
        showToast("Takeoff blocked — Drone is UNARMED.", "warning");
      }
      return false;
    }
    const state = simStateRef.current;
    state.verticalSpeed = 2.5;
    state.flightMode = "TAKEOFF";
    return true;
  }, [isArmed, showToast]);

  // Active authoritative telemetry: Live WebSocket data takes priority ONLY if active packets are flowing
  const isActivelyLive = Boolean(
    isLive &&
    liveTelemetry &&
    typeof liveTelemetry.latitude === "number" &&
    liveTelemetry.latitude !== 0
  );

  const activeTelemetry = isActivelyLive
    ? {
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
        latitude:
          typeof liveTelemetry.latitude === "number"
            ? liveTelemetry.latitude
            : 17.385000,
        longitude:
          typeof liveTelemetry.longitude === "number"
            ? liveTelemetry.longitude
            : 78.486700,
        flightMovementDebug: {
          droneHeading: typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0,
          arrowDirection: getCardinalDirection(typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0),
          joystickX: 0,
          joystickY: 0,
          joystickDirection: "LIVE",
          calculatedMovementHeading: typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0,
          calculatedMovementDirection: getCardinalDirection(typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : 0),
          latitude: typeof liveTelemetry.latitude === "number" ? liveTelemetry.latitude : 17.385000,
          longitude: typeof liveTelemetry.longitude === "number" ? liveTelemetry.longitude : 78.486700,
          speed: typeof liveTelemetry.speed === "number" ? liveTelemetry.speed : 0,
          isArmed,
        },
      }
    : {
        ...simTelemetry,
        speed: isArmed ? simTelemetry.speed : 0,
        groundSpeed: isArmed ? simTelemetry.groundSpeed : 0,
        verticalSpeed: isArmed ? simTelemetry.verticalSpeed : 0,
        climbRate: isArmed ? simTelemetry.climbRate : 0,
        pitch: isArmed ? simTelemetry.pitch : 0,
        roll: isArmed ? simTelemetry.roll : 0,
        armed: isArmed,
        isArmed: isArmed,
        gimbal: gimbalState,
      };

  return {
    telemetry: {
      ...activeTelemetry,
      gimbal: activeTelemetry.gimbal || gimbalState,
    },
    flightMode: activeTelemetry.flightMode,
    setFlightMode,
    updateStickInputs,
    simMode,
    setSimMode,
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
