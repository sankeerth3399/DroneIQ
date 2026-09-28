import { calculateDistance } from "./distance.js";
import { calculatePolygonArea, normalizeCoord } from "./geofence.js";

export { calculateDistance };

/**
 * DroneIQ GCS - Centralized Geofence Geometry Validation Utilities
 * 
 * Enforces strict aerospace safety standards for geofence polygons:
 * - Simple polygon topology (no self-intersections, no crossing edges)
 * - Minimum vertex separation (no duplicate or nearly overlapping vertices)
 * - Boundary non-encroachment (vertices cannot lie on existing edges)
 * - Minimum edge lengths (no zero-length or microscopic segments)
 * - Non-overlapping edges (no folded or collinear backtracking edges)
 * - Minimum enclosed surface area (no degenerate slivers or zero-area polygons)
 * - Strict closure validation before sealing
 */

// ==========================================
// CONFIGURABLE CONSTANTS (in meters & m²)
// ==========================================
export const MIN_VERTEX_DISTANCE_METERS = 2.0;
export const EDGE_VERTEX_TOLERANCE_METERS = 2.0;
export const MIN_EDGE_LENGTH_METERS = 2.0;
export const MIN_GEOFENCE_AREA_M2 = 10.0;
export const GEOFENCE_EDGE_INSERTION_TOLERANCE_METERS = 500;

// Canonical Validation Reason Codes
export const GeofenceValidationReasons = {
  INSUFFICIENT_VERTICES: "INSUFFICIENT_VERTICES",
  DUPLICATE_VERTEX: "DUPLICATE_VERTEX",
  VERTEX_TOO_CLOSE: "VERTEX_TOO_CLOSE",
  VERTEX_ON_EDGE: "VERTEX_ON_EDGE",
  SHORT_EDGE: "SHORT_EDGE",
  EDGE_INTERSECTION: "EDGE_INTERSECTION",
  EDGE_OVERLAP: "EDGE_OVERLAP",
  INVALID_CLOSURE: "INVALID_CLOSURE",
  INVALID_AREA: "INVALID_AREA",
};

/**
 * Converts geographic coordinates to a local metric tangent plane (in meters).
 * Uses equirectangular projection centered on the centroid of the coordinates,
 * ensuring sub-millimeter precision for geodesic distance, intersection, and angle checks.
 *
 * @param {Array<Object>} coordinates - Array of { lat, lng }
 * @returns {{ origin: { lat: number, lng: number }, points: Array<{ x: number, y: number, lat: number, lng: number }> }}
 */
export function projectToLocalMeters(coordinates = []) {
  const validCoords = coordinates.map(normalizeCoord).filter(Boolean);
  if (validCoords.length === 0) {
    return { origin: { lat: 0, lng: 0 }, points: [] };
  }

  // Centroid reference point
  let sumLat = 0;
  let sumLng = 0;
  for (const pt of validCoords) {
    sumLat += pt.lat;
    sumLng += pt.lng;
  }
  const originLat = sumLat / validCoords.length;
  const originLng = sumLng / validCoords.length;

  const R = 6371000; // Mean Earth radius in meters
  const radLat = (originLat * Math.PI) / 180;
  const cosLat = Math.cos(radLat);

  const points = validCoords.map((pt) => {
    const x = ((pt.lng - originLng) * Math.PI / 180) * R * cosLat;
    const y = ((pt.lat - originLat) * Math.PI / 180) * R;
    return { x, y, lat: pt.lat, lng: pt.lng };
  });

  return { origin: { lat: originLat, lng: originLng }, points };
}

/**
 * Projects a single point using an established reference origin
 */
export function projectSinglePoint(point, origin) {
  const norm = normalizeCoord(point);
  if (!norm || !origin) return null;
  const R = 6371000;
  const radLat = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(radLat);
  const x = ((norm.lng - origin.lng) * Math.PI / 180) * R * cosLat;
  const y = ((norm.lat - origin.lat) * Math.PI / 180) * R;
  return { x, y, lat: norm.lat, lng: norm.lng };
}

