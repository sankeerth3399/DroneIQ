import { apiClient } from "./apiClient.js"

export const STORAGE_KEY_DRONES = "aeronexus_registered_drones"
export const DRONES_UPDATED_EVENT = "aeronexus_drones_updated"

export const INITIAL_REGISTERED_DRONES = [
  {
    id: "DR-001",
    droneId: "DR-001",
    name: "Falcon-1",
    model: "DJI Matrice 350 RTK",
    type: "Multirotor",
    status: "ONLINE",
    battery: 78,
    location: "North Ridge",
    lastFlight: "Today, 07:12",
    hours: 412,
    serial: "1581F8Q00014",
    firmware: "v7.02",
    team: "Team Alpha",
    role: "Lead",
    mission: "North Ridge Survey",
  },
  {
    id: "DR-002",
    droneId: "DR-002",
    name: "Spectre-2",
    model: "Autel EVO Max",
    type: "Multirotor",
    status: "ONLINE",
    battery: 69,
    location: "NH-44 Km 81",
    lastFlight: "Today, 07:45",
    hours: 258,
    serial: "8824EVOMAX01",
    firmware: "v4.18",
    team: "Highway Ops",
    role: "Thermal",
    mission: "Highway Patrol",
  },
  {
    id: "DR-003",
    droneId: "DR-003",
    name: "Therma-3",
    model: "Autel EVO Max",
    type: "Multirotor",
    status: "ONLINE",
    battery: 64,
    location: "North Ridge",
    lastFlight: "Today, 08:15",
    hours: 198,
    serial: "8824EVOMAX02",
    firmware: "v4.18",
    team: "Team Alpha",
    role: "Survey",
    mission: "North Ridge Survey",
  },
  {
    id: "DR-004",
    droneId: "DR-004",
    name: "AeroWing-4",
    model: "WingtraOne GEN II",
    type: "Fixed Wing",
    status: "STANDBY",
    battery: 45,
    location: "Base - HQ",
    lastFlight: "Today, 05:30",
    hours: 620,
    serial: "WGTR992014",
    firmware: "v3.85",
    team: "Survey Group",
    role: "Mapping",
    mission: "Perimeter Mapping",
  },
  {
    id: "DR-005",
    droneId: "DR-005",
    name: "Scout-5",
    model: "Skydio X2D",
    type: "Multirotor",
    status: "STANDBY",
    battery: 92,
    location: "Base - HQ",
    lastFlight: "Yesterday, 18:20",
    hours: 145,
    serial: "SKYD202409",
    firmware: "v2.11",
    team: "Team Beta",
    role: "Scout",
    mission: "Area Reconnaissance",
  },
]

/**
 * Normalizes a raw drone record ensuring standard keys exist
 */
export function normalizeDroneRecord(raw) {
  if (!raw || typeof raw !== "object") return null
  const id = String(raw.id || raw.droneId || "DR-001").trim()
  return {
    id,
    droneId: id,
    name: raw.name?.trim() || `Drone ${id}`,
    model: raw.model?.trim() || "QuadX Pro",
    type: raw.type?.trim() || "Multirotor",
    status: raw.status?.trim() || "ONLINE",
    battery: typeof raw.battery === "number" ? raw.battery : 100,
    location: raw.location?.trim() || "Local Station",
    lastFlight: raw.lastFlight?.trim() || "Standby",
    hours: typeof raw.hours === "number" ? raw.hours : 0,
    serial: raw.serial?.trim() || `SN-${id}`,
    firmware: raw.firmware?.trim() || "v1.0.0",
    team: raw.team?.trim() || "Flight Ops",
    role: raw.role?.trim() || null,
    mission: raw.mission?.trim() || null,
    registeredAt: raw.registeredAt || new Date().toISOString(),
  }
}

/**
 * Synchronously retrieves stored drones from localStorage,
 * falling back to INITIAL_REGISTERED_DRONES.
 */
export function getStoredDrones() {
  if (typeof window === "undefined") return INITIAL_REGISTERED_DRONES
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRONES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeDroneRecord).filter(Boolean)
      }
    }
  } catch (err) {
    console.warn("[droneService] Failed reading stored drones:", err)
  }
  // Initialize storage with defaults
  saveStoredDrones(INITIAL_REGISTERED_DRONES)
  return INITIAL_REGISTERED_DRONES
}

/**
 * Synchronously saves drones to localStorage and notifies the application
 */
