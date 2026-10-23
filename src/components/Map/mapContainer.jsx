import { useEffect, useRef, useState, useId, useMemo, useCallback } from "react";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import {
  OPERATIONAL_MAP_ZOOM,
  FALLBACK_DRONE_LOCATION,
  PositionSource,
  isValidGpsCoordinate,
  TELEMETRY_STALE_THRESHOLD_MS,
} from "@/services/telemetry/telemetryTypes.js";
import { resolveInitialMapState } from "@/config/mapConfig.js";
import {
  ensureSatelliteLayer,
  applyMapStyle,
  getUnderlyingMap,
  enforceMapLayerOrder,
} from "./satelliteLayerHelper.js";
import {
  buildDroneMarkerHtml,
  updateDroneMarkerDom,
  buildSimulatedDroneMarkerHtml,
  updateSimulatedDroneMarkerDom,
} from "./droneMarkerHelper.js";
import { buildWaypointMarkerHtml } from "./waypointMarkerHelper.js";
import {
  syncGeofenceLayers,
  removeGeofenceLayers,
  buildGeofenceVertexMarkerHtml,
  GEOFENCE_FILL_LAYER_ID,
  GEOFENCE_LINE_LAYER_ID,
  GEOFENCE_PREVIEW_LINE_LAYER_ID,
} from "./geofenceLayerHelper.js";
import {
  syncMissionRoute,
  syncDirectionMarkers,
  removeRouteLayers,
  syncCompletedRoute,
} from "./routeLayerHelper.js";
import {
  syncAirspaceLayer,
  removeAirspaceLayer,
} from "./airspaceLayerHelper.js";
import { useMission } from "@/hooks/useMission.js";
import { isPointInsideGeofence } from "@/utils/geofence.js";
import MapControls from "./MapControls.jsx";

const normalizeLongitude = (lng) => {
  if (typeof lng !== "number" || isNaN(lng)) return FALLBACK_DRONE_LOCATION.longitude;
  if (lng >= -180 && lng <= 180) return Number(lng.toFixed(6));
  const normalized = ((lng + 180) % 360 + 360) % 360 - 180;
  return Number(normalized.toFixed(6));
};