/** Finds the closest polygon edge to a candidate coordinate in local meters. */
export function findNearestPolygonEdge(
  vertices = [],
  candidate,
  maxDistanceMeters = GEOFENCE_EDGE_INSERTION_TOLERANCE_METERS
) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);
  const point = normalizeCoord(candidate);
  if (coords.length < 3 || !point || maxDistanceMeters < 0) return null;

  let nearest = null;
  for (let edgeIndex = 0; edgeIndex < coords.length; edgeIndex++) {
    const start = coords[edgeIndex];
    const end = coords[(edgeIndex + 1) % coords.length];
    const origin = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
    const a = projectSinglePoint(start, origin);
    const b = projectSinglePoint(end, origin);
    const p = projectSinglePoint(point, origin);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) continue;

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    const distanceMeters = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        edgeIndex,
        insertionIndex: edgeIndex + 1,
        distanceMeters,
      };
    }
  }

  return nearest && nearest.distanceMeters <= maxDistanceMeters ? nearest : null;
}

/**
 * Checks if two vertices are closer than the minimum required threshold.
 * Uses exact Haversine distance in meters.
 */
export function isVertexTooClose(v1, v2, thresholdMeters = MIN_VERTEX_DISTANCE_METERS) {
  const norm1 = normalizeCoord(v1);
  const norm2 = normalizeCoord(v2);
  if (!norm1 || !norm2) return false;
  return calculateDistance(norm1, norm2) < thresholdMeters;
}

/**
 * Checks if a point lies on an existing line segment within spatial tolerance.
 * Ignores endpoints (which are checked by vertex-to-vertex separation).
 *
 * @param {Object} point - Candidate point { lat, lng }
 * @param {Object} segStart - Segment start { lat, lng }
 * @param {Object} segEnd - Segment end { lat, lng }
 * @param {number} toleranceMeters - Spatial threshold in meters (default 2m)
 * @returns {boolean} True if point lies on segment body
 */
export function isPointOnSegment(point, segStart, segEnd, toleranceMeters = EDGE_VERTEX_TOLERANCE_METERS) {
  const normP = normalizeCoord(point);
  const normA = normalizeCoord(segStart);
  const normB = normalizeCoord(segEnd);
  if (!normP || !normA || !normB) return false;

  // Endpoint clearance check: if point is close to an endpoint, defer to vertex distance checks
  const distA = calculateDistance(normP, normA);
  const distB = calculateDistance(normP, normB);
  if (distA <= toleranceMeters || distB <= toleranceMeters) {
    return false;
  }

  // Project locally to evaluate perpendicular distance and interior projection factor t
  const origin = { lat: (normA.lat + normB.lat) / 2, lng: (normA.lng + normB.lng) / 2 };
  const p = projectSinglePoint(normP, origin);
  const a = projectSinglePoint(normA, origin);
  const b = projectSinglePoint(normB, origin);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-4) return false;

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  // Point must project onto the interior of the segment
  if (t <= 0 || t >= 1) return false;

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  const perpDist = Math.hypot(p.x - projX, p.y - projY);

  return perpDist <= toleranceMeters;
}

/**
 * 2D Vector cross product in metric plane
 */
function crossProduct2D(ux, uy, vx, vy) {
  return ux * vy - uy * vx;
}

/**
 * Checks whether two line segments (p1-p2) and (p3-p4) intersect.
 *
 * @param {Object} p1 - Segment 1 Start
 * @param {Object} p2 - Segment 1 End
 * @param {Object} p3 - Segment 2 Start
 * @param {Object} p4 - Segment 2 End
 * @returns {boolean} True if segments cross or intersect
 */
