import { useState } from "react"
import {
  X,
  FileText,
  Route,
  Plane,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Database,
  Download,
  Calendar,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react"
import { REPORT_TYPES, reportService } from "@/services/reportService.js"

const REPORT_TYPE_ICONS = {
  mission: Route,
  fleet: Plane,
  compliance: ShieldCheck,
  detection: Sparkles,
  operations: BarChart3,
  data_delivery: Database,
}

export const GenerateReportModal = ({
  isOpen = false,
  onClose,
  initialTypeId = "mission",
  projects = [],
  drones = [],
  currentProject = null,
  currentUserName = "Sai Sankeer",
  onReportGenerated,
}) => {
  if (!isOpen) return null

  const [typeId, setTypeId] = useState(initialTypeId || "mission")
  const [selectedProjectId, setSelectedProjectId] = useState(
    currentProject?.id || (projects.length > 0 ? projects[0].id : "AERO-MSN-0001")
  )
  const [selectedDroneId, setSelectedDroneId] = useState(
    drones.length > 0 ? (drones[0].droneId || drones[0].id) : "DRONE-001"
  )
  const [period, setPeriod] = useState("Today")
  const [format, setFormat] = useState("PDF")
  const [isGenerating, setIsGenerating] = useState(false)

  // Inclusions toggles
  const [inclusions, setInclusions] = useState({
    includeTelemetry: true,
    includeWaypoints: true,
    includeGeofence: true,
    includeDetections: true,
    includeFlightStats: true,
    includeMedia: true,
  })

  const toggleInclusion = (key) => {
    setInclusions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const reportConfig = Object.values(REPORT_TYPES).find((r) => r.id === typeId) || REPORT_TYPES.MISSION
  const IconComponent = REPORT_TYPE_ICONS[typeId] || FileText
  const projectObj = projects.find((p) => p.id === selectedProjectId) || currentProject || projects[0]
  const droneObj = drones.find((d) => (d.droneId || d.id) === selectedDroneId) || { droneId: selectedDroneId, name: selectedDroneId }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)

    // Simulate realistic generation settlement
    setTimeout(() => {
      const generated = reportService.generateReport({
        typeId,
        project: projectObj,
        drone: droneObj,
        period,
        format,
        operator: currentUserName,
        inclusions,
      })

      setIsGenerating(false)
      onReportGenerated?.(generated)
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0A1628]/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-[#CBDCEE] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EDF8] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE]">
              <IconComponent className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0E2646] tracking-tight">
                Generate {reportConfig.label}
              </h2>
              <p className="text-xs text-[#50667E]">
                Configure mission parameters, data scope and output format.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition cursor-pointer"
            title="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Report Type Selection Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(REPORT_TYPES).map((r) => {
                const ActiveIcon = REPORT_TYPE_ICONS[r.id] || FileText
                const isSelected = typeId === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setTypeId(r.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#1E64D4] bg-[#F0F6FF] text-[#1E64D4] shadow-xs ring-1 ring-[#1E64D4]/30"
                        : "border-[#D8E3EF] bg-white text-[#4A627B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <ActiveIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{r.title}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Target Project & Drone Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-1.5">
                Mission / Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-[#CBDCEE] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0E2646] focus:border-[#1E64D4] focus:outline-none focus:ring-2 focus:ring-[#1E64D4]/20 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-1.5">
                Target Aircraft / Drone
              </label>
              <select
                value={selectedDroneId}
                onChange={(e) => setSelectedDroneId(e.target.value)}
                className="w-full rounded-xl border border-[#CBDCEE] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0E2646] focus:border-[#1E64D4] focus:outline-none focus:ring-2 focus:ring-[#1E64D4]/20 cursor-pointer"
              >
                <option value="FLEET-ALL">All Operational Aircraft (Fleet-Wide)</option>
                {drones.map((d) => {
                  const id = d.droneId || d.id
                  return (
                    <option key={id} value={id}>
                      {d.name || id} ({d.model || "QuadX"})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* 3. Timeframe / Period & Output Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-1.5">
                Reporting Period
              </label>
              <div className="flex gap-1.5">
                {["Today", "Week 37", "August", "Custom"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-bold text-center transition cursor-pointer ${
                      period === p
                        ? "border-[#1E64D4] bg-[#1E64D4] text-white shadow-2xs"
                        : "border-[#D8E3EF] bg-white text-[#4A627B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-1.5">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-xl border border-[#CBDCEE] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0E2646] focus:border-[#1E64D4] focus:outline-none focus:ring-2 focus:ring-[#1E64D4]/20 cursor-pointer"
              >
                <option value="PDF">PDF (Enterprise Document)</option>
                <option value="CSV">CSV (Tabular Metrics)</option>
                <option value="XLSX">XLSX (Excel Workbook)</option>
                <option value="JSON">JSON (REST API Payload)</option>
                <option value="PDF + GeoTIFF">PDF + GeoTIFF (Geospatial Orthomosaic)</option>
                <option value="GeoJSON">GeoJSON (Map Boundary & Route)</option>
              </select>
            </div>
          </div>

          {/* 4. Data Inclusions Checkboxes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-2.5">
              Include Data Sections
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ["includeTelemetry", "Live & historical telemetry summary"],
                ["includeWaypoints", "Waypoint & mission route execution"],
                ["includeGeofence", "Geofence boundary & compliance audit"],
                ["includeDetections", "AI computer vision detection catalog"],
                ["includeFlightStats", "Flight hours, altitude & battery health"],
                ["includeMedia", "Captured media metadata & orthomosaics"],
              ].map(([key, label]) => {
                const checked = inclusions[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleInclusion(key)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F1F6FB] transition text-left cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4 text-[#1E64D4] shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-[#94A3B8] shrink-0" />
                    )}
                    <span className="font-medium text-[#2C4460]">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2EDF8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1E64D4] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1553B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E64D4] transition cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating & Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate & Export Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GenerateReportModal
