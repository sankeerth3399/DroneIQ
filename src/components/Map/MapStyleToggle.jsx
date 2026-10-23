import React, { memo } from "react";
import { Globe, Map as MapIcon } from "lucide-react";

/**
 * MapStyleToggle Component
 * Reusable horizontal segmented toggle for switching between Normal street map
 * and Satellite imagery in AeroNexus DroneIQ map views.
 *
 * @param {Object} props
 * @param {"normal" | "satellite"} props.currentStyle - Currently active map style
 * @param {Function} props.onStyleChange - Callback when user switches style
 * @param {string} [props.className=""] - Optional extra classes
 * @param {boolean} [props.disabled=false] - Whether buttons are disabled
 */
export const MapStyleToggle = memo(function MapStyleToggle({
  currentStyle = "normal",
  onStyleChange,
  className = "",
  disabled = false,
}) {
  const isNormal = currentStyle === "normal";
  const isSatellite = currentStyle === "satellite";

  const handleSelect = (style) => {
    if (disabled || style === currentStyle) return;
    if (typeof onStyleChange === "function") {
      onStyleChange(style);
    }
  };

  return (
    <div
      role="group"
      aria-label="Map style selector"
      className={`inline-flex items-center p-0.5 rounded-lg bg-[#07101CEE] border border-[#1C2C42] shadow-xl backdrop-blur-md select-none transition-all ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Normal Style Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleSelect("normal")}
        aria-pressed={isNormal}
        title="Normal Street Map"
        className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
          isNormal
            ? "bg-[#1B68D2] text-white shadow-xs font-extrabold"
            : "text-[#94A3B8] hover:text-white hover:bg-[#142338]"
        }`}
      >
        <MapIcon className="w-3.5 h-3.5 shrink-0" />
        <span>Normal</span>
      </button>

      {/* Satellite Style Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleSelect("satellite")}
        aria-pressed={isSatellite}
        title="Satellite Imagery"
        className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
          isSatellite
            ? "bg-[#1B68D2] text-white shadow-xs font-extrabold"
            : "text-[#94A3B8] hover:text-white hover:bg-[#142338]"
        }`}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span>Satellite</span>
      </button>
    </div>
  );
});

export default MapStyleToggle;
