import assert from "node:assert/strict";
import {
  ROUTE_LINE_CASING_LAYER_ID,
  ROUTE_LINE_LAYER_ID,
  ROUTE_SOURCE_ID,
  syncDirectionMarkers,
  syncMissionRoute,
} from "../src/components/Map/routeLayerHelper.js";
import {
  GEOFENCE_SOURCE_ID,
  VIOLATIONS_SOURCE_ID,
  syncGeofenceLayers,
} from "../src/components/Map/geofenceLayerHelper.js";

const sources = new Map();
const layers = new Map([
  ["aeronexus-geofence-fill", { id: "aeronexus-geofence-fill" }],
  ["aeronexus-geofence-line", { id: "aeronexus-geofence-line" }],
]);
const map = {
  getSource: (id) => sources.get(id),
  addSource: (id, source) => sources.set(id, {
    ...source,
    setData(data) {
      this.data = data;
    },
  }),
  removeSource: (id) => sources.delete(id),
  getLayer: (id) => layers.get(id),
  addLayer: (layer) => layers.set(layer.id, layer),
  removeLayer: (id) => layers.delete(id),
  moveLayer: () => {},
  isStyleLoaded: () => true,
};

let removedDirectionMarkers = 0;
globalThis.window = {
  mappls: {
    Marker: class {
      remove() {
        removedDirectionMarkers += 1;
      }
    },
  },
};

const directionMarkersRef = { current: new Map() };
const waypoints = [
  { id: "wp-1", lat: 17.385, lng: 78.486 },
  { id: "wp-2", lat: 17.386, lng: 78.487 },
  { id: "wp-3", lat: 17.387, lng: 78.488 },
  { id: "wp-4", lat: 17.388, lng: 78.489 },
];

syncMissionRoute(map, waypoints);
syncDirectionMarkers(map, waypoints, true, directionMarkersRef);
assert.ok(sources.has(ROUTE_SOURCE_ID), "Route source should exist for multiple waypoints");
assert.ok(layers.has(ROUTE_LINE_LAYER_ID), "Route line layer should exist for multiple waypoints");
assert.ok(layers.has(ROUTE_LINE_CASING_LAYER_ID), "Route casing layer should exist for multiple waypoints");
assert.equal(directionMarkersRef.current.size, 3, "Four waypoints should have three directional markers");

const afterMiddleDelete = [waypoints[0], waypoints[2], waypoints[3]];
syncMissionRoute(map, afterMiddleDelete);
syncDirectionMarkers(map, afterMiddleDelete, true, directionMarkersRef);
assert.deepEqual(
  sources.get(ROUTE_SOURCE_ID).data.features[0].geometry.coordinates,
  afterMiddleDelete.map((waypoint) => [waypoint.lng, waypoint.lat]),
  "Deleting a middle waypoint should reconnect only the remaining consecutive waypoints"
);
assert.equal(directionMarkersRef.current.size, 2, "Deleting one of four waypoints should leave two segment arrows");

syncMissionRoute(map, []);
syncDirectionMarkers(map, [], true, directionMarkersRef);
assert.equal(sources.has(ROUTE_SOURCE_ID), false, "Clearing waypoints must remove the route source");
assert.equal(layers.has(ROUTE_LINE_LAYER_ID), false, "Clearing waypoints must remove the route line layer");
assert.equal(layers.has(ROUTE_LINE_CASING_LAYER_ID), false, "Clearing waypoints must remove the casing layer");
assert.equal(directionMarkersRef.current.size, 0, "Clearing waypoints must remove all directional markers");
assert.equal(removedDirectionMarkers, 3, "Deleting and clearing waypoints must remove all obsolete directional markers");
assert.ok(layers.has("aeronexus-geofence-fill"), "Clearing route must preserve geofence fill");
assert.ok(layers.has("aeronexus-geofence-line"), "Clearing route must preserve geofence boundary");

syncMissionRoute(map, waypoints);
syncDirectionMarkers(map, waypoints, true, directionMarkersRef);
syncMissionRoute(map, [waypoints[0]]);
syncDirectionMarkers(map, [waypoints[0]], true, directionMarkersRef);
assert.equal(sources.has(ROUTE_SOURCE_ID), false, "One waypoint must not retain a route source");
assert.equal(layers.has(ROUTE_LINE_LAYER_ID), false, "One waypoint must not retain a route line");
assert.equal(directionMarkersRef.current.size, 0, "One waypoint must not retain directional markers");

const geofence = [
  { lat: 17.38, lng: 78.48 },
  { lat: 17.39, lng: 78.48 },
  { lat: 17.39, lng: 78.49 },
  { lat: 17.38, lng: 78.49 },
];
const violations = [[
  { lat: 17.381, lng: 78.481 },
  { lat: 17.389, lng: 78.489 },
]];
syncGeofenceLayers(map, geofence, violations);
const savedGeofenceData = sources.get(GEOFENCE_SOURCE_ID).data;
assert.equal(sources.get(VIOLATIONS_SOURCE_ID).data.features.length, 1, "Invalid mission segment should render a violation feature");

syncGeofenceLayers(map, geofence, []);
assert.equal(sources.has(VIOLATIONS_SOURCE_ID), false, "Cleared waypoint violations must remove the red violation source");
assert.equal(layers.has("aeronexus-violations-line"), false, "Cleared waypoint violations must remove the red violation line layer");
assert.deepEqual(sources.get(GEOFENCE_SOURCE_ID).data, savedGeofenceData, "Clearing violations must leave geofence polygon data unchanged");

console.log("Waypoint route cleanup tests passed; geofence layers remain intact.");