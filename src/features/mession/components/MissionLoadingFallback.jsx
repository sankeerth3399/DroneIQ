import React from "react"
import { Compass, RefreshCw } from "lucide-react"

/**
 * AeroNexus Mission Loading Fallback
 * Displayed while mission, project, or telemetry data is synchronizing.
 * Prevents any flash of blank screen during asynchronous initialization.
 */
export const MissionLoadingFallback = ({ message = "Synchronizing project workspace, geofence boundaries, and telemetry streams..." }) => {
  return (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#F8FAFC] p-6 select-none">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#CBD5E1] p-8 shadow-lg text-center space-y-6">
        {/* Animated Radar Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#1B68D2]/30 animate-spin" style={{ animationDuration: "8s" }} />
          <div className="absolute inset-2 rounded-full border-2 border-sky-400/40 animate-ping opacity-25" />
          <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-[#38BDF8] flex items-center justify-center shadow-md relative z-10">
            <Compass className="w-7 h-7 animate-pulse text-[#38BDF8]" />
          </div>
        </div>

        {/* Informational Text */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-[#0F284E] tracking-tight">
            Initializing Mission Planning
          </h3>
          <p className="text-xs text-[#475569] leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Aerospace Micro Progress Bar */}
        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden relative">
          <div className="h-full bg-[#1B68D2] rounded-full animate-indeterminate" style={{
            width: "40%",
            animation: "shimmer 1.8s infinite ease-in-out"
          }} />
        </div>

        <div className="text-[11px] font-mono text-[#64748B] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AeroNexus GCS · Secure Mission Synchronization</span>
        </div>
      </div>
    </div>
  )
}

export default MissionLoadingFallback
