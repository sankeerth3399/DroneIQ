import { useEffect, useRef, useState, useId, useMemo, useCallback } from "react";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import {
  OPERATIONAL_MAP_ZOOM,
  FALLBACK_DRONE_LOCATION,
  GLOBAL_DEFAULT_CENTER,
  GLOBAL_DEFAULT_ZOOM,
  PositionSource,
  isValidGpsCoordinate,
} from "@/services/telemetry/telemetryTypes.js";
import { resolveInitialMapState } from "@/config/mapConfig.js";
import { ensureSatelliteLayer, applyMapStyle } from "./satelliteLayerHelper.js";
import { buildDroneMarkerHtml } from "./droneMarkerHelper.js";
import { buildWaypointMarkerHtml } from "./waypointMarkerHelper.js";
import { syncGeofenceLayers, buildGeofenceVertexMarkerHtml } from "./geofenceLayerHelper.js";
import {
  syncMissionRoute,
  syncDirectionMarkers,
  removeRouteLayers,
} from "./routeLayerHelper.js";

const MapContainer = ({
  mapStyle = "normal",
  telemetry: propTelemetry,
  waypoints = [],
  selectedWaypointId = null,
  onWaypointSelect,
  onWaypointDrag,
  onWaypointDragEnd,
  onMapClick,
  isPlacingWaypoint = false,
  showMissionRoute = true,
  geofence = null,
  isDrawingGeofence = false,
  isEditingGeofence = false,
  onGeofenceVertexDrag,
  onGeofenceVertexDragEnd,
  routeViolations = [],
  invalidClickPoint = null,
  followDrone = false,
  pageType = "fly",
  initialCenter: propInitialCenter = null,
  initialZoom: propInitialZoom = null,
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const markerRotatorRef = useRef(null);
  const invalidMarkerRef = useRef(null);
  const autoId = useId();
  const mapId = `mappls-map-${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markerScalerRef = useRef(null);
  const polylineRef = useRef(null);
  const [sdkAvailable, setSdkAvailable] = useState(() => typeof window !== "undefined" && Boolean(window.mappls));

  const effectivePageType = useMemo(() => {
    if (pageType) return String(pageType).toLowerCase().trim();
    if (isDrawingGeofence || isEditingGeofence) return "geofence";
    if (isPlacingWaypoint || (waypoints && waypoints.length > 0)) return "waypoints";
    return "fly";
  }, [pageType, isDrawingGeofence, isEditingGeofence, isPlacingWaypoint, waypoints]);

  const {
    telemetry: contextTelemetry,
    selectedDroneId,
    connectionState: contextConnectionState,
    isLive: contextIsLive,
    isStale: contextIsStale,
  } = useTelemetry();

  // Single source of truth: prioritize passed active telemetry
  const telemetry = propTelemetry || contextTelemetry;
  const droneCallsign = selectedDroneId || "DRONE-001";

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
  const hasLiveDroneLocation = Boolean(isDroneConnected && !isTelemetryStale && hasValidGps);

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

  const mapStyleRef = useRef(mapStyle);

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
              html: buildDroneMarkerHtml(droneCallsign, heading),
            });
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
          } catch {
            // Safe ignore
          }
        }

        // 2. Center map on exact live GPS coordinate and zoom into operational level (15) ONLY for Fly page
        if (effectivePageType === "fly" && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
          try {
            if (typeof map.flyTo === "function") {
              map.flyTo({
                center: [activeLat, activeLng],
                zoom: OPERATIONAL_MAP_ZOOM,
                duration: 1200,
              });
            } else if (typeof map.setCenter === "function") {
              map.setCenter([activeLat, activeLng]);
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
              html: buildDroneMarkerHtml(droneCallsign, heading),
            });
            attachMarkerDomRefs();
          } catch (err) {
            console.warn("[MapContainer] Marker re-creation error:", err.message);
          }
        }

        // Follow drone ONLY if followDrone is enabled, user hasn't panned, and not drawing geofence
        if (followDrone && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
          try {
            if (typeof map.panTo === "function") {
              map.panTo([activeLat, activeLng]);
            } else if (typeof map.setCenter === "function") {
              map.setCenter([activeLat, activeLng]);
            }
          } catch {
            // Safe ignore
          }
        }
      }
    } else {
      // SCENARIO B: HYDERABAD FALLBACK (Disconnected or no valid live GPS)
      // If we previously had a live connection and the drone just disconnected:
      if (prevSource === PositionSource.LIVE || hasHadFirstFixRef.current) {
        hasHadFirstFixRef.current = false;
        userHasPannedRef.current = false;
        currentPosRef.current = { lat: FALLBACK_DRONE_LOCATION.latitude, lng: FALLBACK_DRONE_LOCATION.longitude };
        targetPosRef.current = { lat: FALLBACK_DRONE_LOCATION.latitude, lng: FALLBACK_DRONE_LOCATION.longitude };

        // Return camera to neutral global default view (zoom 2, center [20, 0]) ONLY for Fly page
        if (effectivePageType === "fly") {
          try {
            if (typeof map.flyTo === "function") {
              map.flyTo({
                center: [GLOBAL_DEFAULT_CENTER.latitude, GLOBAL_DEFAULT_CENTER.longitude],
                zoom: GLOBAL_DEFAULT_ZOOM,
                duration: 1000,
              });
            } else if (typeof map.setCenter === "function") {
              map.setCenter([GLOBAL_DEFAULT_CENTER.latitude, GLOBAL_DEFAULT_CENTER.longitude]);
              map.setZoom(GLOBAL_DEFAULT_ZOOM);
            }
          } catch (err) {
            console.debug("[MapContainer] Reset view error:", err.message);
          }
        }

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

      // Ensure marker is placed at active coordinates (starting at Hyderabad fallback location)
      if (!markerRef.current && typeof window.mappls.Marker === "function") {
        try {
          markerRef.current = new window.mappls.Marker({
            map,
            position: { lat: activeLat, lng: activeLng },
            html: buildDroneMarkerHtml(droneCallsign, heading),
          });
          attachMarkerDomRefs();
        } catch (err) {
          console.warn("[MapContainer] Marker creation error:", err.message);
        }
      }

      // Follow drone if followDrone is enabled, user hasn't panned, and not drawing geofence
      if (followDrone && !userHasPannedRef.current && !isDrawingOrEditingGeofence && !isPlacingWaypoint) {
        try {
          if (typeof map.panTo === "function") {
            map.panTo([activeLat, activeLng]);
          } else if (typeof map.setCenter === "function") {
            map.setCenter([activeLat, activeLng]);
          }
        } catch {
          // Safe ignore
        }
      }
    }
  }, [
    positionSource,
    isDroneConnected,
    isTelemetryStale,
    activeLat,
    activeLng,
    heading,
    droneCallsign,
    followDrone,
    isDrawingOrEditingGeofence,
    isPlacingWaypoint,
    attachMarkerDomRefs,
    effectivePageType,
  ]);

  useEffect(() => {
    mapStyleRef.current = mapStyle;
    applyMapStyle(mapRef.current, mapStyle, polylineRef);
  }, [mapStyle]);

  // Mission Planning Waypoint Refs & Dynamic Synchronization
  const waypointMarkersRef = useRef(new Map());
  const directionMarkersRef = useRef(new Map());
  const draggingWaypointIdRef = useRef(null);
  const missionPolylineRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  const onWaypointSelectRef = useRef(onWaypointSelect);
  const onWaypointDragRef = useRef(onWaypointDrag);
  const onWaypointDragEndRef = useRef(onWaypointDragEnd);

  // Geofence Dynamic Synchronization Refs
  const geofenceMarkersRef = useRef(new Map());
  const onGeofenceVertexDragRef = useRef(onGeofenceVertexDrag);
  const onGeofenceVertexDragEndRef = useRef(onGeofenceVertexDragEnd);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onWaypointSelectRef.current = onWaypointSelect;
    onWaypointDragRef.current = onWaypointDrag;
    onWaypointDragEndRef.current = onWaypointDragEnd;
    onGeofenceVertexDragRef.current = onGeofenceVertexDrag;
    onGeofenceVertexDragEndRef.current = onGeofenceVertexDragEnd;
  }, [onMapClick, onWaypointSelect, onWaypointDrag, onWaypointDragEnd, onGeofenceVertexDrag, onGeofenceVertexDragEnd]);

  const geofenceCoords = useMemo(() => {
    if (Array.isArray(geofence)) return geofence;
    if (Array.isArray(geofence?.polygon)) return geofence.polygon;
    if (Array.isArray(geofence?.coordinates)) return geofence.coordinates;
    return [];
  }, [geofence]);

  // Synchronize Geofence and Route Violation Layers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncGeofenceLayers(map, geofenceCoords, routeViolations);
  }, [geofenceCoords, routeViolations, mapStyle]);

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

  // Synchronize Geofence Vertex Handles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    const currentMarkers = geofenceMarkersRef.current;
    const showMarkers = isEditingGeofence || isDrawingGeofence;

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

    const nextIndices = new Set(geofenceCoords.map((_, i) => i));

    for (const [idx, markerObj] of currentMarkers.entries()) {
      if (!nextIndices.has(idx)) {
        try {
          markerObj.marker?.remove?.();
        } catch {
          // Safe ignore
        }
        currentMarkers.delete(idx);
      }
    }

    geofenceCoords.forEach((pt, idx) => {
      const existing = currentMarkers.get(idx);
      if (existing) {
        try {
          if (typeof existing.marker.setPosition === "function") {
            existing.marker.setPosition({ lat: pt.lat, lng: pt.lng });
          } else if (typeof existing.marker.setLngLat === "function") {
            existing.marker.setLngLat([pt.lng, pt.lat]);
          }
        } catch (err) {
          console.debug("[MapContainer] Geofence marker update note:", err.message);
        }
      } else {
        try {
          const html = buildGeofenceVertexMarkerHtml(idx);
          const marker = new window.mappls.Marker({
            map,
            position: { lat: pt.lat, lng: pt.lng },
            html,
            draggable: isEditingGeofence,
          });

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
                  });
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
                  onGeofenceVertexDragEndRef.current?.(idx, {
                    lat: Number(Number(pLat).toFixed(6)),
                    lng: Number(Number(pLng).toFixed(6)),
                  });
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

          currentMarkers.set(idx, { marker, html });
        } catch (err) {
          console.warn("[MapContainer] Geofence vertex creation note:", err.message);
        }
      }
    });
  }, [geofenceCoords, isEditingGeofence, isDrawingGeofence]);

  // Synchronize Waypoint Markers & Mission Route on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mappls) return;

    const currentMarkers = waypointMarkersRef.current;
    const nextIds = new Set(waypoints.map((w) => w.id));

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
    waypoints.forEach((wp) => {
      const isSelected = wp.id === selectedWaypointId;
      const existing = currentMarkers.get(wp.id);

      if (existing) {
        try {
          if (draggingWaypointIdRef.current !== wp.id) {
            if (typeof existing.marker.setPosition === "function") {
              existing.marker.setPosition({ lat: wp.lat, lng: wp.lng });
            } else if (typeof existing.marker.setLngLat === "function") {
              existing.marker.setLngLat([wp.lng, wp.lat]);
            }
          }

          const newHtml = buildWaypointMarkerHtml(wp, isSelected);
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
          const markerHtml = buildWaypointMarkerHtml(wp, isSelected);
          const marker = new window.mappls.Marker({
            map,
            position: { lat: wp.lat, lng: wp.lng },
            html: markerHtml,
            draggable: true,
          });

          const handleDrag = () => {
            try {
              draggingWaypointIdRef.current = wp.id;
              const pos = marker.getPosition?.() || marker.getLngLat?.();
              if (pos) {
                const pLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
                const pLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
                onWaypointDragRef.current?.(wp.id, {
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
                onWaypointDragEndRef.current?.(wp.id, {
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
            const el = marker.getElement?.();
            if (el) {
              el.addEventListener("click", (evt) => {
                evt.stopPropagation();
                onWaypointSelectRef.current?.(wp.id);
              });
            }
          }, 60);

          currentMarkers.set(wp.id, { marker, html: markerHtml });
        } catch (err) {
          console.warn("[MapContainer] Waypoint marker creation note:", err.message);
        }
      }
    });

    // 3. Synchronize Straight Mission Route Layers & Direction Chevrons
    syncMissionRoute(map, waypoints, showMissionRoute, mapStyle === "satellite");
    syncDirectionMarkers(map, waypoints, showMissionRoute, directionMarkersRef);

    // 4. Also keep Mappls Polyline (if available) synced for dual compatibility
    if (showMissionRoute && waypoints.length >= 2) {
      const path = waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
      try {
        const PolylineConstructor = window.mappls?.Polyline || window.mappls?.polyline;
        if (missionPolylineRef.current && typeof missionPolylineRef.current.setPath === "function") {
          missionPolylineRef.current.setPath(path);
          missionPolylineRef.current.setTop?.();
        } else if (!missionPolylineRef.current && PolylineConstructor) {
          missionPolylineRef.current = new PolylineConstructor({
            map,
            path,
            strokeColor: "#35E0FF",
            strokeWeight: 3.5,
            strokeOpacity: 0.85,
          });
          missionPolylineRef.current.setTop?.();
        }
      } catch (err) {
        console.debug("[MapContainer] Mission polyline update note:", err.message);
      }
    } else if (missionPolylineRef.current && waypoints.length < 2) {
      try {
        missionPolylineRef.current.remove?.();
      } catch {
        // Safe ignore
      }
      missionPolylineRef.current = null;
    }
  }, [waypoints, selectedWaypointId, showMissionRoute, mapStyle]);

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

        const map = new window.mappls.Map(mapId, {
          center: initialCenter,
          zoom: initialZoom,
          hybrid: mapStyle === "satellite",
          fullscreenControl: false,
          zoomControl: false,
          rotateControl: false,
          scrollZoom: true,
          doubleClickZoom: true,
          touchZoomRotate: true,
          dragPan: true,
        });

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

        // Map Click Listener for Waypoint Placement Mode & Geofence Drawing
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
          onMapClickRef.current?.({
            lat: Number(Number(e.lngLat.lat).toFixed(6)),
            lng: Number(Number(e.lngLat.lng).toFixed(6)),
          });
        });

        const onMapReady = () => {
          if (cancelled) return;
          setSdkAvailable(true);
          map.resize?.();

          // Initialize satellite layer and apply style
          ensureSatelliteLayer(map, mapStyleRef.current === "satellite");
          applyMapStyle(map, mapStyleRef.current, polylineRef);
          syncGeofenceLayers(map, geofenceCoords, routeViolations);
          syncMissionRoute(map, waypoints, showMissionRoute, mapStyleRef.current === "satellite");
          syncDirectionMarkers(map, waypoints, showMissionRoute, directionMarkersRef);

          // Track user map pan/drag to decouple camera centering from live marker updates
          map.on("dragstart", () => {
            userHasPannedRef.current = true;
          });

          // Responsive zoom scaling listener
          const handleZoom = () => {
            if (markerScalerRef.current && typeof map.getZoom === "function") {
              const z = map.getZoom();
              const scale = z < 12 ? 0.82 : z > 16 ? 1.15 : 1.0;
              markerScalerRef.current.style.transform = `scale(${scale})`;
            }
          };
          map.on("zoom", handleZoom);
          map.on("zoomend", () => {
            map.resize?.();
          });

          // Initialize custom top-down drone marker (Live GPS or Hyderabad Fallback)
          if (typeof window.mappls.Marker === "function" && !markerRef.current) {
            if (hasLiveDroneLocation) {
              hasHadFirstFixRef.current = true;
            }
            try {
              markerRef.current = new window.mappls.Marker({
                map,
                position: { lat: activeLat, lng: activeLng },
                html: buildDroneMarkerHtml(droneCallsign, heading),
              });
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
          syncGeofenceLayers(map, geofenceCoords, routeViolations);
          syncMissionRoute(map, waypoints, showMissionRoute, mapStyleRef.current === "satellite");
          syncDirectionMarkers(map, waypoints, showMissionRoute, directionMarkersRef);
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
        const missionPolyline = missionPolylineRef.current;
        if (missionPolyline?.remove) {
          try {
            missionPolyline.remove();
          } catch {
            // Safe ignore
          }
        }
        missionPolylineRef.current = null;
        removeRouteLayers(mapRef.current, directionMarkersRef);

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

  // 60 FPS smooth position lerp interpolation & movement trail manager
  useEffect(() => {
    let animId;

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

      if (distSq > 1e-16) {
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

        // Update Mappls Marker position
        if (markerRef.current) {
          try {
            if (typeof markerRef.current.setPosition === "function") {
              markerRef.current.setPosition({ lat: current.lat, lng: current.lng });
            }
          } catch {
            // Ignore if method not supported on marker
          }
          try {
            if (typeof markerRef.current.setLngLat === "function") {
              markerRef.current.setLngLat([current.lng, current.lat]);
            }
          } catch {
            // Ignore if method not supported on marker
          }
          try {
            if (markerRef.current._marker && typeof markerRef.current._marker.setLngLat === "function") {
              markerRef.current._marker.setLngLat([current.lng, current.lat]);
            }
          } catch {
            // Ignore if method not supported on marker
          }
          try {
            if (typeof markerRef.current.setPoint === "function") {
              markerRef.current.setPoint([current.lat, current.lng]);
            }
          } catch {
            // Ignore if method not supported on marker
          }
        }

        // Manage lightweight flight breadcrumb trail (last 40 points)
        const trail = trailCoordsRef.current;
        const lastPt = trail[trail.length - 1];
        const stepDistSq = lastPt
          ? Math.pow(current.lat - lastPt.lat, 2) + Math.pow(current.lng - lastPt.lng, 2)
          : 1;

        if (stepDistSq > 0.0000000005) {
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

    animId = requestAnimationFrame(animateMovement);
    return () => cancelAnimationFrame(animId);
  }, []);

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
              onClick={(e) => {
                if (!isPlacingWaypoint && !isDrawingGeofence) return;
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
                isPlacingWaypoint || isDrawingGeofence ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
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
              <div className="relative flex items-center justify-center w-[360px] h-[360px] rounded-full border border-[#1A3344] opacity-80">
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

                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;
                        const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

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
                            {/* Directional Chevron at midpoint pointing towards next waypoint */}
                            <path
                              d="M-3,-3.5 L3,0 L-3,3.5"
                              stroke="#35E0FF"
                              strokeWidth="1.8"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}
                            />
                          </g>
                        );
                      })}
                    </g>
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

                  {/* Waypoints Dots */}
                  {waypoints.map((pt, i) => {
                    const dLatM = (pt.lat - radarRefLat) * 111139;
                    const dLngM = (pt.lng - radarRefLng) * (111139 * Math.cos((radarRefLat * Math.PI) / 180));
                    const x = 180 + dLngM * 0.8;
                    const y = 180 - dLatM * 0.8;
                    return (
                      <circle
                        key={pt.id || i}
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#35E0FF"
                        stroke="#030712"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Geofence Vertices */}
                  {(isDrawingGeofence || isEditingGeofence) &&
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
                          {droneCallsign}
                        </span>
                      </div>
                    </div>
                  );
                })()}

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

