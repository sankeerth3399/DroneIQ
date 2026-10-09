import { useState } from "react"
import { Eye, Shield, Radio, Maximize2, AlertCircle, Camera } from "lucide-react"

export const IncidentEvidenceView = ({ incident }) => {
  const [activeZoom, setActiveZoom] = useState(false)

  if (!incident) {
    return (
      <div className="h-64 rounded-2xl border border-dashed border-[#CAD8E6] bg-[#F8FAFC] flex flex-col items-center justify-center text-[#64748B]">
        <Camera className="w-8 h-8 text-[#94A3B8] mb-2" />
        <span className="text-sm font-semibold">No Sensor Evidence Available</span>
        <span className="text-xs text-[#94A3B8]">Select an alert from the active queue</span>
      </div>
    )
  }

  const isThermal = incident.evidenceType === "thermal" || incident.title.toLowerCase().includes("thermal") || incident.title.toLowerCase().includes("smoke")
  const detectionTag = incident.detectionTag || `${incident.title} - ${incident.confidence}`
  const timestamp = incident.detectedTime || "08:21 AM"
  const droneId = incident.droneId || "DR-007"

  return (
    <div className="flex flex-col gap-3">
      {/* Dual Screen Evidence Layout matching reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Left Screen: Primary Detection Frame with Bounding Box */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-xl overflow-hidden bg-[#0A0714] border border-[#2D1B4E] shadow-sm flex items-center justify-center group select-none">
          {/* Thermal / Sensor Background Imagery */}
          {isThermal ? (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1B053A] via-[#350A52] to-[#0A0520]">
              {/* Thermal Heat Hotspots */}
              <div
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(ellipse 40% 45% at 55% 48%, rgba(255, 230, 100, 0.95) 0%, rgba(245, 120, 20, 0.85) 30%, rgba(180, 20, 80, 0.65) 60%, rgba(40, 10, 80, 0.4) 85%, transparent 100%), radial-gradient(circle 35% at 25% 45%, rgba(255, 140, 30, 0.8) 0%, rgba(180, 20, 80, 0.6) 40%, rgba(50, 10, 80, 0.3) 70%, transparent 100%), radial-gradient(circle 30% at 80% 42%, rgba(255, 160, 40, 0.75) 0%, rgba(160, 20, 80, 0.5) 45%, transparent 100%)",
                }}
              />
              {/* Scanline Grid */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B] to-[#0F172A] flex items-center justify-center">
              {/* Highway Optical Representation */}
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(100, 116, 139, 0.8) 0%, rgba(30, 41, 59, 0.9) 70%, #0F172A 100%)",
                }}
              />
              <div className="w-24 h-16 rounded-md bg-[#334155] border border-[#64748B] opacity-60 shadow-lg" />
            </div>
          )}

          {/* AI Detection Bounding Box */}
          <div className="absolute inset-x-[24%] inset-y-[20%] border-2 border-[#EF4444] rounded-sm pointer-events-none transition-all">
            {/* Tag Badge on top of bounding box */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#DC2626] text-white text-[10px] font-mono font-bold tracking-tight shadow-md whitespace-nowrap">
              {detectionTag}
            </div>
            {/* Corner Crosshairs */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
          </div>

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DC2626] text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0A0E1A]/85 text-white border border-white/20 backdrop-blur-xs">
              {droneId} {isThermal ? "thermal" : "camera"}
            </span>
          </div>

          {/* Bottom Timestamp */}
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 text-white/90 backdrop-blur-xs">
              {timestamp}
            </span>
          </div>
        </div>

        {/* Right Screen: Secondary / Thermal View with Heatmap Scale */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-xl overflow-hidden bg-[#0A0714] border border-[#2D1B4E] shadow-sm flex items-center justify-center select-none">
          {/* Secondary Sensor Stream */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1B053A] via-[#350A52] to-[#0A0520]">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 210, 80, 0.9) 0%, rgba(230, 90, 30, 0.75) 35%, rgba(160, 20, 80, 0.55) 65%, transparent 100%), radial-gradient(circle 30% at 75% 55%, rgba(255, 140, 30, 0.7) 0%, rgba(160, 20, 80, 0.5) 45%, transparent 100%)",
              }}
            />
          </div>

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DC2626] text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0A0E1A]/85 text-white border border-white/20 backdrop-blur-xs">
              Thermal view
            </span>
          </div>

          {/* Thermal Temperature Gradient Scale Bar (Right side) */}
          <div className="absolute right-2.5 top-6 bottom-6 w-3 rounded-full flex flex-col items-center justify-between p-0.5 z-10">
            <span className="text-[8px] font-mono font-bold text-white drop-shadow-md">Hot</span>
            <div
              className="w-1.5 flex-1 my-1 rounded-full shadow-inner"
              style={{
                background:
                  "linear-gradient(to bottom, #FFFFFF 0%, #FBBF24 25%, #EF4444 55%, #7C3AED 85%, #0F172A 100%)",
              }}
            />
            <span className="text-[8px] font-mono font-bold text-white drop-shadow-md">Cool</span>
          </div>

          {/* Bottom Timestamp */}
          <div className="absolute bottom-2.5 right-8 z-10">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 text-white/90 backdrop-blur-xs">
              {timestamp}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncidentEvidenceView
