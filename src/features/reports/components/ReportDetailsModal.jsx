import {
  X,
  Download,
  ExternalLink,
  Route,
  Plane,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Database,
  Calendar,
  User,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { reportService } from "@/services/reportService.js"

const REPORT_TYPE_ICONS = {
  mission: Route,
  fleet: Plane,
  compliance: ShieldCheck,
  detection: Sparkles,
  operations: BarChart3,
  data_delivery: Database,
}

export const ReportDetailsModal = ({
  report = null,
  isOpen = false,
  onClose,
}) => {
  const navigate = useNavigate()
  if (!isOpen || !report) return null

  const IconComponent = REPORT_TYPE_ICONS[report.typeId] || FileText

  const handleDownload = (format) => {
    reportService.downloadReport(report, format || report.format)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0A1628]/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-[#CBDCEE] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EDF8] bg-[#F8FAFC]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE]">
              <IconComponent className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1D4ED8]">
                  {report.id}
                </span>
                <span className="inline-flex items-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-mono font-bold text-[#15803D]">
                  {report.status}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0E2646] tracking-tight truncate mt-0.5">
                {report.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition cursor-pointer"
            title="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Highlights Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#E2EDF8] bg-[#F8FAFC] p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Project / Mission</span>
              <span className="font-bold text-xs sm:text-sm text-[#0E2646] truncate block mt-0.5">
                {report.projectName}
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">{report.projectId}</span>
            </div>

            <div className="rounded-xl border border-[#E2EDF8] bg-[#F8FAFC] p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Assigned Aircraft</span>
              <span className="font-bold text-xs sm:text-sm text-[#0E2646] truncate block mt-0.5">
                {report.droneName}
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">{report.droneId}</span>
            </div>

            <div className="rounded-xl border border-[#E2EDF8] bg-[#F8FAFC] p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Reporting Period</span>
              <span className="font-bold text-xs sm:text-sm text-[#1E64D4] block mt-0.5">
                {report.period}
              </span>
              <span className="text-[10px] text-[#64748B]">{report.generatedFormatted}</span>
            </div>

            <div className="rounded-xl border border-[#E2EDF8] bg-[#F8FAFC] p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Flight Operator</span>
              <span className="font-bold text-xs sm:text-sm text-[#0E2646] block mt-0.5">
                {report.operator || "Operator"}
              </span>
              <span className="text-[10px] text-[#059669] font-semibold">Certified GCS Pilot</span>
            </div>
          </div>

          {/* Operational Metrics Breakdown */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-3">
              Operational Flight & Compliance Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Route Distance</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0E2646] font-mono">
                  {report.metrics?.routeDistanceKm || 1.02} km
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Duration Flown</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0E2646] font-mono">
                  {report.metrics?.duration || "24m 24s"}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Mission Waypoints</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0E2646] font-mono">
                  {report.metrics?.waypointsCount || 4} waypoints
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Geofence Enclosure</span>
                <span className="text-sm sm:text-base font-extrabold text-[#059669] font-mono">
                  {report.metrics?.geofenceArea || "62.09 ha"}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Max Altitude</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1E64D4] font-mono">
                  {report.metrics?.maxAltitudeM || 68.4} m AGL
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Average Groundspeed</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0E2646] font-mono">
                  {report.metrics?.avgSpeedMs || 7.2} m/s
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">Battery Consumption</span>
                <span className="text-sm sm:text-base font-extrabold text-[#D97706] font-mono">
                  {report.metrics?.batteryUsed || 56}%
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E8EFF6] bg-white shadow-2xs">
                <span className="text-[11px] text-[#64748B] block">AI Detections Logged</span>
                <span className="text-sm sm:text-base font-extrabold text-[#0E2646] font-mono">
                  {report.metrics?.detectionsCount || 14} items
                </span>
              </div>
            </div>
          </div>

          {/* Attached Deliverables & Outputs */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E556E] mb-3">
              Generated Deliverables & Output Packages
            </h3>
            <div className="divide-y divide-[#EEF3F8] rounded-xl border border-[#E2EDF8] bg-white overflow-hidden">
              {(report.deliverables || []).map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-[#F8FAFC] transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E64D4] text-xs font-mono font-bold">
                      {file.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[#0E2646] truncate">{file.name}</p>
                      <p className="text-[11px] text-[#64748B] font-mono">{file.size} · Validated SHA-256</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(file.type)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E64D4] hover:bg-[#F0F6FF] hover:border-[#1E64D4] transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#E2EDF8] bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate("/missions/details")
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E64D4] hover:underline cursor-pointer"
            >
              <Route className="h-3.5 w-3.5" />
              Open in Mission Details
            </button>
            <span className="text-[#CBD5E1]">·</span>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate("/dashboard")
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E64D4] hover:underline cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Command Center
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleDownload("CSV")}
              className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-bold text-[#334155] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleDownload("PDF")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E64D4] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1553B8] transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportDetailsModal
