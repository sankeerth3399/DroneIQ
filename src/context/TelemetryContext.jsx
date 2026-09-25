import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { TelemetryContext } from "./telemetryContextCore.js"
import { useAuth } from "@/hooks/useAuth.js"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"
import {
  ConnectionState,
  createDefaultTelemetry,
  DEFAULT_FLIGHT_MODE,
  DEFAULT_ARMED_STATE,
  isValidGpsCoordinate,
  TELEMETRY_STALE_THRESHOLD_MS,
  FALLBACK_DRONE_LOCATION,
  PositionSource,
} from "@/services/telemetry/telemetryTypes.js"

export const TelemetryProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth()

  const [selectedDroneId, setSelectedDroneId] = useState("DRONE-001")
  const [fleetTelemetry, setFleetTelemetry] = useState({})
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED)
  const [lastTelemetryTime, setLastTelemetryTime] = useState(null)
  const [prevToken, setPrevToken] = useState(token)

  // Clear fleet telemetry when token is cleared
  if (token !== prevToken) {
    setPrevToken(token)
    if (!token) {
      setFleetTelemetry({})
      setLastTelemetryTime(null)
    }
  }

  // Centralized ARM/DISARM Flight Safety State (Initial state: false — strictly unarmed by default)
  const [isArmed, setIsArmedState] = useState(DEFAULT_ARMED_STATE)

  // Centralized Canonical Flight Mode State (Mandatory Default: "GUIDED")
  const [flightMode, setFlightModeState] = useState(DEFAULT_FLIGHT_MODE)

  // Centralized Flight Control Notification Toast
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const showToast = useCallback((message, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({
      id: Date.now(),
      message,
      type,
    })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 2800)
  }, [])

  // Handle incoming live telemetry event (OBSERVED STATE ONLY - never mutate user command state)
  const handleTelemetryUpdate = useCallback((data) => {
    if (!data || !data.droneId) return

    setLastTelemetryTime(Date.now())

    // Update fleet telemetry store with incoming observed metrics (GPS, battery, altitude, etc.)
    setFleetTelemetry((prev) => ({
      ...prev,
      [data.droneId]: {
        ...(prev[data.droneId] || {}),
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      },
    }))
  }, [])

  // Subscribe to WebSocket client events
  useEffect(() => {
    const unsubTelemetry = telemetryClient.onTelemetry(handleTelemetryUpdate)
    const unsubState = telemetryClient.onStateChange((state) => {
      setConnectionState(state)
      if (
        state === ConnectionState.DISCONNECTED ||
        state === ConnectionState.AUTH_FAILURE ||
        state === ConnectionState.BACKEND_UNAVAILABLE
      ) {
        setLastTelemetryTime(null)
        setFleetTelemetry({})
      }
    })

    return () => {
      unsubTelemetry()
      unsubState()
    }
  }, [handleTelemetryUpdate])

  // Connect WebSocket when authenticated, disconnect on logout
  useEffect(() => {
    if (isAuthenticated && token) {
      telemetryClient.connect(token)
    } else {
      telemetryClient.disconnect()
    }

    return () => {
      telemetryClient.disconnect()
    }
  }, [isAuthenticated, token])

  // Select a drone and notify WebSocket
  const selectDrone = useCallback((droneId) => {
    if (!droneId) return
    setSelectedDroneId(droneId)
    telemetryClient.subscribeDrone(droneId)
  }, [])

  // Subscribe to all drones (Fleet Overview)
  const subscribeAll = useCallback(() => {
    telemetryClient.subscribeAll()
  }, [])

  // Stale detection loop (marks telemetry as stale if > 6s without updates)
  useEffect(() => {
    if (connectionState !== ConnectionState.AUTHENTICATED) return

    const interval = setInterval(() => {
      if (lastTelemetryTime && Date.now() - lastTelemetryTime > TELEMETRY_STALE_THRESHOLD_MS) {
        setConnectionState((curr) =>
          curr === ConnectionState.AUTHENTICATED ? ConnectionState.STALE : curr
        )
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [connectionState, lastTelemetryTime])

  // Centralized Flight Mode Switcher (USER ACTION ONLY)
  const handleFlightModeChange = useCallback((newMode, source = "USER") => {
    if (!newMode) return false
    const normalized = String(newMode).toUpperCase().replace(/\s+/g, "_")
    const validModes = ["STABILIZE", "ALT_HOLD", "POS_HOLD", "LOITER", "GUIDED", "RTL", "LAND", "AUTO", "BRAKE", "MANUAL"]
    if (!validModes.includes(normalized)) {
      console.warn(`[TelemetryContext] Unknown flight mode requested: ${newMode}`)
      return false
    }

    if (import.meta.env?.DEV) {
      console.log(`[FLIGHT MODE] previous: ${flightMode} -> next: ${normalized} | source: ${source}`)
    }

    setFlightModeState(normalized)
    setFleetTelemetry((prev) => ({
      ...prev,
      [selectedDroneId]: {
        ...(prev[selectedDroneId] || {}),
        flightMode: normalized,
      },
    }))

    // Dispatch global custom event for drone simulation and UI components
    window.dispatchEvent(new CustomEvent("aeronexus:flight-mode-change", {
      detail: { mode: normalized, droneId: selectedDroneId, source },
    }))

    const friendlyLabels = {
      STABILIZE: "Stabilize",
      ALT_HOLD: "Alt Hold",
      POS_HOLD: "Pos Hold",
      LOITER: "Loiter",
      GUIDED: "Guided",
      RTL: "RTL",
      LAND: "Land",
      AUTO: "Auto",
      BRAKE: "Brake",
      MANUAL: "Manual",
    }
    const label = friendlyLabels[normalized] || normalized
    showToast(`Flight mode changed to ${label}`, "info")
    return true
  }, [flightMode, selectedDroneId, showToast])

  const setFlightMode = handleFlightModeChange

  // Listen for global toast notifications (e.g. from 403 Forbidden or API events)
  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || "info")
      }
    }

    const handleRtl = () => {
      handleFlightModeChange("RTL", "EMERGENCY_OVERRIDE")
    }

    const handleLand = () => {
      handleFlightModeChange("LAND", "EMERGENCY_OVERRIDE")
    }

    const handleAbort = () => {
      handleFlightModeChange("BRAKE", "EMERGENCY_OVERRIDE")
    }

    const handleDisarm = () => {
      setIsArmedState(false)
      if (import.meta.env?.DEV) {
        console.log("[ARM STATE] previous: ARMED -> next: UNARMED | source: EMERGENCY_OVERRIDE")
      }
      showToast("Motors Force Disarmed", "warning")
    }

    window.addEventListener("aeronexus:toast", handleToastEvent)
    window.addEventListener("aeronexus:emergency-rtl", handleRtl)
    window.addEventListener("aeronexus:emergency-land", handleLand)
    window.addEventListener("aeronexus:emergency-abort", handleAbort)
    window.addEventListener("aeronexus:emergency-disarm", handleDisarm)

    return () => {
      window.removeEventListener("aeronexus:toast", handleToastEvent)
      window.removeEventListener("aeronexus:emergency-rtl", handleRtl)
      window.removeEventListener("aeronexus:emergency-land", handleLand)
      window.removeEventListener("aeronexus:emergency-abort", handleAbort)
      window.removeEventListener("aeronexus:emergency-disarm", handleDisarm)
    }
  }, [showToast, handleFlightModeChange])

  const toggleArmed = useCallback((source = "USER") => {
    setIsArmedState((prev) => {
      const next = !prev
      if (import.meta.env?.DEV) {
        console.log(`[ARM STATE] previous: ${prev ? "ARMED" : "UNARMED"} -> next: ${next ? "ARMED" : "UNARMED"} | source: ${source}`)
      }
      if (next) {
        showToast("Drone Armed Successfully", "success")
      } else {
        showToast("Drone Disarmed Successfully", "warning")
      }
      return next
    })
  }, [showToast])

  const setArmed = useCallback((val, source = "USER") => {
    setIsArmedState((prev) => {
      const next = Boolean(val)
      if (prev !== next) {
        if (import.meta.env?.DEV) {
          console.log(`[ARM STATE] previous: ${prev ? "ARMED" : "UNARMED"} -> next: ${next ? "ARMED" : "UNARMED"} | source: ${source}`)
        }
        if (next) {
          showToast("Drone Armed Successfully", "success")
        } else {
          showToast("Drone Disarmed Successfully", "warning")
        }
      }
      return next
    })
  }, [showToast])

  const setIsArmed = useCallback((val) => {
    setArmed(val, "USER")
  }, [setArmed])

  // Centralized Camera Gimbal State (Independent from Drone Attitude)
  const [gimbalState, setGimbalState] = useState({
    pitch: 0.0, // -90° (Nadir) to +90° (Zenith), 0° = forward level
    roll: 0.0,  // -180° to +180°, 0° = level horizon
    yaw: 0.0,   // 0.0° to 359.9° absolute heading
  })
  const gimbalAnimRef = useRef(null)

  const normalizePitch = useCallback((val) => {
    const num = Number(val)
    if (isNaN(num)) return 0.0
    return Math.max(-90.0, Math.min(90.0, Number(num.toFixed(1))))
  }, [])

  const normalizeRoll = useCallback((val) => {
    const num = Number(val)
    if (isNaN(num)) return 0.0
    let r = ((num + 180) % 360) - 180
    if (r < -180) r += 360
    return Number(r.toFixed(1))
  }, [])

  const normalizeYaw = useCallback((val) => {
    const num = Number(val)
    if (isNaN(num)) return 0.0
    const y = ((num % 360) + 360) % 360
    return Number(y.toFixed(1))
  }, [])

  const setGimbalPitch = useCallback((val) => {
    if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)
    setGimbalState((prev) => ({
      ...prev,
      pitch: normalizePitch(val),
    }))
  }, [normalizePitch])

  const setGimbalRoll = useCallback((val) => {
    if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)
    setGimbalState((prev) => ({
      ...prev,
      roll: normalizeRoll(val),
    }))
  }, [normalizeRoll])

  const setGimbalYaw = useCallback((val) => {
    if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)
    setGimbalState((prev) => ({
      ...prev,
      yaw: normalizeYaw(val),
    }))
  }, [normalizeYaw])

  const setGimbalOrientation = useCallback(({ pitch, roll, yaw }) => {
    if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)
    setGimbalState((prev) => ({
      pitch: pitch !== undefined ? normalizePitch(pitch) : prev.pitch,
      roll: roll !== undefined ? normalizeRoll(roll) : prev.roll,
      yaw: yaw !== undefined ? normalizeYaw(yaw) : prev.yaw,
    }))
  }, [normalizePitch, normalizeRoll, normalizeYaw])

  // Smooth center gimbal animation (interpolates pitch -> 0, roll -> 0, yaw -> droneHeading)
  const centerGimbal = useCallback((targetYaw = null) => {
    if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)

    setGimbalState((current) => {
      const startPitch = current.pitch
      const startRoll = current.roll
      const startYaw = current.yaw

      const endYaw = targetYaw !== null && !isNaN(Number(targetYaw)) ? normalizeYaw(targetYaw) : 0.0
      const endPitch = 0.0
      const endRoll = 0.0

      const yawDiff = ((endYaw - startYaw + 540) % 360) - 180
      const durationMs = 280
      const startTime = performance.now()

      const animate = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / durationMs)
        const ease = 1 - Math.pow(1 - progress, 3)

        const nextPitch = Number((startPitch + (endPitch - startPitch) * ease).toFixed(1))
        const nextRoll = Number((startRoll + (endRoll - startRoll) * ease).toFixed(1))
        const nextYaw = normalizeYaw(startYaw + yawDiff * ease)

        setGimbalState({
          pitch: nextPitch,
          roll: nextRoll,
          yaw: nextYaw,
        })

        if (progress < 1) {
          gimbalAnimRef.current = requestAnimationFrame(animate)
        } else {
          gimbalAnimRef.current = null
        }
      }

      gimbalAnimRef.current = requestAnimationFrame(animate)
      return current
    })
  }, [normalizeYaw])

  useEffect(() => {
    return () => {
      if (gimbalAnimRef.current) cancelAnimationFrame(gimbalAnimRef.current)
    }
  }, [])

  const isConnected = connectionState === ConnectionState.AUTHENTICATED
  const isStale = connectionState === ConnectionState.STALE
  const isLive = Boolean(
    lastTelemetryTime && isConnected && !isStale
  )

  // Extract selected drone's latest telemetry with safe fallback
  const rawTelemetry = useMemo(() => {
    if (isConnected || isStale) {
      const activeData = fleetTelemetry[selectedDroneId]
      if (activeData) return activeData
    }
    return createDefaultTelemetry(selectedDroneId)
  }, [fleetTelemetry, selectedDroneId, isConnected, isStale])

  const droneGPSValid = useMemo(() => {
    return isValidGpsCoordinate(rawTelemetry.latitude, rawTelemetry.longitude)
  }, [rawTelemetry.latitude, rawTelemetry.longitude])

  // Centralized telemetry object with authoritative isArmed, flightMode, and gimbal state
  const telemetry = useMemo(() => {
    const hasLiveFix = isConnected && !isStale && droneGPSValid
    const positionSource = hasLiveFix ? PositionSource.LIVE : PositionSource.HYDERABAD_FALLBACK
    return {
      ...rawTelemetry,
      latitude: hasLiveFix ? rawTelemetry.latitude : FALLBACK_DRONE_LOCATION.latitude,
      longitude: hasLiveFix ? rawTelemetry.longitude : FALLBACK_DRONE_LOCATION.longitude,
      positionSource,
      droneConnected: isConnected,
      droneGPSValid: hasLiveFix,
      isLive,
      isStale,
      status: !isConnected ? "DISCONNECTED" : isStale ? "STALE" : rawTelemetry.status || "OK",
      flightMode: flightMode || DEFAULT_FLIGHT_MODE,
      armed: isArmed,
      isArmed,
      speed: isArmed ? (rawTelemetry.speed || 0) : 0,
      groundSpeed: isArmed ? (rawTelemetry.groundSpeed || 0) : 0,
      verticalSpeed: isArmed ? (rawTelemetry.verticalSpeed || 0) : 0,
      climbRate: isArmed ? (rawTelemetry.climbRate || 0) : 0,
      gimbal: gimbalState,
    }
  }, [rawTelemetry, flightMode, isArmed, gimbalState, isConnected, isStale, droneGPSValid, isLive])

  const value = {
    telemetry,
    positionSource: telemetry.positionSource,
    flightMode,
    setFlightMode,
    handleFlightModeChange: setFlightMode,
    isArmed,
    setIsArmed,
    setArmed,
    toggleArmed,
    toast,
    showToast,
    clearToast,
    gimbalState,
    setGimbalPitch,
    setGimbalRoll,
    setGimbalYaw,
    setGimbalOrientation,
    centerGimbal,
    normalizeGimbalAngles: {
      pitch: normalizePitch,
      roll: normalizeRoll,
      yaw: normalizeYaw,
    },
    fleetTelemetry,
    selectedDroneId,
    selectDrone,
    subscribeAll,
    connectionState,
    droneConnected: isConnected,
    droneGPSValid: Boolean(isConnected && !isStale && droneGPSValid),
    isStale,
    isLive,
    lastTelemetryTime,
  }

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}

export default TelemetryProvider
