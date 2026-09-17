import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, Route, ArrowUp, Clock, Target } from "lucide-react";

export default function MissionSummaryHUD({
  itemsCount = 0,
  formattedDistance = "0.0 m",
  maxAltitude = 0,
  formattedDuration = "00:00",
  geofenceStatus = "ACTIVE",
  boundaryCheckPassed = true,
}) {
  const [minimized, setMinimized] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  return (
    <div className="rounded-xl bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md shadow-2xl text-[10px] sm:text-xs font-mono text-[#EEF4F8] select-none pointer-events-auto overflow-hidden transition-all duration-200">
      {/* Header / Click to Toggle */}
      <button
        type="button"
        onClick={() => setMinimized((prev) => !prev)}
        className="flex items-center justify-between w-full px-3 py-1.5 bg-[#0C121DF2] hover:bg-[#111A26] border-b border-[#1A2633] transition text-[#35E0FF] font-bold"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span>MISSION SUMMARY</span>
        </div>
        {minimized ? <ChevronUp className="w-3 h-3 text-[#8E9EAA]" /> : <ChevronDown className="w-3 h-3 text-[#8E9EAA]" />}
      </button>

      {/* Body */}
      {!minimized && (
        <div className="p-2.5 min-w-[210px] sm:min-w-[240px] space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#8E9EAA] flex items-center gap-1">
                <Target className="w-3 h-3 text-[#35E0FF]" />
                <span>WAYPOINTS:</span>
              </span>
              <strong className="text-white font-bold">{String(itemsCount).padStart(2, "0")}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8E9EAA] flex items-center gap-1">
                <Route className="w-3 h-3 text-[#35E0FF]" />
                <span>DIST:</span>
              </span>
              <strong className="text-[#B7F3FF] font-bold">{formattedDistance}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8E9EAA] flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-[#2FE089]" />
                <span>MAX ALT:</span>
              </span>
              <strong className="text-[#2FE089] font-bold">{maxAltitude} m</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8E9EAA] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#EEF4F8]" />
                <span>EST TIME:</span>
              </span>
              <strong className="text-white font-bold">{formattedDuration}</strong>
            </div>
          </div>

          {/* Boundary & Safety Status */}
          <div className="pt-2 border-t border-[#1A2633] space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8E9EAA]">GEOFENCE:</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded text-[9.5px] ${
                  geofenceStatus === "ACTIVE"
                    ? "text-[#2FE089] bg-[#2FE08918] border border-[#2FE08940]"
                    : "text-[#F59E0B] bg-[#F59E0B18] border border-[#F59E0B40]"
                }`}
              >
                {geofenceStatus}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8E9EAA]">BOUNDARY CHECK:</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded text-[9.5px] ${
                  boundaryCheckPassed
                    ? "text-[#2FE089] bg-[#2FE08918] border border-[#2FE08940]"
                    : "text-[#EF4444] bg-[#EF444418] border border-[#EF444440] animate-pulse"
                }`}
              >
                {boundaryCheckPassed ? "PASSED" : "FAILED"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
