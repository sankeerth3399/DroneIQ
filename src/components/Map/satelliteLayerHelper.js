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

export const ensureSatelliteLayer = (mapInstance, isSatellite = false, onDone) => {
  const map = getUnderlyingMap(mapInstance);
  if (!map || typeof map.getSource !== "function" || typeof map.addSource !== "function") return;

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
        map.addLayer({
          id: SATELLITE_LAYER_ID,
          type: "raster",
          source: SATELLITE_SOURCE_ID,
          layout: { visibility: isSatellite ? "visible" : "none" },
          paint: {
            "raster-opacity": 1,
            "raster-fade-duration": 0,
          },
        });
      }

      if (map.getLayer(SATELLITE_LAYER_ID) && isSatellite) {
        try {
          map.moveLayer(SATELLITE_LAYER_ID);
        } catch {
          // Safe ignore
        }
      }

      if (onDone) onDone(map);
    } catch (err) {
      console.warn("[SatelliteHelper] Satellite layer add note:", err.message);
    }
  };

  if (typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) {
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

        if (isSatellite) {
          try {
            targetMap.moveLayer(SATELLITE_LAYER_ID);
          } catch {
            // Safe ignore
          }
          if (polylineRef?.current && typeof polylineRef.current.setTop === "function") {
            polylineRef.current.setTop();
          }
        }
      }
    } catch (err) {
      console.debug("[SatelliteHelper] Style visibility note:", err.message);
    }
  };

  ensureSatelliteLayer(mapInstance, isSatellite, updateVisibility);
  updateVisibility(m);
};
