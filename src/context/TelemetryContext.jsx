import { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react"
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
  resolveDroneDisplayPosition,
} from "@/services/telemetry/telemetryTypes.js"
import { droneService, DRONES_UPDATED_EVENT } from "@/services/api/droneService.js"

export const TelemetryProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth()

  const [registeredDrones, setRegisteredDrones] = useState(() => droneService.getStoredDrones())
  const [selectedDroneId, setSelectedDroneId] = useState(() => {
    const stored = droneService.getStoredDrones()
    return stored[0]?.id || "DR-001"
  })

  // Synchronize registered drones across tabs and pages in real-time
  useEffect(() => {
    const handleSync = () => {
      setRegisteredDrones(droneService.getStoredDrones())
    }
    window.addEventListener("storage", handleSync)
    window.addEventListener(DRONES_UPDATED_EVENT, handleSync)

    // Background verification with backend if reachable
    droneService.getDrones().then((drones) => {
      if (Array.isArray(drones) && drones.length > 0) {
        setRegisteredDrones(drones)
      }
    }).catch(() => {})

    return () => {
      window.removeEventListener("storage", handleSync)
      window.removeEventListener(DRONES_UPDATED_EVENT, handleSync)
    }
  }, [])

  const registerDrone = useCallback(async (data) => {
    const created = await droneService.registerDrone(data)
    setRegisteredDrones(droneService.getStoredDrones())
    return created
  }, [])

  const updateDrone = useCallback(async (id, data) => {
    const updated = await droneService.updateDrone(id, data)
    setRegisteredDrones(droneService.getStoredDrones())
    return updated
  }, [])

  const deleteDrone = useCallback(async (id) => {
    const res = await droneService.deleteDrone(id)
    setRegisteredDrones(droneService.getStoredDrones())
    return res
  }, [])
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

  // Authoritative Drone Geographic Position (Initial state: strictly fixed Hyderabad fallback 17.385000, 78.486700)
  const [dronePosition, setDronePosition] = useState({
    latitude: FALLBACK_DRONE_LOCATION.latitude,
    longitude: FALLBACK_DRONE_LOCATION.longitude,
  })
  const dronePositionRef = useRef(dronePosition)
  dronePositionRef.current = dronePosition

  // Live-drone state is separate from telemetry connectivity.
  const [liveDroneConnected, setLiveDroneConnected] = useState(false)
  const [validLiveGps, setValidLiveGps] = useState(false)

  // Live Telemetry Attachment Flag (false = fixed fallback, true = following live valid GPS)
  const [liveTelemetryAttached, setLiveTelemetryAttached] = useState(false)
  const lastAcceptedTelemetryTimestampRef = useRef({})
  const lastAcceptedArmedTimestampRef = useRef({})

  /**
   * Authoritative helper to extract boolean armed state from any packet structure
   */
  const extractArmedState = useCallback((packet) => {
    if (!packet || typeof packet !== "object") return undefined
    if (typeof packet.armed === "boolean") return packet.armed
    if (typeof packet.isArmed === "boolean") return packet.isArmed
    if (packet.telemetry && typeof packet.telemetry === "object") {
      if (typeof packet.telemetry.armed === "boolean") return packet.telemetry.armed
      if (typeof packet.telemetry.isArmed === "boolean") return packet.telemetry.isArmed
    }
    if (packet.state && typeof packet.state === "object") {
      if (typeof packet.state.armed === "boolean") return packet.state.armed
      if (typeof packet.state.isArmed === "boolean") return packet.state.isArmed
    }
    if (packet.status && typeof packet.status === "object") {
      if (typeof packet.status.armed === "boolean") return packet.status.armed
      if (typeof packet.status.isArmed === "boolean") return packet.status.isArmed
    }
    return undefined
  }, [])

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

  /**
   * The ONE authoritative function for changing drone ARM/DISARM state.
   * Handles both frontend-initiated user commands (with required confirmation)
   * and external vehicle-reported authoritative state transitions (from WebSocket/telemetry).
   */
  const updateArmedState = useCallback((newArmed, {
    source = "USER_COMMAND",
    commandId = null,
    userAction = null,
    backendResponse = null,
    isConfirmed = false,
    droneId = null,
    timestamp = null,
  } = {}) => {
    if (newArmed === undefined || newArmed === null) return false
    const targetDroneId = droneId || selectedDroneId || "DRONE-001"
    const next = Boolean(newArmed)
    const incomingTime = timestamp
      ? (typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime())
      : Date.now()

    const isExternalVehicleChange =
      source === "VEHICLE_TELEMETRY" ||
      source === "BACKEND_STATE_EVENT" ||
      source === "LIVE_TELEMETRY" ||
      source === "AUTHORITATIVE_TELEMETRY"
    const isEmergency = source === "EMERGENCY_OVERRIDE"

    // Guard against out-of-order stale telemetry packets overwriting newer state
    const lastArmedTime = lastAcceptedArmedTimestampRef.current[targetDroneId] || 0
    if (isExternalVehicleChange && timestamp && incomingTime < lastArmedTime && lastArmedTime !== 0) {
      if (import.meta.env?.DEV) {
        console.warn("[ARM STATE REJECTED]", {
          timestamp: incomingTime,
          droneId: targetDroneId,
          incomingValue: next,
          source,
          accepted: false,
          reason: "STALE_OUT_OF_ORDER_PACKET",
          origin: "EXTERNAL_VEHICLE_STATE_CHANGE",
        })
      }
      return false
    }

    // Command Safety Rules:
    // When ARM/DISARM is initiated by a user from the frontend, verify confirmation & backend acknowledgment.
    // When reported by the physical vehicle or authoritative backend telemetry, accept immediately without blocking.
    if (!isExternalVehicleChange && !isEmergency) {
      if (next && (!isConfirmed || userAction !== "USER_ARM_CONFIRMED" || !backendResponse?.success)) {
        if (import.meta.env?.DEV) {
          console.warn("[ARM STATE REJECTED]", {
            timestamp: incomingTime,
            droneId: targetDroneId,
            incomingValue: next,
            source,
            accepted: false,
            reason: "UNCONFIRMED_USER_ARM_COMMAND",
            origin: "USER_COMMAND_RESULT",
          })
        }
        return false
      }
      if (!next && (!isConfirmed || userAction !== "USER_DISARM_CONFIRMED" || !backendResponse?.success)) {
        if (import.meta.env?.DEV) {
          console.warn("[ARM STATE REJECTED]", {
            timestamp: incomingTime,
            droneId: targetDroneId,
            incomingValue: next,
            source,
            accepted: false,
            reason: "UNCONFIRMED_USER_DISARM_COMMAND",
            origin: "USER_COMMAND_RESULT",
          })
        }
        return false
      }
    }

    lastAcceptedArmedTimestampRef.current[targetDroneId] = incomingTime

    // Update primary isArmed state when the update is for the selected drone
    if (targetDroneId === selectedDroneId) {
      setIsArmedState((prev) => {
        if (prev === next) return prev

        if (import.meta.env?.DEV) {
          console.log("[ARM STATE SYNC]", {
            timestamp: incomingTime,
            droneId: targetDroneId,
            incomingValue: next,
            source,
            previousState: prev ? "ARMED" : "UNARMED",
            newState: next ? "ARMED" : "UNARMED",
            accepted: true,
            reason: null,
            origin: isExternalVehicleChange ? "EXTERNAL_VEHICLE_STATE_CHANGE" : "USER_COMMAND_RESULT",
          })
        }

        window.dispatchEvent(
          new CustomEvent("aeronexus:drone-armed", {
            detail: {
              droneId: targetDroneId,
              armed: next,
              isArmed: next,
              source,
              timestamp: new Date(incomingTime).toISOString(),
            },
          })
        )

        return next
      })
    }

    // Always update fleetTelemetry store for multi-drone tracking and state preservation
    setFleetTelemetry((prev) => ({
      ...prev,
      [targetDroneId]: {
        ...(prev[targetDroneId] || {}),
        armed: next,
        isArmed: next,
      },
    }))

    return true
  }, [selectedDroneId])

  /**
   * Section 11, 17, 18, 25: The ONE authoritative function for changing drone position.
   * Only this function is permitted to update droneState.latitude and droneState.longitude.
   */
  const acceptLiveDronePosition = useCallback((droneId, lat, lng, timestamp, source = "LIVE_TELEMETRY") => {
    if (!droneId || droneId !== selectedDroneId) {
      return false
    }

    if (lat === null || lat === undefined || lat === "" || (typeof lat === "string" && lat.trim() === "")) {
      return false
    }
    const numLat = Number(lat)
    if (!Number.isFinite(numLat) || numLat < -90 || numLat > 90) {
      if (import.meta.env?.DEV) {
        console.warn(`[DRONE POSITION REJECTED] reason: INVALID_LATITUDE lat=${lat}`)
      }
      return false
    }

    if (lng === null || lng === undefined || lng === "" || (typeof lng === "string" && lng.trim() === "")) {
      return false
    }
    const numLng = Number(lng)
    if (!Number.isFinite(numLng) || numLng < -180 || numLng > 180) {
      if (import.meta.env?.DEV) {
        console.warn(`[DRONE POSITION REJECTED] reason: INVALID_LONGITUDE lng=${lng}`)
      }
      return false
    }

    if (Math.abs(numLat) < 0.0001 && Math.abs(numLng) < 0.0001) {
      if (import.meta.env?.DEV) {
        console.warn(`[DRONE POSITION REJECTED] reason: NULL_ISLAND_COORDINATES (0, 0)`)
      }
      return false
    }

    const incomingTime = timestamp
      ? (typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime())
      : Date.now()

    const targetId = droneId || selectedDroneId || "DRONE-001"
    const lastTime = lastAcceptedTelemetryTimestampRef.current[targetId] || 0

    if (incomingTime <= lastTime && lastTime !== 0) {
      if (import.meta.env?.DEV) {
        console.warn(`[DRONE POSITION REJECTED] reason: STALE_OR_DUPLICATE_TELEMETRY incomingTime=${incomingTime} lastTime=${lastTime}`)
      }
      return false
    }

    if (source !== "LIVE_TELEMETRY" && source !== "SIMULATION") {
      if (import.meta.env?.DEV) {
        console.warn(`[UNEXPECTED POSITION CHANGE]\nprevious: ${dronePositionRef.current.latitude.toFixed(6)}, ${dronePositionRef.current.longitude.toFixed(6)}\nnew: ${numLat.toFixed(6)}, ${numLng.toFixed(6)}\nsource: ${source}\ntelemetryTimestamp: ${incomingTime}`)
      }
      return false
    }

    const acceptedLat = Number(numLat.toFixed(6))
    const acceptedLng = Number(numLng.toFixed(6))

    lastAcceptedTelemetryTimestampRef.current[targetId] = incomingTime

    setDronePosition((prev) => {
      if (prev.latitude === acceptedLat && prev.longitude === acceptedLng) {
        return prev
      }
      if (import.meta.env?.DEV) {
        console.log(
          `[DRONE POSITION CHANGE]\nprevious: ${prev.latitude.toFixed(6)}, ${prev.longitude.toFixed(6)}\nnew: ${acceptedLat.toFixed(6)}, ${acceptedLng.toFixed(6)}\nsource: ${source}\ntelemetryTimestamp: ${timestamp || incomingTime}`
        )
      }
      return {
        latitude: acceptedLat,
        longitude: acceptedLng,
      }
    })
    setLiveDroneConnected(true)
    setValidLiveGps(true)
    setLiveTelemetryAttached(true)

    return true
  }, [selectedDroneId])

  // Handle incoming live telemetry event (OBSERVED METRICS ONLY - never mutate user command state)
  const handleTelemetryUpdate = useCallback((data) => {
    const timestampMs = data?.timestamp ? new Date(data.timestamp).getTime() : Date.now()
    const now = Date.now()
    const isFresh = Number.isFinite(timestampMs) && timestampMs <= now + 5000 && now - timestampMs <= TELEMETRY_STALE_THRESHOLD_MS
    const isAuthenticated = telemetryClient.connectionState === ConnectionState.AUTHENTICATED
    const metadataSource = data?.metadata?.source || data?.source || ""
    const isSimulatorTelemetry = [
      data?.metadata?.simulator,
      data?.metadata?.mock,
      data?.metadata?.simulation,
    ].some((value) => value === true || String(value).toLowerCase() === "true") || /simulator|mock|simulation/i.test(String(metadataSource))
    const isRealTelemetry = isAuthenticated && !isSimulatorTelemetry && data?.liveDroneConnected !== false && data?.isLiveDrone !== false && data?.live !== false
    const hasValidGps = isValidGpsCoordinate(data?.latitude, data?.longitude)

    console.info("TELEMETRY RECEIVED", {
      "DRONE ID": data?.droneId || null,
      LATITUDE: data?.latitude ?? null,
      LONGITUDE: data?.longitude ?? null,
      TIMESTAMP: data?.timestamp ?? null,
      "CONNECTION STATE": connectionState,
      "POSITION SOURCE": isSimulatorTelemetry ? "SIMULATOR" : isRealTelemetry ? "REAL_LIVE" : "UNVERIFIED",
    })

    if (!data?.droneId || !isFresh || !isAuthenticated) {
      console.warn("TELEMETRY REJECTED", {
        "DRONE ID": data?.droneId || null,
        LATITUDE: data?.latitude ?? null,
        LONGITUDE: data?.longitude ?? null,
        TIMESTAMP: data?.timestamp ?? null,
        "CONNECTION STATE": telemetryClient.connectionState,
        "POSITION SOURCE": "REJECTED",
        reason: !data?.droneId ? "MISSING_DRONE_ID" : !isAuthenticated ? "WEBSOCKET_NOT_AUTHENTICATED" : "STALE_OR_INVALID_TIMESTAMP",
      })
      return
    }

    setLastTelemetryTime(now)
    if (connectionState === ConnectionState.STALE) {
      setConnectionState(ConnectionState.AUTHENTICATED)
    }

    let validatedGps = {}
    if (isRealTelemetry && hasValidGps && data.droneId === selectedDroneId) {
      const accepted = acceptLiveDronePosition(
        data.droneId,
        data.latitude,
        data.longitude,
        data.timestamp,
        "LIVE_TELEMETRY"
      )
      if (accepted) {
        setLiveDroneConnected(true)
        setValidLiveGps(true)
        setLiveTelemetryAttached(true)
        validatedGps = {
          latitude: Number(Number(data.latitude).toFixed(6)),
          longitude: Number(Number(data.longitude).toFixed(6)),
          positionSource: PositionSource.LIVE,
        }
      }
    }

    console.info("TELEMETRY ACCEPTED", {
      "DRONE ID": data.droneId,
      LATITUDE: data.latitude ?? null,
      LONGITUDE: data.longitude ?? null,
      TIMESTAMP: data.timestamp ?? null,
      "CONNECTION STATE": connectionState === ConnectionState.STALE ? ConnectionState.AUTHENTICATED : connectionState,
      "POSITION SOURCE": validatedGps.positionSource || (isSimulatorTelemetry ? "SIMULATOR" : hasValidGps ? "NO_VALID_REAL_POSITION" : "INVALID_GPS"),
    })

    // Monitor battery threshold crossings - state tracking only, no user popups (Section 15)
    const batt = typeof data.battery === "number" ? data.battery : (typeof data.batteryPercent === "number" ? data.batteryPercent : null)
    if (batt !== null && typeof batt === "number" && !isNaN(batt)) {
      prevBatteryPercentRef.current = batt
    }

    // Section 1, 2, 5: Authoritative two-way ARM/DISARM state synchronization
    const incomingArmed = extractArmedState(data)
    if (typeof incomingArmed === "boolean") {
      updateArmedState(incomingArmed, {
        source: isRealTelemetry ? "VEHICLE_TELEMETRY" : "LIVE_TELEMETRY",
        droneId: data.droneId,
        timestamp: timestampMs,
      })
    }

    // Authoritative flight mode synchronization from vehicle
    const incomingMode = data.flightMode || data.mode || data.telemetry?.flightMode
    if (incomingMode && typeof incomingMode === "string" && data.droneId === selectedDroneId) {
      const normalizedMode = String(incomingMode).toUpperCase().replace(/\s+/g, "_")
      const validModes = ["STABILIZE", "ALT_HOLD", "POS_HOLD", "LOITER", "GUIDED", "RTL", "LAND", "AUTO", "BRAKE", "MANUAL"]
      if (validModes.includes(normalizedMode)) {
        setFlightModeState((curr) => (curr !== normalizedMode ? normalizedMode : curr))
      }
    }

    // Update fleet telemetry store with incoming observed metrics (battery, altitude, heading, etc.)
    setFleetTelemetry((prev) => {
      const prevData = prev[data.droneId] || {}
      if (isSimulatorTelemetry && prevData.positionSource === PositionSource.LIVE) {
        return prev
      }
      return {
        ...prev,
        [data.droneId]: {
          ...prevData,
          ...data,
          armed: typeof incomingArmed === "boolean" ? incomingArmed : (prevData.armed ?? DEFAULT_ARMED_STATE),
          isArmed: typeof incomingArmed === "boolean" ? incomingArmed : (prevData.isArmed ?? DEFAULT_ARMED_STATE),
          flightMode: incomingMode ? String(incomingMode).toUpperCase().replace(/\s+/g, "_") : prevData.flightMode,
          latitude: validatedGps.latitude !== undefined
            ? validatedGps.latitude
            : isRealTelemetry && hasValidGps
            ? Number(Number(data.latitude).toFixed(6))
            : prevData.latitude,
          longitude: validatedGps.longitude !== undefined
            ? validatedGps.longitude
            : isRealTelemetry && hasValidGps
            ? Number(Number(data.longitude).toFixed(6))
            : prevData.longitude,
          positionSource: validatedGps.positionSource || (isRealTelemetry && hasValidGps
            ? PositionSource.LIVE
            : prevData.positionSource || PositionSource.HYDERABAD_FALLBACK),
          _telemetryReceivedAt: now,
          _isRealTelemetry: isRealTelemetry,
          timestamp: data.timestamp || new Date().toISOString(),
        },
      }
    })
  }, [acceptLiveDronePosition, connectionState, extractArmedState, selectedDroneId, updateArmedState])

  // Subscribe to WebSocket client events and backend events
  useEffect(() => {
    const unsubTelemetry = telemetryClient.onTelemetry(handleTelemetryUpdate)

    // Listen to discrete backend state events (e.g. ARM_STATE, DRONE_DISARMED, STATUS_CHANGE)
    const unsubBackendEvent = telemetryClient.onBackendEvent((event) => {
      if (!event || typeof event !== "object") return
      const targetDroneId = event.droneId || event.targetDrone || event.drone || event.data?.droneId
      if (!targetDroneId) return

      const eventType = String(event.type || event.event || "").toUpperCase()
      let eventArmed = extractArmedState(event)
      if (eventArmed === undefined && event.data) {
        eventArmed = extractArmedState(event.data)
      }

      if (eventArmed === undefined) {
        if (eventType === "ARMED" || eventType === "DRONE_ARMED" || eventType === "VEHICLE_ARMED") {
          eventArmed = true
        } else if (eventType === "DISARMED" || eventType === "DRONE_DISARMED" || eventType === "VEHICLE_DISARMED") {
          eventArmed = false
        }
      }

      if (typeof eventArmed === "boolean") {
        updateArmedState(eventArmed, {
          source: "BACKEND_STATE_EVENT",
          droneId: targetDroneId,
          timestamp: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
        })
      }
    })

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
        setLiveDroneConnected(false)
        setValidLiveGps(false)
        setLiveTelemetryAttached(false)
        setDronePosition((prev) => {
          if (
            prev.latitude === FALLBACK_DRONE_LOCATION.latitude &&
            prev.longitude === FALLBACK_DRONE_LOCATION.longitude
          ) {
            return prev
          }
          return {
            latitude: FALLBACK_DRONE_LOCATION.latitude,
            longitude: FALLBACK_DRONE_LOCATION.longitude,
          }
        })
      }
    })

    return () => {
      unsubTelemetry()
      unsubBackendEvent()
      unsubState()
    }
  }, [extractArmedState, handleTelemetryUpdate, updateArmedState])

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
    const droneData = fleetTelemetry[droneId]
    if (droneData && (typeof droneData.armed === "boolean" || typeof droneData.isArmed === "boolean")) {
      const droneArmed = typeof droneData.armed === "boolean" ? droneData.armed : droneData.isArmed
      setIsArmedState(droneArmed)
    } else {
      setIsArmedState(DEFAULT_ARMED_STATE)
    }
  }, [fleetTelemetry])

  // Synchronize armed state when switching selected drone
  useEffect(() => {
    const droneData = fleetTelemetry[selectedDroneId]
    if (droneData && (typeof droneData.armed === "boolean" || typeof droneData.isArmed === "boolean")) {
      const droneArmed = typeof droneData.armed === "boolean" ? droneData.armed : droneData.isArmed
      setIsArmedState(droneArmed)
    }
  }, [selectedDroneId, fleetTelemetry])

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
        setLiveDroneConnected(false)
        setValidLiveGps(false)
        setLiveTelemetryAttached(false)
        setDronePosition({
          latitude: FALLBACK_DRONE_LOCATION.latitude,
          longitude: FALLBACK_DRONE_LOCATION.longitude,
        })
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
      updateArmedState(false, {
        source: "EMERGENCY_OVERRIDE",
        commandId: `EMERGENCY-DISARM-${Date.now()}`,
        userAction: "EMERGENCY_DISARM",
        backendResponse: { success: true },
        isConfirmed: true,
      })
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
  }, [showToast, handleFlightModeChange, selectedDroneId, updateArmedState])

  /**
   * Execute real ARM or DISARM flight command through backend and wait for authoritative state
   */
  const executeArmCommand = useCallback(async ({ arm = true, droneId, isOverride = false } = {}) => {
    const targetDroneId = droneId || selectedDroneId || "DRONE-001"
    const actionLabel = arm ? "ARM" : "DISARM"
    const userAction = arm ? "USER_ARM_CONFIRMED" : "USER_DISARM_CONFIRMED"
    const commandId = `CMD-${actionLabel}-${Date.now()}`

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
    let confirmed = false
    try {
      confirmed = await flightControlService.waitForAuthoritativeArmedState({
        droneId: targetDroneId,
        expectedArmed: arm,
        timeoutMs: 4000,
        commandResponse: responseData,
      })
    } catch (waitErr) {
      console.warn(`[ARM] Wait confirmation error:`, waitErr)
      confirmed = false
    }

    if (!confirmed) {
      console.warn(`[ARM] Telemetry armed state: confirmation timed out`)
      showAlert({
        type: AlertTypes.ERROR,
        title: arm ? "ARM COMMAND TIMEOUT" : "DISARM COMMAND TIMEOUT",
        message: `No authoritative confirmation received for ${targetDroneId}.`,
        key: "ARM_RESULT",
        category: AlertCategories.FLIGHT,
      })
      throw new Error(`Timeout waiting for drone to confirm ${actionLabel} state.`)
    }

    // Final Authoritative State Update (Section 5, 6, 17: only after confirmed response)
    console.info(`[ARM] Final state: ${arm ? "ARMED" : "UNARMED"} confirmed`)
    updateArmedState(arm, {
      source: "CONFIRMED_USER_COMMAND",
      commandId,
      userAction,
      backendResponse: { success: true, ...responseData },
      isConfirmed: true,
    })

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
      message: `${targetDroneId} ${arm ? "armed" : "disarmed"} successfully.`,
      key: "ARM_RESULT",
      category: AlertCategories.FLIGHT,
    })

    return true
  }, [selectedDroneId, isAuthenticated, isArmed, updateArmedState])

  const toggleArmed = useCallback(async (source = "USER") => {
    try {
      await executeArmCommand({ arm: !isArmed, source })
    } catch (err) {
      console.warn("[TelemetryContext] toggleArmed error:", err.message)
    }
  }, [executeArmCommand, isArmed])

  const setArmed = useCallback((val, source = "USER") => {
    updateArmedState(val, {
      source,
      userAction: "UNCONFIRMED_DIRECT_CALL",
      isConfirmed: false,
    })
  }, [updateArmedState])

  const setIsArmed = useCallback((val) => {
    setArmed(val, "UNCONFIRMED_SET_IS_ARMED")
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

  // Extract selected drone's latest telemetry with safe fallback and authoritative position
  const resolvedDisplayPosition = useMemo(() => {
    const liveConnected = Boolean(liveDroneConnected && selectedDroneId)
    const hasValidGps = Boolean(validLiveGps && isValidGpsCoordinate(dronePosition.latitude, dronePosition.longitude))

    return resolveDroneDisplayPosition({
      liveDroneConnected: liveConnected,
      validLiveGps: hasValidGps,
      activeDroneId: selectedDroneId,
      latitude: dronePosition.latitude,
      longitude: dronePosition.longitude,
    })
  }, [liveDroneConnected, selectedDroneId, validLiveGps, dronePosition.latitude, dronePosition.longitude])

  useEffect(() => {
    setDronePosition((prev) => {
      const next = {
        latitude: resolvedDisplayPosition.latitude,
        longitude: resolvedDisplayPosition.longitude,
      }
      return prev.latitude === next.latitude && prev.longitude === next.longitude ? prev : next
    })

    const source = resolvedDisplayPosition.source
    const connection = source === PositionSource.LIVE ? "LIVE" : "NO LIVE DRONE"
    const gps = source === PositionSource.LIVE ? "VALID" : "INVALID"
    console.info(
      `[DRONE LOCATION SOURCE]\nconnection: ${connection}\ngps: ${gps}\nsource: ${source}\ndisplayPosition: ${resolvedDisplayPosition.latitude.toFixed(6)}, ${resolvedDisplayPosition.longitude.toFixed(6)}`
    )
  }, [resolvedDisplayPosition])

  const rawTelemetry = useMemo(() => {
    const activeData = fleetTelemetry[selectedDroneId]
    const defaultData = createDefaultTelemetry(selectedDroneId)
    const source = resolvedDisplayPosition.source
    if (activeData) {
      return {
        ...defaultData,
        ...activeData,
        latitude: resolvedDisplayPosition.latitude,
        longitude: resolvedDisplayPosition.longitude,
        positionSource: source,
      }
    }
    return {
      ...defaultData,
      latitude: resolvedDisplayPosition.latitude,
      longitude: resolvedDisplayPosition.longitude,
      positionSource: source,
    }
  }, [fleetTelemetry, selectedDroneId, resolvedDisplayPosition])

  const droneGPSValid = useMemo(() => {
    return isValidGpsCoordinate(dronePosition.latitude, dronePosition.longitude)
  }, [dronePosition.latitude, dronePosition.longitude])

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
    const positionSource = liveTelemetryAttached
      ? PositionSource.LIVE
      : PositionSource.HYDERABAD_FALLBACK
    const hasAuthoritativeLiveTelemetry = positionSource === PositionSource.LIVE

    return {
      ...rawTelemetry,
      latitude: dronePosition.latitude,
      longitude: dronePosition.longitude,
      positionSource,
      droneConnected: isConnected,
      droneGPSValid: liveTelemetryAttached || Boolean(isConnected && !isStale && droneGPSValid),
      isLive,
      isStale,
      status: !isConnected ? "DISCONNECTED" : isStale ? "STALE" : rawTelemetry.status || "OK",
      flightMode: hasAuthoritativeLiveTelemetry
        ? rawTelemetry.flightMode || flightMode || DEFAULT_FLIGHT_MODE
        : flightMode || DEFAULT_FLIGHT_MODE,
      armed: typeof isArmed === "boolean" ? isArmed : (typeof rawTelemetry.armed === "boolean" ? rawTelemetry.armed : DEFAULT_ARMED_STATE),
      isArmed: typeof isArmed === "boolean" ? isArmed : (typeof rawTelemetry.isArmed === "boolean" ? rawTelemetry.isArmed : DEFAULT_ARMED_STATE),
      speed: rawTelemetry.speed ?? 0,
      groundSpeed: rawTelemetry.groundSpeed ?? rawTelemetry.speed ?? 0,
      verticalSpeed: rawTelemetry.verticalSpeed ?? rawTelemetry.climbRate ?? 0,
      climbRate: rawTelemetry.climbRate ?? rawTelemetry.verticalSpeed ?? 0,
      gimbal: gimbalState,
    }
  }, [rawTelemetry, dronePosition, liveTelemetryAttached, flightMode, isArmed, gimbalState, isConnected, isStale, droneGPSValid, isLive])

  const activeDrone = useMemo(() => {
    const reg = (registeredDrones || []).find(
      (d) => d.id === selectedDroneId || d.droneId === selectedDroneId || (selectedDroneId === "DRONE-001" && d.id === "DR-001")
    ) || registeredDrones?.[0] || null
    return reg
  }, [registeredDrones, selectedDroneId])

  const value = {
    telemetry,
    dronePosition,
    liveTelemetryAttached,
    acceptLiveDronePosition,
    updateArmedState,
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
    registeredDrones,
    activeDrone,
    selectedDroneId,
    selectDrone,
    registerDrone,
    updateDrone,
    deleteDrone,
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

export const useTelemetry = () => {
  const context = useContext(TelemetryContext)
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider")
  }
  return context
}

export default TelemetryProvider
