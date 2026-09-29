import { getUnderlyingMap, SATELLITE_LAYER_ID } from "./satelliteLayerHelper.js";

export const GEOFENCE_SOURCE_ID = "aeronexus-geofence-source";
export const GEOFENCE_FILL_LAYER_ID = "aeronexus-geofence-fill";
export const GEOFENCE_LINE_LAYER_ID = "aeronexus-geofence-line";
export const GEOFENCE_PREVIEW_SOURCE_ID = "aeronexus-geofence-preview-source";
export const GEOFENCE_PREVIEW_LINE_LAYER_ID = "aeronexus-geofence-preview-line";
export const VIOLATIONS_SOURCE_ID = "aeronexus-violations-source";
export const VIOLATIONS_LINE_LAYER_ID = "aeronexus-violations-line";

/**
 * Builds GeoJSON FeatureCollection for a single continuous polygon geofence.
 * Guarantees exactly ONE polygon feature: V1 -> V2 -> ... -> Vn -> V1.
 * Never generates multiple polygons or per-vertex buffer geometries.
 *
 * @param {Array<Object>} coordinates - Canonical ordered vertex coordinates [{lat, lng}, ...]
 * @returns {Object} GeoJSON FeatureCollection containing at most ONE Polygon Feature
 */
export const buildGeofenceGeoJson = (coordinates = []) => {
  if (!coordinates || coordinates.length < 3) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  // Ring must be closed for GeoJSON Polygon: first and last coordinate must match
  const ring = coordinates.map((pt) => [
    Number(Number(pt.lng ?? pt.longitude).toFixed(6)),
    Number(Number(pt.lat ?? pt.latitude).toFixed(6)),
  ]);

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
        id: "geofence-canonical-polygon",
        properties: {
          type: "geofence",
          vertexCount: coordinates.length,
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      },
    ],
  };
};

/**
 * Builds GeoJSON for the temporary boundary preview line during drawing mode.
 * Connects vertices V1 -> V2 -> ... -> Vn as an unclosed line preview.
 *
 * @param {Array<Object>} coordinates - Current vertices array
 * @param {boolean} isDrawing - Whether drawing mode is currently active
 * @param {boolean} isClosed - Whether boundary has been closed
 * @returns {Object} GeoJSON FeatureCollection
 */
