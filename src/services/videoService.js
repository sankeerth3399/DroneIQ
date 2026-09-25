import { apiClient } from "./api/apiClient.js"

/**
 * Maps a Drone ID and camera type to canonical Stream ID
 * Example:
 *   DRONE-001 (main) -> drone-001-camera
 *   DRONE-001 (fpv)  -> drone-001-fpv (or drone-001-camera if single stream)
 *   DRONE-002        -> drone-002-camera
 *
 * @param {string} droneId - Drone identifier (e.g. "DRONE-001")
 * @param {string} [cameraType="main"] - Camera type ("main" or "fpv")
 * @returns {string} streamId
 */
export function getStreamIdFromDroneId(droneId, cameraType = "main") {
  if (!droneId) return "drone-001-camera"
  const cleanId = String(droneId).trim().toLowerCase()
  if (cleanId.endsWith("-camera") || cleanId.endsWith("-fpv")) {
    return cleanId
  }
  const suffix = cameraType === "fpv" ? "fpv" : "camera"
  return `${cleanId}-${suffix}`
}

/**
 * DroneIQ Spring Boot Video REST Service
 * Communicates with /api/video/* endpoints
 * Uses centralized apiClient for automatic JWT Bearer token injection
 */
export const videoService = {
  /**
   * Fetch all active/configured video streams
   * @returns {Promise<Array>} List of stream objects
   */
  async getVideoStreams() {
    try {
      if (import.meta.env?.DEV) {
        console.log("[VideoService] Fetching video streams list...")
      }
      const response = await apiClient("/api/video/streams", { method: "GET" })
      if (Array.isArray(response)) return response
      if (response?.data && Array.isArray(response.data)) return response.data
      return []
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.warn("[VideoService] GET /api/video/streams failed:", err.message)
      }
      throw err
    }
  },

  /**
   * Fetch details and WHEP endpoint for a specific stream ID
   * @param {string} streamId - Canonical stream ID (e.g. "drone-001-camera")
   * @returns {Promise<Object>} Stream metadata including webrtcUrl
   */
  async getVideoStream(streamId) {
    if (!streamId) {
      throw new Error("streamId is required to query video stream")
    }

    try {
      if (import.meta.env?.DEV) {
        console.log(`[VideoService] Fetching stream info for: ${streamId}`)
      }
      const response = await apiClient(`/api/video/streams/${streamId}`, { method: "GET" })

      // Handle standard DroneIQ ApiResponse envelope { success, message, data }
      const data = response?.data || response
      if (!data) {
        throw new Error(`Empty response received for stream ${streamId}`)
      }

      if (import.meta.env?.DEV) {
        console.log(`[VideoService] Stream available: ${streamId}`, data)
      }
      return data
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.warn(`[VideoService] GET /api/video/streams/${streamId} error:`, err.message)
      }
      throw err
    }
  },

  /**
   * Diagnostic health check for the Media server / Spring Boot video service
   * Non-blocking: returns null on failure so UI remains unaffected
   * @returns {Promise<Object|null>}
   */
  async getVideoHealth() {
    try {
      const response = await apiClient("/api/video/health", { method: "GET" })
      return response?.data || response
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.debug("[VideoService] Video health check unreachable (non-blocking):", err.message)
      }
      return null
    }
  },
}

export default videoService
