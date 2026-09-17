import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./apiClient.js"
import { normalizeRole, Roles } from "@/auth/roleConfig.js"
import { parseJwt, createDevJwt, DEV_TEST_USERS } from "@/auth/jwtUtils.js"

/**
 * Production Authentication Service with RBAC support
 */

export const authService = {
  /**
   * Log in with operator credentials
   * @param {Object} credentials - { username, password, requestedRole }
   */
  async login({ username, password, requestedRole }) {
    if (!username || !username.trim()) {
      throw new Error("Username or email is required.")
    }
    if (!password) {
      throw new Error("Password must not be empty.")
    }

    const trimmedUsername = username.trim()
    const payload = {
      username: trimmedUsername,
      password,
    }

    let authData

    try {
      const response = await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      // Support both backend wrapper formats:
      // 1. { success: true, data: { token, tokenType, expiresIn, username, email, role } }
      // 2. Direct data object { token, ... }
      authData = response?.data?.data ? response.data.data : response?.data || response
    } catch (apiErr) {
      // ONLY fall back to seeded dev accounts if the backend is completely unreachable (Network Error / status 0)
      // Never mask a legitimate 401 Unauthorized or other HTTP rejection from the backend
      if (import.meta.env.DEV && (apiErr.isNetworkError || apiErr.status === 0)) {
        const lowerUser = trimmedUsername.toLowerCase()
        const devMatch =
          DEV_TEST_USERS[lowerUser] ||
          Object.values(DEV_TEST_USERS).find(
            (u) => u.email.toLowerCase() === lowerUser || u.role.toLowerCase() === lowerUser
          )

        if (devMatch || requestedRole) {
          console.warn("[AuthService] Backend unreachable. Using local dev test profile for testing.")
          const targetRole = devMatch?.role || normalizeRole(requestedRole) || Roles.FLIGHT_OPERATOR
          const devToken = createDevJwt({
            sub: trimmedUsername,
            username: devMatch?.displayName || trimmedUsername,
            email: devMatch?.email || `${trimmedUsername}@aeronexus.io`,
            role: targetRole,
            authorities: devMatch?.authorities || [],
          })

          authData = {
            token: devToken,
            tokenType: "Bearer",
            expiresIn: 86400000,
            username: devMatch?.displayName || trimmedUsername,
            email: devMatch?.email || `${trimmedUsername}@aeronexus.io`,
            role: targetRole,
            authorities: devMatch?.authorities || [],
          }
        } else {
          throw apiErr
        }
      } else {
        throw apiErr
      }
    }

    if (!authData || !authData.token) {
      throw new Error("Invalid response from authentication server: missing access token.")
    }

    const token = authData.token

    // Decode JWT payload for authority verification if present
    const decoded = parseJwt(token)
    const authedUsername = authData.username || decoded?.username || decoded?.sub || trimmedUsername
    const effectiveRole = normalizeRole(authData.role || decoded?.role || requestedRole, authedUsername)
    const effectiveAuthorities = Array.isArray(authData.authorities)
      ? authData.authorities
      : Array.isArray(decoded?.authorities)
      ? decoded.authorities
      : []

    const user = {
      username: authedUsername,

      email: authData.email || decoded?.email || "",
      role: effectiveRole,
      authorities: effectiveAuthorities,
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
      localStorage.setItem("role", user.role)
    }

    // Optionally hydrate authoritative profile from /api/auth/me in the background
    this.getProfile().catch((err) => {
      console.warn("[AuthService] Background /api/auth/me profile sync warning:", err.message)
    })

    return { token, user }
  },

  /**
   * Fetch authenticated user profile from GET /api/auth/me
   * Authoritative backend profile verification
   */
  async getProfile() {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await apiClient("/api/auth/me", { method: "GET" })
      const profile = response?.data || response
      if (profile && profile.username) {
        const currentUser = this.getUser() || {}
        const updatedUser = {
          ...currentUser,
          id: profile.id,
          username: profile.username,
          email: profile.email || currentUser.email,
          role: normalizeRole(profile.role || currentUser.role, profile.username),
          createdAt: profile.createdAt,
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
          localStorage.setItem("firstName", updatedUser.username || "Operator")
          localStorage.setItem("role", updatedUser.role)
        }
        return updatedUser
      }
      return profile
    } catch (err) {
      if (err.status === 401) {
        console.warn("[AuthService] /api/auth/me returned 401. Token is invalid or expired.")
      }
      throw err
    }
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
   * Development-only instantaneous role switcher
   * @param {string} newRole
   */
  devSwitchRole(newRole) {
    if (!import.meta.env.DEV) {
      console.warn("[AuthService] devSwitchRole is disabled in production.")
      return null
    }

    const canonicalRole = normalizeRole(newRole)
    const currentUser = this.getUser() || {
      username: "Dev Operator",
      email: "operator@aeronexus.io",
      authorities: [],
    }

    const updatedUser = {
      ...currentUser,
      role: canonicalRole,
    }

    const devToken = createDevJwt({
      sub: updatedUser.username,
      username: updatedUser.username,
      email: updatedUser.email,
      role: canonicalRole,
      authorities: updatedUser.authorities,
    })

    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_STORAGE_KEY, devToken)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
      localStorage.setItem("role", canonicalRole)
      window.dispatchEvent(new CustomEvent("aeronexus:role-changed", { detail: { role: canonicalRole } }))
    }

    return { token: devToken, user: updatedUser }
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
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed) {
        parsed.role = normalizeRole(parsed.role, parsed.username)
      }
      return parsed
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
