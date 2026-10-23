/**
 * Axis Normalization and Bipolar Scaling Helpers
 * 
 * AeroNexus DroneIQ Remote Pilot Axis Indicator System
 */

/**
 * Normalizes signed controller values in the range -1 to +1 into percentages [0, 100].
 * 
 * Formula: percentage = ((axisValue + 1) / 2) * 100
 * Clamped strictly to [0, 100].
 * 
 * @param {number} axisValue - Signed controller axis value in range [-1, +1]
 * @returns {number} Normalized percentage in range [0, 100]
 */
export const normalizeAxisToPercentage = (axisValue) => {
  if (typeof axisValue !== "number" || isNaN(axisValue)) return 50;
  // Clamp signed controller value to [-1, +1]
  const clamped = Math.max(-1, Math.min(1, axisValue));
  const percentage = ((clamped + 1) / 2) * 100;
  return Math.max(0, Math.min(100, percentage));
};

/**
 * Converts a raw axis value that might be in [-100, +100] (e.g. keyboard demo state)
 * or [-1, +1] (physical gamepad) into a clamped percentage [0, 100].
 * 
 * @param {number} rawVal - Raw axis value in [-100, +100] or [-1, +1]
 * @returns {number} Normalized percentage in range [0, 100]
 */
export const rawAxisToPercentage = (rawVal) => {
  if (typeof rawVal !== "number" || isNaN(rawVal)) return 50;
  // If on a -100..100 scale (|val| > 1.0), convert to -1..1
  const normVal = Math.abs(rawVal) > 1.0 ? rawVal / 100 : rawVal;
  return normalizeAxisToPercentage(normVal);
};

/**
 * Calculates the bipolar fill geometry originating from the 50% midpoint.
 * 
 * @param {number} percentage - Percentage in range [0, 100]
 * @returns {{ left: string, width: string, direction: "low"|"neutral"|"high" }}
 */
export const getBipolarFill = (percentage) => {
  if (percentage > 50) {
    return {
      left: "50%",
      width: `${percentage - 50}%`,
      direction: "high",
    };
  } else if (percentage < 50) {
    return {
      left: `${percentage}%`,
      width: `${50 - percentage}%`,
      direction: "low",
    };
  }
  return {
    left: "50%",
    width: "0%",
    direction: "neutral",
  };
};

/**
 * Applies controller deadzone to filter out stick drift around neutral.
 * 
 * @param {number} val - Raw stick input in [-1, +1]
 * @param {number} [dz=0.06] - Deadzone threshold (default 6%)
 * @returns {number} Processed value in [-1, +1]
 */
export const applyDeadzone = (val, dz = 0.06) => {
  if (typeof val !== "number" || isNaN(val)) return 0;
  if (Math.abs(val) < dz) return 0;
  const sign = Math.sign(val);
  const scaled = (Math.abs(val) - dz) / (1 - dz);
  return sign * Math.min(1, Math.max(0, scaled));
};