const MapContainer = ({
  mapStyle = "normal",
  onMapStyleChange,
  showStyleToggle,
  telemetry: propTelemetry,
  showDrones = true,
  waypoints = [],
  selectedWaypointId = null,
  onWaypointSelect,
  onWaypointDrag,
  onWaypointDragEnd,
  onMapClick,
  isPlacingWaypoint = false,
  showMissionRoute = true,
  geofence = null,
  geofenceEditHover = null,
  isDrawingGeofence = false,
  isEditingGeofence = false,
  isClosedGeofence = undefined,
  selectedGeofenceVertexId = null,
  onGeofenceVertexSelect,
  onGeofenceVertexDrag,
  onGeofenceVertexDragEnd,
  onGeofenceEditHover,
  onGeofenceClick,
  routeViolations = [],
  invalidClickPoint = null,
  followDrone = false,
  pageType = "fly",
  initialCenter: propInitialCenter = null,
  initialZoom: propInitialZoom = null,
  onDroneSelect,
  simulatedDrone = null,
  followSimulatedDrone = false,
  completedCoordinates = [],
  activeSimWaypointId = null,
  showAirspace = false,
  onAirspaceStatusChange = null,
  showAirspaceToggle = false,
  onAirspaceToggle = null,
  showControls = true,
  controlsPosition = "top-right",
}) => {
  const { currentProjectId, currentProject } = useMission();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const simMarkerRef = useRef(null);
  const fleetMarkersRef = useRef(new Map());
  const onDroneSelectRef = useRef(onDroneSelect);
  const markerRotatorRef = useRef(null);
  const invalidMarkerRef = useRef(null);
  const geofenceInsertionMarkerRef = useRef(null);
  const autoId = useId();
  const mapId = `mappls-map-${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markerScalerRef = useRef(null);
  const polylineRef = useRef(null);
  const mapStyleRef = useRef(mapStyle);
  const [internalMapStyle, setInternalMapStyle] = useState(mapStyle);

  useEffect(() => {
    setInternalMapStyle(mapStyle);
  }, [mapStyle]);

  const activeMapStyle = mapStyle || internalMapStyle;
  mapStyleRef.current = activeMapStyle;

  const handleMapStyleSwitch = useCallback((newStyle) => {
    setInternalMapStyle(newStyle);
    mapStyleRef.current = newStyle;
    applyMapStyle(mapRef.current, newStyle, polylineRef);
    if (typeof onMapStyleChange === "function") {
      onMapStyleChange(newStyle);
    }
  }, [onMapStyleChange]);

  const [sdkAvailable, setSdkAvailable] = useState(() => typeof window !== "undefined" && Boolean(window.mappls));
  const [mapReady, setMapReady] = useState(false);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);
  const scrollZoomEnabledRef = useRef(false);
  scrollZoomEnabledRef.current = scrollZoomEnabled;
  const [radarScale, setRadarScale] = useState(1.0);

  const effectivePageType = useMemo(() => {
    if (pageType) return String(pageType).toLowerCase().trim();
    if (isDrawingGeofence || isEditingGeofence) return "geofence";
    if (isPlacingWaypoint || (waypoints && waypoints.length > 0)) return "waypoints";
    return "fly";
  }, [pageType, isDrawingGeofence, isEditingGeofence, isPlacingWaypoint, waypoints]);

  const {
    telemetry: contextTelemetry,
    selectedDroneId,
    fleetTelemetry,
    registeredDrones,
    activeDrone,
    selectDrone,
    connectionState: telemetryConnectionState,
    connectionState: contextConnectionState,
    isLive: contextIsLive,
    isStale: contextIsStale,
  } = useTelemetry();

  // Single source of truth: prioritize passed active telemetry
  const telemetry = propTelemetry || contextTelemetry;
  const droneCallsign = selectedDroneId || activeDrone?.id || "DR-001";

  // Check connection, staleness, and GPS validity
  const isDroneConnected = Boolean(
    telemetry?.droneConnected !== undefined
      ? telemetry.droneConnected
      : (contextIsLive || contextConnectionState === "AUTHENTICATED")
  );

  const isTelemetryStale = Boolean(
    telemetry?.isStale !== undefined
      ? telemetry.isStale
      : (contextIsStale || contextConnectionState === "STALE")
  );

  const hasValidGps = isValidGpsCoordinate(telemetry?.latitude, telemetry?.longitude);
  const hasLiveDroneLocation = Boolean(
    isDroneConnected &&
    !isTelemetryStale &&
    hasValidGps &&
    telemetry?.positionSource === PositionSource.LIVE
  );

  useEffect(() => {
    onDroneSelectRef.current = onDroneSelect;
  }, [onDroneSelect]);

  const bindDashboardDroneSelect = useCallback((marker, droneId) => {
    if (!marker) return;
    const handleSelect = (event) => {
      event?.stopPropagation?.();
      if (onDroneSelectRef.current) {
        onDroneSelectRef.current(droneId);
      } else {
        selectDrone(droneId);
      }
    };
    if (typeof marker.addListener === "function") {
      marker.addListener("click", handleSelect);
    } else if (typeof marker.on === "function") {
      marker.on("click", handleSelect);
    } else {
      setTimeout(() => marker.getElement?.()?.addEventListener("click", handleSelect), 60);
    }
  }, [selectDrone]);

  // Position source resolution: prioritize LIVE real drone GPS, fallback to Hyderabad for development
  const positionSource = hasLiveDroneLocation
    ? PositionSource.LIVE
    : PositionSource.HYDERABAD_FALLBACK;

  const activeLat = hasValidGps
    ? Number(telemetry.latitude)
    : FALLBACK_DRONE_LOCATION.latitude;
  const activeLng = hasValidGps
    ? Number(telemetry.longitude)
    : FALLBACK_DRONE_LOCATION.longitude;
  const heading = typeof telemetry?.heading === "number" ? telemetry.heading : 0;

  // Smoothing refs
  const currentPosRef = useRef({ lat: activeLat, lng: activeLng });
  const targetPosRef = useRef({ lat: activeLat, lng: activeLng });
  const renderedHeadingRef = useRef(heading);
  const trailCoordsRef = useRef([]);
  const hasHadFirstFixRef = useRef(false);
  const userHasPannedRef = useRef(false);
  const prevPositionSourceRef = useRef(positionSource);
  const isDrawingOrEditingGeofence = isDrawingGeofence || isEditingGeofence;

  // Helper to ensure DOM rotator and scaler refs are attached
  const attachMarkerDomRefs = useCallback(() => {
    setTimeout(() => {
      const el = markerRef.current?.getElement?.() || document.getElementById(mapId);
      if (el) {
        markerRotatorRef.current = el.querySelector(".drone-marker-rotator");
        markerScalerRef.current = el.querySelector(".drone-marker-scaler");
      }
      if (markerRotatorRef.current) {
        markerRotatorRef.current.style.transform = `rotate(${renderedHeadingRef.current}deg)`;
      }
    }, 40);
  }, [mapId]);

  // Keep targetPosRef up to date with active coordinates
  useEffect(() => {
    targetPosRef.current = { lat: activeLat, lng: activeLng };
    if (!Number.isFinite(currentPosRef.current.lat)) {
      currentPosRef.current = { lat: activeLat, lng: activeLng };
    }
  }, [activeLat, activeLng]);

  // Dynamic marker options derived from registered drone profile and callsign
  const activeMarkerOptions = useMemo(() => {
    const regDrone =
      (registeredDrones || []).find((d) => d.id === droneCallsign || d.droneId === droneCallsign) || activeDrone;
    return {
      name: regDrone?.name || null,
      selected: true,
    };
  }, [
    registeredDrones,
    droneCallsign,
    activeDrone,
  ]);

  // Synchronize Drone Marker & Camera Transitions (Live vs Hyderabad Fallback)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    const prevSource = prevPositionSourceRef.current;
    prevPositionSourceRef.current = positionSource;

    // SCENARIO A: LIVE REAL DRONE GPS AVAILABLE
    if (positionSource === PositionSource.LIVE) {
      targetPosRef.current = { lat: activeLat, lng: activeLng };

      // Transition from HYDERABAD_FALLBACK to LIVE (First real live GPS fix)
      if (!hasHadFirstFixRef.current || prevSource === PositionSource.HYDERABAD_FALLBACK) {
        hasHadFirstFixRef.current = true;
        currentPosRef.current = { lat: activeLat, lng: activeLng };
        trailCoordsRef.current = [{ lat: activeLat, lng: activeLng }];

        // 1. Place or move existing AeroNexus drone marker at exact live coordinates
        if (!markerRef.current && typeof window.mappls.Marker === "function") {
          try {
            markerRef.current = new window.mappls.Marker({
              map,
              position: { lat: activeLat, lng: activeLng },
              html: buildDroneMarkerHtml(droneCallsign, heading, activeMarkerOptions),
            });
            if (!showDrones && markerRef.current) {
              markerRef.current.getElement?.()?.style?.setProperty("display", "none");
            }
            bindDashboardDroneSelect(markerRef.current, droneCallsign);
            attachMarkerDomRefs();
          } catch (err) {
            console.warn("[MapContainer] Marker creation error:", err.message);
          }
        } else if (markerRef.current) {
          try {
            if (typeof markerRef.current.setPosition === "function") {
              markerRef.current.setPosition({ lat: activeLat, lng: activeLng });
            } else if (typeof markerRef.current.setLngLat === "function") {
              markerRef.current.setLngLat([activeLng, activeLat]);
            }
            updateDroneMarkerDom(markerRef.current.getElement?.(), droneCallsign, heading, activeMarkerOptions);
            if (markerRef.current.getElement?.()) {
              markerRef.current.getElement().style.display = showDrones ? "block" : "none";
            }
          } catch {
            // Safe ignore
          }
        }

        // 2. Center map on exact live GPS coordinate and zoom into operational level (15) ONLY for Fly page
        if (effectivePageType === "fly" && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
          try {
            if (typeof map.flyTo === "function") {
              map.flyTo({
                center: { lat: activeLat, lng: activeLng },
                zoom: OPERATIONAL_MAP_ZOOM,
                duration: 1200,
              });
            } else if (typeof map.setCenter === "function") {
              map.setCenter({ lat: activeLat, lng: activeLng });
              map.setZoom(OPERATIONAL_MAP_ZOOM);
            }
          } catch (err) {
            console.debug("[MapContainer] Camera transition error:", err.message);
          }
        }
      } else {
        // Subsequent continuous live GPS updates
        if (!markerRef.current && typeof window.mappls.Marker === "function") {
          try {
            markerRef.current = new window.mappls.Marker({
              map,
              position: { lat: activeLat, lng: activeLng },
              html: buildDroneMarkerHtml(droneCallsign, heading, activeMarkerOptions),
            });
            if (!showDrones && markerRef.current) {
              markerRef.current.getElement?.()?.style?.setProperty("display", "none");
            }
            bindDashboardDroneSelect(markerRef.current, droneCallsign);
            attachMarkerDomRefs();
          } catch (err) {
            console.warn("[MapContainer] Marker re-creation error:", err.message);
          }
        } else if (markerRef.current) {
          try {
            if (typeof markerRef.current.setPosition === "function") {
              markerRef.current.setPosition({ lat: activeLat, lng: activeLng });
            } else if (typeof markerRef.current.setLngLat === "function") {
              markerRef.current.setLngLat([activeLng, activeLat]);
            }
            updateDroneMarkerDom(markerRef.current.getElement?.(), droneCallsign, heading, activeMarkerOptions);
            if (markerRef.current.getElement?.()) {
              markerRef.current.getElement().style.display = showDrones ? "block" : "none";
            }
          } catch {
            // Safe ignore
          }
        }

        // Follow drone ONLY if followDrone is enabled, user hasn't panned, and not drawing geofence
        if (followDrone && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
          try {
            if (typeof map.panTo === "function") {
              map.panTo({ lat: activeLat, lng: activeLng });
            } else if (typeof map.setCenter === "function") {
              map.setCenter({ lat: activeLat, lng: activeLng });
            }
          } catch {
            // Safe ignore
          }
        }
      }
    } else {
      // SCENARIO B: HYDERABAD FALLBACK (Disconnected or no valid live GPS)
      // When live telemetry transitions to disconnected or stale:
      // The camera remains undisturbed where the user had it. DO NOT fly to [20, 0]!
      if (prevSource === PositionSource.LIVE || hasHadFirstFixRef.current) {
        hasHadFirstFixRef.current = false;

        // Clear polyline trail
        if (polylineRef.current) {
          try {
            polylineRef.current.remove?.();
          } catch {
            // Safe ignore
          }
          polylineRef.current = null;
        }
        trailCoordsRef.current = [];
      }

      // Ensure marker is placed or updated at active coordinates (starting at Hyderabad fallback location)
      if (!markerRef.current && typeof window.mappls.Marker === "function") {
        try {
          markerRef.current = new window.mappls.Marker({
            map,
            position: { lat: activeLat, lng: activeLng },
            html: buildDroneMarkerHtml(droneCallsign, heading, activeMarkerOptions),
          });
          if (!showDrones && markerRef.current) {
            markerRef.current.getElement?.()?.style?.setProperty("display", "none");
          }
          bindDashboardDroneSelect(markerRef.current, droneCallsign);
          attachMarkerDomRefs();
        } catch (err) {
          console.warn("[MapContainer] Marker creation error:", err.message);
        }
      } else if (markerRef.current) {
        try {
          if (typeof markerRef.current.setPosition === "function") {
            markerRef.current.setPosition({ lat: activeLat, lng: activeLng });
          } else if (typeof markerRef.current.setLngLat === "function") {
            markerRef.current.setLngLat([activeLng, activeLat]);
          }
          updateDroneMarkerDom(markerRef.current.getElement?.(), droneCallsign, heading, activeMarkerOptions);
          if (markerRef.current.getElement?.()) {
            markerRef.current.getElement().style.display = showDrones ? "block" : "none";
          }
        } catch {
          // Safe ignore
        }
      }

      // Follow drone if followDrone is enabled, user hasn't panned, and not drawing geofence
      if (followDrone && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
        try {
          if (typeof map.panTo === "function") {
            map.panTo({ lat: activeLat, lng: activeLng });
          } else if (typeof map.setCenter === "function") {
            map.setCenter({ lat: activeLat, lng: activeLng });
          }
        } catch {
          // Safe ignore
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Heading updates decoupled to prevent camera repositioning
  }, [
    positionSource,
    isDroneConnected,
    isTelemetryStale,
    activeLat,
    activeLng,
    droneCallsign,
    followDrone,
    isDrawingOrEditingGeofence,
    isPlacingWaypoint,
    attachMarkerDomRefs,
    bindDashboardDroneSelect,
    effectivePageType,
    hasLiveDroneLocation,
  ]);

  // Synchronize Simulation Drone Marker and Completed Route Layer (Section 3 & 5: Completely separate from real drone)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    const isSimActive = Boolean(
      simulatedDrone?.active &&
      typeof simulatedDrone.lat === "number" &&
      typeof simulatedDrone.lng === "number" &&
      !isNaN(simulatedDrone.lat) &&
      !isNaN(simulatedDrone.lng)
    );

    if (isSimActive) {
      const simLat = simulatedDrone.lat;
      const simLng = simulatedDrone.lng;
      const simHeading = typeof simulatedDrone.heading === "number" ? simulatedDrone.heading : 0;
      const simAlt = typeof simulatedDrone.altitude === "number" ? simulatedDrone.altitude : 50;
      const simLabel = simulatedDrone.label || "SIMULATION";

      if (!simMarkerRef.current && typeof window.mappls.Marker === "function") {
        try {
          simMarkerRef.current = new window.mappls.Marker({
            map,
            position: { lat: simLat, lng: simLng },
            html: buildSimulatedDroneMarkerHtml(simHeading, simAlt, simLabel),
          });
        } catch (err) {
          console.debug("[MapContainer] Sim marker creation note:", err.message);
        }
      } else if (simMarkerRef.current) {
        try {
          if (typeof simMarkerRef.current.setPosition === "function") {
            simMarkerRef.current.setPosition({ lat: simLat, lng: simLng });
          } else if (typeof simMarkerRef.current.setLngLat === "function") {
            simMarkerRef.current.setLngLat([simLng, simLat]);
          }
          updateSimulatedDroneMarkerDom(
            simMarkerRef.current.getElement?.(),
            simHeading,
            simAlt,
            simLabel
          );
          if (simMarkerRef.current.getElement?.()) {
            simMarkerRef.current.getElement().style.display = "block";
          }
        } catch {
          // Safe ignore
        }
      }

      // Smoothly follow simulated drone if enabled
      if (followSimulatedDrone) {
        try {
          if (typeof map.panTo === "function") {
            map.panTo({ lat: simLat, lng: simLng });
          } else if (typeof map.setCenter === "function") {
            map.setCenter({ lat: simLat, lng: simLng });
          }
        } catch {
          // Safe ignore
        }
      }
    } else {
      if (simMarkerRef.current) {
        try {
          simMarkerRef.current.remove?.();
        } catch {
          // Safe ignore
        }
        simMarkerRef.current = null;
      }
    }

    // Synchronize completed simulation route polyline
    syncCompletedRoute(map, isSimActive ? (completedCoordinates || []) : []);
  }, [
    simulatedDrone?.lat,
    simulatedDrone?.lng,
    simulatedDrone?.heading,
    simulatedDrone?.altitude,
    simulatedDrone?.active,
    simulatedDrone?.label,
    followSimulatedDrone,
    completedCoordinates,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const canRenderFleet = map && window.mappls?.Marker && telemetryConnectionState === "AUTHENTICATED";
    const liveDrones = new Map();

    if (canRenderFleet) {
      const now = Date.now();
      Object.entries(fleetTelemetry || {}).forEach(([droneId, droneTelemetry]) => {
        const receivedAt = droneTelemetry?._telemetryReceivedAt;
        if (
          droneId === selectedDroneId ||
          !droneTelemetry?._isRealTelemetry ||
          droneTelemetry?.positionSource !== PositionSource.LIVE ||
          !isValidGpsCoordinate(droneTelemetry?.latitude, droneTelemetry?.longitude) ||
          !Number.isFinite(receivedAt) ||
          now - receivedAt > TELEMETRY_STALE_THRESHOLD_MS
        ) {
          return;
        }
        liveDrones.set(droneId, droneTelemetry);
      });
    }

    for (const [droneId, markerRecord] of fleetMarkersRef.current) {
      if (!liveDrones.has(droneId)) {
        markerRecord.marker?.remove?.();
        fleetMarkersRef.current.delete(droneId);
      }
    }

    liveDrones.forEach((droneTelemetry, droneId) => {
      const regDrone = (registeredDrones || []).find((d) => d.id === droneId || d.droneId === droneId);
      const position = {
        lat: Number(droneTelemetry.latitude),
        lng: Number(droneTelemetry.longitude),
      };
      const heading = typeof droneTelemetry.heading === "number" ? droneTelemetry.heading : 0;
      let markerRecord = fleetMarkersRef.current.get(droneId);
      const fleetMarkerOptions = {
        name: regDrone?.name || droneTelemetry.name || null,
        selected: false,
      };

      if (!markerRecord) {
        try {
          const marker = new window.mappls.Marker({
            map,
            position,
            html: buildDroneMarkerHtml(droneId, heading, fleetMarkerOptions),
          });
          if (!showDrones && marker) {
            marker.getElement?.()?.style?.setProperty("display", "none");
          }
          const handleSelect = (event) => {
            event?.stopPropagation?.();
            if (onDroneSelectRef.current) {
              onDroneSelectRef.current(droneId);
            } else {
              selectDrone(droneId);
            }
          };
          if (typeof marker.addListener === "function") {
            marker.addListener("click", handleSelect);
          } else if (typeof marker.on === "function") {
            marker.on("click", handleSelect);
          }
          markerRecord = { marker, handleSelect };
          fleetMarkersRef.current.set(droneId, markerRecord);
        } catch (err) {
          console.warn("[MapContainer] Fleet marker creation error:", err.message);
          return;
        }
      } else {
        try {
          if (typeof markerRecord.marker.setPosition === "function") {
            markerRecord.marker.setPosition(position);
          } else if (typeof markerRecord.marker.setLngLat === "function") {
            markerRecord.marker.setLngLat([position.lng, position.lat]);
          }
          updateDroneMarkerDom(markerRecord.marker.getElement?.(), droneId, heading, fleetMarkerOptions);
          if (markerRecord.marker.getElement?.()) {
            markerRecord.marker.getElement().style.display = showDrones ? "block" : "none";
          }
        } catch (err) {
          console.debug("[MapContainer] Fleet marker update note:", err.message);
        }
      }
    });
  }, [
    effectivePageType,
    fleetTelemetry,
    registeredDrones,
    showDrones,
    selectedDroneId,
    selectDrone,
    sdkAvailable,
    mapReady,
    telemetryConnectionState,
  ]);

  useEffect(() => () => {
    for (const { marker } of fleetMarkersRef.current.values()) {
      marker?.remove?.();
    }
    fleetMarkersRef.current.clear();
    if (simMarkerRef.current) {
      try {
        simMarkerRef.current.remove?.();
      } catch {
        // Safe ignore
      }
      simMarkerRef.current = null;
    }
  }, []);

  // Synchronize showDrones visibility with active marker and fleet markers
  useEffect(() => {
    const displayVal = showDrones ? "block" : "none";
    if (markerRef.current?.getElement?.()) {
      markerRef.current.getElement().style.display = displayVal;
    }
    fleetMarkersRef.current.forEach(({ marker }) => {
      if (marker?.getElement?.()) {
        marker.getElement().style.display = displayVal;
      }
    });
  }, [showDrones]);

  // Dynamic update of active marker label whenever options or callsign changes
  useEffect(() => {
    if (markerRef.current?.getElement?.()) {
      updateDroneMarkerDom(markerRef.current.getElement(), droneCallsign, heading, activeMarkerOptions);
    }
  }, [droneCallsign, heading, activeMarkerOptions]);

  useEffect(() => {
    mapStyleRef.current = activeMapStyle;
    applyMapStyle(mapRef.current, activeMapStyle, polylineRef);
  }, [activeMapStyle]);

  // Mission Planning Waypoint Refs & Dynamic Synchronization
  const geofenceCoords = useMemo(() => {
    let raw = [];
    if (Array.isArray(geofence)) raw = geofence;
    else if (Array.isArray(geofence?.vertices)) raw = geofence.vertices;
    else if (Array.isArray(geofence?.polygon)) raw = geofence.polygon;
    else if (Array.isArray(geofence?.coordinates)) raw = geofence.coordinates;

    if (!Array.isArray(raw)) return [];

    return raw
      .map((pt, idx) => {
        let lat = 0;
        let lng = 0;
        if (Array.isArray(pt) && pt.length >= 2) {
          const v0 = Number(pt[0]);
          const v1 = Number(pt[1]);
          if (isNaN(v0) || isNaN(v1)) return null;
          if (Math.abs(v0) > Math.abs(v1)) {
            lng = v0;
            lat = v1;
          } else {
            lat = v0;
            lng = v1;
          }
        } else if (pt && typeof pt === "object") {
          const rawLat = pt.lat ?? pt.latitude;
          const rawLng = pt.lng ?? pt.longitude;
          lat = typeof rawLat === "number" ? rawLat : Number(rawLat);
          lng = typeof rawLng === "number" ? rawLng : Number(rawLng);
          if (isNaN(lat) || isNaN(lng)) return null;
        } else {
          return null;
        }

        const id = pt?.id || `vertex-${idx + 1}`;
        return {
          ...(typeof pt === "object" && !Array.isArray(pt) ? pt : {}),
          id,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
        };
      })
      .filter(Boolean);
  }, [geofence]);

  const waypointMarkersRef = useRef(new Map());
  const directionMarkersRef = useRef(new Map());
  const draggingWaypointIdRef = useRef(null);
  const selectedWaypointIdRef = useRef(selectedWaypointId);
  const waypointsRef = useRef(waypoints);

  useEffect(() => {
    selectedWaypointIdRef.current = selectedWaypointId;
  }, [selectedWaypointId]);

  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  const missionRouteStateRef = useRef({
    waypoints,
    showMissionRoute,
    isSatellite: mapStyle === "satellite",
    geofenceCoords,
    routeViolations: waypoints.length >= 2 ? routeViolations : [],
    isDrawingGeofence,
    isClosedGeofence,
  });
  const onMapClickRef = useRef(onMapClick);
  const onWaypointSelectRef = useRef(onWaypointSelect);
  const onWaypointDragRef = useRef(onWaypointDrag);
  const onWaypointDragEndRef = useRef(onWaypointDragEnd);

  // Toggle Scroll-to-Zoom Handler
  const handleToggleScrollZoom = useCallback(() => {
    setScrollZoomEnabled((prev) => !prev);
  }, []);

  // Zoom In Handler (clamped to max zoom 19, decouples auto-centering)
  const handleZoomIn = useCallback(() => {
    userHasPannedRef.current = true;
    const map = mapRef.current;
    const under = getUnderlyingMap(map);
    if (under) {
      const currentZoom = typeof under.getZoom === "function" ? under.getZoom() : (map?.getZoom?.() || 15);
      const targetZoom = Math.min(19, Math.round(currentZoom + 1));
      if (typeof under.zoomTo === "function") {
        under.zoomTo(targetZoom, { duration: 250 });
      } else if (typeof under.setZoom === "function") {
        under.setZoom(targetZoom);
      }
    } else if (map && typeof map.setZoom === "function") {
      const currentZoom = typeof map.getZoom === "function" ? map.getZoom() : 15;
      map.setZoom(Math.min(19, Math.round(currentZoom + 1)));
    } else {
      setRadarScale((prev) => Math.min(3.0, prev * 1.25));
    }
  }, []);

  // Zoom Out Handler (clamped to min 4 to prevent resetting to world view)
  const handleZoomOut = useCallback(() => {
    userHasPannedRef.current = true;
    const map = mapRef.current;
    const under = getUnderlyingMap(map);
    if (under) {
      const currentZoom = typeof under.getZoom === "function" ? under.getZoom() : (map?.getZoom?.() || 15);
      const targetZoom = Math.max(4, Math.round(currentZoom - 1));
      if (typeof under.zoomTo === "function") {
        under.zoomTo(targetZoom, { duration: 250 });
      } else if (typeof under.setZoom === "function") {
        under.setZoom(targetZoom);
      }
    } else if (map && typeof map.setZoom === "function") {
      const currentZoom = typeof map.getZoom === "function" ? map.getZoom() : 15;
      map.setZoom(Math.max(4, Math.round(currentZoom - 1)));
    } else {
      setRadarScale((prev) => Math.max(0.6, prev / 1.25));
    }
  }, []);

  // Reset View / Fit Mission Handler
  const handleResetView = useCallback(() => {
    userHasPannedRef.current = false;
    setRadarScale(1.0);
    const { center, zoom } = resolveInitialMapState({
      pageType: effectivePageType,
      hasLiveDroneLocation,
      activeLat,
      activeLng,
      geofenceCoords,
      waypoints,
      customCenter: propInitialCenter,
      customZoom: propInitialZoom,
    });
    const lat = Number(center[0] ?? center.lat ?? FALLBACK_DRONE_LOCATION.latitude);
    const lng = Number(center[1] ?? center.lng ?? FALLBACK_DRONE_LOCATION.longitude);

    const map = mapRef.current;
    const under = getUnderlyingMap(map);
    if (under) {
      if (typeof under.flyTo === "function") {
        under.flyTo({ center: [lng, lat], zoom, duration: 600 });
      } else if (typeof under.setCenter === "function" && typeof under.setZoom === "function") {
        under.setCenter([lng, lat]);
        under.setZoom(zoom);
      }
    } else if (map) {
      if (typeof map.setCenter === "function") {
        map.setCenter({ lat, lng });
      }
      if (typeof map.setZoom === "function") {
        map.setZoom(zoom);
      }
    }
  }, [
    effectivePageType,
    hasLiveDroneLocation,
    activeLat,
    activeLng,
    geofenceCoords,
    waypoints,
    propInitialCenter,
    propInitialZoom,
  ]);

  // Synchronize scroll-to-zoom setting with Mappls / MapLibre map instance
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const under = getUnderlyingMap(map);

    if (scrollZoomEnabled) {
      if (typeof under?.scrollZoom?.enable === "function") under.scrollZoom.enable();
      if (typeof map.scrollZoom?.enable === "function") map.scrollZoom.enable();
    } else {
      if (typeof under?.scrollZoom?.disable === "function") under.scrollZoom.disable();
      if (typeof map.scrollZoom?.disable === "function") map.scrollZoom.disable();
    }
  }, [scrollZoomEnabled, mapReady]);

  // Non-intrusive Wheel Handler (Ctrl+Wheel zooms map, normal wheel scrolls webpage) & ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // If Scroll to Zoom is disabled (the default safe mode):
      if (!scrollZoomEnabledRef.current) {
        if (e.ctrlKey || e.metaKey) {
          // Explicit Ctrl + Wheel: smoothly zoom the map under the pointer without enabling permanent scroll-to-zoom
          e.preventDefault();
          e.stopPropagation();
          const map = mapRef.current;
          const under = getUnderlyingMap(map);
          if (under) {
            const currentZoom = typeof under.getZoom === "function" ? under.getZoom() : 15;
            const delta = e.deltaY < 0 ? 0.5 : -0.5;
            const targetZoom = Math.max(4, Math.min(19, currentZoom + delta));
            if (typeof under.zoomTo === "function") {
              under.zoomTo(targetZoom, { duration: 100 });
            } else if (typeof under.setZoom === "function") {
              under.setZoom(targetZoom);
            }
          } else {
            setRadarScale((prev) => Math.max(0.6, Math.min(3.0, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
          }
        }
        // When Ctrl is NOT pressed: DO NOT preventDefault or stopPropagation!
        // Allow the event to bubble naturally so the webpage scrolls smoothly without map zoom interference!
      } else {
        // When Scroll to Zoom IS enabled:
        // Prevent simultaneous page scroll jumping while zooming the map
        e.stopPropagation();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    // Dimension resize observer to keep map canvas updated without resetting camera
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const map = mapRef.current;
        if (map) {
          try {
            map.resize?.();
            const under = getUnderlyingMap(map);
            if (under && under !== map) under.resize?.();
          } catch {
            // Safe ignore
          }
        }
      });
      ro.observe(container);
    }

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (ro) ro.disconnect();
    };
  }, []);

  // Geofence Dynamic Synchronization Refs
  const geofenceMarkersRef = useRef(new Map());
  const onGeofenceVertexDragRef = useRef(onGeofenceVertexDrag);
  const onGeofenceVertexDragEndRef = useRef(onGeofenceVertexDragEnd);
  const onGeofenceVertexSelectRef = useRef(onGeofenceVertexSelect);
  const onGeofenceEditHoverRef = useRef(onGeofenceEditHover);
  const onGeofenceClickRef = useRef(onGeofenceClick);

  useEffect(() => {
    onGeofenceClickRef.current = onGeofenceClick;
  }, [onGeofenceClick]);

  useEffect(() => {
    missionRouteStateRef.current = {
      waypoints,
      showMissionRoute,
      isSatellite: mapStyle === "satellite",
      geofenceCoords,
      routeViolations: waypoints.length >= 2 ? routeViolations : [],
      isDrawingGeofence,
      isClosedGeofence,
    };
  }, [
    waypoints,
    showMissionRoute,
    mapStyle,
    geofenceCoords,
    routeViolations,
    isDrawingGeofence,
    isClosedGeofence,
  ]);

  const syncCurrentWaypointMarkers = (map, explicitWaypoints) => {
    const targetMap = map || mapRef.current;
    if (!targetMap || !window.mappls) return;

    const currentMarkers = waypointMarkersRef.current;
    const targetWps = explicitWaypoints || waypointsRef.current || waypoints || [];
    const nextIds = new Set(targetWps.map((w, idx) => w.id || `wp-${idx + 1}`));

    // 1. Remove deleted markers
    for (const [id, markerObj] of currentMarkers.entries()) {
      if (!nextIds.has(id)) {
        try {
          markerObj.marker?.remove?.();
        } catch {
          // Safe ignore
        }
        currentMarkers.delete(id);
      }
    }

    // 2. Add or update active waypoint markers
    targetWps.forEach((wp, index) => {
      const wId = wp.id || `wp-${index + 1}`;
      const isSelected = wId === selectedWaypointIdRef.current;
      const existing = currentMarkers.get(wId);

      const seqNum = wp.seq ?? wp.sequence ?? index + 1;
      const markerWp = {
        ...wp,
        id: wId,
        seq: seqNum,
        sequence: seqNum,
        label: `WP${seqNum}`,
      };

      if (existing) {
        try {
          if (draggingWaypointIdRef.current !== wId) {
            if (typeof existing.marker.setPosition === "function") {
              existing.marker.setPosition({ lat: wp.lat, lng: wp.lng });
            } else if (typeof existing.marker.setLngLat === "function") {
              existing.marker.setLngLat([wp.lng, wp.lat]);
            }
          }

          const newHtml = buildWaypointMarkerHtml(markerWp, isSelected);
          if (existing.html !== newHtml) {
            existing.html = newHtml;
            const el = existing.marker.getElement?.();
            if (el) el.innerHTML = newHtml;
          }
        } catch (err) {
          console.debug("[MapContainer] Waypoint marker update note:", err.message);
        }
      } else {
        try {
          const markerHtml = buildWaypointMarkerHtml(markerWp, isSelected);
          const marker = new window.mappls.Marker({
            map: targetMap,
            position: { lat: wp.lat, lng: wp.lng },
            html: markerHtml,
            draggable: Boolean(onWaypointDragRef.current),
          });

          const el = marker.getElement?.();
          if (el) {
            el.style.zIndex = isSelected ? "45" : "35";
          }

          const handleDrag = () => {
            try {
              draggingWaypointIdRef.current = wId;
              const pos = marker.getPosition?.() || marker.getLngLat?.();
              if (pos) {
                const pLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                const pLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                onWaypointDragRef.current?.(wId, {
                  lat: Number(Number(pLat).toFixed(6)),
                  lng: Number(Number(pLng).toFixed(6)),
                });
              }
            } catch (err) {
              console.debug("[MapContainer] Drag note:", err.message);
            }
          };

          const handleDragEnd = () => {
            try {
              draggingWaypointIdRef.current = null;
              const pos = marker.getPosition?.() || marker.getLngLat?.();
              if (pos) {
                const pLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                const pLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                onWaypointDragEndRef.current?.(wId, {
                  lat: Number(Number(pLat).toFixed(6)),
                  lng: Number(Number(pLng).toFixed(6)),
                });
              }
            } catch (err) {
              console.debug("[MapContainer] DragEnd note:", err.message);
            }
          };

          if (typeof marker.addListener === "function") {
            marker.addListener("drag", handleDrag);
            marker.addListener("dragend", handleDragEnd);
          } else if (typeof marker.on === "function") {
            marker.on("drag", handleDrag);
            marker.on("dragend", handleDragEnd);
          }

          setTimeout(() => {
            const markerEl = marker.getElement?.();
            if (markerEl) {
              markerEl.style.zIndex = isSelected ? "45" : "35";
              markerEl.addEventListener("click", (evt) => {
                evt.stopPropagation();
                onWaypointSelectRef.current?.(wId);
              });
            }
          }, 60);

          currentMarkers.set(wId, { marker, html: markerHtml });
        } catch (err) {
          console.warn("[MapContainer] Waypoint marker creation note:", err.message);
        }
      }
    });

    // Apply responsive zoom scaling
    if (typeof targetMap.getZoom === "function") {
      const z = targetMap.getZoom();
      const wpScale = z < 12 ? 0.82 : z > 16 ? 1.05 : z >= 14 ? 1.0 : 0.92;
      const container = document.getElementById(mapId);
      if (container) {
        const shells = container.querySelectorAll(".waypoint-marker-shell");
        shells.forEach((shell) => {
          shell.style.transform = `scale(${wpScale})`;
        });
      }
    }
  };

  const syncCurrentMissionRoute = (map, explicitWaypoints) => {
    const routeState = missionRouteStateRef.current;
    const targetWps = explicitWaypoints || routeState.waypoints;
    syncMissionRoute(map, targetWps, routeState.showMissionRoute, routeState.isSatellite);
    syncDirectionMarkers(map, targetWps, routeState.showMissionRoute, directionMarkersRef);
  };

  const syncCurrentGeofenceLayers = (map) => {
    const routeState = missionRouteStateRef.current;
    const isClosed =
      routeState.isClosedGeofence !== undefined
        ? routeState.isClosedGeofence
        : !routeState.isDrawingGeofence || routeState.geofenceCoords.length >= 3;

    syncGeofenceLayers(map, routeState.geofenceCoords, routeState.routeViolations, {
      isDrawing: routeState.isDrawingGeofence,
      isClosed,
    });
  };

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onWaypointSelectRef.current = onWaypointSelect;
    onWaypointDragRef.current = onWaypointDrag;
    onWaypointDragEndRef.current = onWaypointDragEnd;
    onGeofenceVertexDragRef.current = onGeofenceVertexDrag;
    onGeofenceVertexDragEndRef.current = onGeofenceVertexDragEnd;
    onGeofenceVertexSelectRef.current = onGeofenceVertexSelect;
    onGeofenceEditHoverRef.current = onGeofenceEditHover;
  }, [onMapClick, onWaypointSelect, onWaypointDrag, onWaypointDragEnd, onGeofenceVertexDrag, onGeofenceVertexDragEnd, onGeofenceVertexSelect, onGeofenceEditHover]);

  // Synchronize Geofence, Preview Line, and Route Violation Layers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const isClosed =
      isClosedGeofence !== undefined
        ? isClosedGeofence
        : !isDrawingGeofence || geofenceCoords.length >= 3;

    syncGeofenceLayers(map, geofenceCoords, waypoints.length >= 2 ? routeViolations : [], {
      isDrawing: isDrawingGeofence,
      isClosed,
    });

    if (import.meta.env?.DEV) {
      const underlying = getUnderlyingMap(map);
      const hasPolygonLayer = Boolean(
        underlying?.getLayer?.(GEOFENCE_FILL_LAYER_ID) && geofenceCoords.length >= 3
      );
      const hasBoundaryLayer = Boolean(underlying?.getLayer?.(GEOFENCE_LINE_LAYER_ID));
      const hasPreviewLayer = Boolean(
        underlying?.getLayer?.(GEOFENCE_PREVIEW_LINE_LAYER_ID) &&
          isDrawingGeofence &&
          !isClosed &&
          geofenceCoords.length >= 2
      );

      console.log("[GEOFENCE RENDER]", {
        project: currentProjectId || currentProject?.id || "N/A",
        vertexCount: geofenceCoords.length,
        polygonLayerCount: hasPolygonLayer ? 1 : 0,
        polylineLayerCount: hasBoundaryLayer ? 1 : 0,
        previewLayerCount: hasPreviewLayer ? 1 : 0,
        vertexMarkerCount: geofenceMarkersRef.current?.size || 0,
      });
    }
  }, [
    geofenceCoords,
    routeViolations,
    waypoints.length,
    mapStyle,
    isDrawingGeofence,
    isClosedGeofence,
    currentProjectId,
    currentProject?.id,
  ]);

  // Synchronize Temporary Invalid Click Marker (Red Pulse on Map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    if (invalidClickPoint && typeof invalidClickPoint.lat === "number" && typeof invalidClickPoint.lng === "number") {
      try {
        if (invalidMarkerRef.current) {
          invalidMarkerRef.current.remove?.();
          invalidMarkerRef.current = null;
        }

        const html = `
          <div class="invalid-click-marker animate-ping" style="width: 26px; height: 26px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); border: 2px solid #EF4444; box-shadow: 0 0 16px #EF4444; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444;"></div>
          </div>
        `;

        invalidMarkerRef.current = new window.mappls.Marker({
          map,
          position: { lat: invalidClickPoint.lat, lng: invalidClickPoint.lng },
          html,
        });
      } catch (err) {
        console.debug("[MapContainer] Invalid click marker note:", err.message);
      }
    } else {
      if (invalidMarkerRef.current) {
        try {
          invalidMarkerRef.current.remove?.();
        } catch {
          // Safe ignore
        }
        invalidMarkerRef.current = null;
      }
    }

    return () => {
      if (invalidMarkerRef.current) {
        try {
          invalidMarkerRef.current.remove?.();
        } catch {
          // Safe ignore
        }
        invalidMarkerRef.current = null;
      }
    };
  }, [invalidClickPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    if (!isEditingGeofence || !geofenceEditHover) {
      geofenceInsertionMarkerRef.current?.remove?.();
      geofenceInsertionMarkerRef.current = null;
      return;
    }

    if (geofenceInsertionMarkerRef.current) {
      if (geofenceInsertionMarkerRef.current.setPosition) {
        geofenceInsertionMarkerRef.current.setPosition(geofenceEditHover);
      } else {
        geofenceInsertionMarkerRef.current.setLngLat?.([
          geofenceEditHover.lng,
          geofenceEditHover.lat,
        ]);
      }
      return;
    }

    const cueHtml = `
      <div style="width:16px;height:16px;border:2px solid #35E0FF;border-radius:50%;background:#35E0FF33;box-shadow:0 0 10px #35E0FF;pointer-events:none;"></div>
    `;
    try {
      geofenceInsertionMarkerRef.current = new window.mappls.Marker({
        map,
        position: geofenceEditHover,
        html: cueHtml,
      });
    } catch (err) {
      console.debug("[MapContainer] Geofence insertion cue note:", err.message);
    }
  }, [geofenceEditHover, isEditingGeofence]);

  // Synchronize Geofence Vertex Handles (Keyed by stable vertex ID)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    const currentMarkers = geofenceMarkersRef.current;
    const showMarkers =
      isEditingGeofence ||
      isDrawingGeofence ||
      geofenceCoords.length > 0;

    if (!showMarkers) {
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

    const nextIds = new Set(geofenceCoords.map((pt, i) => pt.id || `vertex-${i}`));

    // Clean up markers for removed vertices
    for (const [id, markerObj] of currentMarkers.entries()) {
      if (!nextIds.has(id)) {
        try {
          markerObj.marker?.remove?.();
        } catch {
          // Safe ignore
        }
        currentMarkers.delete(id);
      }
    }

    // Add or update active markers
    geofenceCoords.forEach((pt, idx) => {
      const vId = pt.id || `vertex-${idx}`;
      const isSelected = vId === selectedGeofenceVertexId;
      const html = buildGeofenceVertexMarkerHtml(idx, isSelected);
      const existing = currentMarkers.get(vId);

      if (existing && existing.isEditing === isEditingGeofence) {
        try {
          if (typeof existing.marker.setPosition === "function") {
            existing.marker.setPosition({ lat: pt.lat, lng: pt.lng });
          } else if (typeof existing.marker.setLngLat === "function") {
            existing.marker.setLngLat([pt.lng, pt.lat]);
          }

          // Update marker HTML and presentation number if selection or index changed
          if (existing.html !== html || existing.index !== idx || existing.isSelected !== isSelected) {
            existing.html = html;
            existing.index = idx;
            existing.isSelected = isSelected;
            const el = existing.marker.getElement?.();
            if (el) {
              const bg = isSelected ? "#35E0FF" : "#06B6D4";
              const borderColor = isSelected ? "#35E0FF" : "#FFFFFF";
              const glow = isSelected
                ? "0 0 0 3px rgba(53, 224, 255, 0.45), 0 0 16px #35E0FF, 0 0 24px rgba(53, 224, 255, 0.6)"
                : "0 0 6px rgba(6, 182, 212, 0.6)";
              const scale = isSelected ? "scale(1.25)" : "scale(1)";
              const zIndex = isSelected ? "999" : "10";

              el.innerHTML = `
                <div class="geofence-vertex-marker ${isSelected ? "selected-vertex" : ""}" data-index="${idx}" style="
                  position: relative;
                  width: 22px;
                  height: 22px;
                  border-radius: 50%;
                  background: ${bg};
                  border: 2px solid ${borderColor};
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
                  transform-origin: 50% 50%;
                  transform: ${scale};
                  z-index: ${zIndex};
                  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                ">
                  ${idx + 1}
                </div>
              `;
            }
          }
        } catch (err) {
          console.debug("[MapContainer] Geofence marker update note:", err.message);
        }
      } else {
        if (existing) {
          try {
            existing.marker?.remove?.();
          } catch {
            // Safe ignore
          }
          currentMarkers.delete(vId);
        }

        try {
          const marker = new window.mappls.Marker({
            map,
            position: { lat: pt.lat, lng: pt.lng },
            html,
            draggable: isEditingGeofence,
          });

          const handleSelectClick = (e) => {
            e?.stopPropagation?.();
            onGeofenceVertexSelectRef.current?.(vId, idx);
          };

          if (typeof marker.addListener === "function") {
            marker.addListener("click", handleSelectClick);
          } else if (typeof marker.on === "function") {
            marker.on("click", handleSelectClick);
          }

          setTimeout(() => {
            const el = marker.getElement?.();
            if (el) {
              el.addEventListener("click", handleSelectClick);
            }
          }, 60);

          if (isEditingGeofence) {
            const handleDrag = () => {
              try {
                const pos = marker.getPosition?.() || marker.getLngLat?.();
                if (pos) {
                  const pLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                  const pLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                  onGeofenceVertexDragRef.current?.(idx, {
                    lat: Number(Number(pLat).toFixed(6)),
                    lng: Number(Number(pLng).toFixed(6)),
                  }, vId);
                }
              } catch (err) {
                console.debug("[MapContainer] Geofence drag note:", err.message);
              }
            };

            const handleDragEnd = () => {
              try {
                const pos = marker.getPosition?.() || marker.getLngLat?.();
                if (pos) {
                  const pLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                  const pLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                  const dragResult = onGeofenceVertexDragEndRef.current?.(idx, {
                    lat: Number(Number(pLat).toFixed(6)),
                    lng: Number(Number(pLng).toFixed(6)),
                  }, vId);
                  if (dragResult && dragResult.valid === false) {
                    if (typeof marker.setPosition === "function") {
                      marker.setPosition({ lat: pt.lat, lng: pt.lng });
                    } else if (typeof marker.setLngLat === "function") {
                      marker.setLngLat([pt.lng, pt.lat]);
                    }
                  }
                }
              } catch (err) {
                console.debug("[MapContainer] Geofence dragend note:", err.message);
              }
            };

            if (typeof marker.addListener === "function") {
              marker.addListener("drag", handleDrag);
              marker.addListener("dragend", handleDragEnd);
            } else if (typeof marker.on === "function") {
              marker.on("drag", handleDrag);
              marker.on("dragend", handleDragEnd);
            }
          }

          currentMarkers.set(vId, {
            marker,
            html,
            index: idx,
            isSelected,
            isEditing: isEditingGeofence,
          });
        } catch (err) {
          console.warn("[MapContainer] Geofence vertex creation note:", err.message);
        }
      }
    });
  }, [geofenceCoords, isEditingGeofence, isDrawingGeofence, selectedGeofenceVertexId, effectivePageType, mapReady]);

  // Synchronize Waypoint Markers & Mission Route on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    syncCurrentWaypointMarkers(map, waypoints);
    syncCurrentMissionRoute(map, waypoints);
  }, [waypoints, selectedWaypointId, showMissionRoute, mapStyle, mapReady]);

  // Synchronize Official Mappls Airspace / No-Fly Zone Plugin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    syncAirspaceLayer(map, {
      visible: Boolean(showAirspace),
      onStatusChange: (statusInfo) => {
        onAirspaceStatusChange?.(statusInfo);
      },
    });
  }, [showAirspace, mapReady, onAirspaceStatusChange]);

  // Initialize Mappls Map with async SDK readiness polling & unique element ID
  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    const markers = waypointMarkersRef.current;
    const geofenceMarkers = geofenceMarkersRef.current;

    const initMap = () => {
      if (cancelled || mapRef.current || !window.mappls) return;

      // 1. Guard Mapbox/Mappls prototype remove against double destruction
      if (typeof window !== "undefined" && window.mapplsgl?.Map?.prototype?.remove && !window.mapplsgl.Map.prototype._safePatched) {
        window.mapplsgl.Map.prototype._safePatched = true;
        const origProtoRemove = window.mapplsgl.Map.prototype.remove;
        window.mapplsgl.Map.prototype.remove = function () {
          if (!this.handlers) return;
          try {
            origProtoRemove.call(this);
          } catch (e) {
            console.debug("[MapContainer] Handled duplicate remove:", e.message);
          }
        };
      }

      // 2. Guard existing maps in map_o array
      if (typeof window !== "undefined" && Array.isArray(window.map_o)) {
        window.map_o.forEach((m) => {
          if (m && !m._safePatched && typeof m.remove === "function") {
            m._safePatched = true;
            const origRem = m.remove;
            m.remove = function () {
              if (!this.handlers) return;
              try {
                origRem.call(this);
              } catch {
                // Safe ignore duplicate remove
              }
            };
          }
        });
      }

      const container = document.getElementById(mapId);
      if (!container) return;
      container.innerHTML = "";

      try {
        const { center: initialCenter, zoom: initialZoom } = resolveInitialMapState({
          pageType: effectivePageType,
          hasLiveDroneLocation,
          activeLat,
          activeLng,
          geofenceCoords,
          waypoints,
          customCenter: propInitialCenter,
          customZoom: propInitialZoom,
        });

        const centerObj = {
          lat: Number(initialCenter[0] ?? initialCenter.lat ?? FALLBACK_DRONE_LOCATION.latitude),
          lng: Number(initialCenter[1] ?? initialCenter.lng ?? FALLBACK_DRONE_LOCATION.longitude),
        };

        const map = new window.mappls.Map(mapId, {
          center: centerObj,
          zoom: initialZoom,
          hybrid: mapStyle === "satellite",
          renderWorldCopies: false,
          maxBounds: [[-180, -85], [180, 85]],
          fullscreenControl: false,
          zoomControl: false,
          rotateControl: false,
          scrollZoom: false, // Default: DISABLED so normal wheel scrolling navigates page
          doubleClickZoom: true,
          touchZoomRotate: true,
          dragPan: true,
        });

        // Ensure scrollZoom is disabled initially on both Mappls and underlying MapLibre
        if (typeof map.scrollZoom?.disable === "function") {
          map.scrollZoom.disable();
        }
        const initialUnderlying = getUnderlyingMap(map);
        if (initialUnderlying && typeof initialUnderlying.scrollZoom?.disable === "function") {
          initialUnderlying.scrollZoom.disable();
        }

        // Ensure renderWorldCopies is strictly disabled on the underlying Mapbox/MapLibre instance
        if (typeof map.setRenderWorldCopies === "function") {
          map.setRenderWorldCopies(false);
        }
        if (map.transform && "renderWorldCopies" in map.transform) {
          map.transform.renderWorldCopies = false;
        }

        if (typeof map.remove === "function") {
          const origInstRemove = map.remove;
          map.remove = function () {
            if (!this.handlers) return;
            try {
              origInstRemove.call(this);
            } catch {
              // Safe ignore duplicate remove
            }
          };
        }

        mapRef.current = map;

        // Map Click Listener for Waypoint Placement Mode, Geofence Drawing & Selection
        map.on("click", (e) => {
          if (!e || !e.lngLat) return;
          const origTarget = e.originalEvent?.target;
          if (
            origTarget?.closest?.(".waypoint-marker-shell") ||
            origTarget?.closest?.(".drone-marker-shell") ||
            origTarget?.closest?.(".geofence-vertex-marker")
          ) {
            return;
          }

          const clickPt = {
            lat: Number(Number(e.lngLat.lat).toFixed(6)),
            lng: Number(Number(e.lngLat.lng).toFixed(6)),
          };

          // If clicking inside geofence polygon and onGeofenceClick is provided
          const currentGeofence = missionRouteStateRef.current.geofenceCoords;
          if (
            onGeofenceClickRef.current &&
            currentGeofence.length >= 3 &&
            isPointInsideGeofence(clickPt, currentGeofence)
          ) {
            onGeofenceClickRef.current(clickPt);
            return;
          }

          onMapClickRef.current?.(clickPt);
        });
        map.on("mousemove", (e) => {
          if (!isEditingGeofence || !e?.lngLat) return;
          onGeofenceEditHoverRef.current?.({
            lat: Number(Number(e.lngLat.lat).toFixed(6)),
            lng: Number(Number(e.lngLat.lng).toFixed(6)),
          });
        });
        map.on("mouseout", () => onGeofenceEditHoverRef.current?.(null));

        const onMapReady = () => {
          if (cancelled) return;
          setSdkAvailable(true);
          setMapReady(true);
          map.resize?.();

          // Initialize satellite layer and apply style
          ensureSatelliteLayer(map, mapStyleRef.current === "satellite");
          applyMapStyle(map, mapStyleRef.current, polylineRef);
          syncCurrentGeofenceLayers(map);
          syncCurrentMissionRoute(map);
          syncCurrentWaypointMarkers(map);
          enforceMapLayerOrder(map);

          // Track user map pan/drag and manual zoom to decouple camera centering from live marker updates
          map.on("dragstart", () => {
            userHasPannedRef.current = true;
          });
          map.on("zoomstart", () => {
            userHasPannedRef.current = true;
          });

          // Responsive zoom scaling listener
          const handleZoom = () => {
            if (typeof map.getZoom === "function") {
              const z = map.getZoom();
              const scale = z < 12 ? 0.78 : z > 16 ? 1.15 : z >= 14 ? 1.0 : 0.88;
              if (markerScalerRef.current) {
                markerScalerRef.current.style.transform = `scale(${scale})`;
              }
              const wpScale = z < 12 ? 0.82 : z > 16 ? 1.05 : z >= 14 ? 1.0 : 0.92;
              const mapEl = document.getElementById(mapId);
              if (mapEl) {
                const shells = mapEl.querySelectorAll(".waypoint-marker-shell");
                shells.forEach((shell) => {
                  shell.style.transform = `scale(${wpScale})`;
                });
              }
            }
          };
          map.on("zoom", handleZoom);

          // Initialize custom top-down drone marker (Live GPS or Hyderabad Fallback)
          if (
            typeof window.mappls.Marker === "function" &&
            !markerRef.current
          ) {
            if (hasLiveDroneLocation) {
              hasHadFirstFixRef.current = true;
            }
            try {
              markerRef.current = new window.mappls.Marker({
                map,
                position: { lat: activeLat, lng: activeLng },
                html: buildDroneMarkerHtml(droneCallsign, heading, activeMarkerOptions),
              });
              if (!showDrones && markerRef.current) {
                markerRef.current.getElement?.()?.style?.setProperty("display", "none");
              }
              bindDashboardDroneSelect(markerRef.current, droneCallsign);
              attachMarkerDomRefs();
            } catch (markerErr) {
              console.warn("[MapContainer] Marker creation note:", markerErr.message);
            }
          }
        };

        const handleStyleLoad = () => {
          if (cancelled) return;
          ensureSatelliteLayer(map, mapStyleRef.current === "satellite");
          applyMapStyle(map, mapStyleRef.current, polylineRef);
          syncCurrentGeofenceLayers(map);
          syncCurrentMissionRoute(map);
          syncCurrentWaypointMarkers(map);
          enforceMapLayerOrder(map);
        };

        if (map.loaded?.()) {
          onMapReady();
        } else {
          map.on("load", onMapReady);
        }
        map.on?.("style.load", handleStyleLoad);

        // Secondary guarantee: ensure overlay is dismissed and canvas is resized
        setTimeout(() => {
          if (!cancelled && mapRef.current) {
            setSdkAvailable(true);
            mapRef.current.resize?.();
          }
        }, 300);

      } catch (err) {
        console.warn("[MapContainer] Map initialization error:", err.message);
      }
    };

    if (window.mappls) {
      initMap();
    } else {
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts++;
        if (window.mappls) {
          clearInterval(pollTimer);
          initMap();
        } else if (attempts >= 50) {
          clearInterval(pollTimer);
          console.warn("[MapContainer] Mappls SDK timed out loading.");
        }
      }, 100);
    }

      // Observe and guarantee bottom-left MAPPLS banner and 3D / Zoom controls are pruned
      const container = document.getElementById(mapId);
      let attribObserver = null;
      if (container) {
        const cleanMapControls = () => {
          // Hide bottom-left branding banner
          const banners = container.querySelectorAll(
            '.cst-attrib-cont > a, [id^="watermark_logo"], img[src*="mappls_mmi"], .maplibregl-ctrl-bottom-left a[href*="mappls"], .mapboxgl-ctrl-bottom-left a[href*="mappls"]'
          );
          banners.forEach((el) => {
            if (el.style.display !== "none") {
              el.style.setProperty("display", "none", "important");
              el.style.setProperty("visibility", "hidden", "important");
              el.style.setProperty("pointer-events", "none", "important");
            }
          });

          // Remove 3D control, zoom (+ / -) controls, and their containers without leaving empty boxes
          const controlsToRemove = container.querySelectorAll(
            '.map-control, [id^="mmi_ctrl"], .expand-map-control, .map-zoom-in, .map-zoom-out, .D3, [id^="d3"], .mcompass, [id^="mcompass"], .maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out, .mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out, .maplibregl-ctrl-pitch, .mapboxgl-ctrl-pitch, .maplibregl-ctrl-compass, .mapboxgl-ctrl-compass, .cst-btn-3d, .mappls-3d-ctrl, .mappls-ctrl-zoom, .mappls-zoom-ctrl, button[title*="3D"], button[aria-label*="3D"], a[title="Compass"], a[alt="Compass"], a[title="Zoom In"], a[alt="Zoom In"], a[title="Zoom Out"], a[alt="Zoom Out"]'
          );
          controlsToRemove.forEach((el) => {
            const parentControl = el.closest('.map-control, [id^="mmi_ctrl"], .maplibregl-ctrl-group, .mapboxgl-ctrl-group');
            if (parentControl && parentControl.parentNode) {
              parentControl.remove();
            } else if (el.parentNode) {
              el.remove();
            }
          });
        };
        cleanMapControls();
        attribObserver = new MutationObserver(cleanMapControls);
        attribObserver.observe(container, { childList: true, subtree: true });
      }

      return () => {
        cancelled = true;
        if (attribObserver) attribObserver.disconnect();
        if (pollTimer) clearInterval(pollTimer);
        const polyline = polylineRef.current;
        if (polyline?.remove) {
          try {
            polyline.remove();
          } catch {
            // Safe ignore
          }
        }
        removeRouteLayers(mapRef.current, directionMarkersRef);
        removeGeofenceLayers(mapRef.current);
        removeAirspaceLayer(mapRef.current);
        geofenceInsertionMarkerRef.current?.remove?.();
        geofenceInsertionMarkerRef.current = null;

        for (const [, obj] of markers.entries()) {
          try {
            obj.marker?.remove?.();
          } catch {
            // Safe ignore
          }
        }
        markers.clear();

        for (const [, obj] of geofenceMarkers.entries()) {
          try {
            obj.marker?.remove?.();
          } catch {
            // Safe ignore
          }
        }
        geofenceMarkers.clear();

        const marker = markerRef.current;
        if (marker?.remove) {
          try {
            marker.remove();
          } catch {
            // Safe ignore
          }
        }
        if (mapRef.current && mapRef.current.handlers) {
          try {
            mapRef.current.remove();
          } catch {
            // Safe ignore
          }
        }
        mapRef.current = null;
        markerRef.current = null;
        markerRotatorRef.current = null;
        markerScalerRef.current = null;
        polylineRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Responsive Map Size Recalculation (Sidebar toggle, window resize, orientation change)
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        try {
          mapRef.current.resize?.();
        } catch {
          // Safe ignore
        }
        try {
          const underlying = getUnderlyingMap(mapRef.current);
          underlying?.resize?.();
        } catch {
          // Safe ignore
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const container = containerRef.current || document.getElementById(mapId);
    let ro = null;
    if (container && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(container);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (ro) ro.disconnect();
    };
  }, [mapId]);

  // Smooth project change and initial mission geometry camera transition
  const lastCenterProjectRef = useRef(null);
  const hasFramedMissionRef = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const hasMissionGeometry =
      (Array.isArray(waypoints) && waypoints.length > 0) ||
      (Array.isArray(geofenceCoords) && geofenceCoords.length > 0);

    const projectChanged = Boolean(currentProjectId && lastCenterProjectRef.current !== currentProjectId);
    const shouldInitialFrameMission =
      hasMissionGeometry && !hasFramedMissionRef.current && !userHasPannedRef.current;

    if (projectChanged) {
      lastCenterProjectRef.current = currentProjectId;
      hasFramedMissionRef.current = false;
      userHasPannedRef.current = false;
    }

    if (projectChanged || shouldInitialFrameMission) {
      if (hasMissionGeometry) {
        hasFramedMissionRef.current = true;
      }

      const { center, zoom } = resolveInitialMapState({
        pageType: effectivePageType,
        hasLiveDroneLocation,
        activeLat,
        activeLng,
        geofenceCoords,
        waypoints,
        customCenter: propInitialCenter,
        customZoom: propInitialZoom,
      });

      const centerObj = {
        lat: Number(center[0] ?? center.lat ?? FALLBACK_DRONE_LOCATION.latitude),
        lng: Number(center[1] ?? center.lng ?? FALLBACK_DRONE_LOCATION.longitude),
      };

      try {
        if (typeof map.flyTo === "function") {
          map.flyTo({
            center: centerObj,
            zoom: zoom || OPERATIONAL_MAP_ZOOM,
            duration: 800,
          });
        } else if (typeof map.setCenter === "function") {
          map.setCenter(centerObj);
          if (zoom) map.setZoom(zoom);
        }
      } catch (err) {
        console.debug("[MapContainer] Project center fly error:", err.message);
      }
    }
  }, [
    currentProjectId,
    mapReady,
    effectivePageType,
    hasLiveDroneLocation,
    propInitialCenter,
    propInitialZoom,
  ]);


  // Shortest-path angle interpolation for smooth heading rotation (359° -> 0° safe)
  useEffect(() => {
    const targetHeading = ((heading % 360) + 360) % 360;
    const prevAngle = renderedHeadingRef.current;

    // Shortest angular difference (-180 to +180)
    const diff = ((targetHeading - (prevAngle % 360) + 540) % 360) - 180;
    const nextContinuousAngle = prevAngle + diff;
    renderedHeadingRef.current = nextContinuousAngle;

    // Rotate the inner marker element directly (the single authoritative source of arrow orientation)
    const rotEl = document.querySelector(`#${mapId} .drone-marker-rotator`) || document.querySelector(".drone-marker-rotator");
    if (rotEl) {
      rotEl.style.transform = `rotate(${nextContinuousAngle}deg)`;
    }
  }, [heading, mapId]);

  // Smooth position lerp interpolation & movement trail manager
  // Strictly stops when destination is reached to eliminate marker drift
  useEffect(() => {
    let animId = null;

    const animateMovement = () => {
      const current = currentPosRef.current;
      const target = targetPosRef.current;

      if (!Number.isFinite(current.lat) || !Number.isFinite(target.lat)) {
        current.lat = target.lat;
        current.lng = target.lng;
      }

      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;
      const distSq = dLat * dLat + dLng * dLng;

      // Stationary check: if within ~0.02 meters (1e-12 degrees sq), snap and stop animation
      if (distSq <= 1e-12) {
        current.lat = target.lat;
        current.lng = target.lng;

        if (markerRef.current) {
          const displayLng = normalizeLongitude(current.lng);
          const displayLat = Math.max(-90, Math.min(90, Number(current.lat.toFixed(6))));

          try {
            if (typeof markerRef.current.setPosition === "function") {
              markerRef.current.setPosition({ lat: displayLat, lng: displayLng });
            } else if (typeof markerRef.current.setLngLat === "function") {
              markerRef.current.setLngLat([displayLng, displayLat]);
            }
          } catch {
            // Ignore
          }

          if (import.meta.env?.DEV) {
            const mPos = markerRef.current.getPosition?.() || markerRef.current.getLngLat?.() || markerRef.current._marker?.getLngLat?.();
            const mLat = mPos?.lat ? (typeof mPos.lat === "function" ? mPos.lat() : mPos.lat) : displayLat;
            const mLng = mPos?.lng ? (typeof mPos.lng === "function" ? mPos.lng() : mPos.lng) : displayLng;
            const mCenter = mapRef.current?.getCenter?.();
            const mZoom = mapRef.current?.getZoom?.();
            console.debug("[DRONE MARKER RENDER]", {
              stateLat: activeLat,
              stateLng: activeLng,
              markerLat: mLat,
              markerLng: mLng,
              mapCenterLat: mCenter?.lat,
              mapCenterLng: mCenter?.lng,
              mapZoom: mZoom,
            });
          }
        }
        return;
      }

      if (distSq > 0.005) {
        // Large step or initial coordinate load: snap directly
        current.lat = target.lat;
        current.lng = target.lng;
      } else {
        // Smooth tracking for continuous live movement
        const lerpFactor = 0.45;
        current.lat += dLat * lerpFactor;
        current.lng += dLng * lerpFactor;
      }

      // Update Mappls Marker position with normalized display coordinates
      if (markerRef.current) {
        const displayLng = normalizeLongitude(current.lng);
        const displayLat = Math.max(-90, Math.min(90, Number(current.lat.toFixed(6))));

        try {
          if (typeof markerRef.current.setPosition === "function") {
            markerRef.current.setPosition({ lat: displayLat, lng: displayLng });
          } else if (typeof markerRef.current.setLngLat === "function") {
            markerRef.current.setLngLat([displayLng, displayLat]);
          } else if (markerRef.current._marker && typeof markerRef.current._marker.setLngLat === "function") {
            markerRef.current._marker.setLngLat([displayLng, displayLat]);
          }
        } catch {
          // Ignore
        }
      }

      // Manage lightweight flight breadcrumb trail (only for real movements in live mode)
      if (hasLiveDroneLocation) {
        const trail = trailCoordsRef.current;
        const lastPt = trail[trail.length - 1];
        const stepDistSq = lastPt
          ? Math.pow(current.lat - lastPt.lat, 2) + Math.pow(current.lng - lastPt.lng, 2)
          : 1;

        if (stepDistSq > 0.00000005) {
          trail.push({ lat: Number(current.lat.toFixed(6)), lng: Number(current.lng.toFixed(6)) });
          if (trail.length > 40) trail.shift();

          // Update polyline on map
          if (mapRef.current && window.mappls?.polyline && trail.length >= 2) {
            try {
              if (polylineRef.current && typeof polylineRef.current.setPath === "function") {
                polylineRef.current.setPath(trail);
              } else if (!polylineRef.current) {
                polylineRef.current = new window.mappls.polyline({
                  map: mapRef.current,
                  path: trail,
                  strokeColor: "#35E0FF",
                  strokeWeight: 2.5,
                  strokeOpacity: 0.45,
                });
              }
            } catch (err) {
              console.debug("[MapContainer] Trail update note:", err.message);
            }
          }
        }
      }

      animId = requestAnimationFrame(animateMovement);
    };

    // Check if target is different from current; if so, trigger interpolation
    const current = currentPosRef.current;
    const target = targetPosRef.current;
    const initialDistSq = Math.pow(target.lat - current.lat, 2) + Math.pow(target.lng - current.lng, 2);

    if (initialDistSq > 1e-12) {
      animId = requestAnimationFrame(animateMovement);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeLat, activeLng, hasLiveDroneLocation]);

  // Handle container resize & transition settlements
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeMap = () => {
      mapRef.current?.resize?.();
    };

    const observer = new ResizeObserver(resizeMap);
    observer.observe(el);

    // Staggered resize events to guarantee map adapts when parent layout transitions settle
    const t1 = setTimeout(resizeMap, 50);
    const t2 = setTimeout(resizeMap, 200);
    const t3 = setTimeout(resizeMap, 500);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`map-shell relative h-full w-full bg-[#070B10] overflow-hidden ${
        isPlacingWaypoint ? "cursor-crosshair" : ""
      }`}
    >
      <div
        id={mapId}
        className={`map-root h-full w-full ${isPlacingWaypoint ? "cursor-crosshair" : ""}`}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />

      {/* Visible Map Zoom Controls (+ / - / Reset View / Scroll to Zoom Toggle / Map Style Toggle / Airspace Toggle) */}
      {showControls && (
        <MapControls
          mapStyle={activeMapStyle}
          onMapStyleChange={onMapStyleChange ? handleMapStyleSwitch : (showStyleToggle ? handleMapStyleSwitch : undefined)}
          showStyleToggle={showStyleToggle !== undefined ? showStyleToggle : Boolean(onMapStyleChange)}
          showAirspaceToggle={showAirspaceToggle}
          airspaceEnabled={Boolean(showAirspace)}
          onToggleAirspace={onAirspaceToggle}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          scrollZoomEnabled={scrollZoomEnabled}
          onToggleScrollZoom={handleToggleScrollZoom}
          position={controlsPosition}
          fitMissionTitle={
            waypoints.length > 0 || (geofenceCoords && geofenceCoords.length > 0)
              ? "Fit Mission / Reset View"
              : "Reset View"
          }
        />
      )}

      {/* Fallback Tactical Radar View when Mappls CDN is offline */}
      {!sdkAvailable && (
        (() => {
          const radarRefLat = hasLiveDroneLocation
            ? activeLat
            : (typeof waypoints[0]?.lat === "number"
                ? waypoints[0].lat
                : (typeof geofenceCoords[0]?.lat === "number"
                    ? geofenceCoords[0].lat
                    : FALLBACK_DRONE_LOCATION.latitude));
          const radarRefLng = hasLiveDroneLocation
            ? activeLng
            : (typeof waypoints[0]?.lng === "number"
                ? waypoints[0].lng
                : (typeof geofenceCoords[0]?.lng === "number"
                    ? geofenceCoords[0].lng
                    : FALLBACK_DRONE_LOCATION.longitude));

          return (
            <div
              onMouseMove={(e) => {
                if (!isEditingGeofence) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pxOffsetX = e.clientX - (rect.left + rect.width / 2);
                const pxOffsetY = e.clientY - (rect.top + rect.height / 2);
                const clickedLat = radarRefLat - pxOffsetY / (0.8 * 111139);
                const clickedLng = radarRefLng + pxOffsetX / (0.8 * 111139 * Math.cos((radarRefLat * Math.PI) / 180));
                onGeofenceEditHoverRef.current?.({
                  lat: Number(clickedLat.toFixed(6)),
                  lng: Number(clickedLng.toFixed(6)),
                });
              }}
              onMouseLeave={() => onGeofenceEditHoverRef.current?.(null)}
              onClick={(e) => {
                if (!isPlacingWaypoint && !isDrawingGeofence && !isEditingGeofence) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const pxOffsetX = e.clientX - cx;
                const pxOffsetY = e.clientY - cy;
                const dLngM = pxOffsetX / 0.8;
                const dLatM = -pxOffsetY / 0.8;
                const clickedLat = radarRefLat + dLatM / 111139;
                const clickedLng = radarRefLng + dLngM / (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                onMapClickRef.current?.({
                  lat: Number(clickedLat.toFixed(6)),
                  lng: Number(clickedLng.toFixed(6)),
                });
              }}
              className={`absolute inset-0 flex items-center justify-center bg-[#070B12] ${
                isPlacingWaypoint || isDrawingGeofence || isEditingGeofence ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
              }`}
            >
              {/* Tactical Grid Background */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #35E0FF22 1px, transparent 1px), linear-gradient(to bottom, #35E0FF22 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                }}
              />

              {/* Concentric Radar Rings */}
              <div
                className="relative flex items-center justify-center w-[360px] h-[360px] rounded-full border border-[#1A3344] opacity-80 transition-transform duration-150 ease-out"
                style={{ transform: `scale(${radarScale})` }}
              >
                <div className="w-[260px] h-[260px] rounded-full border border-[#20445C] opacity-60" />
                <div className="absolute w-[160px] h-[160px] rounded-full border border-[#35E0FF44] opacity-80" />
                <div className="absolute w-full h-[1px] bg-[#35E0FF22]" />
                <div className="absolute h-full w-[1px] bg-[#35E0FF22]" />

                {/* Directional Cardinal Labels */}
                <span className="absolute top-2 text-[10px] font-mono font-bold text-[#35E0FF]">N (0°)</span>
                <span className="absolute right-2 text-[10px] font-mono text-[#8E9EAA]">E (90°)</span>
                <span className="absolute bottom-2 text-[10px] font-mono text-[#8E9EAA]">S (180°)</span>
                <span className="absolute left-2 text-[10px] font-mono text-[#8E9EAA]">W (270°)</span>

                {/* Tactical Overlay SVG: Geofence, Waypoint Routes, & Route Violations */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 360 360"
                >
                  {/* Geofence Polygon */}
                  {geofenceCoords.length >= 3 && (
                    <polygon
                      points={geofenceCoords
                        .map((pt) => {
                          const dLatM = (pt.lat - radarRefLat) * 111139;
                          const dLngM = (pt.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                          const x = 180 + dLngM * 0.8;
                          const y = 180 - dLatM * 0.8;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="#06B6D4"
                      fillOpacity="0.18"
                      stroke="#35E0FF"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Straight Waypoint-to-Waypoint Route Segments with Directional Chevrons */}
                  {showMissionRoute && waypoints.length >= 2 && (
                    <g>
                      {waypoints.slice(0, -1).map((p1, idx) => {
                        const p2 = waypoints[idx + 1];
                        if (!p1 || !p2 || typeof p1.lat !== "number" || typeof p2.lat !== "number") return null;

                        const dLatM1 = (p1.lat - radarRefLat) * 111139;
                        const dLngM1 = (p1.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                        const x1 = 180 + dLngM1 * 0.8;
                        const y1 = 180 - dLatM1 * 0.8;

                        const dLatM2 = (p2.lat - radarRefLat) * 111139;
                        const dLngM2 = (p2.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                        const x2 = 180 + dLngM2 * 0.8;
                        const y2 = 180 - dLatM2 * 0.8;

                        return (
                          <g key={`radar-seg-${p1.id || idx}-${p2.id || idx + 1}`}>
                            {/* Straight route line between consecutive waypoints */}
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#35E0FF"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Completed Simulation Route Path */}
                  {simulatedDrone?.active && Array.isArray(completedCoordinates) && completedCoordinates.length >= 2 && (
                    <polyline
                      points={completedCoordinates
                        .map((pt) => {
                          const dLatM = (pt.lat - radarRefLat) * 111139;
                          const dLngM = (pt.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                          const x = 180 + dLngM * 0.8;
                          const y = 180 - dLatM * 0.8;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#C084FC"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Route Violations Segments */}
                  {Array.isArray(routeViolations) &&
                    routeViolations.map((seg, idx) => {
                      const dLatM1 = (seg[0].lat - radarRefLat) * 111139;
                      const dLngM1 = (seg[0].lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                      const x1 = 180 + dLngM1 * 0.8;
                      const y1 = 180 - dLatM1 * 0.8;

                      const dLatM2 = (seg[1].lat - radarRefLat) * 111139;
                      const dLngM2 = (seg[1].lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                      const x2 = 180 + dLngM2 * 0.8;
                      const y2 = 180 - dLatM2 * 0.8;

                      return (
                        <line
                          key={idx}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#EF4444"
                          strokeWidth="3.5"
                          strokeDasharray="4 2"
                        />
                      );
                    })}

                  {/* Waypoints Dots & Numbered Badges */}
                  {waypoints.map((pt, i) => {
                    const dLatM = (pt.lat - radarRefLat) * 111139;
                    const dLngM = (pt.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                    const x = 180 + dLngM * 0.8;
                    const y = 180 - dLatM * 0.8;
                    const isSel = pt.id === selectedWaypointId;
                    const isSimTarget = pt.id === activeSimWaypointId;
                    const wpNum = pt.seq ?? i + 1;
                    return (
                      <g key={pt.id || i} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onWaypointSelectRef.current?.(pt.id); }}>
                        {isSel && (
                          <circle cx={x} cy={y} r="8.5" fill="none" stroke="#35E0FF" strokeWidth="1.5" className="animate-ping" opacity="0.75" />
                        )}
                        {isSimTarget && (
                          <circle cx={x} cy={y} r="10" fill="none" stroke="#C084FC" strokeWidth="2" className="animate-ping" opacity="0.85" />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSel ? "5.5" : isSimTarget ? "5.5" : "4.5"}
                          fill="#080F18"
                          stroke={isSel ? "#54E4F1" : isSimTarget ? "#C084FC" : "#35E0FF"}
                          strokeWidth="1.6"
                        />
                        <text
                          x={x}
                          y={y + 2}
                          textAnchor="middle"
                          fill={isSel ? "#54E4F1" : "#35E0FF"}
                          fontSize="5.2"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {wpNum}
                        </text>
                        <text
                          x={x}
                          y={y + 9}
                          textAnchor="middle"
                          fill="#EEF4F8"
                          fontSize="4.5"
                          fontFamily="monospace"
                          fontWeight="600"
                        >
                          {pt.alt || 50}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Geofence Vertices */}
                  {geofenceCoords.length > 0 &&
                    geofenceCoords.map((pt, i) => {
                      const dLatM = (pt.lat - radarRefLat) * 111139;
                      const dLngM = (pt.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                      const x = 180 + dLngM * 0.8;
                      const y = 180 - dLatM * 0.8;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="5.5"
                          fill="#06B6D4"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      );
                    })}

                  {isEditingGeofence && geofenceEditHover && (() => {
                    const dLatM = (geofenceEditHover.lat - radarRefLat) * 111139;
                    const dLngM = (geofenceEditHover.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                    const x = 180 + dLngM * 0.8;
                    const y = 180 - dLatM * 0.8;
                    return (
                      <circle
                        cx={x}
                        cy={y}
                        r="7"
                        fill="#35E0FF33"
                        stroke="#35E0FF"
                        strokeWidth="2"
                      />
                    );
                  })()}

                  {/* Invalid Click Indicator (Red Pulse) */}
                  {invalidClickPoint && typeof invalidClickPoint.lat === "number" && (
                    (() => {
                      const dLatM = (invalidClickPoint.lat - radarRefLat) * 111139;
                      const dLngM = (invalidClickPoint.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                      const x = 180 + dLngM * 0.8;
                      const y = 180 - dLatM * 0.8;
                      return (
                        <g key={invalidClickPoint.key || "invalid-pt"}>
                          <circle cx={x} cy={y} r="14" fill="#EF4444" fillOpacity="0.45" stroke="#EF4444" strokeWidth="2" className="animate-ping" />
                          <circle cx={x} cy={y} r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
                        </g>
                      );
                    })()
                  )}
                </svg>

                {/* Tactical Drone Marker (Fallback Radar with Translation) - Live or Hyderabad Fallback */}
                {(() => {
                  const dLatM = (activeLat - radarRefLat) * 111139;
                  const dLngM = (activeLng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                  const radarX = Math.max(-130, Math.min(130, dLngM * 0.8));
                  const radarY = Math.max(-130, Math.min(130, -dLatM * 0.8));
                  return (
                    <div
                      className="absolute pointer-events-auto"
                      style={{
                        transform: `translate(${radarX}px, ${radarY}px) rotate(${heading}deg)`,
                        transition: "transform 0.08s linear",
                      }}
                    >
                      <svg
                        width="68"
                        height="68"
                        viewBox="0 0 100 100"
                        fill="none"
                        style={{ filter: "drop-shadow(0 0 12px #35E0FF)" }}
                      >
                        {/* Subtle Range / Sensor Circle */}
                        <circle cx="50" cy="54" r="38" stroke="#35E0FF" strokeWidth="1.2" strokeOpacity="0.3" strokeDasharray="4 4" />

                        {/* Rear Motor Carbon Arms */}
                        <line x1="50" y1="54" x2="22" y2="76" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="22" y2="76" stroke="#1F3A4E" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="78" y2="76" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="78" y2="76" stroke="#1F3A4E" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Front Motor Carbon Arms */}
                        <line x1="50" y1="54" x2="20" y2="40" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="20" y2="40" stroke="#35E0FF" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="80" y2="40" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                        <line x1="50" y1="54" x2="80" y2="40" stroke="#35E0FF" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Rear Motors / Rotors (Distinct red rear beacons) */}
                        <circle cx="22" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" strokeWidth="2" />
                        <circle cx="22" cy="76" r="4" fill="#FF4757" fillOpacity="0.85" />
                        <circle cx="78" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" strokeWidth="2" />
                        <circle cx="78" cy="76" r="4" fill="#FF4757" fillOpacity="0.85" />

                        {/* Front Motors / Rotors (Cyan hubs) */}
                        <circle cx="20" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" strokeWidth="2" />
                        <circle cx="20" cy="40" r="4" fill="#35E0FF" />
                        <circle cx="80" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" strokeWidth="2" />
                        <circle cx="80" cy="40" r="4" fill="#35E0FF" />

                        {/* Central Avionics Body / Fuselage */}
                        <rect x="38" y="42" width="24" height="26" rx="6" fill="#070B10" stroke="#224054" strokeWidth="2" />
                        <circle cx="50" cy="54" r="4" fill="#2FE089" stroke="#070B10" strokeWidth="1.2" />

                        {/* PROMINENT DIRECTIONAL ARROW / NOSE (1.5x body length) */}
                        <polygon points="50,3 67,35 50,25 33,35" fill="#04070A" stroke="#04070A" strokeWidth="3.5" strokeLinejoin="round" />
                        <polygon points="50,5 65,33 50,24 35,33" fill="#35E0FF" stroke="#35E0FF" strokeWidth="1.2" strokeLinejoin="round" />
                        <polygon points="50,5 65,33 50,24" fill="#1EB8D8" fillOpacity="0.5" />
                        <line x1="50" y1="6" x2="50" y2="24" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <div className="absolute top-[70px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[9.5px] font-mono font-bold text-[#35E0FF] bg-[#080C14CC] border border-[#35E0FF4D] px-1.5 py-0.5 rounded shadow">
                          {(() => {
                            const dName = activeDrone?.name || (registeredDrones || []).find((d) => d.id === droneCallsign || d.droneId === droneCallsign)?.name;
                            const showName = dName && String(dName).trim().toLowerCase() !== String(droneCallsign).trim().toLowerCase();
                            return showName ? `${droneCallsign} · ${dName}` : droneCallsign;
                          })()}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Tactical Simulated Drone Marker (Fallback Radar) */}
                {simulatedDrone?.active && typeof simulatedDrone.lat === "number" && typeof simulatedDrone.lng === "number" && (
                  (() => {
                    const dLatM = (simulatedDrone.lat - radarRefLat) * 111139;
                    const dLngM = (simulatedDrone.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                    const radarX = Math.max(-130, Math.min(130, dLngM * 0.8));
                    const radarY = Math.max(-130, Math.min(130, -dLatM * 0.8));
                    const simHdg = simulatedDrone.heading || 0;
                    const simAlt = simulatedDrone.altitude || 50;

                    return (
                      <div
                        className="absolute pointer-events-auto"
                        style={{
                          transform: `translate(${radarX}px, ${radarY}px) rotate(${simHdg}deg)`,
                          transition: "transform 0.08s linear",
                          zIndex: 60,
                        }}
                      >
                        <svg
                          width="68"
                          height="68"
                          viewBox="0 0 100 100"
                          fill="none"
                          style={{ filter: "drop-shadow(0 0 14px #C084FC)" }}
                        >
                          <circle cx="50" cy="54" r="38" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="4 4" />
                          <line x1="50" y1="54" x2="22" y2="76" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="22" y2="76" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="78" y2="76" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="78" y2="76" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="20" y2="40" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="20" y2="40" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="80" y2="40" stroke="#05080C" strokeWidth="5" strokeLinecap="round" />
                          <line x1="50" y1="54" x2="80" y2="40" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="22" cy="76" r="9.5" fill="#0A0F16" stroke="#4C1D95" strokeWidth="2" />
                          <circle cx="22" cy="76" r="4" fill="#F472B6" fillOpacity="0.9" />
                          <circle cx="78" cy="76" r="9.5" fill="#0A0F16" stroke="#4C1D95" strokeWidth="2" />
                          <circle cx="78" cy="76" r="4" fill="#F472B6" fillOpacity="0.9" />
                          <circle cx="20" cy="40" r="9.5" fill="#0A0F16" stroke="#C084FC" strokeWidth="2" />
                          <circle cx="20" cy="40" r="4" fill="#E879F9" />
                          <circle cx="80" cy="40" r="9.5" fill="#0A0F16" stroke="#C084FC" strokeWidth="2" />
                          <circle cx="80" cy="40" r="4" fill="#E879F9" />
                          <rect x="38" y="42" width="24" height="26" rx="6" fill="#0E071A" stroke="#7E22CE" strokeWidth="2" />
                          <circle cx="50" cy="54" r="4" fill="#C084FC" stroke="#0E071A" strokeWidth="1.2" />
                          <polygon points="50,3 67,35 50,25 33,35" fill="#04070A" stroke="#04070A" strokeWidth="3.5" strokeLinejoin="round" />
                          <polygon points="50,5 65,33 50,24 35,33" fill="#C084FC" stroke="#C084FC" strokeWidth="1.2" strokeLinejoin="round" />
                          <polygon points="50,5 65,33 50,24" fill="#9333EA" fillOpacity="0.5" />
                          <line x1="50" y1="6" x2="50" y2="24" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <div className="absolute top-[70px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[9.5px] font-mono font-bold text-[#F3E8FF] bg-[#160B24F0] border border-[#C084FC] px-1.5 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            SIMULATION · {Math.round(simAlt)}m
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Status indicator on Radar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                  <span className="text-[9.5px] font-mono text-[#8E9EAA] bg-[#080C14CC] border border-[#1E293B] px-2.5 py-1 rounded shadow">
                    {positionSource === PositionSource.LIVE
                      ? "LIVE ● DRONE GPS ACTIVE"
                      : isDroneConnected
                      ? "STANDBY ● WAITING FOR LIVE GPS (HYDERABAD FALLBACK)"
                      : "FALLBACK ● HYDERABAD (DEVELOPMENT MODE)"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

export default MapContainer;

