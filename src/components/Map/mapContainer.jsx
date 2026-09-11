import { useEffect, useRef, useState, useId } from "react";
import { useTelemetry } from "@/context/TelemetryContext.jsx";

const SATELLITE_SOURCE_ID = "aeronexus-satellite-source";
const SATELLITE_LAYER_ID = "aeronexus-satellite-layer";

const getUnderlyingMap = (map) => {
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

const ensureSatelliteLayer = (mapInstance, isSatellite = false, onDone) => {
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
      console.warn("[MapContainer] Satellite layer add note:", err.message);
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

const applyMapStyle = (mapInstance, mapStyle, polylineRef) => {
  if (!mapInstance) return;
  const isSatellite = mapStyle === "satellite";
  const map = getUnderlyingMap(mapInstance);
  if (!map) return;

  const updateVisibility = (m) => {
    if (typeof m.setLayoutProperty === "function" && m.getLayer?.(SATELLITE_LAYER_ID)) {
      try {
        m.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", isSatellite ? "visible" : "none");

        if (isSatellite) {
          // Bring satellite layer to top of all base vector layers so it is fully visible
          m.moveLayer(SATELLITE_LAYER_ID);

          // If polyline trail exists, bring it above satellite layer
          if (polylineRef?.current && typeof polylineRef.current.setTop === "function") {
            polylineRef.current.setTop();
          }
        }
      } catch (err) {
        console.debug("[MapContainer] Style visibility note:", err.message);
      }
    }
  };

  ensureSatelliteLayer(map, isSatellite, updateVisibility);
  updateVisibility(map);
};

/**
 * Builds custom AeroNexus top-down drone aircraft marker HTML
 * Features prominent 1.5x length directional arrow, red rear beacons, and zoom scaler
 * Top nose arrow points North (0° / Up)
 */
const buildDroneMarkerHtml = (callsign, initialHeading = 0) => {
  return `
    <div class="drone-marker-shell" style="position: relative; width: 68px; height: 68px; cursor: pointer; pointer-events: auto; z-index: 50;">
      <!-- Scaler wrapper for responsive map zoom scaling -->
      <div class="drone-marker-scaler" style="position: relative; width: 100%; height: 100%; transform: scale(1); transform-origin: 50% 50%; transition: transform 0.2s ease;">
        <!-- Rotator Element: pivots around center (50% 50%), isolates rotation from Mappls translation -->
        <div class="drone-marker-rotator" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform-origin: 50% 50%; transform: rotate(${initialHeading}deg); transition: transform 0.08s linear; will-change: transform;">
          <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 10px rgba(53, 224, 255, 0.75)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.9));">
            <!-- Subtle Range / Sensor Circle -->
            <circle cx="50" cy="54" r="38" stroke="#35E0FF" stroke-width="1.2" stroke-opacity="0.22" stroke-dasharray="4 4" />

            <!-- Rear Motor Carbon Arms -->
            <line x1="50" y1="54" x2="22" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="22" y2="76" stroke="#1F3A4E" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#1F3A4E" stroke-width="2.5" stroke-linecap="round" />

            <!-- Front Motor Carbon Arms -->
            <line x1="50" y1="54" x2="20" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="20" y2="40" stroke="#35E0FF" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#35E0FF" stroke-width="2.5" stroke-linecap="round" />

            <!-- Rear Motors / Rotors (Distinct crimson/amber nav beacons for rear distinction) -->
            <circle cx="22" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" stroke-width="2" />
            <circle cx="22" cy="76" r="4" fill="#FF4757" fill-opacity="0.85" />
            <circle cx="78" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" stroke-width="2" />
            <circle cx="78" cy="76" r="4" fill="#FF4757" fill-opacity="0.85" />

            <!-- Front Motors / Rotors (Cyan motor hubs) -->
            <circle cx="20" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" stroke-width="2" />
            <circle cx="20" cy="40" r="4" fill="#35E0FF" />
            <circle cx="80" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" stroke-width="2" />
            <circle cx="80" cy="40" r="4" fill="#35E0FF" />

            <!-- Central Avionics Body / Fuselage -->
            <rect x="38" y="42" width="24" height="26" rx="6" fill="#070B10" stroke="#224054" stroke-width="2" />
            <!-- Center Status Core (Emerald Green LED) -->
            <circle cx="50" cy="54" r="4" fill="#2FE089" stroke="#070B10" stroke-width="1.2" />

            <!-- PROMINENT DIRECTIONAL ARROW / NOSE (1.5x body length, pointing North / 0° forward) -->
            <!-- High-contrast dark outline -->
            <polygon points="50,3 67,35 50,25 33,35" fill="#04070A" stroke="#04070A" stroke-width="3.5" stroke-linejoin="round" />
            <!-- Bright Neon Cyan Primary Arrow -->
            <polygon points="50,5 65,33 50,24 35,33" fill="#35E0FF" stroke="#35E0FF" stroke-width="1.2" stroke-linejoin="round" />
            <!-- Directional Facet Highlight & White Spine Keel -->
            <polygon points="50,5 65,33 50,24" fill="#1EB8D8" fill-opacity="0.5" />
            <line x1="50" y1="6" x2="50" y2="24" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Callsign Badge (Anchored below, non-rotating so text remains horizontal) -->
        <div style="position: absolute; top: 70px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;">
          <span style="display: inline-block; font-family: monospace; font-size: 9.5px; font-weight: 700; color: #35E0FF; background: rgba(8, 12, 20, 0.92); border: 1px solid rgba(53, 224, 255, 0.5); padding: 1px 5px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.7); letter-spacing: 0.05em;">
            ${callsign}
          </span>
        </div>
      </div>
    </div>
  `;
};

const MapContainer = ({ mapStyle = "normal", telemetry: propTelemetry }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const markerRotatorRef = useRef(null);
  const autoId = useId();
  const mapId = `mappls-map-${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markerScalerRef = useRef(null);
  const polylineRef = useRef(null);
  const [sdkAvailable, setSdkAvailable] = useState(() => typeof window !== "undefined" && Boolean(window.mappls));

  const { telemetry: contextTelemetry, selectedDroneId } = useTelemetry();
  // Single source of truth: prioritize passed active telemetry
  const telemetry = propTelemetry || contextTelemetry;

  const droneCallsign = selectedDroneId || "DRONE-001";
  const lat = typeof telemetry.latitude === "number" ? telemetry.latitude : 17.385000;
  const lng = typeof telemetry.longitude === "number" ? telemetry.longitude : 78.486700;
  const heading = typeof telemetry.heading === "number" ? telemetry.heading : 0;

  const mapStyleRef = useRef(mapStyle);

  // Smoothing refs
  const currentPosRef = useRef({ lat, lng });
  const targetPosRef = useRef({ lat, lng });
  const renderedHeadingRef = useRef(heading);
  const trailCoordsRef = useRef([{ lat, lng }]);

  // Keep targetPosRef up to date with telemetry GPS
  useEffect(() => {
    targetPosRef.current = { lat, lng };
  }, [lat, lng]);

  useEffect(() => {
    mapStyleRef.current = mapStyle;
    applyMapStyle(mapRef.current, mapStyle, polylineRef);
  }, [mapStyle]);

  // Initialize Mappls Map with async SDK readiness polling & unique element ID
  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

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
        const map = new window.mappls.Map(mapId, {
          center: [lat, lng],
          zoom: 15,
          hybrid: mapStyle === "satellite",
          fullscreenControl: false,
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

        const onMapReady = () => {
          if (cancelled) return;
          setSdkAvailable(true);
          map.resize?.();

          // Initialize satellite layer and apply style
          ensureSatelliteLayer(map, mapStyleRef.current === "satellite");
          applyMapStyle(map, mapStyleRef.current, polylineRef);

          // Initialize custom top-down drone marker on map
          try {
            if (typeof window.mappls.Marker === "function" && !markerRef.current) {
              markerRef.current = new window.mappls.Marker({
                map,
                position: { lat, lng },
                html: buildDroneMarkerHtml(droneCallsign, heading),
              });

              // Cache reference to the inner rotating and scaling DOM nodes
              setTimeout(() => {
                const el = markerRef.current?.getElement?.();
                if (el) {
                  markerRotatorRef.current = el.querySelector(".drone-marker-rotator");
                  markerScalerRef.current = el.querySelector(".drone-marker-scaler");
                }
              }, 60);

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
            }
          } catch (markerErr) {
            console.warn("[MapContainer] Marker creation note:", markerErr.message);
          }
        };

        const handleStyleLoad = () => {
          if (cancelled) return;
          ensureSatelliteLayer(map, mapStyleRef.current === "satellite");
          applyMapStyle(map, mapStyleRef.current, polylineRef);
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

      // Observe and guarantee bottom-left MAPPLS / MapmyIndia banner is hidden
      const container = document.getElementById(mapId);
      let attribObserver = null;
      if (container) {
        const hideBottomLeftBanner = () => {
          const els = container.querySelectorAll(
            '.cst-attrib-cont > a, [id^="watermark_logo"], img[src*="mappls_mmi"], .maplibregl-ctrl-bottom-left a[href*="mappls"], .mapboxgl-ctrl-bottom-left a[href*="mappls"]'
          );
          els.forEach((el) => {
            if (el.style.display !== "none") {
              el.style.setProperty("display", "none", "important");
              el.style.setProperty("visibility", "hidden", "important");
              el.style.setProperty("pointer-events", "none", "important");
            }
          });
        };
        hideBottomLeftBanner();
        attribObserver = new MutationObserver(hideBottomLeftBanner);
        attribObserver.observe(container, { childList: true, subtree: true });
      }

      return () => {
        cancelled = true;
        if (attribObserver) attribObserver.disconnect();
        if (pollTimer) clearInterval(pollTimer);
        if (polylineRef.current?.remove) {
          try {
            polylineRef.current.remove();
          } catch {
            // Safe ignore
          }
        }
        if (markerRef.current?.remove) {
          try {
            markerRef.current.remove();
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


  // Shortest-path angle interpolation for smooth heading rotation (359° -> 0° safe)
  useEffect(() => {
    const targetHeading = ((heading % 360) + 360) % 360;
    const prevAngle = renderedHeadingRef.current;

    // Shortest angular difference (-180 to +180)
    const diff = ((targetHeading - (prevAngle % 360) + 540) % 360) - 180;
    const nextContinuousAngle = prevAngle + diff;
    renderedHeadingRef.current = nextContinuousAngle;

    // Rotate the inner marker element
    if (markerRotatorRef.current) {
      markerRotatorRef.current.style.transform = `rotate(${nextContinuousAngle}deg)`;
    } else {
      const el = markerRef.current?.getElement?.();
      const rot = el?.querySelector(".drone-marker-rotator");
      if (rot) {
        markerRotatorRef.current = rot;
        rot.style.transform = `rotate(${nextContinuousAngle}deg)`;
      }
    }

    // Call native setRotation fallback if available
    try {
      markerRef.current?.setRotation?.(targetHeading);
    } catch {
      // Safe catch
    }
  }, [heading]);

  // 60 FPS smooth position lerp interpolation & movement trail manager
  useEffect(() => {
    let animId;

    const animateMovement = () => {
      const current = currentPosRef.current;
      const target = targetPosRef.current;

      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;
      const distSq = dLat * dLat + dLng * dLng;

      if (distSq > 0.000000000001) {
        // Smooth lerp tracking (avoids jitter and sudden teleportation)
        const lerpFactor = 0.26;
        current.lat += dLat * lerpFactor;
        current.lng += dLng * lerpFactor;

        // Update Mappls Marker position
        if (markerRef.current) {
          try {
            if (typeof markerRef.current.setPosition === "function") {
              markerRef.current.setPosition({ lat: current.lat, lng: current.lng });
            } else if (typeof markerRef.current.setLngLat === "function") {
              markerRef.current.setLngLat([current.lng, current.lat]);
            } else if (typeof markerRef.current.setPoint === "function") {
              markerRef.current.setPoint([current.lat, current.lng]);
            }
          } catch {
            // Safe ignore
          }
        }

        // Manage lightweight flight breadcrumb trail (last 40 points)
        const trail = trailCoordsRef.current;
        const lastPt = trail[trail.length - 1];
        const stepDistSq = lastPt
          ? Math.pow(current.lat - lastPt.lat, 2) + Math.pow(current.lng - lastPt.lng, 2)
          : 1;

        if (stepDistSq > 0.000000002) {
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
    <div ref={containerRef} className="map-shell relative h-full w-full bg-[#070B10] overflow-hidden">
      <div
        id={mapId}
        className="map-root h-full w-full"
        style={{ width: "100%", height: "100%", position: "relative" }}
      />

      {/* Fallback Tactical Radar View when Mappls CDN is offline */}
      {!sdkAvailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#070B12] pointer-events-none">
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
          <div className="relative flex items-center justify-center w-[360px] h-[360px] rounded-full border border-[#1A3344] opacity-40">
            <div className="w-[260px] h-[260px] rounded-full border border-[#20445C] opacity-60" />
            <div className="absolute w-[160px] h-[160px] rounded-full border border-[#35E0FF44] opacity-80" />
            <div className="absolute w-full h-[1px] bg-[#35E0FF22]" />
            <div className="absolute h-full w-[1px] bg-[#35E0FF22]" />

            {/* Directional Cardinal Labels */}
            <span className="absolute top-2 text-[10px] font-mono font-bold text-[#35E0FF]">N (0°)</span>
            <span className="absolute right-2 text-[10px] font-mono text-[#8E9EAA]">E (90°)</span>
            <span className="absolute bottom-2 text-[10px] font-mono text-[#8E9EAA]">S (180°)</span>
            <span className="absolute left-2 text-[10px] font-mono text-[#8E9EAA]">W (270°)</span>

            {/* Tactical Drone Marker Center (Fallback) */}
            <div
              className="absolute pointer-events-auto"
              style={{
                transform: `rotate(${heading}deg)`,
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
          </div>
        </div>
      )}
    </div>
  );
};

export default MapContainer;