export const buildGeofencePreviewGeoJson = (coordinates = [], isDrawing = false, isClosed = false) => {
  // Preview line is only displayed during active drawing when open and has at least 2 vertices
  if (!isDrawing || isClosed || !coordinates || coordinates.length < 2) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const lineCoords = coordinates.map((pt) => [
    Number(Number(pt.lng ?? pt.longitude).toFixed(6)),
    Number(Number(pt.lat ?? pt.latitude).toFixed(6)),
  ]);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "geofence-preview-line",
        properties: {
          preview: true,
        },
        geometry: {
          type: "LineString",
          coordinates: lineCoords,
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
        [Number(seg[0].lng ?? seg[0].longitude), Number(seg[0].lat ?? seg[0].latitude)],
        [Number(seg[1].lng ?? seg[1].longitude), Number(seg[1].lat ?? seg[1].latitude)],
      ],
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Synchronizes ONE continuous Geofence Polygon, temporary preview line, and violation layers on map.
 * Enforces strict single-layer architecture:
 * - At any time, exactly ONE geofence polygon fill and ONE geofence boundary line exist.
 * - During drawing before 3 vertices: shows ONLY vertex markers and preview connecting line.
 * - Once 3+ vertices exist: updates that same single polygon in place.
 * - No stacking, no per-vertex buffers, no leftover preview on close/save.
 */
export const syncGeofenceLayers = (
  mapInstance,
  geofenceCoords = [],
  violations = [],
  options = {}
) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

  const { isDrawing = false, isClosed = true } = options;
  const isActuallyClosed = isClosed || geofenceCoords.length >= 3;

  // When drawing with fewer than 3 vertices, do NOT create a filled polygon yet (Requirement 5)
  const shouldRenderPolygon = geofenceCoords.length >= 3;
  const geofenceData = shouldRenderPolygon
    ? buildGeofenceGeoJson(geofenceCoords)
    : { type: "FeatureCollection", features: [] };

  // Temporary preview line: active during drawing mode (Requirement 6)
  const previewData = buildGeofencePreviewGeoJson(geofenceCoords, isDrawing, isActuallyClosed);
  const violationsData = buildViolationsGeoJson(violations);

  const applyLayers = () => {
    try {
      // 1. Geofence Canonical Polygon Source & Layers
      if (!map.getSource(GEOFENCE_SOURCE_ID)) {
        map.addSource(GEOFENCE_SOURCE_ID, {
          type: "geojson",
          data: geofenceData,
        });
      } else {
        map.getSource(GEOFENCE_SOURCE_ID).setData(geofenceData);
      }

      // Exactly ONE polygon translucent cyan fill layer
      if (!map.getLayer(GEOFENCE_FILL_LAYER_ID) && map.getSource(GEOFENCE_SOURCE_ID)) {
        map.addLayer({
          id: GEOFENCE_FILL_LAYER_ID,
          type: "fill",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "fill-color": "#06B6D4",
            "fill-opacity": 0.18,
          },
        });
      }

      // Exactly ONE polygon cyan boundary outline layer
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

      // 2. Temporary Drawing Preview Line Source & Layer (Requirement 6)
      if (!map.getSource(GEOFENCE_PREVIEW_SOURCE_ID)) {
        map.addSource(GEOFENCE_PREVIEW_SOURCE_ID, {
          type: "geojson",
          data: previewData,
        });
      } else {
        map.getSource(GEOFENCE_PREVIEW_SOURCE_ID).setData(previewData);
      }

      if (!map.getLayer(GEOFENCE_PREVIEW_LINE_LAYER_ID) && map.getSource(GEOFENCE_PREVIEW_SOURCE_ID)) {
        map.addLayer({
          id: GEOFENCE_PREVIEW_LINE_LAYER_ID,
          type: "line",
          source: GEOFENCE_PREVIEW_SOURCE_ID,
          paint: {
            "line-color": "#35E0FF",
            "line-width": 2.0,
            "line-dasharray": [2, 2],
          },
        });
      }

      // 3. Violation route exists only while there are violating segments.
      if (violationsData.features.length === 0) {
        if (map.getLayer(VIOLATIONS_LINE_LAYER_ID)) {
          map.removeLayer(VIOLATIONS_LINE_LAYER_ID);
        }
        if (map.getSource(VIOLATIONS_SOURCE_ID)) {
          map.removeSource(VIOLATIONS_SOURCE_ID);
        }
      } else {
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
      }

      // 4. Stacking: Ensure layers are above satellite raster if satellite exists
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
        if (map.getLayer(GEOFENCE_PREVIEW_LINE_LAYER_ID)) {
          try {
            map.moveLayer(GEOFENCE_PREVIEW_LINE_LAYER_ID);
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
    // Attach single one-shot listener
    map.once?.("idle", applyLayers);
  }
};

/**
 * Removes all geofence layers, preview line layers, and sources from the map.
 * Ensures complete cleanup during unmount, project switching, or geofence reset.
 *
 * @param {Object} mapInstance - Mappls / MapLibre map instance
 */
export const removeGeofenceLayers = (mapInstance) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map) return;

  try {
    // 1. Remove preview line
    if (map.getLayer?.(GEOFENCE_PREVIEW_LINE_LAYER_ID)) {
      map.removeLayer(GEOFENCE_PREVIEW_LINE_LAYER_ID);
    }
    if (map.getSource?.(GEOFENCE_PREVIEW_SOURCE_ID)) {
      map.removeSource(GEOFENCE_PREVIEW_SOURCE_ID);
    }

    // 2. Remove geofence fill and line
    if (map.getLayer?.(GEOFENCE_FILL_LAYER_ID)) {
      map.removeLayer(GEOFENCE_FILL_LAYER_ID);
    }
    if (map.getLayer?.(GEOFENCE_LINE_LAYER_ID)) {
      map.removeLayer(GEOFENCE_LINE_LAYER_ID);
    }
    if (map.getSource?.(GEOFENCE_SOURCE_ID)) {
      map.removeSource(GEOFENCE_SOURCE_ID);
    }

    // 3. Remove route violations
    if (map.getLayer?.(VIOLATIONS_LINE_LAYER_ID)) {
      map.removeLayer(VIOLATIONS_LINE_LAYER_ID);
    }
    if (map.getSource?.(VIOLATIONS_SOURCE_ID)) {
      map.removeSource(VIOLATIONS_SOURCE_ID);
    }
  } catch (err) {
    console.debug("[GeofenceLayerHelper] Layer removal note:", err.message);
  }
};

/**
 * Builds HTML for an interactive geofence vertex handle marker.
 * Strictly renders DOM handle point only (numbered 1..N).
 * NEVER renders a polygon or buffer around the vertex.
 */
export const buildGeofenceVertexMarkerHtml = (index, isSelected = false) => {
  const borderColor = isSelected ? "#35E0FF" : "#FFFFFF";
  const bg = isSelected ? "#35E0FF" : "#06B6D4";
  const glow = isSelected
    ? "0 0 0 3px rgba(53, 224, 255, 0.45), 0 0 16px #35E0FF, 0 0 24px rgba(53, 224, 255, 0.6)"
    : "0 0 6px rgba(6, 182, 212, 0.6)";
  const scale = isSelected ? "scale(1.3)" : "scale(1)";
  const zIndex = isSelected ? "999" : "10";

  return `
    <div class="geofence-vertex-marker ${isSelected ? "selected-vertex" : ""}" data-index="${index}" style="
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
      cursor: pointer;
      user-select: none;
      transform: translate(-50%, -50%) ${scale};
      z-index: ${zIndex};
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    ">
      ${index + 1}
    </div>
  `;
};