export function segmentsIntersect(p1, p2, p3, p4) {
  const norm1 = normalizeCoord(p1);
  const norm2 = normalizeCoord(p2);
  const norm3 = normalizeCoord(p3);
  const norm4 = normalizeCoord(p4);
  if (!norm1 || !norm2 || !norm3 || !norm4) return false;

  // Check if they share endpoints (connected adjacent segments)
  const d13 = calculateDistance(norm1, norm3);
  const d14 = calculateDistance(norm1, norm4);
  const d23 = calculateDistance(norm2, norm3);
  const d24 = calculateDistance(norm2, norm4);

  const sharesEndpoint = d13 < 0.05 || d14 < 0.05 || d23 < 0.05 || d24 < 0.05;
  if (sharesEndpoint) {
    // Adjacent segments sharing an endpoint do not intersect unless they fold back / overlap
    return segmentsOverlap(norm1, norm2, norm3, norm4);
  }

  // Local metric projection
  const origin = { lat: (norm1.lat + norm3.lat) / 2, lng: (norm1.lng + norm3.lng) / 2 };
  const a = projectSinglePoint(norm1, origin);
  const b = projectSinglePoint(norm2, origin);
  const c = projectSinglePoint(norm3, origin);
  const d = projectSinglePoint(norm4, origin);

  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const cdX = d.x - c.x;
  const cdY = d.y - c.y;

  const den = crossProduct2D(abX, abY, cdX, cdY);

  if (Math.abs(den) > 1e-7) {
    const acX = c.x - a.x;
    const acY = c.y - a.y;

    const t = crossProduct2D(acX, acY, cdX, cdY) / den;
    const u = crossProduct2D(acX, acY, abX, abY) / den;

    // Strict interior or near-boundary intersection
    const eps = 1e-4;
    if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
      return true;
    }
  }

  // Check if any non-shared endpoint lies on the other segment within 1.5m
  if (isPointOnSegment(norm1, norm3, norm4, 1.5)) return true;
  if (isPointOnSegment(norm2, norm3, norm4, 1.5)) return true;
  if (isPointOnSegment(norm3, norm1, norm2, 1.5)) return true;
  if (isPointOnSegment(norm4, norm1, norm2, 1.5)) return true;

  return segmentsOverlap(norm1, norm2, norm3, norm4);
}

/**
 * Checks if two line segments are collinear and overlap over a non-zero length.
 * Detects folded or backtracking geometry.
 */
export function segmentsOverlap(p1, p2, p3, p4, toleranceMeters = 1.0) {
  const norm1 = normalizeCoord(p1);
  const norm2 = normalizeCoord(p2);
  const norm3 = normalizeCoord(p3);
  const norm4 = normalizeCoord(p4);
  if (!norm1 || !norm2 || !norm3 || !norm4) return false;

  const origin = { lat: (norm1.lat + norm2.lat) / 2, lng: (norm1.lng + norm2.lng) / 2 };
  const a = projectSinglePoint(norm1, origin);
  const b = projectSinglePoint(norm2, origin);
  const c = projectSinglePoint(norm3, origin);
  const d = projectSinglePoint(norm4, origin);

  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLen = Math.hypot(abX, abY);
  if (abLen < 1e-3) return false;

  const uX = abX / abLen;
  const uY = abY / abLen;

  // Perpendicular distance of C and D to line AB
  const perpDistC = Math.abs(crossProduct2D(uX, uY, c.x - a.x, c.y - a.y));
  const perpDistD = Math.abs(crossProduct2D(uX, uY, d.x - a.x, d.y - a.y));

  if (perpDistC > toleranceMeters || perpDistD > toleranceMeters) {
    return false;
  }

  // Projections along line AB
  const sA = 0;
  const sB = abLen;
  const sC = (c.x - a.x) * uX + (c.y - a.y) * uY;
  const sD = (d.x - a.x) * uX + (d.y - a.y) * uY;

  const minCD = Math.min(sC, sD);
  const maxCD = Math.max(sC, sD);

  const overlapStart = Math.max(sA, minCD);
  const overlapEnd = Math.min(sB, maxCD);

  const overlapLength = overlapEnd - overlapStart;
  return overlapLength > toleranceMeters;
}

/**
 * Checks if a vertex array contains duplicate or nearly overlapping vertices (< 2m).
 */
export function hasDuplicateVertices(vertices = [], minDistanceMeters = MIN_VERTEX_DISTANCE_METERS) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      if (calculateDistance(coords[i], coords[j]) < minDistanceMeters) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if any segment in the vertices array is shorter than minEdgeLengthMeters.
 */
