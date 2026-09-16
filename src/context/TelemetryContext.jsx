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

  // Listen for global toast notifications (e.g. from 403 Forbidden or API events)
  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || "info")
      }
    }

    const handleRtl = () => {
      setFleetTelemetry((prev) => {
        const current = prev[selectedDroneId] || {}
        return {
          ...prev,
          [selectedDroneId]: {
            ...current,
            flightMode: "RTL",
          },
        }
      })
    }

    const handleLand = () => {
      setFleetTelemetry((prev) => {
        const current = prev[selectedDroneId] || {}
        return {
          ...prev,
          [selectedDroneId]: {
            ...current,
            flightMode: "LAND",
          },
        }
      })
    }

    const handleAbort = () => {
      setFleetTelemetry((prev) => {
        const current = prev[selectedDroneId] || {}
        return {
          ...prev,
          [selectedDroneId]: {
            ...current,
            flightMode: "HOLD",
          },
        }
      })
    }

    window.addEventListener("aeronexus:toast", handleToastEvent)
    window.addEventListener("aeronexus:emergency-rtl", handleRtl)
    window.addEventListener("aeronexus:emergency-land", handleLand)
    window.addEventListener("aeronexus:emergency-abort", handleAbort)

    return () => {
      window.removeEventListener("aeronexus:toast", handleToastEvent)
      window.removeEventListener("aeronexus:emergency-rtl", handleRtl)
      window.removeEventListener("aeronexus:emergency-land", handleLand)
      window.removeEventListener("aeronexus:emergency-abort", handleAbort)
    }
  }, [showToast, selectedDroneId])

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
    const activeData = fleetTelemetry[selectedDroneId]
    if (activeData) return activeData
    return createDefaultTelemetry(selectedDroneId)
  }, [fleetTelemetry, selectedDroneId])

  // Centralized telemetry object with authoritative isArmed and gimbal state
  const telemetry = useMemo(() => ({
    ...rawTelemetry,
    armed: isArmed,
    isArmed,
    gimbal: gimbalState,
  }), [rawTelemetry, isArmed, gimbalState])

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
    isLive,
    lastTelemetryTime,
  }

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}

export default TelemetryProvider
