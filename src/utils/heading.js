/**
 * Heading & Angular Navigation Utilities
 */

const CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * Normalizes heading angle into [0, 360) range
 * @param {number} deg 
 * @returns {number}
 */
export function normalizeHeading(deg) {
  if (typeof deg !== "number" || isNaN(deg)) return 0;
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Returns 8-point cardinal abbreviation for a heading angle
 * @param {number} deg 
 * @returns {string} e.g. "N", "NE", "E", etc.
 */
export function getCardinalDirection(deg) {
  const normalized = normalizeHeading(deg);
  const index = Math.round((normalized / 45)) % 8;
  return CARDINAL_DIRECTIONS[index];
}

/**
 * Formats a heading angle into human-readable string with cardinal suffix
 * @param {number} deg 
 * @returns {string} e.g. "042° NE"
 */
export function formatHeading(deg) {
  const norm = Math.round(normalizeHeading(deg));
  const card = getCardinalDirection(norm);
  return `${String(norm).padStart(3, "0")}° ${card}`;
}

/**
 * Smoothly interpolates an angle towards a target angle taking shortest path
 * @param {number} current 
 * @param {number} target 
 * @param {number} factor 
 * @returns {number}
 */
export function interpolateHeading(current, target, factor = 0.1) {
  const cur = normalizeHeading(current);
  const tgt = normalizeHeading(target);
  let diff = tgt - cur;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeHeading(cur + diff * factor);
}