export function hasShortEdges(vertices = [], isClosed = false, minEdgeLengthMeters = MIN_EDGE_LENGTH_METERS) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);
  if (coords.length < 2) return false;

  const edgeCount = isClosed ? coords.length : coords.length - 1;
  for (let i = 0; i < edgeCount; i++) {
    const nextIdx = (i + 1) % coords.length;
    if (calculateDistance(coords[i], coords[nextIdx]) < minEdgeLengthMeters) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if any non-adjacent edges in a polygon or open polyline intersect or overlap.
 */
export function hasSelfIntersection(vertices = [], isClosed = false) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);
  const count = coords.length;
  if (count < 4 && !isClosed) return false;
  if (count < 3 && isClosed) return false;

  const edgeCount = isClosed ? count : count - 1;

  for (let i = 0; i < edgeCount; i++) {
    const a1 = coords[i];
    const a2 = coords[(i + 1) % count];

    for (let j = i + 1; j < edgeCount; j++) {
      // Check adjacency
      const isAdjacent = j === i + 1 || (isClosed && i === 0 && j === edgeCount - 1);
      const b1 = coords[j];
      const b2 = coords[(j + 1) % count];

      if (isAdjacent) {
        // Adjacent edges must not fold back on each other
        if (segmentsOverlap(a1, a2, b1, b2, 1.0)) {
          return true;
        }
      } else {
        // Non-adjacent edges must not intersect or overlap
        if (segmentsIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if the polygon has adequate positive area.
 */
export function hasValidArea(vertices = [], minAreaM2 = MIN_GEOFENCE_AREA_M2) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);
  if (coords.length < 3) return false;
  const areaRes = calculatePolygonArea(coords);
  const sqMeters = typeof areaRes === "object" ? areaRes.sqMeters : Number(areaRes) || 0;
  return sqMeters >= minAreaM2;
}

/**
 * Validates adding a proposed new vertex to an existing vertex array.
 * 
 * Flow:
 * 1. Checks proximity to all existing vertices (< 2m -> REJECT)
 * 2. Checks if proposed vertex lies on any existing boundary segment (<= 2m -> REJECT)
 * 3. Checks length of new segment (last -> new) (< 2m -> REJECT)
 * 4. Checks if new segment overlaps or crosses any existing non-adjacent segment -> REJECT
 * 
 * @param {Array<Object>} existingVertices - Current polygon/polyline vertices
 * @param {Object} newVertex - Proposed vertex { lat, lng }
 * @returns {{ valid: boolean, reason?: string, message?: string }}
 */
export function validateProposedVertex(existingVertices = [], newVertex) {
  const normNew = normalizeCoord(newVertex);
  if (!normNew) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.INSUFFICIENT_VERTICES,
      message: "Invalid geographic coordinates provided.",
    };
  }

  const existing = existingVertices.map(normalizeCoord).filter(Boolean);
  if (existing.length === 0) {
    return { valid: true };
  }

  // 1. Check distance against all existing vertices
  for (let i = 0; i < existing.length; i++) {
    const dist = calculateDistance(normNew, existing[i]);
    if (dist < 0.1) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.DUPLICATE_VERTEX,
        message: "Vertex overlaps an existing vertex.",
      };
    }
    if (dist < MIN_VERTEX_DISTANCE_METERS) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.VERTEX_TOO_CLOSE,
        message: `Geofence vertices must be at least ${MIN_VERTEX_DISTANCE_METERS} m apart.`,
      };
    }
  }

  // 2. Check if new vertex lies on any existing boundary segment
  if (existing.length >= 2) {
    for (let i = 0; i < existing.length - 1; i++) {
      if (isPointOnSegment(normNew, existing[i], existing[i + 1], EDGE_VERTEX_TOLERANCE_METERS)) {
        return {
          valid: false,
          reason: GeofenceValidationReasons.VERTEX_ON_EDGE,
          message: "Vertex cannot be placed on an existing geofence boundary.",
        };
      }
    }
  }

  // 3. Check new edge length (lastVertex -> newVertex)
  const lastVertex = existing[existing.length - 1];
  const edgeDist = calculateDistance(lastVertex, normNew);
  if (edgeDist < MIN_EDGE_LENGTH_METERS) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.SHORT_EDGE,
      message: "Geofence edge is too short.",
    };
  }

  // 4. Check if new edge crosses or overlaps any existing segment
  if (existing.length >= 2) {
    // New segment is (lastVertex -> newVertex)
    for (let i = 0; i < existing.length - 1; i++) {
      const segStart = existing[i];
      const segEnd = existing[i + 1];

      // If segment is adjacent to new segment (i.e. segEnd === lastVertex)
      const isAdjacent = i === existing.length - 2;
      if (isAdjacent) {
        if (segmentsOverlap(segStart, segEnd, lastVertex, normNew)) {
          return {
            valid: false,
            reason: GeofenceValidationReasons.EDGE_OVERLAP,
            message: "Invalid geofence: boundary edges cannot overlap.",
          };
        }
      } else {
        if (segmentsIntersect(segStart, segEnd, lastVertex, normNew)) {
          return {
            valid: false,
            reason: GeofenceValidationReasons.EDGE_INTERSECTION,
            message: "Invalid geofence: boundary would intersect an existing edge.",
          };
        }
        if (segmentsOverlap(segStart, segEnd, lastVertex, normNew)) {
          return {
            valid: false,
            reason: GeofenceValidationReasons.EDGE_OVERLAP,
            message: "Invalid geofence: boundary edges cannot overlap.",
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Validates moving an existing vertex to a proposed new position during editing.
 * Checks the entire resulting polygon geometry.
 *
 * @param {Array<Object>} vertices - Current vertex array
 * @param {number} vertexIndex - Index of vertex being moved
 * @param {Object} newPosition - Proposed new coordinate { lat, lng }
 * @param {boolean} isClosed - Whether geofence is currently closed
 * @returns {{ valid: boolean, reason?: string, message?: string }}
 */
export function validateVertexDrag(vertices = [], vertexIndex, newPosition, isClosed = false) {
  const normNew = normalizeCoord(newPosition);
  if (!normNew) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.INSUFFICIENT_VERTICES,
      message: "Invalid coordinates provided.",
    };
  }

  const coords = vertices.map(normalizeCoord).filter(Boolean);
  if (vertexIndex < 0 || vertexIndex >= coords.length) {
    return { valid: false, message: "Invalid vertex index." };
  }

  // Construct proposed vertex array
  const proposed = coords.map((v, i) => (i === vertexIndex ? normNew : v));

  // 1. Check distance against all other vertices
  for (let i = 0; i < proposed.length; i++) {
    if (i === vertexIndex) continue;
    const dist = calculateDistance(normNew, proposed[i]);
    if (dist < 0.1) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.DUPLICATE_VERTEX,
        message: "Vertex overlaps an existing vertex.",
      };
    }
    if (dist < MIN_VERTEX_DISTANCE_METERS) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.VERTEX_TOO_CLOSE,
        message: `Geofence vertices must be at least ${MIN_VERTEX_DISTANCE_METERS} m apart.`,
      };
    }
  }

  // 2. Check if moved vertex lies on any non-incident boundary segment
  const edgeCount = isClosed ? proposed.length : proposed.length - 1;
  for (let i = 0; i < edgeCount; i++) {
    const nextIdx = (i + 1) % proposed.length;
    // Incident edges share vertexIndex
    if (i === vertexIndex || nextIdx === vertexIndex) continue;

    if (isPointOnSegment(normNew, proposed[i], proposed[nextIdx], EDGE_VERTEX_TOLERANCE_METERS)) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.VERTEX_ON_EDGE,
        message: "Vertex cannot be placed on an existing geofence boundary.",
      };
    }
  }

  // 3. Check for short edges
  if (hasShortEdges(proposed, isClosed, MIN_EDGE_LENGTH_METERS)) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.SHORT_EDGE,
      message: "Geofence edge is too short.",
    };
  }

  // 4. Check for self-intersections or overlaps across the whole resulting polygon
  if (hasSelfIntersection(proposed, isClosed)) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.EDGE_INTERSECTION,
      message: "Invalid geofence: boundary would intersect an existing edge.",
    };
  }

  // 5. If closed, verify area
  if (isClosed && proposed.length >= 3) {
    if (!hasValidArea(proposed, MIN_GEOFENCE_AREA_M2)) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.INVALID_AREA,
        message: "Invalid geofence: boundary area is too small.",
      };
    }
  }

  return { valid: true };
}

