/**
 * Flight Control Service Abstraction
 * 
 * NOTE: The DroneIQ backend integration contract (FRONTEND_INTEGRATION.md) currently documents:
 * - REST Authentication (/api/auth/login)
 * - Telemetry WebSocket streaming (/ws/telemetry)
 * 
 * Flight control and RC override endpoints (e.g. MAVLink MANUAL_CONTROL or REST flight commands)
 * are pending backend specification. This service provides a clean isolated adapter so joystick
 * values can be mapped without inventing undocumented backend endpoints or sending invalid network requests.
 */

import { authService } from "@/services/api/authService.js"
import { Permissions } from "@/auth/permissions.js"
import { getRolePermissions } from "@/auth/roleConfig.js"

class FlightControlService {
  constructor() {
    this.subscribers = new Set()
    this.lastCommand = {
      throttle: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      timestamp: null,
    }
  }

  /**
   * Process virtual joystick control values
   * Enforces RBAC defense-in-depth: only permitted roles can execute routine flight commands.
   * @param {Object} command - { throttle, yaw, pitch, roll } normalized [-1.00, +1.00]
   */
  sendControlCommand({ throttle = 0, yaw = 0, pitch = 0, roll = 0 }) {
    const user = authService.getUser()
    const permissions = user?.role ? getRolePermissions(user.role, user.authorities) : new Set()
    if (!permissions.has(Permissions.EXECUTE_FLIGHT_COMMANDS)) {
      console.warn("[FlightControlService] Routine flight command blocked: Role lacks EXECUTE_FLIGHT_COMMANDS permission.")
      return
    }

    this.lastCommand = {
      throttle,
      yaw,
      pitch,
      roll,
      timestamp: Date.now(),
    }

    // Notify local subscribers (e.g. simulation or telemetry loop)
    this.subscribers.forEach((callback) => {
      try {
        callback(this.lastCommand)
      } catch (err) {
        console.error("[FlightControlService] Subscriber error:", err)
      }
    })
  }

  /**
   * Subscribe to control command events
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  getLastCommand() {
    return this.lastCommand
  }
}

export const flightControlService = new FlightControlService()
export default flightControlService
