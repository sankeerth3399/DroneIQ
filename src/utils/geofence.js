import { calculateDistance } from "./distance.js";

/**
 * Standardizes coordinate input to { lat, lng }
 * @param {Object} pt - { lat, lng } or { latitude, longitude }
 * @returns {{ lat: number, lng: number } | null}
 */
export function normalizeCoord(pt) {
  if (!pt) return null;
  const lat = typeof pt.lat === "number" ? pt.lat : typeof pt.latitude === "number" ? pt.latitude : null;
  const lng = typeof pt.lng === "number" ? pt.lng : typeof pt.longitude === "number" ? pt.longitude : null;
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Checks if a point lies on a line segment within a spatial tolerance
 */
export function isPointOnSegment(p, a, b, toleranceMeters = 0.5) {
  const normP = normalizeCoord(p);
  const normA = normalizeCoord(a);
  const normB = normalizeCoord(b);
  if (!normP || !normA || !normB) return false;

  const distAB = calculateDistance(normA, normB);
  const distAP = calculateDistance(normA, normP);
  const distPB = calculateDistance(normP, normB);

  return Math.abs(distAP + distPB - distAB) <= toleranceMeters;
}

/**
 * Checks whether a geographic coordinate is inside a polygon geofence
 * Uses Jordan Curve Theorem (Ray-Casting Algorithm) with boundary tolerance.
 * 
 * @param {Object} point - { lat, lng } or { latitude, longitude }
 * @param {Array<Object>} polygon - Array of vertices
 * @returns {boolean}
 */
export function isPointInsideGeofence(point, polygon) {
  const pt = normalizeCoord(point);
  if (!pt) return false;
  if (!Array.isArray(polygon) || polygon.length < 3) return true; // No geofence or open polyline

  const vertices = polygon.map(normalizeCoord).filter(Boolean);
  if (vertices.length < 3) return true;

  // 1. Boundary check: If point is directly on any perimeter segment, it is inside
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    if (isPointOnSegment(pt, vertices[j], vertices[i])) {
      return true;
    }
  }

  // 2. Ray-Casting algorithm along the longitude axis
  let inside = false;
  const x = pt.lng;
  const y = pt.lat;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng;
    const yi = vertices[i].lat;
    const xj = vertices[j].lng;
    const yj = vertices[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Determine orientation of ordered triplet (p, q, r)
 * 0 -> Collinear, 1 -> Clockwise, 2 -> Counterclockwise
 */
function orientation(p, q, r) {
  const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Checks if point q lies on segment pr
 */
function onSegment(p, q, r) {
  return (
    q.lng <= Math.max(p.lng, r.lng) &&
    q.lng >= Math.min(p.lng, r.lng) &&
    q.lat <= Math.max(p.lat, r.lat) &&
    q.lat >= Math.min(p.lat, r.lat)
  );
}

/**
 * Checks whether line segment p1-p2 intersects line segment p3-p4
 */
export function isSegmentIntersectingSegment(p1, p2, p3, p4) {
  const a = normalizeCoord(p1);
  const b = normalizeCoord(p2);
  const c = normalizeCoord(p3);
  const d = normalizeCoord(p4);
  if (!a || !b || !c || !d) return false;

  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  // General intersection case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special collinear cases
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

/**
 * Checks whether a mission route segment connecting two waypoints stays entirely within a geofence.
 * Detects boundary intersections as well as concave cut-throughs via intermediate sampling.
 * 
 * @param {Object} p1 - Start coordinate
 * @param {Object} p2 - End coordinate
 * @param {Array<Object>} polygon - Array of polygon vertices
 * @returns {boolean}
 */
export function isRouteSegmentInsideGeofence(p1, p2, polygon) {
  const normA = normalizeCoord(p1);
  const normB = normalizeCoord(p2);
  if (!normA || !normB) return false;
  if (!Array.isArray(polygon) || polygon.length < 3) return true;

  const vertices = polygon.map(normalizeCoord).filter(Boolean);
  if (vertices.length < 3) return true;

  // 1. Both endpoints must be inside
  if (!isPointInsideGeofence(normA, vertices) || !isPointInsideGeofence(normB, vertices)) {
    return false;
  }

  // 2. Segment cannot intersect any geofence polygon boundary edge (unless touching at a vertex)
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const edgeStart = vertices[j];
    const edgeEnd = vertices[i];

    if (isSegmentIntersectingSegment(normA, normB, edgeStart, edgeEnd)) {
      // Check if intersection is just an endpoint touching a boundary
      const isEndpointTouch =
        isPointOnSegment(normA, edgeStart, edgeEnd) || isPointOnSegment(normB, edgeStart, edgeEnd);

      if (!isEndpointTouch) {
        return false;
      }
    }
  }

  // 3. Sample 5 points along the segment to catch concave polyline cut-throughs
  const sampleSteps = 5;
  for (let s = 1; s < sampleSteps; s++) {
    const t = s / sampleSteps;
    const samplePt = {
      lat: normA.lat + (normB.lat - normA.lat) * t,
      lng: normA.lng + (normB.lng - normA.lng) * t,
    };
    if (!isPointInsideGeofence(samplePt, vertices)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates whether a single waypoint is inside the active geofence
 * @param {Object} waypoint - { lat, lng } or waypoint item
 * @param {Array<Object>|Object} geofence - Polygon coordinates array or geofence object
 * @returns {boolean}
 */
export function isWaypointValid(waypoint, geofence) {
  const coords = Array.isArray(geofence)
    ? geofence
    : Array.isArray(geofence?.coordinates)
    ? geofence.coordinates
    : [];
  if (!coords || coords.length < 3) return false;
  return isPointInsideGeofence(waypoint, coords);
}

/**
 * Checks if a sequential route of waypoints intersects or crosses outside the geofence
 * @param {Array<Object>} route - Ordered array of waypoints
 * @param {Array<Object>|Object} geofence - Polygon coordinates array or geofence object
 * @returns {boolean} True if route breaches or intersects outside geofence
 */
export function doesRouteIntersectGeofence(route = [], geofence) {
  const coords = Array.isArray(geofence)
    ? geofence
    : Array.isArray(geofence?.coordinates)
    ? geofence.coordinates
    : [];
  if (!coords || coords.length < 3) return false;
  if (!Array.isArray(route) || route.length < 2) return false;

  for (let i = 0; i < route.length - 1; i++) {
    if (!isRouteSegmentInsideGeofence(route[i], route[i + 1], coords)) {
      return true; // Breach found
    }
  }
  return false;
}

/**
 * Validates a complete waypoint mission against an active geofence
 * 
 * @param {Array<Object>} waypoints - Mission items
 * @param {Object|Array} geofence - Geofence object with coordinates or raw coordinates array
 * @returns {{ isValid: boolean, valid: boolean, violations: Array<Object>, violatingSegments: Array<Array>, invalidWaypointIds: Set<string>, invalidSegmentIndices: Set<number>, message: string }}
 */
export function validateMissionAgainstGeofence(waypoints = [], geofence) {
  const coords = Array.isArray(geofence)
    ? geofence
    : Array.isArray(geofence?.coordinates)
    ? geofence.coordinates
    : [];

  const violations = [];
  const invalidWaypointIds = new Set();
  const invalidSegmentIndices = new Set();

  if (!coords || coords.length < 3) {
    return {
      isValid: false,
      valid: false,
      violations: [
        {
          type: "NO_GEOFENCE",
          message: "GEOFENCE REQUIRED — Create and save a geofence before planning waypoints.",
        },
      ],
      violatingSegments: [],
      invalidWaypointIds,
      invalidSegmentIndices,
      message: "GEOFENCE REQUIRED — Create and save a geofence before planning waypoints.",
    };
  }

  // 1. Check each waypoint individual placement
  waypoints.forEach((wp, idx) => {
    if (!isPointInsideGeofence({ lat: wp.lat, lng: wp.lng }, coords)) {
      invalidWaypointIds.add(wp.id);
      violations.push({
        type: "WAYPOINT_OUTSIDE",
        waypointId: wp.id,
        index: idx,
        message: `WAYPOINT OUTSIDE GEOFENCE — WP#${idx + 1} is outside the configured flight area.`,
      });
    }
  });

  // 2. Check route segments between consecutive waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    const w1 = waypoints[i];
    const w2 = waypoints[i + 1];

    if (!isRouteSegmentInsideGeofence(w1, w2, coords)) {
      invalidSegmentIndices.add(i);
      violations.push({
        type: "ROUTE_EXITS_GEOFENCE",
        fromId: w1.id,
        toId: w2.id,
        fromIndex: i,
        toIndex: i + 1,
        segment: [
          { lat: Number(w1.lat), lng: Number(w1.lng) },
          { lat: Number(w2.lat), lng: Number(w2.lng) },
        ],
        message: `MISSION ROUTE EXCEEDS GEOFENCE — Segment between WP#${i + 1} and WP#${i + 2} crosses boundary.`,
      });
    }
  }

  const isValid = violations.length === 0;

  return {
    isValid,
    valid: isValid,
    violations,
    violatingSegments: violations.filter((v) => v.segment).map((v) => v.segment),
    invalidWaypointIds,
    invalidSegmentIndices,
    message: violations.length > 0 ? violations[0].message : "",
  };
}

/**
 * Calculates geodesic area of a polygon geofence in square meters, hectares, and sq km
 */
export function calculatePolygonArea(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return { sqMeters: 0, hectares: 0, sqKm: 0, formatted: "0.00 ha" };
  }

  const vertices = polygon.map(normalizeCoord).filter(Boolean);
  if (vertices.length < 3) {
    return { sqMeters: 0, hectares: 0, sqKm: 0, formatted: "0.00 ha" };
  }

  const R = 6378137; // WGS84 Earth radius in meters
  let area = 0;

  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const p1 = vertices[i];
    const p2 = vertices[j];

    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const deltaLngRad = ((p2.lng - p1.lng) * Math.PI) / 180;

    area += deltaLngRad * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }

  area = Math.abs((area * R * R) / 2.0);
  const hectares = area / 10000;
  const sqKm = area / 1000000;

  let formatted;
  if (hectares < 0.1) {
    formatted = `${Math.round(area)} m²`;
  } else if (hectares < 100) {
    formatted = `${hectares.toFixed(2)} ha`;
  } else {
    formatted = `${sqKm.toFixed(2)} km²`;
  }

  return {
    sqMeters: Math.round(area),
    hectares: Number(hectares.toFixed(2)),
    sqKm: Number(sqKm.toFixed(3)),
    formatted,
  };
}

/**
 * Calculates total perimeter length of a polygon geofence
 */
export function calculatePolygonPerimeter(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 2) return 0;
  const vertices = polygon.map(normalizeCoord).filter(Boolean);
  if (vertices.length < 2) return 0;

  let totalDist = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    totalDist += calculateDistance(vertices[i], next);
  }
  return Math.round(totalDist);
}

/**
 * Formats an area in m² or area object to a human-readable string
 */
export function formatArea(area) {
  if (!area) return "0.00 ha";
  if (typeof area === "object" && area.formatted) return area.formatted;
  const num = typeof area === "number" ? area : Number(area) || 0;
  const hectares = num / 10000;
  if (hectares < 0.01) return `${Math.round(num)} m²`;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(num / 1000000).toFixed(2)} km²`;
}

/**
 * Formats a distance in meters to a human-readable string
 */
export function formatDistance(meters) {
  const m = typeof meters === "number" ? meters : Number(meters) || 0;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

