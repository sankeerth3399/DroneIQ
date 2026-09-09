import { useEffect, useRef } from "react";
import { useTelemetry } from "@/context/TelemetryContext.jsx";

const applyMapStyle = (map, mapStyle) => {
  if (!map) return;

  const isSatellite = mapStyle === "satellite";

  if (typeof map.setHybrid === "function") {
    map.setHybrid(isSatellite);
    return;
  }

  if (typeof map.setStyle === "function") {
    const styles = window.mappls?.MapStyle;
    const nextStyle = isSatellite
      ? styles?.SATELLITE || "satellite"
      : styles?.STANDARD || "standard";
    map.setStyle(nextStyle);
    return;
  }

  if (typeof map.setMapType === "function") {
    map.setMapType(isSatellite ? 1 : 0);
  }
};

const MapContainer = ({ mapStyle = "normal" }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const { telemetry, selectedDroneId } = useTelemetry();

  const lat = typeof telemetry.latitude === "number" ? telemetry.latitude : 17.385;
  const lng = typeof telemetry.longitude === "number" ? telemetry.longitude : 78.4867;
  const heading = typeof telemetry.heading === "number" ? telemetry.heading : 0;

  // Initialize Mappls Map
  useEffect(() => {
    if (!window.mappls) {
      console.warn("[MapContainer] Mappls SDK is NOT loaded; running in fallback mode.");
      return;
    }

    try {
      const map = new window.mappls.Map("map", {
        center: [lat, lng],
        zoom: 15,
        hybrid: mapStyle === "satellite",
      });

      mapRef.current = map;

      map.on("load", () => {
        map.resize?.();
        applyMapStyle(map, mapStyle);

        // Initialize drone marker on map
        try {
          if (typeof window.mappls.Marker === "function") {
            markerRef.current = new window.mappls.Marker({
              map,
              position: { lat, lng },
              title: selectedDroneId || "Drone",
            });
          }
        } catch (markerErr) {
          console.warn("[MapContainer] Marker creation note:", markerErr.message);
        }
      });
    } catch (err) {
      console.warn("[MapContainer] Map initialization error:", err.message);
    }
  }, []);

  // Sync map style changes
  useEffect(() => {
    applyMapStyle(mapRef.current, mapStyle);
  }, [mapStyle]);

  // Update marker position dynamically when telemetry updates without recreating map
  useEffect(() => {
    if (!markerRef.current) return;

    try {
      const marker = markerRef.current;
      if (typeof marker.setPosition === "function") {
        marker.setPosition({ lat, lng });
      } else if (typeof marker.setLngLat === "function") {
        marker.setLngLat([lng, lat]);
      } else if (typeof marker.setPoint === "function") {
        marker.setPoint([lat, lng]);
      }

      if (typeof marker.setRotation === "function") {
        marker.setRotation(heading);
      }
    } catch (err) {
      console.debug("[MapContainer] Telemetry marker update note:", err.message);
    }
  }, [lat, lng, heading]);

  // Handle container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeMap = () => {
      mapRef.current?.resize?.();
    };

    const observer = new ResizeObserver(resizeMap);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="map-shell relative h-full w-full">
      <div
        id="map"
        className="map-root h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Real-time Map Coordinates Chip */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#080C14D9] border border-[#1E293B] text-[10px] font-mono text-[#8E9EAA] shadow-lg backdrop-blur">
        <span>LAT: <strong className="text-[#35E0FF]">{lat.toFixed(6)}</strong></span>
        <span className="text-[#253342]">|</span>
        <span>LNG: <strong className="text-[#35E0FF]">{lng.toFixed(6)}</strong></span>
        <span className="text-[#253342]">|</span>
        <span>ALT: <strong className="text-[#2FE089]">{telemetry.altitude || 0}m</strong></span>
      </div>
    </div>
  );
};

export default MapContainer;
