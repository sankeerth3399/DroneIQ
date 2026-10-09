/**
 * Centralized Backend Information & Event Stream Service
 * 
 * Captures, normalizes, and retains all backend-pushed WebSocket and system messages
 * across the entire application session.
 */

import { telemetryClient } from "./telemetryClient.js"

const STORAGE_KEY = "aeronexus_backend_info_events"
const MAX_EVENTS = 500

/**
 * Extract clean string representation of payload content
 */
export const getEventContent = (payload) => {
  if (payload === null || payload === undefined) return ""
  if (typeof payload === "string") return payload
  if (typeof payload === "object") {
    const msg = payload.message ?? payload.msg ?? payload.text ?? payload.details ?? payload.description
    if (typeof msg === "string" && msg.trim()) {
      return msg
    }
    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return String(payload)
    }
  }
  return String(payload)
}

/**
 * Extract event category/type
 */
export const getEventType = (payload) => {
  if (!payload) return "BACKEND"
  if (typeof payload === "string") return "INFO"
  const rawType = payload.type ?? payload.event ?? payload.level ?? payload.severity ?? payload.action ?? "BACKEND"
  return String(rawType).toUpperCase()
}

/**
 * Extract ISO or formatted timestamp, preserving backend timestamp when provided
 */
export const getEventTimestampInfo = (payload, receivedAt) => {
  if (payload && typeof payload === "object") {
    const rawTime = payload.timestamp ?? payload.time ?? payload.createdAt ?? payload.datetime ?? payload.date ?? payload.sentAt
    if (rawTime !== undefined && rawTime !== null && rawTime !== "") {
      if (typeof rawTime === "number") {
        const ms = rawTime > 1e11 ? rawTime : rawTime * 1000
        return {
          timestamp: new Date(ms).toISOString(),
          hasBackendTimestamp: true,
        }
      }
      return {
        timestamp: String(rawTime),
        hasBackendTimestamp: true,
      }
    }
  }
  return {
    timestamp: new Date(receivedAt || Date.now()).toISOString(),
    hasBackendTimestamp: false,
  }
}

/**
 * Extract Drone ID if present
 */
export const getEventDroneId = (payload) => {
  if (!payload || typeof payload !== "object") return null
  const d = payload.droneId ?? payload.targetDrone ?? payload.drone_id ?? payload.drone ?? payload.vehicleId ?? payload.uavId
  return d ? String(d) : null
}

/**
 * Extract Mission ID if present
 */
export const getEventMissionId = (payload) => {
  if (!payload || typeof payload !== "object") return null
  const m = payload.missionId ?? payload.mission_id ?? payload.mission ?? payload.projectId
  return m ? String(m) : null
}

/**
 * Extract Source / Subsystem if present
 */
export const getEventSource = (payload) => {
  if (!payload || typeof payload !== "object") return null
  const s = payload.source ?? payload.subsystem ?? payload.origin ?? payload.sender ?? payload.operator
  return s ? String(s) : null
}

/**
 * Extract Severity / Level if present
 */
export const getEventSeverity = (payload) => {
  if (!payload || typeof payload !== "object") return null
  const sev = payload.severity ?? payload.level
  return sev ? String(sev).toUpperCase() : null
}

/**
 * Normalize incoming backend event into standard record
 */
export const parseBackendEvent = (payload, receivedAt = Date.now()) => {
  // Plain text string pushed by backend
  if (typeof payload === "string") {
    return {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(receivedAt).toISOString(),
      hasBackendTimestamp: false,
      receivedAt,
      type: "INFO",
      severity: null,
      event: null,
      message: payload,
      droneId: null,
      missionId: null,
      source: null,
      data: null,
      metadata: null,
      content: payload,
      isPlainString: true,
      raw: payload,
    }
  }

  const obj = typeof payload === "object" && payload !== null ? payload : {}
  const { timestamp, hasBackendTimestamp } = getEventTimestampInfo(obj, receivedAt)
  const type = getEventType(obj)
  const severity = getEventSeverity(obj)
  const droneId = getEventDroneId(obj)
  const missionId = getEventMissionId(obj)
  const source = getEventSource(obj)
  const rawEvent = obj.event ? String(obj.event) : null
  const rawMessage = obj.message ?? obj.msg ?? obj.text ?? obj.details ?? obj.description ?? null
  const message = typeof rawMessage === "string" ? rawMessage : (rawMessage !== null && rawMessage !== undefined ? String(rawMessage) : null)
  const data = obj.data !== undefined ? obj.data : null
  const metadata = obj.metadata !== undefined ? obj.metadata : null
  const content = getEventContent(obj)

  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp,
    hasBackendTimestamp,
    receivedAt,
    type,
    severity,
    event: rawEvent,
    message,
    droneId,
    missionId,
    source,
    data,
    metadata,
    content,
    isPlainString: false,
    raw: payload,
  }
}

class BackendInfoService {
  constructor() {
    this.events = []
    this.subscribers = new Set()
    this.telemetryUnsub = null
    this.loadFromStorage()
    this.initTelemetrySubscription()
  }

  loadFromStorage() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.events = parsed
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }

  saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.events.slice(-MAX_EVENTS)))
    } catch {
      // Ignore quota errors
    }
  }

  initTelemetrySubscription() {
    if (this.telemetryUnsub) return
    this.telemetryUnsub = telemetryClient.onBackendEvent((payload, receivedAt) => {
      this.addEvent(payload, receivedAt)
    })
  }

  addEvent(payload, receivedAt = Date.now()) {
    const event = parseBackendEvent(payload, receivedAt)

    // Development debugging console logging per specification
    console.log("[INFO STREAM RECEIVED]", {
      "message type": event.type,
      "timestamp": event.timestamp,
      ...(event.droneId ? { "droneId": event.droneId } : {}),
      ...(event.missionId ? { "missionId": event.missionId } : {}),
      "raw payload": payload,
      "whether it was forwarded to INFO": true,
    })

    this.events = [...this.events, event].slice(-MAX_EVENTS)
    this.saveToStorage()
    this.notify()
    return event
  }

  clearEvents() {
    this.events = []
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
    this.notify()
  }

  getEvents() {
    return this.events
  }

  subscribe(listener) {
    this.subscribers.add(listener)
    listener(this.events)
    return () => this.subscribers.delete(listener)
  }

  notify() {
    this.subscribers.forEach((fn) => {
      try {
        fn(this.events)
      } catch (err) {
        console.error("[BackendInfoService] listener error:", err)
      }
    })
  }
}

export const backendInfoService = new BackendInfoService()
export default backendInfoService
