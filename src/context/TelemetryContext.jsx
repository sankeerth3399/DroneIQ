import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { TelemetryContext } from "./telemetryContextCore.js"
import { useAuth } from "@/hooks/useAuth.js"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"
import { ConnectionState, createDefaultTelemetry } from "@/services/telemetry/telemetryTypes.js"

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

  // Handle incoming live telemetry event
  const handleTelemetryUpdate = useCallback((data) => {
    if (!data || !data.droneId) return

    setLastTelemetryTime(Date.now())
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
      if (lastTelemetryTime && Date.now() - lastTelemetryTime > 6000) {
        setConnectionState((curr) =>
          curr === ConnectionState.AUTHENTICATED ? ConnectionState.STALE : curr
        )
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [connectionState, lastTelemetryTime])

  // Centralized ARM/DISARM Flight Safety State (Initial state: true)
  const [isArmed, setIsArmed] = useState(true)

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

  const toggleArmed = useCallback(() => {
    setIsArmed((prev) => {
      const next = !prev
      if (next) {
        showToast("Drone Armed Successfully", "success")
      } else {
        showToast("Drone Disarmed Successfully", "warning")
      }
      return next
    })
  }, [showToast])

  const setArmed = useCallback((val) => {
    setIsArmed((prev) => {
      const next = Boolean(val)
      if (prev !== next) {
        if (next) {
          showToast("Drone Armed Successfully", "success")
        } else {
          showToast("Drone Disarmed Successfully", "warning")
        }
      }
      return next
    })
  }, [showToast])

  // Extract selected drone's latest telemetry with safe fallback
  const rawTelemetry = useMemo(() => {
    const activeData = fleetTelemetry[selectedDroneId]
    if (activeData) return activeData
    return createDefaultTelemetry(selectedDroneId)
  }, [fleetTelemetry, selectedDroneId])

  // Centralized telemetry object with authoritative isArmed state
  const telemetry = useMemo(() => ({
    ...rawTelemetry,
    armed: isArmed,
    isArmed,
  }), [rawTelemetry, isArmed])

  const isLive = Boolean(
    lastTelemetryTime && connectionState === ConnectionState.AUTHENTICATED
  )

  const value = {
    telemetry,
    isArmed,
    setIsArmed,
    setArmed,
    toggleArmed,
    toast,
    showToast,
    clearToast,
    fleetTelemetry,
    selectedDroneId,
    selectDrone,
    subscribeAll,
    connectionState,
    isLive,
    lastTelemetryTime,
  }

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}

export default TelemetryProvider
