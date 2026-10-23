/**
 * Mappls Official Airspace Plugin & DigitalSky No-Fly Zone Layer Helper
 *
 * Manages official Mappls Web SDK Airspace Plugin integration:
 * - airport_region_radius_0_to_5_km (Airport Red Zone - No Drone Zone)
 * - airport_region_radius_5_to_8_km (Airport Yellow Zone 5-8km)
 * - airport_region_radius_8_to_12_km_yellow (Airport Yellow Zone 8-12km)
 * - coastal_area_india_region_25km (International Boundary - 25km buffer)
 *
 * Documentation: https://about.mappls.com/api/web-sdk/vector-plugin-example/Airspace/mappls-airspace-plugin
 */

import { MAPPLS_KEY } from "@/config/env.js";
import { enforceMapLayerOrder, getUnderlyingMap } from "./satelliteLayerHelper.js";

export const OFFICIAL_AIRSPACE_LAYERS = [
  { id: "airport_region_radius_0_to_5_km", name: "Airport Red (No-Fly Zone)" },
  { id: "airport_region_radius_5_to_8_km", name: "Airport Yellow [5-8]km" },
  { id: "airport_region_radius_8_to_12_km_yellow", name: "Airport Yellow [8-12]km" },
  { id: "coastal_area_india_region_25km", name: "International Boundary - 25km" },
];

export const OFFICIAL_AIRSPACE_LAYER_IDS = OFFICIAL_AIRSPACE_LAYERS.map((l) => l.id);

/**
 * Safely masks API token for logging to prevent exposing secrets.
 */
