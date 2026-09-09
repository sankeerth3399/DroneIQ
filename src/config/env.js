/**
 * Centralized Environment Configuration for AeroNexus GCS & DroneIQ Backend
 */

const normalizeUrl = (url, isWs = false) => {
  if (!url) {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return isWs ? `wss://${window.location.host}` : `https://${window.location.host}`
    }
    return isWs ? "ws://localhost:8080" : "http://localhost:8080"
  }

  let clean = url.trim().replace(/\/+$/, "")

  // Automatic secure protocol upgrade in browser production environment
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    if (isWs && clean.startsWith("ws://")) {
      clean = clean.replace(/^ws:\/\//, "wss://")
    } else if (!isWs && clean.startsWith("http://")) {
      clean = clean.replace(/^http:\/\//, "https://")
    }
  }

  return clean
}

export const API_BASE_URL = normalizeUrl(import.meta.env.VITE_API_BASE_URL, false)
export const WS_BASE_URL = normalizeUrl(import.meta.env.VITE_WS_BASE_URL, true)
export const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY || ""
