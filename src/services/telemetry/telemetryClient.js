import { WS_BASE_URL } from "@/config/env.js"
import { ConnectionState } from "./telemetryTypes.js"

/**
 * Production WebSocket Client for DroneIQ Real-Time Telemetry
 * Implements First-Message In-Band Authentication, 30s PING keepalive,
 * and exponential backoff reconnection.
 */
export class DroneIqClient {
  constructor() {
    this.ws = null
    const cleanWsBase = (WS_BASE_URL || "")
      .replace(/\/ws\/telemetry\/?$/i, "")
      .replace(/\/api\/?$/i, "")
      .replace(/\/+$/, "")
    this.url = `${cleanWsBase}/ws/telemetry`

    this.reconnectTimeoutId = null
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 30000
    this.intentionalClose = false
    this.connectionState = ConnectionState.DISCONNECTED

    // Subscriptions & listeners
    this.telemetryListeners = new Set()
    this.backendEventListeners = new Set()
    this.stateListeners = new Set()
    this.subscribedDrones = new Set()
    this.subscribeAllMode = true
  }

  /**
   * Register listener for live telemetry updates
   */
  onTelemetry(callback) {
    this.telemetryListeners.add(callback)
    return () => this.telemetryListeners.delete(callback)
  }

  onBackendEvent(callback) {
    this.backendEventListeners.add(callback)
    return () => this.backendEventListeners.delete(callback)
  }

  notifyBackendEvent(payload, receivedAt = Date.now()) {
    this.backendEventListeners.forEach((listener) => {
      try {
        listener(payload, receivedAt)
      } catch (err) {
        console.error("[DroneIqClient] Backend event listener error:", err)
      }
    })
  }

  /**
   * Register listener for connection state transitions
   */
  onStateChange(callback) {
    this.stateListeners.add(callback)
    callback(this.connectionState)
    return () => this.stateListeners.delete(callback)
  }

  setConnectionState(newState) {
    if (this.connectionState !== newState) {
      this.connectionState = newState
      this.stateListeners.forEach((cb) => {
        try {
          cb(newState)
        } catch (err) {
          console.error("[DroneIqClient] State listener error:", err)
        }
      })
    }
  }

  /**
   * Connect WebSocket with JWT token
   * @param {string} token 
   */
  connect(token) {
    if (!token) {
      console.warn("[DroneIqClient] Connect called without JWT token.")
      return
    }

    this.token = token
    this.intentionalClose = false

    // Avoid duplicate connection if already open or connecting
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.clearTimers()
    this.setConnectionState(ConnectionState.CONNECTING)

    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      console.error("[DroneIqClient] Failed to construct WebSocket:", err)
      this.setConnectionState(ConnectionState.BACKEND_UNAVAILABLE)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.info("[DroneIqClient] WebSocket connected to", this.url)
      this.setConnectionState(ConnectionState.CONNECTED)
      this.reconnectAttempts = 0

      // Step 2: In-band first-message authentication (must be within 5 seconds)
      this.send({
        type: "AUTH",
        token: this.token,
      })

      // Start 30s keepalive ping
      this.pingIntervalId = setInterval(() => {
        this.send({ type: "PING" })
      }, 30000)

      this.backendEventListeners.forEach((listener) => {
        try {
          listener({
            type: "WEBSOCKET_CONNECTED",
            level: "INFO",
            message: `WebSocket telemetry channel established to ${this.url}`,
            timestamp: Date.now(),
          }, Date.now())
        } catch (err) {
          console.error("[DroneIqClient] Backend event listener error:", err)
        }
      })
    }

