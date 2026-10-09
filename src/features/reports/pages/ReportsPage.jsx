import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Download,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

import ReportCard from "../components/ReportCard.jsx"
import TodaySoFarCard from "../components/TodaySoFarCard.jsx"
import BottomInfoStrip from "../components/BottomInfoStrip.jsx"
import GenerateReportModal from "../components/GenerateReportModal.jsx"
import ReportDetailsModal from "../components/ReportDetailsModal.jsx"

import { REPORT_TYPES, reportService } from "@/services/reportService.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useMission } from "@/hooks/useMission.js"
import { useAuth } from "@/hooks/useAuth.js"
import { Permissions } from "@/auth/permissions.js"
import { Roles } from "@/auth/roleConfig.js"
import { droneService } from "@/services/api/droneService.js"
import { analyticsService } from "@/services/api/analyticsService.js"

export const ReportsPage = () => {
  const navigate = useNavigate()
  const { user, role, hasPermission } = useAuth()
  const { currentProject, currentProjectId, projects } = useMission()
  const { telemetry, fleetTelemetry, connectionState, isLive } = useTelemetry()

  // Permissions
  const canExport = hasPermission(Permissions.EXPORT_EVIDENCE) || hasPermission(Permissions.CREATE_MISSIONS) || role !== Roles.VIEWER
  const isViewer = role === Roles.VIEWER || !canExport

  // Local state
  const [reports, setReports] = useState(() => reportService.getReports())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormatFilter, setSelectedFormatFilter] = useState("ALL")
  const [registeredDrones, setRegisteredDrones] = useState([])
  const [analyticsOverview, setAnalyticsOverview] = useState(null)

  // Dialog states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [activeGenerateTypeId, setActiveGenerateTypeId] = useState("mission")
  const [selectedReportForView, setSelectedReportForView] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  // Fetch registered drones and analytics overview from existing services
  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const [dronesRes, overviewRes] = await Promise.allSettled([
          droneService.getDrones(),
          analyticsService.getOverviewKpis(),
        ])
        if (!active) return

        if (dronesRes.status === "fulfilled" && Array.isArray(dronesRes.value)) {
          setRegisteredDrones(dronesRes.value)
        }
        if (overviewRes.status === "fulfilled" && overviewRes.value) {
          setAnalyticsOverview(overviewRes.value)
        }
      } catch (err) {
        console.warn("[ReportsPage] Error loading background analytics:", err.message)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        r.reportType?.toLowerCase().includes(q) ||
        r.projectName?.toLowerCase().includes(q) ||
        r.droneName?.toLowerCase().includes(q) ||
        r.droneId?.toLowerCase().includes(q) ||
        r.period?.toLowerCase().includes(q)

      const matchesFormat =
        selectedFormatFilter === "ALL" ||
        r.format?.toUpperCase().includes(selectedFormatFilter.toUpperCase())

      return matchesSearch && matchesFormat
    })
  }, [reports, searchQuery, selectedFormatFilter])

  // Handlers
  const handleOpenGenerate = (typeId = "mission") => {
    if (isViewer) return
    setActiveGenerateTypeId(typeId)
    setIsGenerateModalOpen(true)
  }

  const handleReportGenerated = (newReport) => {
    setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)])
    setSelectedReportForView(newReport)
    setIsViewModalOpen(true)
  }

  const handleViewReport = (report) => {
    setSelectedReportForView(report)
    setIsViewModalOpen(true)
  }

  const handleDownloadReport = (e, report) => {
    e.stopPropagation()
    reportService.downloadReport(report)
  }

  // Aggregate stats for "Today so far" card
  const activeFleetCount = useMemo(() => {
    const liveFromTel = Object.keys(fleetTelemetry || {}).length
    return liveFromTel > 0 ? liveFromTel : registeredDrones.length > 0 ? registeredDrones.length : 4
  }, [fleetTelemetry, registeredDrones])

  const missionsStats = useMemo(() => {
    const total = projects.length > 0 ? projects.length : 42
    return {
      total,
      inProgress: Math.max(1, Math.round(total * 0.2)),
      scheduled: Math.max(1, Math.round(total * 0.3)),
      completed: Math.max(1, Math.round(total * 0.5)),
    }
  }, [projects])

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#F0F4F9]">
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-5 p-4 sm:p-5 xl:p-6 2xl:p-7">
        {/* ================================================== */}
        {/* 1. REPORTS PAGE HEADER                             */}
        {/* ================================================== */}
        <header className="flex flex-col gap-3 pb-2 border-b border-[#D5E1ED] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0D233A] tracking-tight leading-tight">
              Reports
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4F657F] font-medium">
              Mission, fleet, flight and compliance reports, on demand or on a schedule.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isViewer ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#92400E]">
                <ShieldAlert className="h-4 w-4" />
                Auditor Mode · Read-Only Access
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenGenerate("mission")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E64D4] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:bg-[#1553B8] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Generate New Report
              </button>
            )}
          </div>
        </header>

        {/* ================================================== */}
        {/* 2. TOP REPORT WIDGETS (SIX CARDS IN RESPONSIVE ROW) */}
        {/* ================================================== */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4"
          aria-label="Report category widgets"
        >
          {Object.values(REPORT_TYPES).map((reportType) => (
            <ReportCard
              key={reportType.id}
              reportType={reportType}
              onGenerate={handleOpenGenerate}
              disabled={isViewer}
              disabledReason="Report generation requires operator or fleet manager permissions"
            />
          ))}
        </section>

        {/* ================================================== */}
        {/* 3. RECENT REPORTS & TODAY SO FAR GRID              */}
        {/* ================================================== */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-4 sm:gap-5 items-start">
          {/* LEFT: RECENT REPORTS TABLE CARD */}
          <div className="bg-white rounded-xl border border-[#D5E1ED] shadow-xs overflow-hidden flex flex-col min-h-[440px]">
            {/* Table Header Bar with Search & Filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[#EEF3F8]">
              <div>
                <h2 className="text-base sm:text-[17px] font-extrabold text-[#0E2646] tracking-tight">
                  Recent reports
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Archived flight logs, compliance audits, and delivered mission packages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[180px] sm:min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports, missions..."
                    className="w-full rounded-lg border border-[#D0DDEB] bg-white pl-8.5 pr-3 py-1.5 text-xs text-[#0E2646] outline-none focus:border-[#1E64D4] focus:ring-1 focus:ring-[#1E64D4]"
                  />
                </div>

                {/* Format Filter */}
                <select
                  value={selectedFormatFilter}
                  onChange={(e) => setSelectedFormatFilter(e.target.value)}
                  className="rounded-lg border border-[#D0DDEB] bg-white px-2.5 py-1.5 text-xs font-bold text-[#4A627B] outline-none focus:border-[#1E64D4] cursor-pointer"
                >
                  <option value="ALL">All Formats</option>
                  <option value="PDF">PDF</option>
                  <option value="GeoTIFF">GeoTIFF</option>
                  <option value="CSV">CSV</option>
                  <option value="XLSX">XLSX</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="flex-1 overflow-x-auto">
              {filteredReports.length > 0 ? (
                <table className="w-full min-w-[760px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-[#EEF3F8] text-xs font-bold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4 sm:px-5">Report</th>
                      <th className="py-3 px-3">Mission / Project</th>
                      <th className="py-3 px-3">Drone</th>
                      <th className="py-3 px-3">Period</th>
                      <th className="py-3 px-3">Generated</th>
                      <th className="py-3 px-3">Format</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 sm:px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3F8] text-xs">
                    {filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        onClick={() => handleViewReport(report)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      >
                        {/* Report Title */}
                        <td className="py-3.5 px-4 sm:px-5 max-w-[240px]">
                          <span className="font-bold text-[#0E2646] group-hover:text-[#1E64D4] transition-colors block truncate">
                            {report.title}
                          </span>
                          <span className="font-mono text-[10px] text-[#64748B] block mt-0.5">
                            {report.id} · {report.reportType}
                          </span>
                        </td>

                        {/* Mission / Project */}
                        <td className="py-3.5 px-3 max-w-[150px]">
                          <span className="font-semibold text-[#18314C] block truncate">
                            {report.projectName}
                          </span>
                          <span className="font-mono text-[10px] text-[#64748B] block">
                            {report.projectId}
                          </span>
                        </td>

                        {/* Drone */}
                        <td className="py-3.5 px-3">
                          <span className="font-medium text-[#2C4460]">
                            {report.droneName || report.droneId}
                          </span>
                        </td>

                        {/* Period */}
                        <td className="py-3.5 px-3">
                          <span className="font-medium text-[#50667E] whitespace-nowrap">
                            {report.period}
                          </span>
                        </td>

                        {/* Generated */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-medium text-[#50667E]">
                            {report.generatedFormatted}
                          </span>
                        </td>

                        {/* Format */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md border border-[#D0DDEB] bg-[#F1F6FB] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1E64D4]">
                            {report.format}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-mono font-bold text-[#15803D]">
                            {report.status}
                          </span>
                        </td>

                        {/* Action: Download / View */}
                        <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadReport(e, report)}
                            className="font-bold text-[#1E64D4] hover:text-[#1553B8] hover:underline px-2 py-1 transition cursor-pointer"
                            title="Download Report"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Empty state when no reports match */
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1E64D4] mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0E2646]">No reports found</h3>
                  <p className="text-xs text-[#64748B] max-w-sm mt-1 mb-4">
                    {searchQuery
                      ? "No reports matched your search query. Try another keyword or clear filters."
                      : "No operational reports have been generated yet for this workspace."}
                  </p>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={() => handleOpenGenerate("mission")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E64D4] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#1553B8]"
                    >
                      <Plus className="h-4 w-4" />
                      Generate First Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: TODAY SO FAR WIDGET */}
          <TodaySoFarCard
            missionsStats={missionsStats}
            fleetStats={{ active: activeFleetCount, inFlight: 1 }}
            alertsList={[
              { title: "smoke detected at refinery sector" },
              { title: "thermal anomaly on northern dam" },
              { title: "perimeter inspection corridor verified" },
            ]}
            successRate={analyticsOverview?.kpis?.successRate || "98%"}
            flightHours={analyticsOverview?.kpis?.operationalHours || "18.4 h"}
          />
        </section>

        {/* ================================================== */}
        {/* 4. BOTTOM INFORMATION STRIP                        */}
        {/* ================================================== */}
        <BottomInfoStrip />
      </div>

      {/* ================================================== */}
      {/* 5. MODALS & DIALOGS                                */}
      {/* ================================================== */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        initialTypeId={activeGenerateTypeId}
        projects={projects}
        drones={registeredDrones}
        currentProject={currentProject}
        currentUserName={user?.name || user?.username || "Sai Sankeer"}
        onReportGenerated={handleReportGenerated}
      />

      <ReportDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        report={selectedReportForView}
      />
    </div>
  )
}

export default ReportsPage
