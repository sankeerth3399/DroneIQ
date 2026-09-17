import { Roles, ROLE_PERMISSIONS, normalizeRole, getRolePermissions } from "./src/auth/roleConfig.js"
import { Permissions } from "./src/auth/permissions.js"
import { parseJwt, createDevJwt } from "./src/auth/jwtUtils.js"

let failures = 0
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`✅ PASS: ${message}`)
  }
}

console.log("\n==========================================")
console.log("TEST SUITE 1: CANONICAL ROLES DEFINITION")
console.log("==========================================")
assert(Roles.SUPER_ADMIN === "SUPER_ADMIN", "Roles.SUPER_ADMIN is SUPER_ADMIN")
assert(Roles.FLEET_MANAGER === "FLEET_MANAGER", "Roles.FLEET_MANAGER is FLEET_MANAGER")
assert(Roles.FLIGHT_OPERATOR === "FLIGHT_OPERATOR", "Roles.FLIGHT_OPERATOR is FLIGHT_OPERATOR")
assert(Roles.VIEWER === "VIEWER", "Roles.VIEWER is VIEWER")

console.log("\n==========================================")
console.log("TEST SUITE 2: ROLE NORMALIZATION")
console.log("==========================================")
assert(normalizeRole("SUPER_ADMIN") === Roles.SUPER_ADMIN, "normalizeRole('SUPER_ADMIN') -> SUPER_ADMIN")
assert(normalizeRole("FLEET_MANAGER") === Roles.FLEET_MANAGER, "normalizeRole('FLEET_MANAGER') -> FLEET_MANAGER")
assert(normalizeRole("FLIGHT_OPERATOR") === Roles.FLIGHT_OPERATOR, "normalizeRole('FLIGHT_OPERATOR') -> FLIGHT_OPERATOR")
assert(normalizeRole("VIEWER") === Roles.VIEWER, "normalizeRole('VIEWER') -> VIEWER")
assert(normalizeRole("admin") === Roles.SUPER_ADMIN, "normalizeRole('admin') -> SUPER_ADMIN")
assert(normalizeRole("manager") === Roles.FLEET_MANAGER, "normalizeRole('manager') -> FLEET_MANAGER")
assert(normalizeRole("pilot") === Roles.FLIGHT_OPERATOR, "normalizeRole('pilot') -> FLIGHT_OPERATOR")
assert(normalizeRole("operator") === Roles.FLIGHT_OPERATOR, "normalizeRole('operator') -> FLIGHT_OPERATOR")
assert(normalizeRole("viewer") === Roles.VIEWER, "normalizeRole('viewer') -> VIEWER")

console.log("\n==========================================")
console.log("TEST SUITE 3: ROLE CAPABILITY MATRIX")
console.log("==========================================")
// 1. Super Admin
const superPerms = getRolePermissions(Roles.SUPER_ADMIN)
assert(superPerms.has(Permissions.SYSTEM_CONFIG), "SUPER_ADMIN has SYSTEM_CONFIG")
assert(superPerms.has(Permissions.MANAGE_USERS), "SUPER_ADMIN has MANAGE_USERS")
assert(superPerms.has(Permissions.INVITE_USERS), "SUPER_ADMIN has INVITE_USERS")
assert(superPerms.has(Permissions.MANAGE_DRONES), "SUPER_ADMIN has MANAGE_DRONES")
assert(superPerms.has(Permissions.EXECUTE_FLIGHT_COMMANDS), "SUPER_ADMIN has EXECUTE_FLIGHT_COMMANDS")
assert(superPerms.has(Permissions.OVERRIDE_FLIGHT_COMMANDS), "SUPER_ADMIN has OVERRIDE_FLIGHT_COMMANDS")
assert(superPerms.has(Permissions.DELETE_MISSIONS), "SUPER_ADMIN has DELETE_MISSIONS")
assert(superPerms.size === 16, `SUPER_ADMIN has all 16 permissions (found: ${superPerms.size})`)

