import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./apiClient.js"

/**
 * Authentication Service for DroneIQ Backend
 */

export const authService = {
  /**
   * Log in with operator credentials
   * @param {Object} credentials - { username, password }
   */
  async login({ username, password }) {
    if (!username || !username.trim()) {
      throw new Error("Username or email is required.")
    }
    if (!password) {
      throw new Error("Password must not be empty.")
    }

    const payload = {
      username: username.trim(),
      password,
    }

    const response = await apiClient("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    // Parse response format according to FRONTEND_INTEGRATION.md:
    // { success: true, data: { token, tokenType, expiresIn, username, email, role } }
    const authData = response?.data || response

    if (!authData || !authData.token) {
      throw new Error("Invalid response from authentication server: missing access token.")
    }

    const token = authData.token
    const user = {
      username: authData.username || username.trim(),
      email: authData.email || "",
      role: authData.role || "OPERATOR",
      tokenType: authData.tokenType || "Bearer",
      expiresIn: authData.expiresIn || 86400000,
      loginTimestamp: new Date().toISOString(),
    }

    // Persist session securely in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))

      // Keep compatibility with existing AeroNexus UI components
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("firstName", user.username || "Operator")
      localStorage.setItem("lastName", "")
      localStorage.setItem("role", user.role.toLowerCase())
    }

    return { token, user }
  },

  /**
   * Log out and purge session data
   */
  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem("isAuthenticated")
      localStorage.removeItem("firstName")
      localStorage.removeItem("lastName")
      localStorage.removeItem("role")
      window.dispatchEvent(new CustomEvent("aeronexus:logout"))
    }
  },

  /**
   * Retrieve active JWT token
   */
  getToken() {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  },

  /**
   * Retrieve current user profile
   */
  getUser() {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  /**
   * Check if active session exists
   */
  isAuthenticated() {
    return Boolean(this.getToken())
  },
}

export default authService