export const maskKey = (key) => {
  if (!key || typeof key !== "string") return "not-configured";
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

/**
 * Check if Mappls Airspace Plugin is loaded on window.mappls
 */
export const isAirspacePluginLoaded = () => {
  return (
    typeof window !== "undefined" &&
    Boolean(window.mappls) &&
    typeof window.mappls.airspaceLayer === "function"
  );
};

// Map of active airspace controllers per map instance to prevent duplicate instantiation
const activeAirspaceManagers = new WeakMap();

/**
 * Initializes or updates official Mappls Airspace Layer on the given map instance.
 * Follows the official API signature:
 * mappls.airspaceLayer({ key: existingMapplsKey, map: mapInstance, multiple: true })
 */
export const syncAirspaceLayer = (mapInstance, options = {}) => {
  if (!mapInstance) return null;

  const {
    visible = true,
    key = MAPPLS_KEY,
    multiple = true,
    showControl = false,
    defaultLayer = OFFICIAL_AIRSPACE_LAYER_IDS,
    onStatusChange,
  } = options;

  let manager = activeAirspaceManagers.get(mapInstance);
  if (!manager) {
    manager = {
      isInitialized: false,
      isVisible: false,
      status: "IDLE",
      cleanups: [],
    };
    activeAirspaceManagers.set(mapInstance, manager);
  }

  // 1. If visible is false, remove layers if active
  if (!visible) {
    if (manager.isVisible || manager.isInitialized) {
      try {
        if (typeof window !== "undefined" && typeof window.mappls?.airspaceRemove === "function") {
          window.mappls.airspaceRemove({ map: mapInstance });
        }
      } catch (err) {
        console.debug("[AirspaceHelper] airspaceRemove note:", err.message);
      }
      manager.isVisible = false;
      manager.status = "HIDDEN";
      onStatusChange?.({
        status: "HIDDEN",
        message: "Mappls Airspace layer hidden",
        available: isAirspacePluginLoaded(),
      });
    }
    return manager;
  }

  // 2. If visible is true:
  if (!isAirspacePluginLoaded()) {
    console.warn(
      "[AirspaceHelper] Mappls Airspace Plugin not found on window.mappls. Ensure &libraries=geoanalytics&airspacelayers is loaded in index.html."
    );
    manager.status = "UNAVAILABLE";
    onStatusChange?.({
      status: "UNAVAILABLE",
      message: "Airspace Plugin capability not detected on Mappls SDK. Requires &libraries=geoanalytics&airspacelayers.",
      available: false,
    });
    return manager;
  }

  // Clean any previous instances first to prevent duplicate overlays
  try {
    if (typeof window.mappls?.airspaceRemove === "function") {
      window.mappls.airspaceRemove({ map: mapInstance });
    }
  } catch {
    // Ignore cleanup note
  }

  const effectiveKey = key || MAPPLS_KEY;
  if (!effectiveKey) {
    console.warn("[AirspaceHelper] No Mappls API key provided for Airspace Plugin.");
    manager.status = "NO_KEY";
    onStatusChange?.({
      status: "NO_KEY",
      message: "Mappls API key is required to render official Airspace layers.",
      available: true,
    });
    return manager;
  }

  try {
    onStatusChange?.({
      status: "LOADING",
      message: "Requesting Mappls DigitalSky airspace layers...",
      available: true,
    });

    console.info(`[AirspaceHelper] Triggering official Mappls Airspace Plugin (key: ${maskKey(effectiveKey)})`);

    // Call official Mappls Airspace Plugin signature:
    // mappls.airspaceLayer({ key: existingMapplsKey, map: mapInstance, multiple: true })
    const airspaceInstance = window.mappls.airspaceLayer({
      key: effectiveKey,
      map: mapInstance,
      multiple,
      showControl: showControl ? 1 : 0,
      defaultLayer,
    });

    manager.instance = airspaceInstance;
    manager.isInitialized = true;
    manager.isVisible = true;
    manager.status = "ACTIVE";

    // Re-enforce layer stack so geofence, waypoint routes, and drone markers stay on top
    enforceMapLayerOrder(mapInstance);

    // Also listen to tile load errors (e.g. if the key requires GeoAnalytics subscription)
    const underlyingMap = getUnderlyingMap(mapInstance);
    if (underlyingMap && typeof underlyingMap.on === "function" && !manager.hasTileErrorListener) {
      manager.hasTileErrorListener = true;
      const handleError = (e) => {
        const errorText = String(e?.error?.message || e?.message || "");
        const sourceId = String(e?.sourceId || "");
        if (
          OFFICIAL_AIRSPACE_LAYER_IDS.includes(sourceId) ||
          errorText.includes("mgis-apiv2") ||
          errorText.includes("raster_map") ||
          errorText.includes("Token was not recognised") ||
          errorText.includes("401")
        ) {
          console.warn("[AirspaceHelper] Mappls Airspace tile auth note:", errorText || "Code 401");
          manager.status = "AUTH_REQUIRED";
          onStatusChange?.({
            status: "AUTH_REQUIRED",
            message: "Mappls Airspace: DigitalSky GeoAnalytics requires active license for key.",
            available: true,
          });
        }
      };
      underlyingMap.on("error", handleError);
      manager.cleanups.push(() => underlyingMap.off("error", handleError));
    }

    onStatusChange?.({
      status: "ACTIVE",
      message: "Official Mappls Airspace layers rendered (Red & Yellow Zones, 25km Boundary)",
      available: true,
      layers: defaultLayer,
    });

    return manager;
  } catch (err) {
    console.error("[AirspaceHelper] Error initializing Mappls airspace layer:", err.message);
    manager.status = "ERROR";
    onStatusChange?.({
      status: "ERROR",
      message: `Failed to load Mappls Airspace layer: ${err.message}`,
      available: true,
    });
    return manager;
  }
};

/**
 * Completely tears down airspace layers and event listeners for a map instance.
 */
export const removeAirspaceLayer = (mapInstance) => {
  if (!mapInstance) return;
  const manager = activeAirspaceManagers.get(mapInstance);
  if (manager) {
    manager.cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });
    manager.cleanups = [];
    manager.isInitialized = false;
    manager.isVisible = false;
    activeAirspaceManagers.delete(mapInstance);
  }

  try {
    if (typeof window !== "undefined" && typeof window.mappls?.airspaceRemove === "function") {
      window.mappls.airspaceRemove({ map: mapInstance });
    }
  } catch (err) {
    console.debug("[AirspaceHelper] Airspace remove error:", err.message);
  }
};
