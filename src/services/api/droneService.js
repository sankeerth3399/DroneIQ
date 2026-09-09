import { apiClient } from "./apiClient.js"

/**
 * Drone Management & REST Queries
 */
export const droneService = {
  /**
   * Fetch list of registered drones
   */
  async getDrones() {
    try {
      const response = await apiClient("/api/drones", { method: "GET" })
      if (Array.isArray(response)) return response
      if (response?.data && Array.isArray(response.data)) return response.data
      return []
    } catch (err) {
      console.warn("[DroneService] GET /api/drones unavailable, using default drone profile:", err.message)
      return [
        {
          id: "DRONE-001",
          droneId: "DRONE-001",
          name: "AeroNexus Alpha",
          model: "QuadX Pro",
          status: "ONLINE",
        },
      ]
    }
  },

  /**
   * Fetch single drone by ID
   */
  async getDroneById(droneId) {
    try {
      const response = await apiClient(`/api/drones/${droneId}`, { method: "GET" })
      return response?.data || response
    } catch (err) {
      console.warn(`[DroneService] GET /api/drones/${droneId} unavailable:`, err.message)
      return {
        id: droneId,
        droneId,
        name: `Drone ${droneId}`,
        status: "ONLINE",
      }
    }
  },
}

export default droneService
