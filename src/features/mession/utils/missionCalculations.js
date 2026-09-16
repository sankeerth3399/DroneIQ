/**
 * Backwards-compatible re-export module for mission calculations.
 * Internal implementations are now maintained in src/utils/
 */

export {
  calculateDistance,
  haversineDistance,
  calculateMissionDistance,
  formatDistance,
  calculateMissionDuration,
  formatDuration,
} from "@/utils/distance.js";

export {
  normalizeHeading,
  getCardinalDirection,
  formatHeading,
  interpolateHeading,
} from "@/utils/heading.js";

export {
  formatCoordinate,
  formatGps,
} from "@/utils/coordinates.js";

export {
  validateWaypoint,
  calculateMaxAltitude,
  renumberMissionItems,
  validateMissionPlan,
} from "@/utils/validation.js";
