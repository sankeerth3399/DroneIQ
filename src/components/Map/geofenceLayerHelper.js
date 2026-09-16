import { getUnderlyingMap, SATELLITE_LAYER_ID } from "./satelliteLayerHelper.js";

export const GEOFENCE_SOURCE_ID = "aeronexus-geofence-source";
export const GEOFENCE_FILL_LAYER_ID = "aeronexus-geofence-fill";
export const GEOFENCE_LINE_LAYER_ID = "aeronexus-geofence-line";
export const VIOLATIONS_SOURCE_ID = "aeronexus-violations-source";
export const VIOLATIONS_LINE_LAYER_ID = "aeronexus-violations-line";

/**
 * Builds GeoJSON FeatureCollection for polygon geofence
 * coordinates is an array of {lat, lng} or [{lat, lng}, ...]
 */
export const buildGeofenceGeoJson = (coordinates = []) => {
  if (!coordinates || coordinates.length < 3) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  // Ring must be closed for GeoJSON polygon: first and last coordinate must match
  const ring = coordinates.map((pt) => [Number(pt.lng), Number(pt.lat)]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      },
    ],
  };
};

/**
 * Builds GeoJSON for route violation segments
 * violations is an array of segment tuples: [ [ {lat, lng}, {lat, lng} ], ... ]
 */
export const buildViolationsGeoJson = (violations = []) => {
  if (!violations || violations.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const features = violations.map((seg, idx) => ({
    type: "Feature",
    id: idx,
    properties: { violation: true },
    geometry: {
      type: "LineString",
      coordinates: [
        [Number(seg[0].lng), Number(seg[0].lat)],
        [Number(seg[1].lng), Number(seg[1].lat)],
      ],
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Ensures Geofence and Violation layers exist on the map and are placed above satellite layer
 */
export const syncGeofenceLayers = (mapInstance, geofenceCoords = [], violations = []) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

  const geofenceData = buildGeofenceGeoJson(geofenceCoords);
  const violationsData = buildViolationsGeoJson(violations);

  const applyLayers = () => {
    try {
      // 1. Geofence Source & Layers
      if (!map.getSource(GEOFENCE_SOURCE_ID)) {
        map.addSource(GEOFENCE_SOURCE_ID, {
          type: "geojson",
          data: geofenceData,
        });
      } else {
        map.getSource(GEOFENCE_SOURCE_ID).setData(geofenceData);
      }

      if (!map.getLayer(GEOFENCE_FILL_LAYER_ID) && map.getSource(GEOFENCE_SOURCE_ID)) {
        map.addLayer({
          id: GEOFENCE_FILL_LAYER_ID,
          type: "fill",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "fill-color": "#06b6d4",
            "fill-opacity": 0.18,
          },
        });
      }

      if (!map.getLayer(GEOFENCE_LINE_LAYER_ID) && map.getSource(GEOFENCE_SOURCE_ID)) {
        map.addLayer({
          id: GEOFENCE_LINE_LAYER_ID,
          type: "line",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "line-color": "#35E0FF",
            "line-width": 2.5,
            "line-dasharray": [3, 2],
          },
        });
      }

      // 2. Violations Source & Layers
      if (!map.getSource(VIOLATIONS_SOURCE_ID)) {
        map.addSource(VIOLATIONS_SOURCE_ID, {
          type: "geojson",
          data: violationsData,
        });
      } else {
        map.getSource(VIOLATIONS_SOURCE_ID).setData(violationsData);
      }

      if (!map.getLayer(VIOLATIONS_LINE_LAYER_ID) && map.getSource(VIOLATIONS_SOURCE_ID)) {
        map.addLayer({
          id: VIOLATIONS_LINE_LAYER_ID,
          type: "line",
          source: VIOLATIONS_SOURCE_ID,
          paint: {
            "line-color": "#EF4444",
            "line-width": 4.5,
            "line-opacity": 0.95,
          },
        });
      }

      // 3. Move layers above satellite raster if satellite exists
      if (map.getLayer(SATELLITE_LAYER_ID)) {
        if (map.getLayer(GEOFENCE_FILL_LAYER_ID)) {
          try {
            map.moveLayer(GEOFENCE_FILL_LAYER_ID);
          } catch {
            // Safe ignore
          }
        }
        if (map.getLayer(GEOFENCE_LINE_LAYER_ID)) {
          try {
            map.moveLayer(GEOFENCE_LINE_LAYER_ID);
          } catch {
            // Safe ignore
          }
        }
        if (map.getLayer(VIOLATIONS_LINE_LAYER_ID)) {
          try {
            map.moveLayer(VIOLATIONS_LINE_LAYER_ID);
          } catch {
            // Safe ignore
          }
        }
      }
    } catch (err) {
      console.warn("[GeofenceLayerHelper] Sync note:", err.message);
    }
  };

  if (typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) {
    applyLayers();
  } else {
    map.once?.("idle", applyLayers);
    map.once?.("styledata", applyLayers);
  }
};

/**
 * Builds HTML for an interactive geofence vertex handle marker
 */
export const buildGeofenceVertexMarkerHtml = (index, isSelected = false) => {
  const borderColor = isSelected ? "#35E0FF" : "#FFFFFF";
  const bg = isSelected ? "#35E0FF" : "#06B6D4";
  const glow = isSelected ? "0 0 12px #35E0FF" : "0 0 6px rgba(6,182,212,0.6)";

  return `
    <div class="geofence-vertex-marker" data-index="${index}" style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${bg};
      border: 2.5px solid ${borderColor};
      box-shadow: ${glow};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 10px;
      font-weight: 700;
      color: #030712;
      cursor: grab;
      user-select: none;
      transform: translate(-50%, -50%);
      transition: transform 0.15s ease;
    ">
      ${index + 1}
    </div>
  `;
};
