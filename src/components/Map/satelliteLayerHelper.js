/**
 * Satellite Layer Helper for Mappls / MapLibre
 * Manages Google hybrid raster satellite tile source and layer stacking
 */

export const SATELLITE_SOURCE_ID = "aeronexus-satellite-source";
export const SATELLITE_LAYER_ID = "aeronexus-satellite-layer";

export const getUnderlyingMap = (map) => {
  if (!map) return null;
  if (typeof map.addSource === "function" && typeof map.addLayer === "function") {
    return map;
  }
  if (map._map && typeof map._map.addSource === "function") {
    return map._map;
  }
  if (map.map && typeof map.map.addSource === "function") {
    return map.map;
  }
  return map;
};

/**
 * Strict Layer Ordering Enforcer:
 * Enforces the exact required visual hierarchy on the WebGL map canvas:
 * 1. Base satellite map (aeronexus-satellite-layer)
 * 2. Geofence polygon fill (aeronexus-geofence-fill)
 * 3. Geofence boundary line (aeronexus-geofence-line)
 * 4. Geofence preview line (aeronexus-geofence-preview-line)
 * 5. Mission route casing line (aeronexus-mission-route-casing)
 * 6. Mission route primary line (aeronexus-mission-route-line)
 * 7. Route violations line (aeronexus-violations-line)
 * HTML DOM Markers (Waypoints z-index: 30, Drone z-index: 50) naturally sit on top.
 */
export const enforceMapLayerOrder = (mapInstance) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getLayer !== "function" || typeof map.moveLayer !== "function") return;

  const layerStack = [
    SATELLITE_LAYER_ID,
    // Mappls official DigitalSky Airspace raster layers
    "airport_region_radius_0_to_5_km",
    "airport_region_radius_5_to_8_km",
    "airport_region_radius_8_to_12_km_yellow",
    "coastal_area_india_region_25km",
    "aeronexus-geofence-fill",
    "aeronexus-geofence-line",
    "aeronexus-geofence-preview-line",
    "aeronexus-mission-route-casing",
    "aeronexus-mission-route-line",
    "aeronexus-violations-line",
  ];

  for (const layerId of layerStack) {
    if (map.getLayer(layerId)) {
      try {
        map.moveLayer(layerId);
      } catch {
        // Safe ignore
      }
    }
  }
};

export const ensureSatelliteLayer = (mapInstance, isSatellite = false, onDone) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

  // Track the most recent desired satellite visibility on the map instance
  map._desiredSatelliteVisibility = Boolean(isSatellite);

  // If layer already exists, update visibility immediately
  if (map.getLayer && map.getLayer(SATELLITE_LAYER_ID)) {
    try {
      const visibility = map._desiredSatelliteVisibility ? "visible" : "none";
      if (typeof map.setLayoutProperty === "function") {
        map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", visibility);
      }
      enforceMapLayerOrder(map);
      if (onDone) onDone(map);
    } catch (err) {
      console.debug("[SatelliteHelper] Visibility update note:", err.message);
    }
    return;
  }

  const tryAdd = () => {
    try {
      if (!map.getSource(SATELLITE_SOURCE_ID)) {
        map.addSource(SATELLITE_SOURCE_ID, {
          type: "raster",
          tiles: [
            "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            "https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            "https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 22,
          attribution: "Imagery &copy; Google Maps",
        });
      }

      if (map.getSource(SATELLITE_SOURCE_ID) && !map.getLayer(SATELLITE_LAYER_ID)) {
        const activeDesired = map._desiredSatelliteVisibility !== undefined ? map._desiredSatelliteVisibility : isSatellite;
        map.addLayer({
          id: SATELLITE_LAYER_ID,
          type: "raster",
          source: SATELLITE_SOURCE_ID,
          layout: { visibility: activeDesired ? "visible" : "none" },
          paint: {
            "raster-opacity": 1,
            "raster-fade-duration": 0,
          },
        });
      }

      if (map.getLayer(SATELLITE_LAYER_ID)) {
        enforceMapLayerOrder(map);
      }

      if (onDone) onDone(map);
    } catch (err) {
      console.warn("[SatelliteHelper] Satellite layer add note:", err.message);
    }
  };

  if ((typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) || (typeof map.loaded === "function" && map.loaded())) {
    tryAdd();
  } else {
    map.once?.("styledata", tryAdd);
    map.once?.("idle", tryAdd);
    map.once?.("load", tryAdd);
  }
};

export const applyMapStyle = (mapInstance, mapStyle, polylineRef) => {
  if (!mapInstance) return;
  const isSatellite = mapStyle === "satellite";
  const m = getUnderlyingMap(mapInstance);
  if (!m) return;

  const updateVisibility = (targetMap) => {
    try {
      if (targetMap.getLayer?.(SATELLITE_LAYER_ID)) {
        targetMap.setLayoutProperty(
          SATELLITE_LAYER_ID,
          "visibility",
          isSatellite ? "visible" : "none"
        );

        enforceMapLayerOrder(targetMap);
        if (isSatellite && polylineRef?.current && typeof polylineRef.current.setTop === "function") {
          polylineRef.current.setTop();
        }
      }
    } catch (err) {
      console.debug("[SatelliteHelper] Style visibility note:", err.message);
    }
  };

  ensureSatelliteLayer(mapInstance, isSatellite, updateVisibility);
  updateVisibility(m);
};
