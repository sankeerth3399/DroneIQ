/**
 * Coordinate & GPS Formatting Utilities
 */

/**
 * Formats a coordinate number to specified decimal places
 * @param {number} val 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatCoordinate(val, decimals = 6) {
  if (typeof val !== "number" || isNaN(val)) return "0.000000";
  return val.toFixed(decimals);
}

/**
 * Formats latitude and longitude with hemisphere indicators
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} decimals 
 * @returns {string} e.g. "17.385000° N, 78.486700° E"
 */
export function formatGps(lat, lng, decimals = 6) {
  const latNum = typeof lat === "number" ? lat : 0;
  const lngNum = typeof lng === "number" ? lng : 0;

  const latHem = latNum >= 0 ? "N" : "S";
  const lngHem = lngNum >= 0 ? "E" : "W";

  return `${Math.abs(latNum).toFixed(decimals)}° ${latHem}, ${Math.abs(lngNum).toFixed(decimals)}° ${lngHem}`;
}
