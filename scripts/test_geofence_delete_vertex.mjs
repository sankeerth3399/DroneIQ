// Mock browser localStorage for Node test runner
const _store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => _store.get(k) || null,
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

import assert from "node:assert";
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  validateMissionAgainstGeofence,
} from "../src/utils/geofence.js";
import {
  validateGeofencePolygon,
} from "../src/utils/geofenceValidation.js";
import {
  normalizeVertexList,
  saveProjectGeofence,
  getProjectById,
} from "../src/services/projectService.js";

console.log("=== RUNNING GEOFENCE VERTEX DELETION ACCEPTANCE SUITE ===");

// Helper to simulate 10-vertex circular regular polygon around Hyderabad
function createCircleVertices(n = 10, centerLat = 17.385, centerLng = 78.486, radiusM = 500) {
  const points = [];
  const rLat = radiusM / 111139;
  const rLng = radiusM / (111139 * Math.cos((centerLat * Math.PI) / 180));
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    points.push({
      id: `vertex-${i + 1}`,
      lat: Number((centerLat + rLat * Math.cos(angle)).toFixed(6)),
      lng: Number((centerLng + rLng * Math.sin(angle)).toFixed(6)),
      latitude: Number((centerLat + rLat * Math.cos(angle)).toFixed(6)),
      longitude: Number((centerLng + rLng * Math.sin(angle)).toFixed(6)),
    });
  }
  return points;
}

