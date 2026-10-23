import { memo } from "react";
import { Plus, Minus, Crosshair, MousePointer, Shield } from "lucide-react";
import MapStyleToggle from "./MapStyleToggle.jsx";

/**
 * MapControls Component
 * Provides a clean, responsive control group in the top-right corner of the map:
 * 1. Horizontal segmented toggle for Normal / Satellite map style
 * 2. Optional Airspace (NFZ) toggle directly below map style
 * 3. Explicit zoom controls (+ / - / Reset View / Fit Mission) directly below
 * 4. Compact Scroll to Zoom option in a separate row below zoom controls
 *
 * @param {Object} props
 * @param {Function} props.onZoomIn - Zoom in callback
 * @param {Function} props.onZoomOut - Zoom out callback
 * @param {Function} [props.onResetView] - Reset view / fit mission callback
 * @param {boolean} props.scrollZoomEnabled - Current state of scroll-to-zoom
 * @param {Function} props.onToggleScrollZoom - Toggle scroll-to-zoom callback
 * @param {string} [props.position="top-right"] - "top-right" | "top-left" | "bottom-right" | "bottom-left"
 * @param {string} [props.fitMissionTitle="Reset View / Fit Mission"] - Tooltip text for fit mission
 * @param {string} [props.className=""] - Optional extra class names
 * @param {boolean} [props.showFitMission=true] - Whether to display the fit mission button
 * @param {"normal" | "satellite"} [props.mapStyle="normal"] - Currently selected map style
 * @param {Function} [props.onMapStyleChange] - Callback when user switches map style
 * @param {boolean} [props.showStyleToggle=false] - Whether to show the map style toggle
 * @param {boolean} [props.showAirspaceToggle=false] - Whether to show the Airspace (NFZ) toggle
 * @param {boolean} [props.airspaceEnabled=false] - Current active state of airspace layer
 * @param {Function} [props.onToggleAirspace] - Callback when user toggles airspace
 */
export const MapControls = memo(function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  scrollZoomEnabled = false,
  onToggleScrollZoom,
  position = "top-right",
  fitMissionTitle = "Reset View / Fit Mission",
  className = "",
  showFitMission = true,
  mapStyle = "normal",
  onMapStyleChange,
  showStyleToggle = false,
  showAirspaceToggle = false,
  airspaceEnabled = false,
  onToggleAirspace,
}) {
  const positionClasses = {
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }[position] || "top-3 right-3";

  const renderStyleToggle = showStyleToggle || typeof onMapStyleChange === "function";

  return (
    <div
      className={`absolute ${positionClasses} z-30 flex flex-col items-end gap-2 pointer-events-auto select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* 1. Horizontal Segmented Map Style Toggle (Normal / Satellite) */}
      {renderStyleToggle && (
        <MapStyleToggle
          currentStyle={mapStyle}
          onStyleChange={onMapStyleChange}
        />
      )}

      {/* 2. Airspace (NFZ) Toggle Button directly below map style toggle */}
      {showAirspaceToggle && typeof onToggleAirspace === "function" && (
        <button
          type="button"
          onClick={onToggleAirspace}
          aria-pressed={airspaceEnabled}
          title={
            airspaceEnabled
              ? "Airspace (NFZ) is ON — Click to hide Mappls No-Fly Zones"
              : "Airspace (NFZ) is OFF — Click to show Mappls No-Fly Zones"
          }
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-mono font-bold backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
            airspaceEnabled
              ? "bg-[#E11D48] text-white border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.4)]"
              : "bg-[#07101CEE] border-[#1C2C42] text-[#94A3B8] hover:text-white hover:border-[#38BDF8]/40 hover:bg-[#142338]"
          }`}
        >
          <Shield className={`w-3.5 h-3.5 shrink-0 ${airspaceEnabled ? "text-white" : "text-[#64748B]"}`} />
          <span>Airspace (NFZ)</span>
          <span
            className={`w-2 h-2 rounded-full ${
              airspaceEnabled ? "bg-white animate-pulse" : "bg-slate-500"
            }`}
          />
        </button>
      )}

      {/* 3. Zoom In / Zoom Out / Reset View Button Group directly below style and airspace */}
      <div className="flex flex-col bg-[#07101CEE] border border-[#1C2C42] rounded-lg shadow-xl backdrop-blur-md overflow-hidden transition-all">
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={onZoomIn}
          className="w-8 h-8 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] hover:bg-[#1C2C42]/80 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          title="Zoom In (+)"
          aria-label="Zoom in on map"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="h-[1px] w-full bg-[#1C2C42]" />

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={onZoomOut}
          className="w-8 h-8 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] hover:bg-[#1C2C42]/80 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          title="Zoom Out (-)"
          aria-label="Zoom out on map"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Optional Reset View / Fit Mission Button */}
        {showFitMission && typeof onResetView === "function" && (
          <>
            <div className="h-[1px] w-full bg-[#1C2C42]" />
            <button
              type="button"
              onClick={onResetView}
              className="w-8 h-8 flex items-center justify-center text-[#CBD5E1] hover:text-[#38BDF8] hover:bg-[#1C2C42]/80 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              title={fitMissionTitle}
              aria-label={fitMissionTitle}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* 3. Explicit Scroll to Zoom Toggle Pill in a separate compact row below zoom controls */}
      {typeof onToggleScrollZoom === "function" && (
        <button
          type="button"
          onClick={onToggleScrollZoom}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold backdrop-blur-md transition cursor-pointer active:scale-95 shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
            scrollZoomEnabled
              ? "bg-[#07101CEE] border-[#10B981]/60 text-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.25)]"
              : "bg-[#07101CEE] border-[#1C2C42] text-[#8E9EAA] hover:text-[#CBD5E1] hover:border-[#38BDF8]/40"
          }`}
          title={
            scrollZoomEnabled
              ? "Scroll-to-Zoom is ON (Mouse wheel zooms map. Click to turn OFF)"
              : "Scroll-to-Zoom is OFF (Normal page scrolling. Hold Ctrl+Wheel to zoom, or click to turn ON)"
          }
          aria-label={`Scroll to zoom is ${scrollZoomEnabled ? "enabled" : "disabled"}`}
          aria-pressed={scrollZoomEnabled}
        >
          <MousePointer
            className={`w-3 h-3 transition-colors ${
              scrollZoomEnabled ? "text-[#10B981]" : "text-[#64748B]"
            }`}
          />
          <span className="hidden sm:inline">Scroll Zoom</span>
          <span className="sm:hidden">Zoom</span>
          <span
            className={`text-[8.5px] font-mono px-1 py-0.2 rounded font-extrabold ${
              scrollZoomEnabled
                ? "bg-[#10B981]/25 border border-[#10B981]/40 text-[#34D399]"
                : "bg-[#1C2C42] text-[#94A3B8]"
            }`}
          >
            {scrollZoomEnabled ? "ON" : "OFF"}
          </span>
        </button>
      )}
    </div>
  );
});

export default MapControls;

