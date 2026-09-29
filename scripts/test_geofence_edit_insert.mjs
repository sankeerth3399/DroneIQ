import assert from "node:assert/strict";
import {
  findNearestPolygonEdge,
  insertVertexOnNearestEdge,
  validateProposedVertex,
  validateGeofencePolygon,
} from "../src/utils/geofenceValidation.js";
import { calculatePolygonArea } from "../src/utils/geofence.js";
import {
  GEOFENCE_PREVIEW_SOURCE_ID,
  GEOFENCE_SOURCE_ID,
  syncGeofenceLayers,
} from "../src/components/Map/geofenceLayerHelper.js";

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

const insertion = insertVertexOnNearestEdge(vertices, {
  id: "v5",
  lat: edgeClick.lat,
  lng: edgeClick.lng,
});
assert.equal(insertion.valid, true, "Nearby edge insertion should be accepted");
const inserted = insertion.vertices;
assert.deepEqual(
  inserted.map((vertex) => vertex.id),
  ["v1", "v2", "v5", "v3", "v4"],
  "Insertion must preserve existing vertex IDs and polygon order"
);
assert.equal(validateGeofencePolygon(inserted).valid, true, "Valid edge insertion should retain a simple polygon");
assert.ok(
  Math.abs(calculatePolygonArea(inserted).sqMeters - calculatePolygonArea(vertices).sqMeters) <= 1,
  "Snapping onto an existing edge should preserve the polygon area"
);
assert.ok(
  Math.abs(inserted[2].lng - vertices[1].lng) < 1e-9,
  "Accepted point must be snapped onto the selected boundary edge"
);

const mapSources = new Map();
const mapLayers = new Map();
const map = {
  isStyleLoaded: () => true,
  getSource: (id) => mapSources.get(id),
  addSource: (id, source) => mapSources.set(id, {
    ...source,
    setData(data) {
      this.data = data;
    },
  }),
  removeSource: (id) => mapSources.delete(id),
  getLayer: (id) => mapLayers.get(id),
  addLayer: (layer) => mapLayers.set(layer.id, layer),
  removeLayer: (id) => mapLayers.delete(id),
  moveLayer: () => {},
};
syncGeofenceLayers(map, inserted, [], { isDrawing: true, isClosed: false });
const polygonFeatures = mapSources.get(GEOFENCE_SOURCE_ID).data.features;
assert.equal(polygonFeatures.length, 1, "The map must render exactly one geofence polygon");
assert.equal(polygonFeatures[0].geometry.coordinates[0].length, inserted.length + 1, "GeoJSON closes the polygon with only a ring terminator");
assert.deepEqual(
  polygonFeatures[0].geometry.coordinates[0][0],
  polygonFeatures[0].geometry.coordinates[0].at(-1),
  "The rendered polygon ring must close at its first coordinate"
);
assert.equal(mapSources.get(GEOFENCE_PREVIEW_SOURCE_ID).data.features.length, 0, "No duplicate open preview line should render over a 3+ vertex polygon");

const closingEdgeClick = { lat: 17.387, lng: 78.48599 };
const closingEdge = findNearestPolygonEdge(vertices, closingEdgeClick);
assert.equal(closingEdge?.edgeIndex, 3, "Click should detect the closing edge V4 -> V1");
assert.equal(closingEdge?.insertionIndex, 4, "Closing-edge point should be inserted at the end of the ordered list");

assert.equal(
  findNearestPolygonEdge(vertices, { lat: 17.387, lng: 78.488 })?.edgeIndex,
  1,
  "An interior click should resolve to its nearest ordered edge"
);

const lngMetersPerDegree = 111139 * Math.cos((17.387 * Math.PI) / 180);
const distantEditClick = { lat: 17.387, lng: 78.49 + 5000 / lngMetersPerDegree };
const distantNearestEdge = findNearestPolygonEdge(vertices, distantEditClick);
assert.ok(distantNearestEdge, "Nearest edge lookup must remain available at arbitrary distances");
assert.ok(distantNearestEdge.distanceMeters > 5000 - 5, "Test edit click must be several kilometers from the polygon edge");
const distantInsertion = insertVertexOnNearestEdge(vertices, {
  id: "distant-edit-point",
  ...distantEditClick,
});
assert.equal(distantInsertion.valid, true, "Distance alone must not reject an Edit-mode point");

const nearVertex = { lat: 17.385001, lng: 78.486 };
const nearVertexInsertion = insertVertexOnNearestEdge(vertices, {
  id: "near-vertex",
  ...nearVertex,
});
assert.equal(nearVertexInsertion.valid, false, "Near-duplicate point must be rejected before geometry is returned");

const oneKilometerDrawCandidate = validateProposedVertex(
  [vertices[0]],
  { lat: vertices[0].lat, lng: vertices[0].lng + 1000 / lngMetersPerDegree }
);
assert.equal(oneKilometerDrawCandidate.valid, true, "A geometrically valid 1 km drawing edge must be accepted");

const longDistancePolygon = [
  { id: "long-1", lat: 17.38, lng: 78.48 },
  { id: "long-2", lat: 17.38, lng: 78.54 },
  { id: "long-3", lat: 17.43, lng: 78.54 },
  { id: "long-4", lat: 17.43, lng: 78.48 },
];
assert.equal(
  validateProposedVertex(longDistancePolygon.slice(0, 3), longDistancePolygon[3]).valid,
  true,
  "A closing drawing edge longer than 5 km must not be rejected by distance"
);
assert.equal(
  validateGeofencePolygon(longDistancePolygon).valid,
  true,
  "A clean polygon with edges several kilometers long must be accepted"
);

console.log("All geofence edit insertion tests passed.");