/**
 * Validates closing an open polygon (sealing the edge from last vertex to first vertex).
 *
 * @param {Array<Object>} vertices - Open polygon vertices
 * @returns {{ valid: boolean, reason?: string, message?: string }}
 */
export function validateGeofenceClosure(vertices = []) {
  const coords = vertices.map(normalizeCoord).filter(Boolean);

  if (coords.length < 3) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.INSUFFICIENT_VERTICES,
      message: "At least 3 vertices are required to close a geofence.",
    };
  }

  // 1. Check closing edge length (last -> first)
  const first = coords[0];
  const last = coords[coords.length - 1];
  const closingDist = calculateDistance(last, first);

  if (closingDist < MIN_EDGE_LENGTH_METERS) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.SHORT_EDGE,
      message: "Geofence edge is too short.",
    };
  }

  // 2. Check if closing edge crosses or overlaps any non-adjacent edge
  // Non-adjacent edges are all edges except:
  // - Edge 0 (first -> second)
  // - Edge last-1 (second-to-last -> last)
  for (let i = 1; i < coords.length - 2; i++) {
    const segStart = coords[i];
    const segEnd = coords[i + 1];

    if (segmentsIntersect(last, first, segStart, segEnd)) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.EDGE_INTERSECTION,
        message: "Cannot close geofence: closing boundary would intersect an existing edge.",
      };
    }
    if (segmentsOverlap(last, first, segStart, segEnd)) {
      return {
        valid: false,
        reason: GeofenceValidationReasons.EDGE_OVERLAP,
        message: "Cannot close geofence: boundary edges cannot overlap.",
      };
    }
  }

  // 3. Complete closed polygon validation
  return validateGeofencePolygon(coords);
}

