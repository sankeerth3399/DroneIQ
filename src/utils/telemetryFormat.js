/**
 * Live Telemetry Numeric Formatting Utilities
 *
 * Enforces consistent 2-decimal display formatting for live instrument telemetry
 * while strictly handling null, undefined, NaN, -0, and floating point anomalies safely.
 */

/**
 * Safe 2-decimal formatting for unsigned live telemetry values (heading, yaw, etc.)
 *
 * Formatting Rules:
 * - 0 -> "0.00"
 * - -0 -> "0.00"
 * - 1 -> "1.00"
 * - 1.2 -> "1.20"
 * - 1.234 -> "1.23"
 * - -0.5678 -> "-0.57"
 * - 45.6789 -> "45.68"
 * - null / undefined / NaN / invalid -> "0.00"
 * - prevents "-0.00"
 *
 * @param {number|string|null|undefined} value
 * @returns {string} Formatted 2-decimal string
 */
export const formatTelemetry = (value) => {
  if (value === null || value === undefined || value === "") return "0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00";
  const fixed = num.toFixed(2);
  return fixed === "-0.00" ? "0.00" : fixed;
};

/**
 * Safe 2-decimal formatting for signed live attitude telemetry values (pitch, roll).
 * Preserves explicit "+" for positive values and zero, and "-" for negative values.
 *
 * Formatting Rules:
 * - 0 -> "+0.00"
 * - -0 -> "+0.00"
 * - 0.23456789 -> "+0.23"
 * - -0.87654321 -> "-0.88"
 * - null / undefined / NaN / invalid -> "+0.00"
 * - prevents "-0.00"
 *
 * @param {number|string|null|undefined} value
 * @returns {string} Formatted signed 2-decimal string (e.g. "+0.23", "-0.88")
 */
export const formatSignedTelemetry = (value) => {
  if (value === null || value === undefined || value === "") return "+0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "+0.00";
  const fixed = Math.abs(num).toFixed(2);
  if (fixed === "0.00") return "+0.00";
  return `${num > 0 ? "+" : "-"}${fixed}`;
};
