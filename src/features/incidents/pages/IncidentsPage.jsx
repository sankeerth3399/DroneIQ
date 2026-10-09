import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Radio,
  Users,
  Play,
  Download,
  Flame,
  Camera,
  Car,
  Activity,
  Check,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  MapPin,
  Calendar,
  X,
  FileText,
} from "lucide-react"

import { incidentService } from "@/services/api/incidentService.js"
import { IncidentEvidenceView } from "../components/IncidentEvidenceView.jsx"
import BottomInfoStrip from "@/features/reports/components/BottomInfoStrip.jsx"
import { useAuth } from "@/hooks/useAuth.js"
import { Permissions } from "@/auth/permissions.js"
import { Roles } from "@/auth/roleConfig.js"
import { showAlert, AlertTypes, AlertCategories } from "@/services/notification/alertService.js"

export const IncidentsPage = () => {
  const navigate = useNavigate()
  const { user, role, hasPermission } = useAuth()

  // RBAC Permissions
  const canTriage =
    hasPermission(Permissions.TRIAGE_INCIDENTS) ||
    role === Roles.SUPER_ADMIN ||
    role === Roles.FLEET_MANAGER ||
    role === Roles.FLIGHT_OPERATOR
  const canExport = hasPermission(Permissions.EXPORT_EVIDENCE) || role !== Roles.VIEWER
  const isViewer = role === Roles.VIEWER

  // State
  const [activeAlerts, setActiveAlerts] = useState([])
  const [closedRecently, setClosedRecently] = useState([])
  const [selectedIncidentId, setSelectedIncidentId] = useState("ALT-2026-002")
  const [isLoading, setIsLoading] = useState(true)
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false)
  const [triageNote, setTriageNote] = useState("")

  // Load data on mount & subscribe to live incident updates
  const loadIncidentsData = async () => {
    try {
      const [alerts, closed] = await Promise.all([
        incidentService.getActiveAlerts(),
        incidentService.getClosedRecently(),
      ])
      setActiveAlerts(alerts)
      setClosedRecently(closed)
      if (alerts.length > 0 && !alerts.find((a) => a.id === selectedIncidentId)) {
        setSelectedIncidentId(alerts[0].id)
      }
    } catch (err) {
      console.warn("[IncidentsPage] Failed to fetch incidents:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadIncidentsData()

    // Listen to real-time incident event updates
    const handleUpdate = () => {
      loadIncidentsData()
    }
    window.addEventListener("aeronexus:incident_updated", handleUpdate)
    return () => {
      window.removeEventListener("aeronexus:incident_updated", handleUpdate)
    }
  }, [])

  // Selected incident object
  const selectedIncident = useMemo(() => {
    return (
      activeAlerts.find((a) => a.id === selectedIncidentId) ||
      activeAlerts[0] ||
      null
    )
  }, [activeAlerts, selectedIncidentId])

  // Calculated KPIs
  const kpis = useMemo(() => {
    const critical = activeAlerts.filter((a) => a.severity?.toLowerCase() === "critical").length
    const high = activeAlerts.filter((a) => a.severity?.toLowerCase() === "high").length
    const medium = activeAlerts.filter((a) => a.severity?.toLowerCase() === "medium").length

    return {
      activeCount: activeAlerts.length,
      critical,
      high,
      medium,
      closedToday: 9,
      detectToAlert: "42 sec",
      falseAlarmRate: "8%",
      falseAlarmTrend: "↓ -3 pts vs. last month",
    }
  }, [activeAlerts])

  // Incident Actions
  const handleDispatch = (incident) => {
    showAlert({
      type: AlertTypes.SUCCESS,
      title: "Drone Dispatched",
      message: `Fast-response drone tasking packet submitted to verify ${incident.title}.`,
      category: AlertCategories.FLIGHT,
    })
  }

  const handleNotifyTeam = (incident) => {
    showAlert({
      type: AlertTypes.INFO,
      title: "Site Team Alerted",
      message: `Incident notification packet with telemetry telemetry coordinates sent to site team.`,
      category: AlertCategories.SYSTEM,
    })
  }

  const handleTriage = async (newStatus) => {
    if (!canTriage || !selectedIncident) return
    try {
      await incidentService.triageIncident(selectedIncident.id, newStatus, triageNote)
      showAlert({
        type: AlertTypes.SUCCESS,
        title: `Incident ${newStatus}`,
        message: `Status updated to ${newStatus}.`,
        category: AlertCategories.SECURITY,
      })
      setTriageNote("")
      await loadIncidentsData()
    } catch (err) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Triage Update Failed",
        message: err.message,
        category: AlertCategories.SECURITY,
      })
    }
  }

  const handleExportEvidence = () => {
    if (!canExport || !selectedIncident) return
    incidentService.exportEvidence(selectedIncident)
    showAlert({
      type: AlertTypes.SUCCESS,
      title: "Evidence Downloaded",
      message: `Cryptographic evidence package for ${selectedIncident.id} exported.`,
      category: AlertCategories.SECURITY,
    })
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-[#F0F4F9] font-sans">
      {/* Deep Dive Modal */}
      {isDeepDiveOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E36]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#D5E1ED] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#0D233A]">
                    Deep Dive Analysis · {selectedIncident.id}
                  </h3>
                  <p className="text-xs text-[#64748B]">{selectedIncident.location}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeepDiveOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0D233A] hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#334155]">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <h4 className="font-bold text-[#0D233A] mb-1">Sensor Payload Interpretation</h4>
                <p className="leading-relaxed">{selectedIncident.whatItMeans}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white">
                  <span className="text-[11px] text-[#64748B] block">Telemetry Coordinates</span>
                  <span className="font-mono font-bold text-[#0D233A] text-xs">
                    17.3850° N, 78.4867° E (Alt: 42m)
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white">
                  <span className="text-[11px] text-[#64748B] block">Confidence Level</span>
                  <span className="font-bold text-[#16A34A] text-xs">{selectedIncident.confidence} Verified</span>
                </div>
              </div>

              {canTriage && (
                <div>
                  <label className="block text-xs font-semibold text-[#18314C] mb-1.5">
                    Add Operator Triage Notes
                  </label>
                  <textarea
                    rows={2}
                    value={triageNote}
                    onChange={(e) => setTriageNote(e.target.value)}
                    placeholder="Enter observations, team confirmation, or action justification..."
                    className="w-full p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleExportEvidence}
                disabled={!canExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] text-xs font-bold text-[#18314C] hover:bg-[#F8FAFC]"
              >
                <Download className="w-3.5 h-3.5 text-[#1E64D4]" />
                <span>Export Package</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeepDiveOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#D5E1ED]"
                >
                  Close
                </button>
                {canTriage && (
                  <button
                    type="button"
                    onClick={() => {
                      handleTriage("Resolved")
                      setIsDeepDiveOpen(false)
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-xs"
                  >
                    Resolve Incident
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-6 p-4 sm:p-5 xl:p-6 2xl:p-7">
        {/* ================================================== */}
        {/* PAGE HEADER                                        */}
        {/* ================================================== */}
        <header className="flex flex-col gap-2 pb-2 border-b border-[#D5E1ED] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0D233A] tracking-tight leading-tight">
              Incidents & Alerts
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4F657F] font-medium">
              What the drones and cameras found, with the evidence and the next step.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadIncidentsData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] bg-white text-xs font-semibold text-[#18314C] hover:bg-[#F8FAFC] shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1E64D4]" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </header>

        {/* ================================================== */}
        {/* TOP 4 KPI WIDGETS                                  */}
        {/* ================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Active Alerts */}
          <div className="bg-white rounded-2xl border border-[#D5E1ED] p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0D233A] tracking-tight leading-none">
                {kpis.activeCount}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0D233A] mt-1">Active Alerts</div>
              <div className="text-[11px] text-[#64748B] font-medium mt-0.5">
                {kpis.critical} critical · {kpis.high} high · {kpis.medium} medium
              </div>
            </div>
          </div>

          {/* KPI 2: Closed Today */}
          <div className="bg-white rounded-2xl border border-[#D5E1ED] p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#16A34A] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0D233A] tracking-tight leading-none">
                {kpis.closedToday}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0D233A] mt-1">Closed Today</div>
            </div>
          </div>

          {/* KPI 3: Detect to Alert */}
          <div className="bg-white rounded-2xl border border-[#D5E1ED] p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0D233A] tracking-tight leading-none">
                {kpis.detectToAlert}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0D233A] mt-1">Detect to Alert</div>
            </div>
          </div>

          {/* KPI 4: False Alarm Rate */}
          <div className="bg-white rounded-2xl border border-[#D5E1ED] p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#0E2646] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0D233A] tracking-tight leading-none">
                {kpis.falseAlarmRate}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0D233A] mt-1">False Alarm Rate</div>
              <div className="text-[11px] text-[#16A34A] font-semibold mt-0.5">
                {kpis.falseAlarmTrend}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* MAIN TWO-COLUMN LAYOUT                             */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================================================== */}
          {/* LEFT COLUMN: ACTIVE ALERTS + CLOSED RECENTLY       */}
          {/* ================================================== */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* 1. Active Alerts Card */}
            <div className="bg-white rounded-2xl border border-[#D5E1ED] shadow-sm p-4 sm:p-5 flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-[#0D233A] mb-3">Active alerts</h2>

              <div className="flex flex-col gap-2.5">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8 text-[#64748B] text-xs">
                    All airspace and flight alerts are clear.
                  </div>
                ) : (
                  activeAlerts.map((alert) => {
                    const isSelected = alert.id === selectedIncidentId
                    const sev = alert.severity?.toLowerCase()
                    const sevBadgeClass =
                      sev === "critical"
                        ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                        : sev === "high"
                        ? "bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]"
                        : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"

                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedIncidentId(alert.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#EFF6FF]/50 border-2 border-[#1E64D4] shadow-xs"
                            : "bg-white border-[#E2E8F0] hover:border-[#CAD8E6] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thumbnail / Graphic representation */}
                          <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#0A0714] border border-[#2D1B4E] flex items-center justify-center shrink-0">
                            {sev === "critical" ? (
                              <Flame className="w-5 h-5 text-[#EF4444]" />
                            ) : sev === "high" ? (
                              <div className="w-full h-full bg-gradient-to-tr from-[#350A52] to-[#F59E0B] opacity-90 flex items-center justify-center">
                                <span className="w-3 h-3 rounded-full bg-[#FEF08A] blur-[1px]" />
                              </div>
                            ) : (
                              <Car className="w-5 h-5 text-[#38BDF8]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-[#0D233A] truncate">
                              {alert.title}
                            </h3>
                            <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                              {alert.location}
                            </p>
                            <p className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
                              {alert.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Right side: Severity badge + Deep dive link */}
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevBadgeClass}`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[11px] font-semibold text-[#1E64D4] hover:underline flex items-center">
                            Deep dive &gt;
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. Closed Recently Card */}
            <div className="bg-white rounded-2xl border border-[#D5E1ED] shadow-sm p-4 sm:p-5 flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-[#0D233A] mb-3">Closed recently</h2>

              <div className="flex flex-col divide-y divide-[#F1F5F9]">
                {closedRecently.map((item) => {
                  return (
                    <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#0D233A] truncate">{item.title}</h4>
                          <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                            {item.resolution}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#94A3B8] shrink-0 whitespace-nowrap">
                        {item.closedTime}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* RIGHT COLUMN: SELECTED INCIDENT DETAIL             */}
          {/* ================================================== */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D5E1ED] shadow-sm p-5 sm:p-6 lg:p-7 flex flex-col gap-5">
            {selectedIncident ? (
              <>
                {/* Header matching reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0D233A] tracking-tight">
                      {selectedIncident.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {selectedIncident.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5]">
                      {selectedIncident.severity}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsDeepDiveOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E64D4] hover:bg-[#1553B8] text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                    >
                      <span>Open deep dive</span>
                    </button>
                  </div>
                </div>

                {/* Evidence / Video / Thermal Sensor Display */}
                <IncidentEvidenceView incident={selectedIncident} />

                {/* Incident Information Table/Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F1F5F9] text-xs">
                  {/* Row 1: Detected */}
                  <div className="flex items-center gap-2 text-[#64748B]">
                    <Clock className="w-3.5 h-3.5 text-[#1E64D4]" />
                    <span className="font-medium">Detected:</span>
                    <span className="font-bold text-[#0D233A]">
                      {selectedIncident.detectedTime}, {selectedIncident.detectedDate}
                    </span>
                  </div>

                  {/* Row 2: Confidence */}
                  <div className="flex items-center gap-2 text-[#64748B]">
                    <Eye className="w-3.5 h-3.5 text-[#1E64D4]" />
                    <span className="font-medium">Confidence:</span>
                    <span className="font-bold text-[#0D233A]">{selectedIncident.confidence}</span>
                  </div>

                  {/* Row 3: Mission */}
                  <div className="flex items-center gap-2 text-[#64748B] sm:col-span-2">
                    <Layers className="w-3.5 h-3.5 text-[#1E64D4]" />
                    <span className="font-medium">Mission:</span>
                    <button
                      type="button"
                      onClick={() => navigate("/missions/details")}
                      className="font-bold text-[#1E64D4] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>{selectedIncident.missionId} · {selectedIncident.missionName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 4: Seen by */}
                  <div className="flex items-center gap-2 text-[#64748B] sm:col-span-2">
                    <Radio className="w-3.5 h-3.5 text-[#1E64D4]" />
                    <span className="font-medium">Seen by:</span>
                    <button
                      type="button"
                      onClick={() => navigate("/fly")}
                      className="font-bold text-[#0D233A] hover:text-[#1E64D4] cursor-pointer flex items-center gap-1"
                    >
                      <span>{selectedIncident.seenBy}</span>
                    </button>
                  </div>
                </div>

                {/* "What it means" Box matching reference */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#6366F1] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#4338CA]">What it means</h4>
                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed mt-0.5">
                      {selectedIncident.whatItMeans}
                    </p>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[#F1F5F9]">
                  {/* Action 1: Send nearest drone */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0D233A]">Send the nearest drone to verify</h4>
                        <p className="text-[11px] text-[#64748B]">Closest drone is 4 minutes away</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDispatch(selectedIncident)}
                      className="px-4 py-1.5 rounded-lg bg-[#1E64D4] hover:bg-[#1553B8] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      Dispatch
                    </button>
                  </div>

                  {/* Action 2: Notify site team */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0D233A]">Notify the site team</h4>
                        <p className="text-[11px] text-[#64748B]">Clip and position attached</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotifyTeam(selectedIncident)}
                      className="px-4 py-1.5 rounded-lg border border-[#CAD8E6] text-[#0D233A] hover:bg-[#F8FAFC] text-xs font-bold transition cursor-pointer"
                    >
                      Notify
                    </button>
                  </div>

                  {/* Action 3: Open mission live */}
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0D233A]">Open the mission live</h4>
                        <p className="text-[11px] text-[#64748B]">{selectedIncident.missionName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/missions/details")}
                      className="px-4 py-1.5 rounded-lg border border-[#CAD8E6] text-[#0D233A] hover:bg-[#F8FAFC] text-xs font-bold transition cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                </div>

                {/* Incident Triage & Evidence Export Controls */}
                <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#64748B] font-medium">Triage Workflow:</span>
                    {canTriage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTriage("Acknowledged")}
                          className="px-2.5 py-1 rounded-md border border-[#CAD8E6] bg-white text-[#18314C] hover:bg-[#F8FAFC] font-semibold text-[11px] transition"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriage("Investigating")}
                          className="px-2.5 py-1 rounded-md border border-[#CAD8E6] bg-white text-[#18314C] hover:bg-[#F8FAFC] font-semibold text-[11px] transition"
                        >
                          Investigating
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriage("Resolved")}
                          className="px-2.5 py-1 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] shadow-2xs transition"
                        >
                          Resolve
                        </button>
                      </>
                    ) : (
                      <span className="text-[#94A3B8]">Auditor Mode · Read-Only</span>
                    )}
                  </div>

                  {canExport && (
                    <button
                      type="button"
                      onClick={handleExportEvidence}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] bg-white text-xs font-bold text-[#18314C] hover:bg-[#F8FAFC] transition cursor-pointer self-start sm:self-auto"
                    >
                      <Download className="w-3.5 h-3.5 text-[#1E64D4]" />
                      <span>Export Evidence</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-[#64748B]">
                <ShieldCheck className="w-12 h-12 text-[#16A34A] mx-auto mb-2" />
                <h3 className="text-base font-bold text-[#0D233A]">No Active Incidents</h3>
                <p className="text-xs text-[#64748B] mt-1">All aerial security parameters are normal.</p>
              </div>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* BOTTOM VALUE PROPOSITION STRIP                     */}
        {/* ================================================== */}
        <BottomInfoStrip />
      </div>
    </div>
  )
}

export default IncidentsPage
