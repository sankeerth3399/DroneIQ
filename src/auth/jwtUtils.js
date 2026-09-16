import { Roles } from "./roleConfig.js"

/**
 * Safely parse a JWT payload without external library dependencies
 * @param {string} token - JWT string
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Creates a mock development JWT token for offline development and testing
 * @param {Object} payload - { sub, username, email, role, authorities }
 * @returns {string} Mock JWT string
 */
export function createDevJwt(payload = {}) {
  const header = { alg: "HS256", typ: "JWT" }
  const defaultPayload = {
    sub: payload.username || "dev-operator",
    username: payload.username || "Operator",
    email: payload.email || "operator@aeronexus.io",
    role: payload.role || Roles.FLIGHT_OPERATOR,
    authorities: payload.authorities || [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  }

  const base64UrlEncode = (obj) => {
    const str = JSON.stringify(obj)
    const base64 = btoa(str)
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  }

  return `${base64UrlEncode(header)}.${base64UrlEncode(defaultPayload)}.dev_signature_mock`
}

/**
 * Seeded mock accounts for local development and rapid testing
 * (Used only in development environment)
 */
export const DEV_TEST_USERS = Object.freeze({
  superadmin: {
    username: "superadmin",
    displayName: "Commander Alex Vance",
    email: "superadmin@aeronexus.io",
    role: Roles.SUPER_ADMIN,
    authorities: [],
  },
  fleet_manager: {
    username: "fleet_manager",
    displayName: "Marcus Brody (Fleet Director)",
    email: "fleet_manager@aeronexus.io",
    role: Roles.FLEET_MANAGER,
    authorities: [],
  },
  pilot: {
    username: "pilot",
    displayName: "Capt. Sarah Chen (Pilot)",
    email: "pilot@aeronexus.io",
    role: Roles.FLIGHT_OPERATOR,
    authorities: [],
  },
  viewer: {
    username: "viewer",
    displayName: "Elena Rostova (FAA Auditor)",
    email: "viewer@aeronexus.io",
    role: Roles.VIEWER,
    authorities: [],
  },
})

export default parseJwt
