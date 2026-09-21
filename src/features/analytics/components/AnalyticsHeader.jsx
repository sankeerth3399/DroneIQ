import { useState, useRef, useEffect } from "react"
import {
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Code,
  Radio,
} from "lucide-react"

export const AnalyticsHeader = ({
  isLive = false,
  selectedRange = "Last 7 Days",
  onRangeChange,
  selectedDrone = "ALL",
  onDroneChange,
  drones = [],
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

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1A2633] font-mono select-none">
      {/* Title and Subtitle */}
      <div className="flex items-start sm:items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#142232] border border-[#203C54] text-[#35E0FF] shadow-[0_0_15px_rgba(53,224,255,0.15)] shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
              Analytics
            </h1>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#102A20] text-[#2FE089] border border-[#1F4A38] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089]" />
                LIVE STREAM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium bg-[#121A24] text-[#8E9EAA] border border-[#1E2E3E]">
                <Radio className="w-3 h-3 text-[#64748B]" />
                HISTORICAL
              </span>
            )}
          </div>
          <p className="text-xs text-[#8E9EAA] mt-0.5">
            Monitor fleet performance, flight activity, telemetry health and mission intelligence.
          </p>
        </div>
      </div>

      {/* Top Header Quick Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* Quick Date Range Select */}
        <div className="relative">
          <select
            value={selectedRange}
            onChange={(e) => onRangeChange?.(e.target.value)}
            className="appearance-none pl-8 pr-7 py-2 rounded-lg bg-[#0C111E] border border-[#1E2E3E] text-white text-xs font-medium focus:outline-none focus:border-[#35E0FF] cursor-pointer hover:border-[#2A3E52] transition"
          >
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
          </select>
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9EAA] pointer-events-none" />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9EAA] pointer-events-none" />
        </div>

        {/* Quick Drone Select */}
        <div className="relative">
          <select
            value={selectedDrone}
            onChange={(e) => onDroneChange?.(e.target.value)}
            className="appearance-none pl-3 pr-7 py-2 rounded-lg bg-[#0C111E] border border-[#1E2E3E] text-white text-xs font-medium focus:outline-none focus:border-[#35E0FF] cursor-pointer hover:border-[#2A3E52] transition max-w-[140px] truncate"
          >
            <option value="ALL">All Drones</option>
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.name || d.model})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9EAA] pointer-events-none" />
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0C111E] hover:bg-[#141C28] border border-[#1E2E3E] text-[#8E9EAA] hover:text-white text-xs transition cursor-pointer disabled:opacity-50"
          title="Refresh metrics"
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
  )
}

export default AnalyticsHeader