    this.ws.onmessage = (event) => {
      let rawData = event.data
      let message

      try {
        message = typeof rawData === "string" ? JSON.parse(rawData) : rawData
      } catch {
        // Plain text / raw string pushed directly by backend
        message = {
          type: "INFO",
          message: String(rawData),
          raw: rawData,
        }
      }

      if (!message || typeof message !== "object") {
        message = {
          type: "INFO",
          message: String(message),
          raw: message,
        }
      }

      switch (message.type) {
        case "AUTH_SUCCESS":
          console.info("[DroneIqClient] Authenticated successfully as", message.username)
          this.setConnectionState(ConnectionState.AUTHENTICATED)

          // Re-apply any specific drone subscriptions
          if (this.subscribeAllMode) {
            this.subscribeAll()
          } else {
            this.subscribedDrones.forEach((droneId) => {
              this.subscribeDrone(droneId)
            })
          }

          this.notifyBackendEvent({
            type: "AUTH_SUCCESS",
            level: "SUCCESS",
            message: `JWT session authenticated with DroneIQ backend for '${message.username || "operator"}'`,
            username: message.username,
            data: message,
            timestamp: message.timestamp || Date.now(),
          }, Date.now())
          break

        case "TELEMETRY": {
          const dataPayload = (message.data && typeof message.data === "object") ? message.data : message
          const targetDroneId = message.droneId || dataPayload.droneId
          const telemetryPayload = {
            ...dataPayload,
            droneId: targetDroneId,
            liveDroneConnected: message.liveDroneConnected ?? dataPayload.liveDroneConnected,
          }
          this.telemetryListeners.forEach((listener) => {
            try {
              listener(telemetryPayload)
            } catch (err) {
              console.error("[DroneIqClient] Telemetry listener error:", err)
            }
          })

          // If telemetry message also includes a discrete event, alert, status change, or message
          if (message.event || dataPayload.event || dataPayload.alert || dataPayload.message || dataPayload.statusChange) {
            this.notifyBackendEvent({
              type: message.event ? String(message.event) : "TELEMETRY_EVENT",
              ...message,
            }, Date.now())
          }
          break
        }

        case "PONG":
          // Keepalive acknowledged
          break

        case "AUTH_FAILURE":
          console.error("[DroneIqClient] Authentication failure:", message.message)
          this.setConnectionState(ConnectionState.AUTH_FAILURE)
          this.notifyBackendEvent({
            type: "AUTH_FAILURE",
            level: "ERROR",
            message: message.message || "Authentication rejected by DroneIQ backend",
            data: message,
            timestamp: message.timestamp || Date.now(),
          }, Date.now())
          break

        default: {
          // If the message contains drone telemetry or state fields, notify telemetry listeners
          const payload = (message.data && typeof message.data === "object") ? message.data : message
          const droneId = message.droneId || payload?.droneId
          const hasStateFields = payload && typeof payload === "object" && (
            payload.armed !== undefined ||
            payload.isArmed !== undefined ||
            payload.latitude !== undefined ||
            payload.flightMode !== undefined
          )

          if (droneId && hasStateFields) {
            const telemetryPayload = {
              ...payload,
              droneId,
              liveDroneConnected: message.liveDroneConnected ?? payload.liveDroneConnected,
            }
            this.telemetryListeners.forEach((listener) => {
              try {
                listener(telemetryPayload)
              } catch (err) {
                console.error("[DroneIqClient] Telemetry listener error:", err)
              }
            })
          }

          // ANY OTHER BACKEND MESSAGE:
          // INFO, LOG, EVENT, COMMAND, MISSION, SYSTEM, ALERT, STATUS, ERROR,
          // TELEMETRY_EVENT, COMMAND_RESULT, MISSION_EVENT, or any unknown/future valid message type.
          // NEVER drop valid backend messages!
          this.notifyBackendEvent(message, Date.now())
          break
        }
      }
    }

    this.ws.onclose = (event) => {
      console.warn("[DroneIqClient] WebSocket closed. Code:", event.code, "Reason:", event.reason)
      this.clearTimers()

      this.backendEventListeners.forEach((listener) => {
        try {
          listener({
            type: "WEBSOCKET_DISCONNECTED",
            level: "WARNING",
            message: `WebSocket channel closed (code ${event.code}${event.reason ? `: ${event.reason}` : ""})`,
            timestamp: Date.now(),
          }, Date.now())
        } catch (err) {
          console.error("[DroneIqClient] Backend event listener error:", err)
        }
      })

      if (!this.intentionalClose) {
        if (event.code === 1008) {
          this.setConnectionState(ConnectionState.AUTH_FAILURE)
        } else {
          this.setConnectionState(
            this.reconnectAttempts > 3 ? ConnectionState.BACKEND_UNAVAILABLE : ConnectionState.DISCONNECTED
          )
        }
        this.scheduleReconnect()
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED)
      }
    }

    this.ws.onerror = () => {
      console.warn("[DroneIqClient] WebSocket error event encountered.")
      this.setConnectionState(
        this.reconnectAttempts > 2 ? ConnectionState.BACKEND_UNAVAILABLE : ConnectionState.CONNECTING
      )
    }
  }

  scheduleReconnect() {
    if (this.intentionalClose || this.reconnectTimeoutId) return

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay)
    console.info(`[DroneIqClient] Scheduling reconnect attempt ${this.reconnectAttempts} in ${Math.round(delay / 1000)}s...`)

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null
      if (this.token && !this.intentionalClose) {
        this.connect(this.token)
      }
    }, delay)
  }

  clearTimers() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId)
      this.pingIntervalId = null
    }
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
  }

  subscribeDrone(droneId) {
    if (!droneId) return
    this.subscribedDrones.add(droneId)
    this.subscribeAllMode = false
    this.send({ type: "SUBSCRIBE", droneId })
  }

  unsubscribeDrone(droneId) {
    if (!droneId) return
    this.subscribedDrones.delete(droneId)
    this.send({ type: "UNSUBSCRIBE", droneId })
  }

  subscribeAll() {
    this.subscribeAllMode = true
    this.send({ type: "SUBSCRIBE_ALL" })
  }

  disconnect() {
    this.intentionalClose = true
    this.clearTimers()
    this.token = null
    if (this.ws) {
      try {
        this.ws.close(1000, "User logged out")
      } catch {
        // Ignore
      }
      this.ws = null
    }
    this.setConnectionState(ConnectionState.DISCONNECTED)
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data))
      } catch (err) {
        console.error("[DroneIqClient] Failed to send WebSocket message:", err)
      }
    }
  }
}

// Export singleton instance for app-wide use
export const telemetryClient = new DroneIqClient()
export default telemetryClient
