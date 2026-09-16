/**
 * Mission Plan & Waypoint Validation Utilities
 */

/**
 * Validates a single waypoint object
 * @param {Object} item 
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateWaypoint(item) {
  if (!item) return { isValid: false, error: "Waypoint item is missing." };
  if (typeof item.lat !== "number" || item.lat < -90 || item.lat > 90) {
    return { isValid: false, error: "Invalid latitude coordinate (-90 to 90)." };
  }
  if (typeof item.lng !== "number" || item.lng < -180 || item.lng > 180) {
    return { isValid: false, error: "Invalid longitude coordinate (-180 to 180)." };
  }
  if (typeof item.alt === "number" && (item.alt < 0 || item.alt > 500)) {
    return { isValid: false, error: "Altitude must be between 0m and 500m." };
  }
  return { isValid: true };
}

/**
 * Calculates highest altitude across all mission items
 * @param {Array<Object>} items 
 * @returns {number}
 */
export function calculateMaxAltitude(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((max, item) => {
    const a = typeof item.alt === "number" ? item.alt : 0;
    return Math.max(max, a);
  }, 0);
}

/**
 * Ensures consecutive sequential numbering and labels for mission items
 * @param {Array<Object>} items 
 * @returns {Array<Object>}
 */
export function renumberMissionItems(items = []) {
  if (!Array.isArray(items)) return [];
  let wpCount = 0;

  return items.map((item, idx) => {
    const isSpecial = ["TAKEOFF", "LAND", "RTL"].includes(item.type);
    let label = item.type;
    if (!isSpecial) {
      wpCount++;
      label = `WP${wpCount}`;
    }
    return {
      ...item,
      seq: idx + 1,
      label,
    };
  });
}

/**
 * Validates entire mission flight plan before upload or execution
 * @param {Array<Object>} items 
 * @param {Object} limits 
 * @returns {{ isValid: boolean, errors: Array<string>, warnings: Array<string> }}
 */
export function validateMissionPlan(
  items = [],
  limits = { minPoints: 1, maxPoints: 100, maxAlt: 200, maxDistanceMeters: 50000 }
) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(items) || items.length < limits.minPoints) {
    errors.push(`Mission must contain at least ${limits.minPoints} waypoint.`);
  }

  if (items.length > limits.maxPoints) {
    errors.push(`Mission exceeds maximum limit of ${limits.maxPoints} waypoints.`);
  }

  // Check individual items
  items.forEach((item, index) => {
    const wpVal = validateWaypoint(item);
    if (!wpVal.isValid) {
      errors.push(`Item #${index + 1}: ${wpVal.error}`);
    }
    if (typeof item.alt === "number" && item.alt > limits.maxAlt) {
      warnings.push(`Item #${index + 1} exceeds recommended altitude ceiling (${limits.maxAlt}m).`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
