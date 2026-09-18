import { apiClient } from "./apiClient.js"
import { Roles } from "@/auth/roleConfig.js"

export const STORAGE_KEY_TEAM_USERS = "aeronexus_team_users"

/**
 * Seeded Default Fleet Users (Used as base and offline fallback)
 */
export const SEEDED_USERS = [
  {
    id: "usr-01",
    username: "superadmin",
    name: "Alex Vance",
    email: "superadmin@aeronexus.io",
    role: Roles.SUPER_ADMIN,
    status: "Active",
    lastActive: "Active Now",
  },
  {
    id: "usr-02",
    username: "fleet_manager",
    name: "Marcus Brody",
    email: "fleet_manager@aeronexus.io",
    role: Roles.FLEET_MANAGER,
    status: "Active",
    lastActive: "12m ago",
  },
  {
    id: "usr-03",
    username: "pilot",
    name: "Sarah Chen",
    email: "pilot@aeronexus.io",
    role: Roles.FLIGHT_OPERATOR,
    status: "Active",
    lastActive: "2h ago",
  },
  {
    id: "usr-04",
    username: "viewer",
    name: "Elena Rostova",
    email: "viewer@aeronexus.io",
    role: Roles.VIEWER,
    status: "Active",
    lastActive: "1d ago",
  },
]

/**
 * Safely get cached users from localStorage
 */
export function getLocalUsers() {
  if (typeof window === "undefined") return SEEDED_USERS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAM_USERS)
    if (!raw) return SEEDED_USERS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEEDED_USERS
  } catch {
    return SEEDED_USERS
  }
}

/**
 * Safely save users array to localStorage
 */
export function saveLocalUsers(users) {
  if (typeof window === "undefined" || !Array.isArray(users)) return
  try {
    localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(users))
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Authenticated User Management Service
 * Communicates with DroneIQ Backend REST API with resilient offline fallback
 */
export const userService = {
  /**
   * Fetch all registered operators and users
   * @returns {Promise<Array<Object>>}
   */
  async getUsers() {
    try {
      const response = await apiClient("/api/users", {
        method: "GET",
        suppressForbiddenToast: true,
        silent: true,
      })
      const data = Array.isArray(response)
        ? response
        : response?.data && Array.isArray(response.data)
        ? response.data
        : null

      if (data) {
        saveLocalUsers(data)
        return data
      }
      return getLocalUsers()
    } catch (err) {
      console.warn("[UserService] GET /api/users fallback to local directory:", err.message)
      return getLocalUsers()
    }
  },

  /**
   * Invite or create a new operator
   * @param {Object} userData - { name, username, email, role }
   * @returns {Promise<Object>}
   */
  async inviteUser(userData) {
    if (!userData.username || !userData.email) {
      throw new Error("Username and email are required.")
    }

    const payload = {
      username: userData.username.trim(),
      name: userData.name?.trim() || userData.username.trim(),
      email: userData.email.trim(),
      role: userData.role || Roles.FLIGHT_OPERATOR,
      status: "Active",
      lastActive: "Invited",
    }

    try {
      const response = await apiClient("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
        suppressForbiddenToast: true,
        silent: true,
      })
      const created = response?.data || response
      if (created && created.username) {
        const current = getLocalUsers()
        const updated = [created, ...current.filter((u) => u.username !== created.username)]
        saveLocalUsers(updated)
        return created
      }
    } catch (err) {
      console.warn("[UserService] POST /api/users offline fallback:", err.message)
    }

    // Local fallback creation
    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      ...payload,
    }
    const current = getLocalUsers()
    const updated = [newUser, ...current.filter((u) => u.username !== newUser.username)]
    saveLocalUsers(updated)
    return newUser
  },

  /**
   * Update an operator's assigned role
   * @param {string} userId
   * @param {string} newRole
   * @returns {Promise<Object>}
   */
  async updateUserRole(userId, newRole) {
    try {
      await apiClient(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
        suppressForbiddenToast: true,
        silent: true,
      })
    } catch (err) {
      console.warn(`[UserService] PATCH /api/users/${userId}/role offline fallback:`, err.message)
    }

    const current = getLocalUsers()
    const updated = current.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    saveLocalUsers(updated)
    return updated.find((u) => u.id === userId)
  },

  /**
   * Remove/revoke an operator
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId) {
    try {
      await apiClient(`/api/users/${userId}`, {
        method: "DELETE",
        suppressForbiddenToast: true,
        silent: true,
      })
    } catch (err) {
      console.warn(`[UserService] DELETE /api/users/${userId} offline fallback:`, err.message)
    }

    const current = getLocalUsers()
    const updated = current.filter((u) => u.id !== userId)
    saveLocalUsers(updated)
    return true
  },
}

export default userService
