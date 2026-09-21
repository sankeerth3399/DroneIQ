import { ArrowLeft, RefreshCw, Download, ChevronDown, FileSpreadsheet, Code, FileText, Radio } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import DashboardSelector from "./DashboardSelector.jsx"

const DASHBOARD_TITLES = {
  fleet: {
    title: "FLEET ANALYTICS",
    subtitle: "Understand fleet utilization, availability and operational performance.",
  },
  flights: {
    title: "FLIGHT ANALYTICS",
    subtitle: "Flight duration, distance, altitude, speed and flight activity.",
  },
  missions: {
    title: "MISSION ANALYTICS",
    subtitle: "Mission completion, waypoint performance and mission efficiency.",
  },
  telemetry: {
    title: "TELEMETRY INTELLIGENCE",
    subtitle: "GPS, satellites, connectivity, latency and telemetry health.",
  },
  battery: {
    title: "BATTERY ANALYTICS",
    subtitle: "Battery consumption, health and low-battery events.",
  },
  safety: {
    title: "SAFETY & INCIDENTS",
    subtitle: "Incidents, emergency events, geofence violations and safety trends.",
  },
  drones: {
    title: "DRONE PERFORMANCE",
    subtitle: "Individual drone performance, utilization and historical activity.",
  },
  operators: {
    title: "OPERATOR ANALYTICS",
    subtitle: "Operator activity, missions, flights and operational workload.",
  },
}

export const DashboardDetailHeader = ({
  activeDashboard = "fleet",
  onBackToLanding,
  onSelectDashboard,
  isLive = false,
  onRefresh,
  isRefreshing = false,
  onExport,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentInfo = DASHBOARD_TITLES[activeDashboard] || {
    title: "ANALYTICS DASHBOARD",
    subtitle: "Operational flight telemetry and system performance intelligence.",
  }

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Top Navigation Row: Back Button + Title + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1A2633]">
        <div className="flex items-start sm:items-center gap-3">
          {/* ← All Dashboards Back Button */}
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#142232] hover:bg-[#1A2D42] border border-[#203C54] hover:border-[#35E0FF] text-[#35E0FF] text-xs font-bold transition-all shadow-[0_0_12px_rgba(53,224,255,0.12)] cursor-pointer shrink-0"
            title="Return to Analytics Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Dashboards</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                {currentInfo.title}
              </h1>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#102A20] text-[#2FE089] border border-[#1F4A38] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089]" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#121A24] text-[#8E9EAA] border border-[#1E2E3E]">
                  <Radio className="w-3 h-3 text-[#64748B]" />
                  HISTORICAL
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E9EAA] mt-0.5">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0C111E] hover:bg-[#141C28] border border-[#1E2E3E] text-[#8E9EAA] hover:text-white text-xs transition cursor-pointer disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#35E0FF]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#35E0FF1A] hover:bg-[#35E0FF2E] border border-[#1A5A68] hover:border-[#35E0FF] text-[#35E0FF] text-xs font-semibold shadow-[0_0_12px_rgba(53,224,255,0.15)] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExportOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#0B1017] border border-[#223240] shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    onExport?.("csv")
                    setIsExportOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#152230] text-[#EEF4F8] hover:text-white transition text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2FE089]" />
                  <span>Export CSV (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onExport?.("json")
                    setIsExportOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#152230] text-[#EEF4F8] hover:text-white transition text-left cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-[#35E0FF]" />
                  <span>Export JSON (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onExport?.("report")
                    setIsExportOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#152230] text-[#EEF4F8] hover:text-white transition text-left cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Print Summary</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Dashboard Tab Switcher */}
      <DashboardSelector
        activeDashboard={activeDashboard}
        onSelectDashboard={onSelectDashboard}
      />
    </div>
  )
}

export default DashboardDetailHeader
