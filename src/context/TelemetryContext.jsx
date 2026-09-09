import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "./AuthContext.jsx"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"
import { ConnectionState, createDefaultTelemetry } from "@/services/telemetry/telemetryTypes.js"

const TelemetryContext = createContext(null)

export const TelemetryProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth()

  const [selectedDroneId, setSelectedDroneId] = useState("DRONE-001")
  const [fleetTelemetry, setFleetTelemetry] = useState({})
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED)
  const [lastTelemetryTime, setLastTelemetryTime] = useState(null)

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
      setFleetTelemetry({})
      setLastTelemetryTime(null)
    }

    return () => {
      // Clean up on component unmount
      if (!isAuthenticated) {
        telemetryClient.disconnect()
      }
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

  // Extract selected drone's latest telemetry with safe fallback
  const telemetry = useMemo(() => {
    const activeData = fleetTelemetry[selectedDroneId]
    if (activeData) return activeData
    return createDefaultTelemetry(selectedDroneId)
  }, [fleetTelemetry, selectedDroneId])

  const isLive = useMemo(() => {
    return (
      (connectionState === ConnectionState.AUTHENTICATED || connectionState === ConnectionState.CONNECTED) &&
      Boolean(lastTelemetryTime && Date.now() - lastTelemetryTime < 6000)
    )
  }, [connectionState, lastTelemetryTime])

  const value = {
    telemetry,
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

export const useTelemetry = () => {
  const context = useContext(TelemetryContext)
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider")
  }
  return context
}

export default TelemetryContext
