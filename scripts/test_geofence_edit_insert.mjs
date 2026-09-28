import assert from "node:assert/strict";
import {
  findNearestPolygonEdge,
  validateGeofencePolygon,
} from "../src/utils/geofenceValidation.js";

const vertices = [
  { id: "v1", lat: 17.385, lng: 78.486 },
  { id: "v2", lat: 17.385, lng: 78.49 },
  { id: "v3", lat: 17.389, lng: 78.49 },
  { id: "v4", lat: 17.389, lng: 78.486 },
];

const edgeClick = { lat: 17.387, lng: 78.49001 };
const nearest = findNearestPolygonEdge(vertices, edgeClick);
assert.equal(nearest?.edgeIndex, 1, "Click should select edge V2 -> V3");
assert.equal(nearest?.insertionIndex, 2, "New vertex should be inserted after V2");

const inserted = [...vertices];
inserted.splice(nearest.insertionIndex, 0, {
  id: "v5",
  lat: edgeClick.lat,
  lng: edgeClick.lng,
});
assert.deepEqual(
  inserted.map((vertex) => vertex.id),
  ["v1", "v2", "v5", "v3", "v4"],
  "Insertion must preserve existing vertex IDs and polygon order"
);
assert.equal(validateGeofencePolygon(inserted).valid, true, "Valid edge insertion should retain a simple polygon");

const closingEdgeClick = { lat: 17.387, lng: 78.48599 };
const closingEdge = findNearestPolygonEdge(vertices, closingEdgeClick);
assert.equal(closingEdge?.edgeIndex, 3, "Click should detect the closing edge V4 -> V1");
assert.equal(closingEdge?.insertionIndex, 4, "Closing-edge point should be inserted at the end of the ordered list");

const lngMetersPerDegree = 111139 * Math.cos((17.387 * Math.PI) / 180);
const within500Meters = { lat: 17.387, lng: 78.49 + 499 / lngMetersPerDegree };
const beyond500Meters = { lat: 17.387, lng: 78.49 + 501 / lngMetersPerDegree };
assert.equal(
  findNearestPolygonEdge(vertices, within500Meters)?.edgeIndex,
  1,
  "A click within 500 m should identify the nearest edge"
);
assert.equal(
  findNearestPolygonEdge(vertices, beyond500Meters),
  null,
  "A click beyond 500 m must not identify an insertion edge"
);

assert.equal(
  findNearestPolygonEdge(vertices, { lat: 17.387, lng: 78.488 })?.edgeIndex,
  1,
  "An interior click within 500 m should resolve to its nearest ordered edge"
);

const nearVertex = { lat: 17.385001, lng: 78.486 };
const nearVertexEdge = findNearestPolygonEdge(vertices, nearVertex);
assert.ok(nearVertexEdge, "Near-vertex click is still close enough to identify a boundary edge");
const duplicateCandidate = [...vertices];
duplicateCandidate.splice(nearVertexEdge.insertionIndex, 0, nearVertex);
assert.equal(validateGeofencePolygon(duplicateCandidate).valid, false, "Near-duplicate point must be rejected");

console.log("All geofence edit insertion tests passed.");