/**
 * Master validation function for a complete geofence polygon.
 * 
 * @param {Array<Object>} vertices - Closed or unclosed geofence vertices
 * @returns {{ valid: boolean, reason?: string, message?: string }}
 */
export function validateGeofencePolygon(vertices = []) {
  const coords = Array.isArray(vertices)
    ? vertices.map(normalizeCoord).filter(Boolean)
    : Array.isArray(vertices?.coordinates)
    ? vertices.coordinates.map(normalizeCoord).filter(Boolean)
    : Array.isArray(vertices?.polygon)
    ? vertices.polygon.map(normalizeCoord).filter(Boolean)
    : [];

  if (coords.length < 3) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.INSUFFICIENT_VERTICES,
      message: "At least 3 vertices are required to form a geofence.",
    };
  }

  // 1. Check for duplicate or nearly overlapping vertices
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      const dist = calculateDistance(coords[i], coords[j]);
      if (dist < 0.1) {
        return {
          valid: false,
          reason: GeofenceValidationReasons.DUPLICATE_VERTEX,
          message: "Vertex overlaps an existing vertex.",
        };
      }
      if (dist < MIN_VERTEX_DISTANCE_METERS) {
        return {
          valid: false,
          reason: GeofenceValidationReasons.VERTEX_TOO_CLOSE,
          message: `Geofence vertices must be at least ${MIN_VERTEX_DISTANCE_METERS} m apart.`,
        };
      }
    }
  }

  // 2. Check for short edges
  if (hasShortEdges(coords, true, MIN_EDGE_LENGTH_METERS)) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.SHORT_EDGE,
      message: "Geofence edge is too short.",
    };
  }

  // 3. Check for any vertex lying directly on an existing non-incident boundary segment
  for (let vIdx = 0; vIdx < coords.length; vIdx++) {
    const pt = coords[vIdx];
    for (let eIdx = 0; eIdx < coords.length; eIdx++) {
      const nextIdx = (eIdx + 1) % coords.length;
      if (eIdx === vIdx || nextIdx === vIdx) continue;

      if (isPointOnSegment(pt, coords[eIdx], coords[nextIdx], EDGE_VERTEX_TOLERANCE_METERS)) {
        return {
          valid: false,
          reason: GeofenceValidationReasons.VERTEX_ON_EDGE,
          message: "Vertex cannot be placed on an existing geofence boundary.",
        };
      }
    }
  }

  // 4. Check for crossing edges or overlapping edges (Self-Intersection)
  if (hasSelfIntersection(coords, true)) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.EDGE_INTERSECTION,
      message: "Invalid geofence: boundary intersects itself.",
    };
  }

  // 5. Check enclosed polygon surface area
  if (!hasValidArea(coords, MIN_GEOFENCE_AREA_M2)) {
    return {
      valid: false,
      reason: GeofenceValidationReasons.INVALID_AREA,
      message: "Invalid geofence: boundary area is too small.",
    };
  }

  return { valid: true };
}

export default {
  MIN_VERTEX_DISTANCE_METERS,
  EDGE_VERTEX_TOLERANCE_METERS,
  MIN_EDGE_LENGTH_METERS,
  MIN_GEOFENCE_AREA_M2,
  GeofenceValidationReasons,
  isVertexTooClose,
  isPointOnSegment,
  findNearestPolygonEdge,
  segmentsIntersect,
  segmentsOverlap,
  hasDuplicateVertices,
  hasShortEdges,
  hasSelfIntersection,
  hasValidArea,
  validateProposedVertex,
  validateVertexDrag,
  validateGeofenceClosure,
  validateGeofencePolygon,
};
