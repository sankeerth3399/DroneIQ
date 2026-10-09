import { getUnderlyingMap, SATELLITE_LAYER_ID, enforceMapLayerOrder } from "./satelliteLayerHelper.js";

export const ROUTE_SOURCE_ID = "aeronexus-mission-route-source";
export const ROUTE_LINE_LAYER_ID = "aeronexus-mission-route-line";
export const ROUTE_LINE_CASING_LAYER_ID = "aeronexus-mission-route-casing";

/**
 * Calculates geodesic bearing in degrees (0 - 360) from start to end coordinate
 */
export function calculateBearing(start, end) {
  if (!start || !end) return 0;
  const sLatVal = start.lat ?? start.latitude;
  const sLngVal = start.lng ?? start.longitude;
  const eLatVal = end.lat ?? end.latitude;
  const eLngVal = end.lng ?? end.longitude;
  if (typeof sLatVal !== "number" || typeof sLngVal !== "number" || typeof eLatVal !== "number" || typeof eLngVal !== "number") return 0;

  const sLat = (sLatVal * Math.PI) / 180;
  const sLng = (sLngVal * Math.PI) / 180;
  const eLat = (eLatVal * Math.PI) / 180;
  const eLng = (eLngVal * Math.PI) / 180;

  const dLng = eLng - sLng;
  const y = Math.sin(dLng) * Math.cos(eLat);
  const x = Math.cos(sLat) * Math.sin(eLat) - Math.sin(sLat) * Math.cos(eLat) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates geographic midpoint between two coordinates
 */
export function calculateMidpoint(start, end) {
  const sLatVal = start.lat ?? start.latitude;
  const sLngVal = start.lng ?? start.longitude;
  const eLatVal = end.lat ?? end.latitude;
  const eLngVal = end.lng ?? end.longitude;

  return {
    lat: ((sLatVal || 0) + (eLatVal || 0)) / 2,
    lng: ((sLngVal || 0) + (eLngVal || 0)) / 2,
  };
}

/**
 * Builds GeoJSON FeatureCollection for straight waypoint-to-waypoint mission route.
 * Each consecutive waypoint is connected with a straight geodesic line.
 */
export function buildRouteGeoJson(waypoints = []) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  // Exact consecutive coordinates: WP1 -> WP2 -> WP3 -> ...
  const coordinates = waypoints
    .map((wp) => {
      const lat = wp?.lat ?? wp?.latitude;
      const lng = wp?.lng ?? wp?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return null;
      return [Number(lng), Number(lat)];
    })
    .filter(Boolean);

  if (coordinates.length < 2) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          routeType: "mission",
          pointCount: coordinates.length,
        },
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

/**
 * Synchronizes straight waypoint-to-waypoint route on MapLibre / Mappls map
 */
export function syncMissionRoute(mapInstance, waypoints = [], showMissionRoute = true, isSatellite = false) {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

  const routeData = showMissionRoute ? buildRouteGeoJson(waypoints) : { type: "FeatureCollection", features: [] };

  if (routeData.features.length === 0) {
    try {
      if (map.getLayer?.(ROUTE_LINE_LAYER_ID)) map.removeLayer(ROUTE_LINE_LAYER_ID);
      if (map.getLayer?.(ROUTE_LINE_CASING_LAYER_ID)) map.removeLayer(ROUTE_LINE_CASING_LAYER_ID);
      if (map.getSource?.(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    } catch (err) {
      console.debug("[routeLayerHelper] Empty route cleanup note:", err.message);
    }
    return;
  }

  try {
    // 1. Manage GeoJSON Source
    if (!map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeData,
      });
    } else {
      map.getSource(ROUTE_SOURCE_ID).setData(routeData);
    }

    // 2. Manage Dark Casing Layer for high contrast on any background
    if (!map.getLayer(ROUTE_LINE_CASING_LAYER_ID) && map.getSource(ROUTE_SOURCE_ID)) {
      map.addLayer({
        id: ROUTE_LINE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#030712",
          "line-width": 6.5,
          "line-opacity": 0.85,
        },
      });
    }

    // 3. Manage Primary Straight Route Layer (AeroNexus Cyan #35E0FF)
    if (!map.getLayer(ROUTE_LINE_LAYER_ID) && map.getSource(ROUTE_SOURCE_ID)) {
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#35E0FF",
          "line-width": 4.2,
          "line-opacity": 0.98,
        },
      });
    }

    // 4. Enforce strict layer order (satellite -> geofence -> route)
    enforceMapLayerOrder(map);
  } catch (err) {
    console.debug("[routeLayerHelper] Route layer sync note:", err.message);
  }
}

/**
 * Generates HTML string for directional chevron marker along a straight route segment (disabled per specification)
 */
export function buildDirectionChevronHtml() {
  return "";
}

/**
 * Synchronizes Directional Chevron Markers along route segments.
 * Per specification, directional arrows/chevrons are completely removed to keep
 * the mission route visually clean: WP1 ───── WP2 ───── WP3 ───── WP4 ...
 * with ONLY the numbered waypoint markers and connecting lines.
 */
export function syncDirectionMarkers(mapInstance, waypoints = [], showMissionRoute = true, directionMarkersMapRef) {
  if (directionMarkersMapRef?.current) {
    const currentMarkers = directionMarkersMapRef.current;
    for (const [, obj] of currentMarkers.entries()) {
      try {
        obj.marker?.remove?.();
      } catch {
        // Safe ignore
      }
    }
    currentMarkers.clear();
  }

  // Ensure any existing chevron DOM elements are removed immediately
  try {
    const leftoverChevrons = document.querySelectorAll(".route-direction-chevron");
    leftoverChevrons.forEach((el) => {
      const container = el.closest(".mapboxgl-marker, .maplibregl-marker") || el;
      container.remove();
    });
  } catch {
    // Safe ignore
  }
}

/**
 * Removes all route layers and direction markers on map unmount
 */
export function removeRouteLayers(mapInstance, directionMarkersMapRef) {
  if (directionMarkersMapRef?.current) {
    for (const [, obj] of directionMarkersMapRef.current.entries()) {
      try {
        obj.marker?.remove?.();
      } catch {
        // Safe ignore
      }
    }
    directionMarkersMapRef.current.clear();
  }

  const map = getUnderlyingMap(mapInstance);
  if (!map) return;

  try {
    if (map.getLayer?.(ROUTE_LINE_LAYER_ID)) {
      map.removeLayer(ROUTE_LINE_LAYER_ID);
    }
    if (map.getLayer?.(ROUTE_LINE_CASING_LAYER_ID)) {
      map.removeLayer(ROUTE_LINE_CASING_LAYER_ID);
    }
    if (map.getSource?.(ROUTE_SOURCE_ID)) {
      map.removeSource(ROUTE_SOURCE_ID);
    }
  } catch (err) {
    console.debug("[routeLayerHelper] Layer removal note:", err.message);
  }
}
