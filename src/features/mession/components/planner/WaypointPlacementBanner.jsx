import { useEffect } from "react";
import { Crosshair, X } from "lucide-react";

export default function WaypointPlacementBanner({
  placingType = "WAYPOINT",
  onCancel,
}) {
  // ESC key cancels placement mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const typeLabels = {
    WAYPOINT: "WAYPOINT",
    TAKEOFF: "TAKEOFF POINT",
    LAND: "LAND POINT",
    RTL: "RETURN TO LAUNCH (RTL)",
  };

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#080C14FA] border border-[#35E0FF80] shadow-[0_0_20px_rgba(53,224,255,0.4)] backdrop-blur-md text-[11px] font-mono text-[#EEF4F8] select-none animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-1.5 text-[#35E0FF]">
        <Crosshair className="w-4 h-4 animate-spin-slow" />
        <span className="font-bold tracking-wide">ADD {typeLabels[placingType] || "WAYPOINT"}</span>
      </div>

      <span className="text-[#64748B]">|</span>

      <span className="text-[#94A3B8] hidden xs:inline">CLICK ANYWHERE ON MAP</span>

      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 text-[10px] text-[#8E9EAA] hover:text-[#FF4757] bg-[#172230] hover:bg-[#FF47571A] px-2 py-0.5 rounded-full transition ml-1"
        title="Cancel (Esc)"
      >
        <X className="w-3 h-3" />
        <span>Cancel</span>
      </button>
    </div>
  );
}
