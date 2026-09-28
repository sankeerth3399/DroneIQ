import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { TelemetryContext } from "./telemetryContextCore.js"
import { useAuth } from "@/hooks/useAuth.js"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"
import { flightControlService } from "@/services/control/flightControlService.js"
import { showAlert, AlertTypes, AlertCategories } from "@/services/notification/alertService.js"
import { TOKEN_STORAGE_KEY } from "@/services/api/apiClient.js"
import { authService } from "@/services/api/authService.js"
import { Permissions } from "@/auth/permissions.js"
import { getRolePermissions } from "@/auth/roleConfig.js"
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

  const isConnected = connectionState === ConnectionState.AUTHENTICATED
  const isStale = connectionState === ConnectionState.STALE
  const isLive = Boolean(
    lastTelemetryTime && isConnected && !isStale
  )

  // Transition & threshold tracking refs to prevent duplicate alert spam
  const prevConnectionStateRef = useRef(null)
  const prevIsConnectedRef = useRef(null)
  const prevIsLiveRef = useRef(null)
  const prevGpsFixRef = useRef(null)
  const prevBatteryPercentRef = useRef(null)
  const hasEverConnectedRef = useRef(false)
  const lastValidGpsTimestampRef = useRef({})

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const showToast = useCallback((message, type = "info", title = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({
      id: Date.now(),
      message,
      type,
    })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 2800)

    // Route through centralized alert service
    showAlert({
      message,
      type: type === "danger" ? AlertTypes.DANGER : type === "error" ? AlertTypes.ERROR : type === "warning" ? AlertTypes.WARNING : type === "success" ? AlertTypes.SUCCESS : AlertTypes.INFO,
      title: title || (type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Flight Alert"),
      category: AlertCategories.FLIGHT,
    })
  }, [])

  // Handle incoming live telemetry event (OBSERVED STATE ONLY - never mutate user command state)
  const handleTelemetryUpdate = useCallback((data) => {
    if (!data || !data.droneId) return

    setLastTelemetryTime(Date.now())

    // Validate GPS coordinates if provided in incoming packet
    let validatedGps = {}
    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (isValidGpsCoordinate(data.latitude, data.longitude)) {
        const incomingTime = data.timestamp ? new Date(data.timestamp).getTime() : Date.now()
        const lastTime = lastValidGpsTimestampRef.current[data.droneId] || 0

        if (incomingTime >= lastTime) {
          lastValidGpsTimestampRef.current[data.droneId] = incomingTime
          validatedGps = {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            positionSource: PositionSource.LIVE,
          }

          if (import.meta.env?.DEV) {
            console.debug(
              `[DRONE POSITION CHANGE] source: TELEMETRY droneId: ${data.droneId} next: ${validatedGps.latitude.toFixed(6)},${validatedGps.longitude.toFixed(6)} timestamp: ${data.timestamp || incomingTime}`
            )
          }
        } else {
          if (import.meta.env?.DEV) {
            console.debug(
              `[DRONE POSITION REJECTED] reason: STALE_TELEMETRY droneId: ${data.droneId} incomingTime: ${incomingTime} lastTime: ${lastTime}`
            )
          }
        }
      } else {
        if (import.meta.env?.DEV) {
          console.debug(
            `[DRONE POSITION REJECTED] reason: INVALID_COORDINATE droneId: ${data.droneId} lat: ${data.latitude} lng: ${data.longitude}`
          )
        }
      }
    }

    // Monitor battery threshold crossings (30%, 20%, 10%) - state tracking only, no user popups (Section 15)
    const batt = typeof data.battery === "number" ? data.battery : (typeof data.batteryPercent === "number" ? data.batteryPercent : null)
    if (batt !== null && typeof batt === "number" && !isNaN(batt)) {
      prevBatteryPercentRef.current = batt
    }

    // Update fleet telemetry store with incoming observed metrics (GPS, battery, altitude, etc.)
    setFleetTelemetry((prev) => {
      const prevData = prev[data.droneId] || {}
      return {
        ...prev,
        [data.droneId]: {
          ...prevData,
          ...data,
          // CRITICAL: Preserve previously accepted valid GPS coordinates if incoming packet has no GPS
          latitude: validatedGps.latitude !== undefined ? validatedGps.latitude : prevData.latitude,
          longitude: validatedGps.longitude !== undefined ? validatedGps.longitude : prevData.longitude,
          positionSource: validatedGps.positionSource || prevData.positionSource || PositionSource.HYDERABAD_FALLBACK,
          timestamp: data.timestamp || new Date().toISOString(),
        },
      }
    })

    // Sync authoritative armed state if present in incoming live telemetry for selected drone
    // Section 13: External telemetry changes update UI state silently without user-action notifications
    if (data.droneId === selectedDroneId) {
      const incomingArmed = typeof data.armed === "boolean" ? data.armed : (typeof data.isArmed === "boolean" ? data.isArmed : null)
      if (incomingArmed !== null) {
        setIsArmedState((curr) => {
          if (curr !== incomingArmed) {
            console.info(`[ARM] Live telemetry updated authoritative armed state: ${curr ? "ARMED" : "UNARMED"} -> ${incomingArmed ? "ARMED" : "UNARMED"}`)
            return incomingArmed
          }
          return curr
        })
      }
    }
  }, [selectedDroneId])

  // Subscribe to WebSocket client events - internal state update only (Section 15)
  useEffect(() => {
    const unsubTelemetry = telemetryClient.onTelemetry(handleTelemetryUpdate)
    const unsubState = telemetryClient.onStateChange((state) => {
      const prevState = prevConnectionStateRef.current
      prevConnectionStateRef.current = state
      setConnectionState(state)

      if (state === ConnectionState.AUTHENTICATED) {
        if (prevState !== ConnectionState.AUTHENTICATED) {
          hasEverConnectedRef.current = true
        }
      }

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
      showAlert({
        type: AlertTypes.ERROR,
        title: "Flight Mode Change Failed",
        message: "Unable to change flight mode.",
        key: "FLIGHT_MODE_REJECTED",
        category: AlertCategories.FLIGHT,
      })
      return false
    }

    const prevMode = flightMode

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
    const prevLabel = friendlyLabels[prevMode] || prevMode

    // Section 10 & 13: Flight mode change notifications are ONLY dispatched by the user confirmation flow (FlightModeDropdown)
    // External changes or internal updates update UI silently without notification

    return true
  }, [flightMode, selectedDroneId])

  const setFlightMode = handleFlightModeChange

  // Listen for global toast notifications (e.g. from 403 Forbidden or API events)
  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || "info", e.detail.title)
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
  }, [showToast, handleFlightModeChange, selectedDroneId])

  /**
   * Execute real ARM or DISARM flight command through backend and wait for authoritative state
   */
  const executeArmCommand = useCallback(async ({ arm = true, droneId, isOverride = false } = {}) => {
    const targetDroneId = droneId || selectedDroneId || "DRONE-001"
    const actionLabel = arm ? "ARM" : "DISARM"

    console.info(`[ARM] User requested ${actionLabel}`)
    console.info(`[ARM] Confirmation accepted`)

    // 1. Authentication Check
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null
    if (!token && !isAuthenticated) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Access Denied",
        message: "Your session is not authenticated. Please sign in again.",
        category: AlertCategories.SECURITY,
      })
      throw new Error("Session is not authenticated.")
    }

    // 2. RBAC Check
    const user = authService.getUser()
    const perms = user?.role ? getRolePermissions(user.role, user.authorities) : new Set()
    const hasPerm = isOverride
      ? perms.has(Permissions.OVERRIDE_FLIGHT_COMMANDS)
      : perms.has(Permissions.EXECUTE_FLIGHT_COMMANDS)

    console.info(`[ARM] RBAC check: role=${user?.role}, hasPerm=${hasPerm}`)
    if (!hasPerm) {
      const errorMsg = isOverride
        ? "Access Denied: You do not have permission to execute emergency overrides."
        : "ARM/DISARM inhibited: Requires Flight Operator or Super Admin role."
      showAlert({
        type: AlertTypes.ERROR,
        title: "Access Denied",
        message: errorMsg,
        category: AlertCategories.SECURITY,
      })
      throw new Error(errorMsg)
    }

    // Section 16 & 2 & 3: Do NOT block ARM/DISARM on client because of connection state, stale telemetry, or GPS.
    // Send command directly to vehicle/backend and let actual response determine result.

    // If drone is already in requested state, no-op
    if (arm && isArmed) {
      return true
    }
    if (!arm && !isArmed) {
      return true
    }

    // Send Command
    console.info(`[ARM] Sending command: ${actionLabel} for ${targetDroneId}`)
    let responseData
    try {
      responseData = await flightControlService.sendArmCommand({
        droneId: targetDroneId,
        arm,
        isOverride,
      })
      console.info(`[ARM] Command response:`, responseData)
    } catch (err) {
      console.error(`[ARM] Command response error:`, err)
      let failureReason = err?.message || err?.data?.message || `Unable to ${actionLabel.toLowerCase()} drone.`
      if (err?.data?.error || err?.data?.details) {
        const details = Array.isArray(err.data.details) ? err.data.details.join(", ") : err.data.details
        if (details) failureReason = `${failureReason} (${details})`
      }
      showAlert({
        type: AlertTypes.ERROR,
        title: arm ? "ARM FAILED" : "DISARM FAILED",
        message: failureReason,
        key: "ARM_RESULT",
        category: AlertCategories.FLIGHT,
      })
      throw err
    }

    // Wait for Authoritative State Confirmation
    console.info(`[ARM] Telemetry armed state: awaiting authoritative confirmation...`)
    const confirmed = await flightControlService.waitForAuthoritativeArmedState({
      droneId: targetDroneId,
      expectedArmed: arm,
      timeoutMs: 4000,
      commandResponse: responseData,
    })

    if (!confirmed) {
      console.warn(`[ARM] Telemetry armed state: confirmation timed out`)
      showAlert({
        type: AlertTypes.ERROR,
        title: arm ? "ARM FAILED" : "DISARM FAILED",
        message: `No authoritative confirmation received for ${targetDroneId}.`,
        key: "ARM_RESULT",
        category: AlertCategories.FLIGHT,
      })
      throw new Error(`Timeout waiting for drone to confirm ${actionLabel} state.`)
    }

    // Final Authoritative State Update (Section 17: only after authoritative response)
    console.info(`[ARM] Final state: ${arm ? "ARMED" : "UNARMED"} confirmed`)
    setIsArmedState(arm)
    setFleetTelemetry((prev) => ({
      ...prev,
      [targetDroneId]: {
        ...(prev[targetDroneId] || {}),
        armed: arm,
        isArmed: arm,
      },
    }))

    window.dispatchEvent(
      new CustomEvent("aeronexus:drone-armed", {
        detail: { droneId: targetDroneId, armed: arm, isArmed: arm, timestamp: new Date().toISOString() },
      })
    )

    // Section 18: ONE final result notification
    showAlert({
      type: AlertTypes.SUCCESS,
      title: arm ? "ARM SUCCESS" : "DISARM SUCCESS",
      message: `${targetDroneId} is now ${arm ? "armed" : "disarmed"}.`,
      key: "ARM_RESULT",
      category: AlertCategories.FLIGHT,
    })

    return true
  }, [selectedDroneId, isAuthenticated, connectionState, isLive, lastTelemetryTime, isArmed])

  const toggleArmed = useCallback(async (source = "USER") => {
    try {
      await executeArmCommand({ arm: !isArmed, source })
    } catch (err) {
      console.warn("[TelemetryContext] toggleArmed error:", err.message)
    }
  }, [executeArmCommand, isArmed])

  const setArmed = useCallback((val, source = "USER") => {
    setIsArmedState((prev) => {
      const next = Boolean(val)
      if (prev !== next) {
        if (import.meta.env?.DEV) {
          console.log(`[ARM STATE] previous: ${prev ? "ARMED" : "UNARMED"} -> next: ${next ? "ARMED" : "UNARMED"} | source: ${source}`)
        }
      }
      return next
    })
  }, [])

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

  // Monitor drone connection transitions (Offline <-> Online) - state only (Section 15)
  useEffect(() => {
    if (prevIsConnectedRef.current === null) {
      prevIsConnectedRef.current = isConnected
      return
    }
    if (prevIsConnectedRef.current !== isConnected) {
      prevIsConnectedRef.current = isConnected
    }
  }, [isConnected, selectedDroneId])

  // Monitor live telemetry stream transitions (Available <-> Unavailable / Stale) - state only (Section 15)
  useEffect(() => {
    if (prevIsLiveRef.current === null) {
      prevIsLiveRef.current = isLive
      return
    }
    if (prevIsLiveRef.current !== isLive) {
      prevIsLiveRef.current = isLive
    }
  }, [isLive])

  // Monitor GPS fix transitions - state only (Section 15)
  const hasGpsFix = Boolean(isConnected && !isStale && droneGPSValid)
  useEffect(() => {
    if (prevGpsFixRef.current === null) {
      prevGpsFixRef.current = hasGpsFix
      return
    }
    if (prevGpsFixRef.current !== hasGpsFix) {
      prevGpsFixRef.current = hasGpsFix
    }
  }, [hasGpsFix, isConnected])

  // Centralized telemetry object with authoritative isArmed, flightMode, and gimbal state
  const telemetry = useMemo(() => {
    // If the drone has a validated LIVE position, preserve it even when connection transitions to STALE
    const hasLiveOrStaleGps = Boolean(
      (isConnected || isStale) &&
      droneGPSValid &&
      rawTelemetry.positionSource === PositionSource.LIVE
    )
    const positionSource = hasLiveOrStaleGps
      ? PositionSource.LIVE
      : PositionSource.HYDERABAD_FALLBACK

    const lat = hasLiveOrStaleGps
      ? rawTelemetry.latitude
      : FALLBACK_DRONE_LOCATION.latitude
    const lng = hasLiveOrStaleGps
      ? rawTelemetry.longitude
      : FALLBACK_DRONE_LOCATION.longitude

    return {
      ...rawTelemetry,
      latitude: lat,
      longitude: lng,
      positionSource,
      droneConnected: isConnected,
      droneGPSValid: hasLiveOrStaleGps,
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
    executeArmCommand,
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