// 2. Fleet Manager
const fleetPerms = getRolePermissions(Roles.FLEET_MANAGER)
assert(!fleetPerms.has(Permissions.EXECUTE_FLIGHT_COMMANDS), "FLEET_MANAGER lacks EXECUTE_FLIGHT_COMMANDS (NO routine flight)")
assert(!fleetPerms.has(Permissions.SYSTEM_CONFIG), "FLEET_MANAGER lacks SYSTEM_CONFIG")
assert(!fleetPerms.has(Permissions.MANAGE_USERS), "FLEET_MANAGER lacks MANAGE_USERS")
assert(fleetPerms.has(Permissions.OVERRIDE_FLIGHT_COMMANDS), "FLEET_MANAGER has OVERRIDE_FLIGHT_COMMANDS")
assert(fleetPerms.has(Permissions.MANAGE_DRONES), "FLEET_MANAGER has MANAGE_DRONES")
assert(fleetPerms.has(Permissions.CREATE_MISSIONS), "FLEET_MANAGER has CREATE_MISSIONS")
assert(fleetPerms.has(Permissions.DELETE_MISSIONS), "FLEET_MANAGER has DELETE_MISSIONS")
assert(fleetPerms.has(Permissions.INVITE_USERS), "FLEET_MANAGER has INVITE_USERS")

// 3. Flight Operator
const pilotPerms = getRolePermissions(Roles.FLIGHT_OPERATOR)
assert(pilotPerms.has(Permissions.EXECUTE_FLIGHT_COMMANDS), "FLIGHT_OPERATOR has EXECUTE_FLIGHT_COMMANDS")
assert(pilotPerms.has(Permissions.CREATE_MISSIONS), "FLIGHT_OPERATOR has CREATE_MISSIONS")
assert(pilotPerms.has(Permissions.EDIT_MISSIONS), "FLIGHT_OPERATOR has EDIT_MISSIONS")
assert(!pilotPerms.has(Permissions.DELETE_MISSIONS), "FLIGHT_OPERATOR lacks DELETE_MISSIONS")
assert(!pilotPerms.has(Permissions.OVERRIDE_FLIGHT_COMMANDS), "FLIGHT_OPERATOR lacks OVERRIDE_FLIGHT_COMMANDS")
assert(!pilotPerms.has(Permissions.MANAGE_USERS), "FLIGHT_OPERATOR lacks MANAGE_USERS")
assert(!pilotPerms.has(Permissions.SYSTEM_CONFIG), "FLIGHT_OPERATOR lacks SYSTEM_CONFIG")

// 4. Viewer
const viewerPerms = getRolePermissions(Roles.VIEWER)
assert(viewerPerms.has(Permissions.VIEW_DRONES), "VIEWER has VIEW_DRONES")
assert(viewerPerms.has(Permissions.VIEW_MISSIONS), "VIEWER has VIEW_MISSIONS")
assert(viewerPerms.has(Permissions.VIEW_INCIDENTS), "VIEWER has VIEW_INCIDENTS")
assert(viewerPerms.has(Permissions.VIEW_LOGS), "VIEWER has VIEW_LOGS")
assert(!viewerPerms.has(Permissions.EXECUTE_FLIGHT_COMMANDS), "VIEWER lacks EXECUTE_FLIGHT_COMMANDS")
assert(!viewerPerms.has(Permissions.OVERRIDE_FLIGHT_COMMANDS), "VIEWER lacks OVERRIDE_FLIGHT_COMMANDS")
assert(!viewerPerms.has(Permissions.CREATE_MISSIONS), "VIEWER lacks CREATE_MISSIONS")
assert(!viewerPerms.has(Permissions.DELETE_MISSIONS), "VIEWER lacks DELETE_MISSIONS")
assert(!viewerPerms.has(Permissions.MANAGE_DRONES), "VIEWER lacks MANAGE_DRONES")
assert(!viewerPerms.has(Permissions.MANAGE_USERS), "VIEWER lacks MANAGE_USERS")
assert(viewerPerms.size === 4, `VIEWER has exactly 4 read-only permissions (found: ${viewerPerms.size})`)

console.log("\n==========================================")
console.log("TEST SUITE 4: JWT ENCODING / DECODING")
console.log("==========================================")
const testToken = createDevJwt({
  username: "testpilot",
  role: Roles.FLIGHT_OPERATOR,
  authorities: ["CUSTOM_AUTHORITY"],
})
const parsed = parseJwt(testToken)
assert(parsed.role === Roles.FLIGHT_OPERATOR, "Parsed JWT role is FLIGHT_OPERATOR")
assert(parsed.authorities.includes("CUSTOM_AUTHORITY"), "Parsed JWT authorities include CUSTOM_AUTHORITY")

const combinedPerms = getRolePermissions(parsed.role, parsed.authorities)
assert(combinedPerms.has("CUSTOM_AUTHORITY"), "Combined permissions factor in JWT authorities")

console.log("\n==========================================")
if (failures === 0) {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (0 failures)")
  process.exit(0)
} else {
  console.error(`💥 ${failures} TEST(S) FAILED`)
  process.exit(1)
}
