/**
 * DroneIQ GCS - Centralized Alert & Notification Service
 * 
 * Provides a universal notification dispatcher accessible from both React components
 * and non-React services (e.g. apiClient, WebSocket, background event handlers).
 * Dispatches standard "aeronexus:alert" and "aeronexus:toast" custom window events.
 */

export const AlertTypes = {
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  DANGER: "danger",
  LOADING: "loading",
};

export const AlertCategories = {
  SYSTEM: "System",
  FLIGHT: "Flight",
  MISSION: "Mission",
  TELEMETRY: "Telemetry",
  SECURITY: "Security",
  USER: "User",
  MEDIA: "Media",
};

/**
 * Standard durations in milliseconds per severity type
 */
export const DEFAULT_ALERT_DURATIONS = {
  [AlertTypes.SUCCESS]: 3500,
  [AlertTypes.INFO]: 4000,
  [AlertTypes.WARNING]: 5000,
  [AlertTypes.ERROR]: 6000,
  [AlertTypes.DANGER]: 8000,
  [AlertTypes.LOADING]: 0, // 0 = persistent until updated or dismissed
};

// DroneIQ Final Notification Policy Filter
// Strictly permits action-result notifications ONLY for:
// 1. ARM
// 2. DISARM
// 3. TAKEOFF
// 4. LAND
// 5. START MISSION
// 6. FLIGHT MODE CHANGE
// Plus RBAC Security Denials (Section 21)
export function isPolicyPermittedAlert(options) {
  if (!options) return false;
  const rawTitle = String(options.title || "").toUpperCase().trim();
  const rawMessage = String(options.message || "").toUpperCase().trim();
  const rawKey = String(options.key || "").toUpperCase().trim();
  const rawAction = String(options.action || "").toUpperCase().trim();
  const category = String(options.category || "").toUpperCase().trim();

  // 1. Security / Access Denied (RBAC per Section 21)
  if (
    category === "SECURITY" ||
    rawTitle.includes("ACCESS DENIED") ||
    rawTitle.includes("PERMISSION") ||
    rawTitle.includes("INHIBITED") ||
    rawMessage.includes("ACCESS DENIED") ||
    rawMessage.includes("PERMISSION") ||
    rawMessage.includes("INHIBITED") ||
    rawKey.includes("ACCESS_DENIED")
  ) {
    return true;
  }

  // 2. ARM Result
  if (
    rawAction === "ARM" ||
    rawKey === "ARM_RESULT" ||
    rawTitle.includes("ARM SUCCESS") ||
    rawTitle.includes("ARM FAILED") ||
    rawTitle.includes("DRONE ARMED") ||
    rawTitle.includes("ARMING...") ||
    rawTitle.includes("UNABLE TO ARM") ||
    (rawTitle.includes("ARM") && !rawTitle.includes("DISARM") && (rawTitle.includes("SUCCESS") || rawTitle.includes("FAIL") || rawTitle.includes("TIMEOUT")))
  ) {
    return true;
  }

  // 3. DISARM Result
  if (
    rawAction === "DISARM" ||
    rawAction === "FORCE_DISARM" ||
    rawKey === "DISARM_RESULT" ||
    rawTitle.includes("DISARM SUCCESS") ||
    rawTitle.includes("DISARM FAILED") ||
    rawTitle.includes("DRONE DISARMED") ||
    rawTitle.includes("DISARMING...") ||
    rawTitle.includes("FORCE DISARM") ||
    rawTitle.includes("UNABLE TO DISARM")
  ) {
    return true;
  }

  // 4. TAKEOFF Result
  if (
    rawAction === "TAKEOFF" ||
    rawKey === "TAKEOFF_RESULT" ||
    rawTitle.includes("TAKEOFF SUCCESS") ||
    rawTitle.includes("TAKEOFF FAILED") ||
    rawTitle.includes("TAKEOFF COMMAND") ||
    rawTitle.includes("TAKEOFF INITIATED") ||
    rawTitle.includes("TAKING OFF...")
  ) {
    return true;
  }

  // 5. LAND Result
  if (
    rawAction === "LAND" ||
    rawAction === "EMERGENCY_LAND" ||
    rawKey === "LAND_RESULT" ||
    rawTitle.includes("LAND SUCCESS") ||
    rawTitle.includes("LAND FAILED") ||
    rawTitle.includes("EMERGENCY LAND") ||
    rawTitle.includes("LANDING INITIATED") ||
    rawTitle.includes("LANDING...")
  ) {
    return true;
  }

  // 6. START MISSION Result
  if (
    rawAction === "START_MISSION" ||
    rawAction === "START MISSION" ||
    rawKey === "MISSION_START_RESULT" ||
    rawKey === "START_MISSION_RESULT" ||
    rawTitle.includes("START MISSION SUCCESS") ||
    rawTitle.includes("START MISSION FAILED") ||
    rawTitle.includes("MISSION STARTED") ||
    rawTitle.includes("STARTING MISSION...")
  ) {
    return true;
  }

  // 7. FLIGHT MODE CHANGE Result
  if (
    rawAction === "FLIGHT_MODE_CHANGE" ||
    rawKey === "FLIGHT_MODE_CHANGE_RESULT" ||
    rawKey === "FLIGHT_MODE_CHANGE" ||
    rawTitle.includes("FLIGHT MODE CHANGED") ||
    rawTitle.includes("FLIGHT MODE CHANGE FAILED") ||
    rawTitle.includes("CHANGING MODE...")
  ) {
    return true;
  }

  return false;
}

