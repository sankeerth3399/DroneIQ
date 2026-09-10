import { useState, useEffect, useRef, useCallback } from "react"
import { useTelemetry } from "@/context/TelemetryContext.jsx"
import { flightControlService } from "@/services/control/flightControlService.js"

/**
 * Standard Drone Telemetry & Interactive Simulation Hook
 * Bridges live WebSocket telemetry from DroneIQ backend to UI components,
 * while providing local physics fallback when backend telemetry is offline.
 */
export function useDroneTelemetry() {
  const {
    telemetry: liveTelemetry,
    isLive,
    connectionState,
    selectedDroneId,
    selectDrone,
  } = useTelemetry()

  // Local simulated telemetry state (fallback when live stream is offline)
  const [simTelemetry, setSimTelemetry] = useState({
    pitch: 0,
    roll: 0,
    heading: 0,
    altitude: 48.5,
    climbRate: 0.0,
    groundSpeed: 0.0,
    battery: 84,
    voltage: 24.2,
    satellites: 18,
    gpsFix: "3D Fix",
    armed: true,
    flightMode: "GUIDED",
    latitude: 17.385000,
    longitude: 78.486700,
  })

  // Raw joystick input: normalized [-1.00, +1.00]
  const stickInputRef = useRef({
    throttle: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  })

  // Mode: 'interactive' vs 'patrol'
  const [simMode, setSimMode] = useState("interactive")

  /**
   * Update stick inputs from virtual joysticks
   * @param {Object} sticks - { throttle, yaw, pitch, roll }
   */
  const updateStickInputs = useCallback((sticks) => {
    stickInputRef.current = {
      ...stickInputRef.current,
      ...sticks,
    }

    // Forward to flight control service abstraction
    flightControlService.sendControlCommand(stickInputRef.current)
  }, [])

  // Local simulation loop for offline / demo mode
  useEffect(() => {
    // If live WebSocket data is flowing, bypass simulation loop
    if (isLive) return

    let animFrameId
    let lastTime = performance.now()
    let ambientPhase = 0

    const step = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime
      ambientPhase += dt * 1.5

      setSimTelemetry((prev) => {
        const sticks = stickInputRef.current
        const hasStickInput =
          Math.abs(sticks.pitch) > 0.02 ||
          Math.abs(sticks.roll) > 0.02 ||
          Math.abs(sticks.yaw) > 0.02 ||
          Math.abs(sticks.throttle) > 0.02

        let nextPitch = prev.pitch
        let nextRoll = prev.roll
        let nextHeading = prev.heading
        let nextAltitude = prev.altitude
        let nextClimbRate = prev.climbRate
        let nextSpeed = prev.groundSpeed
        let nextFlightMode = prev.flightMode
        let nextLat = prev.latitude
        let nextLng = prev.longitude

        if (simMode === "interactive") {
          const stickX = sticks.roll
          const stickY = sticks.pitch
          const stickMag = Math.hypot(stickX, stickY)

          if (hasStickInput) {
            nextFlightMode = "MANUAL"

            // 1. Directional Right Stick (Pitch/Roll): Point forward/back/left/right
            if (stickMag > 0.08) {
              // Heading calculation from joystick vector:
              // Forward (pitch > 0, roll = 0) -> 0° (North)
              // Right (pitch = 0, roll > 0) -> 90° (East)
              // Backward (pitch < 0, roll = 0) -> 180° (South)
              // Left (pitch = 0, roll < 0) -> 270° (West)
              const targetHeading = (Math.atan2(stickX, stickY) * (180 / Math.PI) + 360) % 360

              // Shortest-path angle interpolation to prevent full circle 359° -> 0° snapping
              const diff = ((targetHeading - nextHeading + 540) % 360) - 180
              const turnSpeed = Math.min(1, dt * 14.0)
              nextHeading = (nextHeading + diff * turnSpeed + 360) % 360
            }

            // 2. Left Stick Yaw (Horizontal): Rotate drone heading directly
            if (Math.abs(sticks.yaw) > 0.05) {
              const yawRate = sticks.yaw * 60.0 // 60 deg/sec
              nextHeading = (nextHeading + yawRate * dt + 360) % 360
            }

            // 3. Attitude pitch and roll response
            const targetPitch = -stickY * 24.0
            nextPitch += (targetPitch - nextPitch) * (dt * 6.5)

            const targetRoll = stickX * 28.0
            nextRoll += (targetRoll - nextRoll) * (dt * 6.5)

            // 4. Throttle / Altitude climb rate
            const targetClimbRate = sticks.throttle * 4.0
            nextClimbRate += (targetClimbRate - nextClimbRate) * (dt * 4.0)
            nextAltitude = Math.max(1.0, nextAltitude + nextClimbRate * dt)

            // 5. Ground speed proportional to stick magnitude
            const targetSpeed = stickMag * 12.5
            nextSpeed += (targetSpeed - nextSpeed) * (dt * 4.5)
          } else {
            // Joysticks neutral: PRESERVE drone's last heading (never reset to North)
            const atmosphericPitch = Math.sin(ambientPhase * 1.1) * 0.8
            const atmosphericRoll = Math.cos(ambientPhase * 0.9) * 0.8

            nextPitch += (atmosphericPitch - nextPitch) * (dt * 3.0)
            nextRoll += (atmosphericRoll - nextRoll) * (dt * 3.0)
            nextClimbRate += (0 - nextClimbRate) * (dt * 4.0)
            nextSpeed += (0 - nextSpeed) * (dt * 3.0)
            if (nextSpeed < 0.04) nextSpeed = 0
          }

          // Deterministic GPS translation along heading vector
          if (nextSpeed > 0.02) {
            const headingRad = (nextHeading * Math.PI) / 180
            const vNorth = nextSpeed * Math.cos(headingRad)
            const vEast = nextSpeed * Math.sin(headingRad)

            const metersPerDegLat = 111139
            const metersPerDegLng = 111139 * Math.cos((prev.latitude * Math.PI) / 180)

            nextLat += (vNorth * dt) / metersPerDegLat
            nextLng += (vEast * dt) / metersPerDegLng
          }
        } else {
          // Autonomous Orbit / Patrol Mode
          nextFlightMode = "AUTO"
          const orbitRate = 12.0
          nextHeading = (nextHeading + orbitRate * dt) % 360
          const autoBank = 12.0
          nextRoll += (autoBank - nextRoll) * (dt * 2.5)
          const autoPitch = Math.sin(ambientPhase * 0.6) * 3.0
          nextPitch += (autoPitch - nextPitch) * (dt * 2.5)
          nextSpeed = 8.4 + Math.sin(ambientPhase) * 1.2
          nextAltitude = 48.5 + Math.sin(ambientPhase * 0.4) * 2.0
          nextClimbRate = Math.cos(ambientPhase * 0.4) * 0.8

          const headingRad = (nextHeading * Math.PI) / 180
          const vNorth = nextSpeed * Math.cos(headingRad)
          const vEast = nextSpeed * Math.sin(headingRad)
          const metersPerDegLat = 111139
          const metersPerDegLng = 111139 * Math.cos((prev.latitude * Math.PI) / 180)

          nextLat += (vNorth * dt) / metersPerDegLat
          nextLng += (vEast * dt) / metersPerDegLng
        }

        return {
          ...prev,
          pitch: Number(nextPitch.toFixed(1)),
          roll: Number(nextRoll.toFixed(1)),
          heading: Number(nextHeading.toFixed(1)),
          altitude: Number(nextAltitude.toFixed(1)),
          climbRate: Number(nextClimbRate.toFixed(2)),
          groundSpeed: Number(nextSpeed.toFixed(1)),
          flightMode: nextFlightMode,
          latitude: Number(nextLat.toFixed(6)),
          longitude: Number(nextLng.toFixed(6)),
        }
      })

      animFrameId = requestAnimationFrame(step)
    }

    animFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animFrameId)
  }, [isLive, simMode])

  // Active telemetry: Live WebSocket data takes priority, fallback to simulation
  const activeTelemetry = isLive
    ? {
        pitch: typeof liveTelemetry.pitch === "number" ? liveTelemetry.pitch : 0,
        roll: typeof liveTelemetry.roll === "number" ? liveTelemetry.roll : 0,
        heading: typeof liveTelemetry.heading === "number" ? liveTelemetry.heading : liveTelemetry.yaw || 0,
        altitude: typeof liveTelemetry.altitude === "number" ? liveTelemetry.altitude : 0,
        climbRate: typeof liveTelemetry.climbRate === "number" ? liveTelemetry.climbRate : 0,
        groundSpeed: typeof liveTelemetry.speed === "number" ? liveTelemetry.speed : liveTelemetry.groundSpeed || 0,
        battery: typeof liveTelemetry.batteryPercentage === "number" ? liveTelemetry.batteryPercentage : 84,
        flightMode: liveTelemetry.flightMode || "AUTO",
        armed: Boolean(liveTelemetry.armed),
        status: liveTelemetry.status || "OK",
        gpsSatellites: liveTelemetry.gpsSatellites || 16,
        latitude: typeof liveTelemetry.latitude === "number" ? liveTelemetry.latitude : 17.385000,
        longitude: typeof liveTelemetry.longitude === "number" ? liveTelemetry.longitude : 78.486700,
      }
    : simTelemetry

  return {
    telemetry: activeTelemetry,
    updateStickInputs,
    simMode,
    setSimMode,
    isLive,
    connectionState,
    selectedDroneId,
    selectDrone,
  }
}

export default useDroneTelemetry
