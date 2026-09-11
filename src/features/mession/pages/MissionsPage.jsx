import { useState } from "react"
import MapLoad from "@/components/Map/mapContainer.jsx"
import { useDroneTelemetry } from "@/features/mession/hooks/useDroneTelemetry.js"

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
]

/**
 * MissionsPage - Dedicated Map-Only Mission View
 * Displays 100% full available content area map without flight controls or floating HUD widgets.
 * Maintains drone marker, heading, location updates, and map controls.
 */
const MissionsPage = () => {
  const [mapStyle, setMapStyle] = useState("normal")
  const { telemetry } = useDroneTelemetry()

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* 100% Full-bleed Map View */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MapLoad mapStyle={mapStyle} telemetry={telemetry} />
      </div>

      {/* Live Mission GPS & Telemetry Status Chip */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg px-3 py-1.5 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-[#2FE089] animate-pulse" />
        <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#35E0FF]">
          {typeof telemetry?.latitude === "number" ? telemetry.latitude.toFixed(6) : "17.385000"}° N, {typeof telemetry?.longitude === "number" ? telemetry.longitude.toFixed(6) : "78.486700"}° E
        </span>
        <span className="text-[10px] text-[#5D707C] font-mono">|</span>
        <span className="font-mono text-[10px] sm:text-xs text-[#94A3B8]">
          ALT {typeof telemetry?.altitude === "number" ? telemetry.altitude.toFixed(1) : "120.0"}m
        </span>
      </div>

      {/* Floating Map Style Selector (Normal / Satellite) */}
      <div className="absolute top-3 right-3 z-10 flex items-center bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg p-1 shadow-lg gap-1">
        {mapStyleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMapStyle(opt.id)}
            className={`px-2.5 py-1 text-[10px] sm:text-xs font-mono font-semibold rounded-md transition ${
              mapStyle === opt.id
                ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.25)]"
                : "text-[#5D707C] hover:text-[#94A3B8]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MissionsPage
