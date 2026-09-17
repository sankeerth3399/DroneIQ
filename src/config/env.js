/**
 * Centralized Environment Configuration for AeroNexus GCS & DroneIQ Backend
 */

const normalizeUrl = (url, isWs = false, fallbackBase = "") => {
  let target = url

  // If WebSocket URL is missing, derive it from the API base URL
  if (!target && isWs && fallbackBase) {
    target = fallbackBase
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://")
      // Remove trailing /api from WS host
      .replace(/\/api\/?$/i, "")
  }

  if (!target) {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return isWs ? `wss://${window.location.host}` : `https://${window.location.host}`
    }
    return isWs ? "ws://localhost:8080" : "http://localhost:8080"
  }

  let clean = target.trim().replace(/\/+$/, "")

  // Strip trailing /api from WebSocket URL if accidentally passed
  if (isWs) {
    clean = clean.replace(/\/api\/?$/i, "").replace(/\/ws\/telemetry\/?$/i, "")
  }

  // Automatic secure protocol upgrade in browser production environment
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    if (isWs && clean.startsWith("ws://")) {
      clean = clean.replace(/^ws:\/\//i, "wss://")
    } else if (!isWs && clean.startsWith("http://")) {
      clean = clean.replace(/^http:\/\//i, "https://")
    }
  }

  return clean
}

const getEnvVar = (key, fallback = "") => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key]
  }
  const proc = typeof globalThis !== "undefined" ? globalThis.process : null
  if (proc && proc.env && proc.env[key] !== undefined) {
    return proc.env[key]
  }
  return fallback
}


export const API_BASE_URL = normalizeUrl(getEnvVar("VITE_API_BASE_URL"), false)
export const WS_BASE_URL = normalizeUrl(getEnvVar("VITE_WS_BASE_URL"), true, API_BASE_URL)
export const MAPPLS_KEY = getEnvVar("VITE_MAPPLS_KEY", "")


/**
 * Builds a clean, fully-qualified API URL avoiding duplicate /api paths
 * e.g.:
 * - (API_BASE_URL ends with '/api' AND endpoint begins with '/api/...') -> deduplicates /api
 * - (API_BASE_URL lacks '/api' AND endpoint begins with '/auth/...') -> ensures /api/auth/...
 * @param {string} endpoint - e.g. "/api/auth/login" or "/auth/login" or full URL
 * @param {string} [baseUrl] - Base API URL (defaults to API_BASE_URL)
 * @returns {string} Fully qualified URL
 */
export function buildApiUrl(endpoint, baseUrl = API_BASE_URL) {
  if (!endpoint) return baseUrl
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint
  }

  const cleanBase = (baseUrl || "").trim().replace(/\/+$/, "")
  const cleanEndpoint = endpoint.trim().replace(/^\/+/, "")

  // Case 1: Base URL already ends with '/api'
  if (cleanBase.toLowerCase().endsWith("/api")) {
    if (cleanEndpoint.toLowerCase().startsWith("api/")) {
      const subPath = cleanEndpoint.slice(4).replace(/^\/+/, "")
      return `${cleanBase}/${subPath}`
    }
    return `${cleanBase}/${cleanEndpoint}`
  }

  // Case 2: Base URL does NOT end with '/api'
  if (!cleanEndpoint.toLowerCase().startsWith("api/")) {
    return `${cleanBase}/api/${cleanEndpoint}`
  }

  return `${cleanBase}/${cleanEndpoint}`
}

