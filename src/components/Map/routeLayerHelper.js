import { getUnderlyingMap, SATELLITE_LAYER_ID } from "./satelliteLayerHelper.js";

export const ROUTE_SOURCE_ID = "aeronexus-mission-route-source";
export const ROUTE_LINE_LAYER_ID = "aeronexus-mission-route-line";
export const ROUTE_LINE_CASING_LAYER_ID = "aeronexus-mission-route-casing";

/**
 * Calculates geodesic bearing in degrees (0 - 360) from start to end coordinate
 */
export function calculateBearing(start, end) {
  if (!start || !end) return 0;
  const sLat = (start.lat * Math.PI) / 180;
  const sLng = (start.lng * Math.PI) / 180;
  const eLat = (end.lat * Math.PI) / 180;
  const eLng = (end.lng * Math.PI) / 180;

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
  return {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
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
    .filter((wp) => typeof wp.lat === "number" && typeof wp.lng === "number")
    .map((wp) => [Number(wp.lng), Number(wp.lat)]);

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
 * Generates HTML string for directional chevron marker along a straight route segment
 */
export function buildDirectionChevronHtml(bearing = 0) {
  return `
    <div class="route-direction-chevron" style="position: relative; width: 18px; height: 18px; pointer-events: none; user-select: none; display: flex; align-items: center; justify-content: center; transform: rotate(${Math.round(bearing)}deg); transition: transform 0.1s linear;">
      <div style="width: 16px; height: 16px; border-radius: 50%; background: rgba(8, 12, 20, 0.75); border: 1px solid rgba(53, 224, 255, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.6);">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="margin-left: 1px;">
          <path d="M4 2.5L11 8L4 13.5" stroke="#35E0FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

/**
 * Synchronizes straight waypoint-to-waypoint route on MapLibre / Mappls map
 */
export function syncMissionRoute(mapInstance, waypoints = [], showMissionRoute = true, isSatellite = false) {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

  const routeData = showMissionRoute ? buildRouteGeoJson(waypoints) : { type: "FeatureCollection", features: [] };

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
          "line-width": 5.5,
          "line-opacity": 0.75,
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
          "line-width": 3.5,
          "line-opacity": 0.95,
        },
      });
    }

    // 4. Ensure layers are visible above satellite raster if satellite is enabled
    if (map.getLayer(SATELLITE_LAYER_ID) && isSatellite) {
      if (map.getLayer(ROUTE_LINE_CASING_LAYER_ID)) {
        try {
          map.moveLayer(ROUTE_LINE_CASING_LAYER_ID);
        } catch {
          // Safe ignore
        }
      }
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        try {
          map.moveLayer(ROUTE_LINE_LAYER_ID);
        } catch {
          // Safe ignore
        }
      }
    }
  } catch (err) {
    console.debug("[routeLayerHelper] Route layer sync note:", err.message);
  }
}

/**
 * Synchronizes Directional Chevron Markers placed at midpoints of straight segments
 */
export function syncDirectionMarkers(mapInstance, waypoints = [], showMissionRoute = true, directionMarkersMapRef) {
  if (!mapInstance || !window.mappls?.Marker || !directionMarkersMapRef) return;
  const currentMarkers = directionMarkersMapRef.current;

  // If fewer than 2 waypoints or route hidden, remove all direction markers
  if (!showMissionRoute || !Array.isArray(waypoints) || waypoints.length < 2) {
    for (const [, obj] of currentMarkers.entries()) {
      try {
        obj.marker?.remove?.();
      } catch {
        // Safe ignore
      }
    }
    currentMarkers.clear();
    return;
  }

  const segmentCount = waypoints.length - 1;
  const activeSegmentKeys = new Set();

  for (let i = 0; i < segmentCount; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if (!p1 || !p2 || typeof p1.lat !== "number" || typeof p2.lat !== "number") continue;

    const segmentKey = `seg-${i}`;
    activeSegmentKeys.add(segmentKey);

    const mid = calculateMidpoint(p1, p2);
    const bearing = calculateBearing(p1, p2);
    const chevronHtml = buildDirectionChevronHtml(bearing);

    const existing = currentMarkers.get(segmentKey);
    if (existing) {
      try {
        if (typeof existing.marker.setPosition === "function") {
          existing.marker.setPosition({ lat: mid.lat, lng: mid.lng });
        } else if (typeof existing.marker.setLngLat === "function") {
          existing.marker.setLngLat([mid.lng, mid.lat]);
        }

        if (existing.bearing !== Math.round(bearing)) {
          existing.bearing = Math.round(bearing);
          const el = existing.marker.getElement?.();
          if (el) {
            el.innerHTML = chevronHtml;
          }
        }
      } catch (err) {
        console.debug("[routeLayerHelper] Direction marker update note:", err.message);
      }
    } else {
      try {
        const marker = new window.mappls.Marker({
          map: mapInstance,
          position: { lat: mid.lat, lng: mid.lng },
          html: chevronHtml,
          draggable: false,
        });
        currentMarkers.set(segmentKey, { marker, bearing: Math.round(bearing) });
      } catch (err) {
        console.debug("[routeLayerHelper] Direction marker creation note:", err.message);
      }
    }
  }

  // Remove markers for segments that no longer exist (e.g. after deletion or reorder)
  for (const [key, obj] of currentMarkers.entries()) {
    if (!activeSegmentKeys.has(key)) {
      try {
        obj.marker?.remove?.();
      } catch {
        // Safe ignore
      }
      currentMarkers.delete(key);
    }
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
