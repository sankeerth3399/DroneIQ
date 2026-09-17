import { Permissions } from "./permissions.js"

/**
 * AeroNexus Canonical Roles
 */
export const Roles = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  FLEET_MANAGER: "FLEET_MANAGER",
  FLIGHT_OPERATOR: "FLIGHT_OPERATOR",
  VIEWER: "VIEWER",
})

/**
 * Role display metadata for HUD indicators and UI badges
 */
export const ROLE_METADATA = Object.freeze({
  [Roles.SUPER_ADMIN]: {
    label: "Super Admin",
    shortLabel: "SUPER ADMIN",
    badgeColor: "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF4D]",
    indicatorColor: "bg-[#35E0FF]",
    description: "Complete system, flight command, and mission authority.",
  },
  [Roles.FLEET_MANAGER]: {
    label: "Fleet Manager",
    shortLabel: "FLEET MGR",
    badgeColor: "text-[#F59E0B] bg-[#F59E0B1A] border-[#F59E0B4D]",
    indicatorColor: "bg-[#F59E0B]",
    description: "Drone asset management, mission planning, and emergency overrides.",
  },
  [Roles.FLIGHT_OPERATOR]: {
    label: "Flight Operator",
    shortLabel: "OPERATOR",
    badgeColor: "text-[#2FE089] bg-[#2FE0891A] border-[#2FE0894D]",
    indicatorColor: "bg-[#2FE089]",
    description: "Routine flight execution, ARM/DISARM, and mission planning.",
  },
  [Roles.VIEWER]: {
    label: "Viewer / Auditor",
    shortLabel: "VIEWER",
    badgeColor: "text-[#94A3B8] bg-[#94A3B81A] border-[#94A3B84D]",
    indicatorColor: "bg-[#94A3B8]",
    description: "Read-only live telemetry, map, camera, and flight observation.",
  },
})

/**
 * Authoritative Role-to-Permissions Mapping Matrix
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [Roles.SUPER_ADMIN]: [
    Permissions.SYSTEM_CONFIG,
    Permissions.MANAGE_USERS,
    Permissions.INVITE_USERS,
    Permissions.MANAGE_DRONES,
    Permissions.VIEW_DRONES,
    Permissions.CREATE_MISSIONS,
    Permissions.EDIT_MISSIONS,
    Permissions.DELETE_MISSIONS,
    Permissions.EXECUTE_FLIGHT_COMMANDS,
    Permissions.OVERRIDE_FLIGHT_COMMANDS,
    Permissions.PUBLISH_TELEMETRY,
    Permissions.TRIAGE_INCIDENTS,
    Permissions.EXPORT_EVIDENCE,
    Permissions.VIEW_MISSIONS,
    Permissions.VIEW_INCIDENTS,
    Permissions.VIEW_LOGS,
  ],

  [Roles.FLEET_MANAGER]: [
    Permissions.MANAGE_DRONES,
    Permissions.VIEW_DRONES,
    Permissions.CREATE_MISSIONS,
    Permissions.EDIT_MISSIONS,
    Permissions.DELETE_MISSIONS,
    Permissions.OVERRIDE_FLIGHT_COMMANDS,
    Permissions.INVITE_USERS,
    Permissions.PUBLISH_TELEMETRY,
    Permissions.TRIAGE_INCIDENTS,
    Permissions.EXPORT_EVIDENCE,
    Permissions.VIEW_MISSIONS,
    Permissions.VIEW_INCIDENTS,
    Permissions.VIEW_LOGS,
  ],

  [Roles.FLIGHT_OPERATOR]: [
    Permissions.VIEW_DRONES,
    Permissions.CREATE_MISSIONS,
    Permissions.EDIT_MISSIONS,
    Permissions.EXECUTE_FLIGHT_COMMANDS,
    Permissions.PUBLISH_TELEMETRY,
    Permissions.TRIAGE_INCIDENTS,
    Permissions.VIEW_MISSIONS,
    Permissions.VIEW_INCIDENTS,
    Permissions.VIEW_LOGS,
  ],

  [Roles.VIEWER]: [
    Permissions.VIEW_DRONES,
    Permissions.VIEW_MISSIONS,
    Permissions.VIEW_INCIDENTS,
    Permissions.VIEW_LOGS,
  ],
})

/**
 * Normalizes any legacy or external role strings to canonical role names
 * @param {string} rawRole
 * @returns {string} Canonical role
 */
export function normalizeRole(rawRole, username = "") {
  const normalizedUser = typeof username === "string" ? username.trim().toLowerCase() : ""

  // Direct canonical account username mapping when backend returns generic or unmapped role
  if (normalizedUser === "superadmin" || normalizedUser === "admin") {
    return Roles.SUPER_ADMIN
  }
  if (normalizedUser === "fleet_manager" || normalizedUser === "manager") {
    return Roles.FLEET_MANAGER
  }
  if (normalizedUser === "pilot" || normalizedUser === "operator" || normalizedUser === "flight_operator") {
    return Roles.FLIGHT_OPERATOR
  }
  if (normalizedUser === "viewer" || normalizedUser === "auditor") {
    return Roles.VIEWER
  }

  if (!rawRole || typeof rawRole !== "string") return Roles.VIEWER

  const normalized = rawRole.trim().toUpperCase()

  if (normalized === Roles.SUPER_ADMIN || normalized === "ADMIN" || normalized === "ADMINISTRATOR") {
    return Roles.SUPER_ADMIN
  }
  if (normalized === Roles.FLEET_MANAGER || normalized === "MANAGER" || normalized === "FLEET_MGR") {
    return Roles.FLEET_MANAGER
  }
  if (
    normalized === Roles.FLIGHT_OPERATOR ||
    normalized === "PILOT" ||
    normalized === "OPERATOR" ||
    normalized === "MISSION OPERATOR" ||
    normalized === "MISSION_OPERATOR"
  ) {
    return Roles.FLIGHT_OPERATOR
  }
  if (normalized === Roles.VIEWER || normalized === "OBSERVER" || normalized === "AUDITOR") {
    return Roles.VIEWER
  }

  return Roles.VIEWER
}


/**
 * Computes complete list of effective permissions for a role, factoring in JWT authorities
 * @param {string} role - Canonical role string
 * @param {Array<string>} [authorities] - Optional explicit authorities provided in JWT
 * @returns {Set<string>} Set of granted permission strings
 */
export function getRolePermissions(role, authorities = []) {
  const canonical = normalizeRole(role)
  const basePermissions = ROLE_PERMISSIONS[canonical] || ROLE_PERMISSIONS[Roles.VIEWER]
  const permissionSet = new Set(basePermissions)

  if (Array.isArray(authorities)) {
    authorities.forEach((auth) => {
      if (typeof auth === "string" && auth.trim()) {
        permissionSet.add(auth.trim())
      }
    })
  }

  return permissionSet
}

export default Roles