export function saveStoredDrones(drones) {
  if (typeof window === "undefined") return drones
  const normalized = (Array.isArray(drones) ? drones : [])
    .map(normalizeDroneRecord)
    .filter(Boolean)

  try {
    localStorage.setItem(STORAGE_KEY_DRONES, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(DRONES_UPDATED_EVENT, { detail: normalized }))
  } catch (err) {
    console.error("[droneService] Failed saving drones to storage:", err)
  }
  return normalized
}

/**
 * Drone Management & REST Queries with Local Synchronous Persistence
 */
export const droneService = {
  getStoredDrones,
  saveStoredDrones,

  /**
   * Fetch list of registered drones (network first, cached fallback)
   */
  async getDrones() {
    try {
      const response = await apiClient("/api/drones", { method: "GET" })
      const list = Array.isArray(response)
        ? response
        : response?.data && Array.isArray(response.data)
        ? response.data
        : null
      if (list && list.length > 0) {
        const normalized = list.map(normalizeDroneRecord).filter(Boolean)
        saveStoredDrones(normalized)
        return normalized
      }
    } catch {
      // Backend unavailable; use local synchronous store
    }
    return getStoredDrones()
  },

  /**
   * Fetch single drone by ID
   */
  async getDroneById(droneId) {
    const all = getStoredDrones()
    const found = all.find(
      (d) => d.id === droneId || d.droneId === droneId || (droneId === "DRONE-001" && d.id === "DR-001")
    )
    if (found) return found

    try {
      const response = await apiClient(`/api/drones/${droneId}`, { method: "GET" })
      const data = response?.data || response
      if (data && (data.id || data.droneId)) {
        return normalizeDroneRecord(data)
      }
    } catch {
      // Backend unavailable
    }

    return (
      all[0] || {
        id: droneId,
        droneId,
        name: `Drone ${droneId}`,
        status: "ONLINE",
      }
    )
  },

  /**
   * Register a new drone (persists immediately and notifies all listeners)
   */
  async registerDrone(droneData = {}) {
    const all = getStoredDrones()
    const rawId = droneData.droneId || droneData.id
    const generatedId = rawId ? String(rawId).trim() : `DR-${String(all.length + 1).padStart(3, "0")}`

    const newDrone = normalizeDroneRecord({
      ...droneData,
      id: generatedId,
      droneId: generatedId,
      registeredAt: new Date().toISOString(),
    })

    // Avoid duplicate IDs
    const updated = [newDrone, ...all.filter((d) => d.id !== newDrone.id)]
    saveStoredDrones(updated)

    try {
      await apiClient("/api/drones", {
        method: "POST",
        body: JSON.stringify(newDrone),
      })
    } catch {
      // Offline mode; storage is already updated
    }

    return newDrone
  },

  /**
   * Update existing drone configuration/profile
   */
  async updateDrone(droneId, droneData) {
    const all = getStoredDrones()
    const targetId = String(droneId).trim()
    let updatedDrone = null

    const updated = all.map((d) => {
      if (d.id === targetId || d.droneId === targetId) {
        updatedDrone = normalizeDroneRecord({ ...d, ...droneData, id: d.id, droneId: d.id })
        return updatedDrone
      }
      return d
    })

    if (updatedDrone) {
      saveStoredDrones(updated)
    }

    try {
      await apiClient(`/api/drones/${targetId}`, {
        method: "PUT",
        body: JSON.stringify(droneData),
      })
    } catch {
      // Offline mode
    }

    return updatedDrone || droneData
  },

  /**
   * Delete or retire a drone
   */
  async deleteDrone(droneId) {
    const all = getStoredDrones()
    const targetId = String(droneId).trim()
    const filtered = all.filter((d) => d.id !== targetId && d.droneId !== targetId)
    saveStoredDrones(filtered)

    try {
      await apiClient(`/api/drones/${targetId}`, {
        method: "DELETE",
      })
    } catch {
      // Offline mode
    }

    return { success: true, id: targetId }
  },

  /**
   * Fetch latest telemetry across all drones via REST
   */
  async getLatestTelemetry() {
    try {
      const response = await apiClient("/api/telemetry/latest", { method: "GET" })
      return response?.data || response
    } catch {
      return null
    }
  },

  /**
   * Fetch latest telemetry for a specific drone via REST
   */
  async getDroneTelemetry(droneId = "DR-001") {
    try {
      const response = await apiClient(`/api/drones/${droneId}/telemetry/latest`, { method: "GET" })
      return response?.data || response
    } catch {
      return this.getLatestTelemetry()
    }
  },
}

export default droneService