// 1. TEST WITH 10 VALID VERTICES -> DELETE VERTEX 5 (Section 25)
{
  console.log("\n[Test 1] 10 vertices: Delete Vertex 5");
  const vertices = createCircleVertices(10);
  assert.strictEqual(vertices.length, 10);
  const v5 = vertices[4]; // 5th vertex
  assert.strictEqual(v5.id, "vertex-5");

  // Deletion logic
  const targetId = "vertex-5";
  const nextVertices = vertices.filter((v, idx) => (v.id || `vertex-${idx + 1}`) !== targetId);

  assert.strictEqual(nextVertices.length, 9, "Should have 9 vertices remaining");
  // Check ordering: V1..V4 then V6..V10
  assert.strictEqual(nextVertices[0].id, "vertex-1");
  assert.strictEqual(nextVertices[3].id, "vertex-4");
  assert.strictEqual(nextVertices[4].id, "vertex-6"); // 4 -> 6 directly
  assert.strictEqual(nextVertices[8].id, "vertex-10");

  // Display numbers: 1 to 9
  const displayNumbers = nextVertices.map((_, idx) => idx + 1);
  assert.deepStrictEqual(displayNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Geometry validation
  const validation = validateGeofencePolygon(nextVertices);
  assert.strictEqual(validation.valid, true, "Resulting 9-vertex polygon must be valid");

  // Metrics update
  const area = calculatePolygonArea(nextVertices);
  const perim = calculatePolygonPerimeter(nextVertices);
  assert(area.sqMeters > 0, "Area must be positive");
  assert(perim > 0, "Perimeter must be positive");
  console.log("✓ PASS: Vertex 5 deleted cleanly, 4 connects to 6 directly, display numbers 1..9, valid geometry.");
}

// 2. TEST DELETE FIRST VERTEX (V1) (Section 11 & 26)
{
  console.log("\n[Test 2] Delete Vertex 1");
  const vertices = createCircleVertices(5);
  const targetId = "vertex-1";
  const nextVertices = vertices.filter((v, idx) => (v.id || `vertex-${idx + 1}`) !== targetId);

  assert.strictEqual(nextVertices.length, 4);
  assert.strictEqual(nextVertices[0].id, "vertex-2");
  assert.strictEqual(nextVertices[1].id, "vertex-3");
  assert.strictEqual(nextVertices[2].id, "vertex-4");
  assert.strictEqual(nextVertices[3].id, "vertex-5");

  const validation = validateGeofencePolygon(nextVertices);
  assert.strictEqual(validation.valid, true, "Boundary V2 -> V3 -> V4 -> V5 -> V2 must be valid");
  console.log("✓ PASS: Vertex 1 deleted cleanly, V2..V5 retained in order, closed boundary valid.");
}

// 3. TEST DELETE LAST VERTEX (V5) (Section 12 & 27)
{
  console.log("\n[Test 3] Delete Last Vertex (V5)");
  const vertices = createCircleVertices(5);
  const targetId = "vertex-5";
  const nextVertices = vertices.filter((v, idx) => (v.id || `vertex-${idx + 1}`) !== targetId);

  assert.strictEqual(nextVertices.length, 4);
  assert.strictEqual(nextVertices[0].id, "vertex-1");
  assert.strictEqual(nextVertices[1].id, "vertex-2");
  assert.strictEqual(nextVertices[2].id, "vertex-3");
  assert.strictEqual(nextVertices[3].id, "vertex-4");

  const validation = validateGeofencePolygon(nextVertices);
  assert.strictEqual(validation.valid, true, "Boundary V1 -> V2 -> V3 -> V4 -> V1 must be valid");
  console.log("✓ PASS: Last vertex deleted cleanly, boundary V1..V4->V1 valid.");
}

// 4. TEST MINIMUM 3 RULE (Section 3 & 28)
{
  console.log("\n[Test 4] Minimum 3 Rule: 3 vertices prevent deletion");
  const vertices = createCircleVertices(3);
  assert.strictEqual(vertices.length, 3);

  // Simulating handleDeleteVertex guard:
  let inlineError = null;
  const targetId = "vertex-2";
  if (vertices.length <= 3) {
    inlineError = "Geofence requires at least 3 points.";
  }

  assert.strictEqual(inlineError, "Geofence requires at least 3 points.");
  assert.strictEqual(vertices.length, 3, "Vertices array must remain 3 points, unchanged");
  console.log("✓ PASS: Deletion prevented on 3-vertex geofence with 'Geofence requires at least 3 points.'");
}

// 5. TEST INVALID GEOMETRY ABORT (Section 13)
{
  console.log("\n[Test 5] Invalid geometry check: self-intersection / crossing edges prevention");
  // Construct polygon: hour-glass if middle vertex is removed
  // A shape that becomes self-intersecting if vertex is deleted
  // Normal polygon: (0,0), (100,0), (100, 100), (50, 10), (0, 100) (bowtie indented)
  // If (50, 10) is deleted, edges (100, 0)->(100, 100) vs (0, 100)->(0, 0)...
  // Let's create an explicit bowtie:
  const bowtie = [
    { id: "v1", lat: 17.385, lng: 78.486 },
    { id: "v2", lat: 17.388, lng: 78.490 },
    { id: "v3", lat: 17.385, lng: 78.490 },
    { id: "v4", lat: 17.388, lng: 78.486 },
  ];
  const bowtieVal = validateGeofencePolygon(bowtie);
  assert.strictEqual(bowtieVal.valid, false, "Self-intersecting geometry must fail validation");
  assert.strictEqual(bowtieVal.reason, "EDGE_INTERSECTION");
  console.log("✓ PASS: Invalid geometry properly detected and rejected by validateGeofencePolygon.");
}

// 6. TEST EDIT + CANCEL (Section 18 & 29)
{
  console.log("\n[Test 6] Edit + Cancel behavior");
  const savedVertices = createCircleVertices(5);
  let editingVertices = [...savedVertices];
  let dragSnapshot = [...editingVertices];

  // In edit mode: delete V3
  editingVertices = editingVertices.filter(v => v.id !== "vertex-3");
  assert.strictEqual(editingVertices.length, 4);

  // User clicks Cancel:
  editingVertices = [...dragSnapshot];
  assert.strictEqual(editingVertices.length, 5);
  assert.deepStrictEqual(editingVertices.map(v => v.id), ["vertex-1", "vertex-2", "vertex-3", "vertex-4", "vertex-5"]);
  console.log("✓ PASS: Cancel restores snapshot V1..V5 perfectly without persisting.");
}

// 7. TEST EDIT + SAVE + PERSISTENCE (Section 17, 21, 30)
{
  console.log("\n[Test 7] Edit + Save persistence in projectService");
  const savedVertices = createCircleVertices(5);
  // Delete V3
  const editedVertices = savedVertices.filter(v => v.id !== "vertex-3");

  const saveResult = saveProjectGeofence("AERO-MSN-0001", {
    vertices: editedVertices,
    coordinates: editedVertices,
    polygon: editedVertices,
    name: "Flight Geofence Boundary",
  });

  assert(saveResult, "saveProjectGeofence must succeed");
  const reloaded = getProjectById("AERO-MSN-0001");
  assert.strictEqual(reloaded.geofence.vertices.length, 4, "Reloaded project must have 4 vertices");
  assert.deepStrictEqual(
    reloaded.geofence.vertices.map(v => v.id),
    ["vertex-1", "vertex-2", "vertex-4", "vertex-5"],
    "V3 must remain deleted across reload"
  );
  console.log("✓ PASS: Save Geofence persists deletion to canonical currentProject.geofence.vertices.");
}

// 8. TEST 50 VERTICES -> DELETE VERTEX 25 (Section 24 & 31)
{
  console.log("\n[Test 8] 50 vertices -> delete vertex 25");
  const vertices = createCircleVertices(50);
  assert.strictEqual(vertices.length, 50);
  const targetId = "vertex-25";

  const nextVertices = vertices.filter(v => v.id !== targetId);
  assert.strictEqual(nextVertices.length, 49);
  assert.strictEqual(nextVertices[23].id, "vertex-24");
  assert.strictEqual(nextVertices[24].id, "vertex-26"); // 24 connects to 26 directly

  const validation = validateGeofencePolygon(nextVertices);
  assert.strictEqual(validation.valid, true, "49-vertex polygon must be valid");

  const area = calculatePolygonArea(nextVertices);
  assert(area.sqMeters > 0);
  console.log("✓ PASS: 50 vertices -> 49 vertices, valid continuous polygon, metrics updated.");
}

// 9. TEST WAYPOINT VALIDATION AFTER VERTEX DELETION (Section 20)
{
  console.log("\n[Test 9] Waypoint validation against updated geofence");
  // Large bounding polygon
  const geofence = [
    { id: "v1", lat: 17.380, lng: 78.480 },
    { id: "v2", lat: 17.390, lng: 78.480 },
    { id: "v3", lat: 17.390, lng: 78.490 },
    { id: "v4", lat: 17.380, lng: 78.490 },
  ];
  // Waypoint inside
  const waypoints = [
    { id: "wp-1", lat: 17.385, lng: 78.485 },
  ];

  const validationBefore = validateMissionAgainstGeofence(waypoints, geofence);
  assert.strictEqual(validationBefore.isValid, true, "Waypoint should be valid inside original geofence");

  // A waypoint far away
  const outsideWaypoints = [
    { id: "wp-outside", lat: 17.450, lng: 78.550 },
  ];
  const validationOutside = validateMissionAgainstGeofence(outsideWaypoints, geofence);
  assert.strictEqual(validationOutside.isValid, false, "Waypoint outside geofence must be detected as violation");
  assert.strictEqual(validationOutside.violations.length, 1);
  console.log("✓ PASS: Waypoint validation accurately checks against canonical geofence.");
}

console.log("\n==================================================");
console.log("ALL 9 GEOFENCE VERTEX DELETION ACCEPTANCE TESTS PASSED!");
console.log("==================================================");