let alertListener = null;

/**
 * Internal helper to dispatch alert events safely
 */
export function dispatchAlertEvent(options) {
  if (typeof options === "string") {
    options = { message: options, type: AlertTypes.INFO };
  }
  if (!options || typeof options !== "object") return null;

  // Strict Policy Check: Drop any notification not in the 6 required categories
  if (!isPolicyPermittedAlert(options)) {
    return null;
  }

  const type = options.type || AlertTypes.INFO;
  const payload = {
    id: options.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: options.key || null,
    type,
    title: options.title || (
      type === AlertTypes.SUCCESS ? "Success" :
      type === AlertTypes.WARNING ? "Warning" :
      type === AlertTypes.ERROR ? "Error" :
      type === AlertTypes.DANGER ? "Critical Alert" :
      type === AlertTypes.LOADING ? "Processing" :
      "Notification"
    ),
    message: options.message || "",
    category: options.category || AlertCategories.SYSTEM,
    duration: typeof options.duration === "number" ? options.duration : DEFAULT_ALERT_DURATIONS[type] ?? 4000,
    timestamp: options.timestamp || new Date().toISOString(),
    action: options.action || null,
  };

  if (alertListener) {
    try {
      alertListener(payload);
    } catch (err) {
      console.error("[AlertService] Listener invocation error:", err);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aeronexus:alert", { detail: payload }));
  }

  return payload.id;
}

/**
 * Register primary in-memory listener (used by NotificationProvider)
 */
export function registerAlertListener(listener) {
  alertListener = listener;
  return () => {
    if (alertListener === listener) {
      alertListener = null;
    }
  };
}

/**
 * Master public function to trigger an alert
 */
export function showAlert(options) {
  return dispatchAlertEvent(options);
}

/**
 * Legacy toast adapter function for backward compatibility
 */
export function showToast(message, type = "info", title = null) {
  return dispatchAlertEvent({
    message,
    type,
    title: title || (type === "success" ? "Success" : type === "error" ? "Error" : "Notification"),
  });
}

/**
 * Dismiss an active alert by ID or deduplication key
 */
export function dismissAlert(idOrKey) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aeronexus:dismiss-alert", { detail: { idOrKey } }));
  }
}

/**
 * Clear all active alerts
 */
export function clearAllAlerts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aeronexus:clear-alerts"));
  }
}

/**
 * High-level helper object
 */
export const alertService = {
  show: showAlert,
  toast: showToast,
  success: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.SUCCESS }),
  info: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.INFO }),
  warning: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.WARNING }),
  error: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.ERROR }),
  danger: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.DANGER }),
  loading: (title, message, opts = {}) => showAlert({ ...opts, title, message, type: AlertTypes.LOADING }),
  dismiss: dismissAlert,
  clearAll: clearAllAlerts,
};

export default alertService;
