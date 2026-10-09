import { useState, useMemo, useEffect } from "react"
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
} from "lucide-react"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { logService } from "@/services/api/logService.js"
import { projectService } from "@/services/projectService.js"
import { LogCategoryTabs } from "../components/LogCategoryTabs.jsx"
import { MissionLogSummary } from "../components/MissionLogSummary.jsx"
import { MissionLogFilters } from "../components/MissionLogFilters.jsx"
import { MissionLogTable } from "../components/MissionLogTable.jsx"
import { FlightLogsTable } from "../components/FlightLogsTable.jsx"
import { GenericLogsTable } from "../components/GenericLogsTable.jsx"
import { MissionLogDetailDrawer } from "../components/MissionLogDetailDrawer.jsx"
import BottomInfoStrip from "@/features/reports/components/BottomInfoStrip.jsx"
import { showAlert, AlertTypes, AlertCategories } from "@/services/notification/alertService.js"

const INITIAL_FILTERS = {
  search: "",
  missionId: "ALL",
  droneId: "ALL",
  operator: "ALL",
  event: "ALL",
  status: "ALL",
  flightMode: "ALL",
  range: "ALL",
}

export const Logs = () => {
  const { isLive } = useTelemetry()

  // Active category tab
  const [activeCategory, setActiveCategory] = useState("all")

  // Filter state
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  // Drawer state for mission details
  const [selectedMissionLog, setSelectedMissionLog] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    try {
      logService.getAllLogs()
    } catch {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Logs Unavailable",
        message: "Unable to load system logs.",
        category: AlertCategories.SYSTEM,
        key: "LOGS_LOAD_ERROR",
      })
    }
  }, [])

  // Handler for ULog downloads
  const handleExportUlog = (logId) => {
    showAlert({
      type: AlertTypes.INFO,
      title: "Export Started",
      message: `Downloading telemetry binary log ${logId}.ulg / .tlog...`,
      category: AlertCategories.SYSTEM,
      key: `EXPORT_${logId}`,
    })
    setTimeout(() => {
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "Logs Exported",
        message: `Binary flight log package ready.`,
        category: AlertCategories.SYSTEM,
        key: `EXPORT_${logId}`,
      })
    }, 800)
  }

  // Fetch summary metrics
  const missionSummary = useMemo(() => {
    return logService.getMissionSummary()
  }, [])

  // Dynamic filter options based on authentic project and flight data
  const { missions, drones, operators, eventTypes, flightModes, statuses } = useMemo(() => {
    const rawProjects = projectService.getProjects() || []
    const rawMissionLogs = logService.getMissionLogs()
    const rawFlightLogs = logService.getFlightLogs()

    const mList = rawProjects.map((p) => ({
      id: p.id,
      name: p.name || p.projectName || p.id,
    }))

    const dList = Array.from(
      new Set(
        [
          ...rawMissionLogs.map((l) => l.droneId),
          ...rawFlightLogs.map((l) => l.droneId || l.callsign),
        ].filter(Boolean)
      )
    )

    const opList = Array.from(
      new Set(
        [
          ...rawMissionLogs.map((l) => l.operator),
          ...rawFlightLogs.map((l) => l.operator),
        ].filter(Boolean)
      )
    )

    const evList = Array.from(
      new Set(rawMissionLogs.map((l) => l.event).filter(Boolean))
    )

    const fmList = ["GUIDED", "AUTO", "RTL", "LOITER", "POSHOLD", "MANUAL"]
    const stList = ["Ready", "Running", "Completed", "Failed", "Cancelled", "Draft"]

    return {
      missions: mList,
      drones: dList,
      operators: opList,
      eventTypes: evList,
      flightModes: fmList,
      statuses: stList,
    }
  }, [])

  // Datasets per category with filters applied
  const missionLogs = useMemo(() => {
    return logService.getMissionLogs(filters)
  }, [filters])

  const flightLogs = useMemo(() => {
    return logService.getFlightLogs(filters)
  }, [filters])

  const telemetryLogs = useMemo(() => {
    return logService.getTelemetryLogs(filters)
  }, [filters])

  const commandLogs = useMemo(() => {
    return logService.getCommandLogs(filters)
  }, [filters])

  const systemLogs = useMemo(() => {
    return logService.getSystemLogs(filters)
  }, [filters])

  const incidentLogs = useMemo(() => {
    return logService.getIncidentLogs(filters)
  }, [filters])

  const allLogs = useMemo(() => {
    return logService.getAllLogs(filters)
  }, [filters])

  // Dynamic count badges for each tab
  const categoryCounts = useMemo(() => {
    return {
      all: logService.getAllLogs().length,
      flight: logService.getFlightLogs().length,
      mission: logService.getMissionLogs().length,
      telemetry: logService.getTelemetryLogs().length,
      command: logService.getCommandLogs().length,
      system: logService.getSystemLogs().length,
      incident: logService.getIncidentLogs().length,
    }
  }, [])

  // Current active dataset for exports
  const currentDataset = useMemo(() => {
    switch (activeCategory) {
      case "mission":
        return missionLogs
      case "flight":
        return flightLogs
      case "telemetry":
        return telemetryLogs
      case "command":
        return commandLogs
      case "system":
        return systemLogs
      case "incident":
        return incidentLogs
      case "all":
      default:
        return allLogs
    }
  }, [
    activeCategory,
    missionLogs,
    flightLogs,
    telemetryLogs,
    commandLogs,
    systemLogs,
    incidentLogs,
    allLogs,
  ])

  // Bidirectional navigation handlers
  const handleOpenMissionDrawer = (log) => {
    setSelectedMissionLog(log)
    setIsDrawerOpen(true)
  }

  const handleViewFlightFromMission = (flightId) => {
    setIsDrawerOpen(false)
    setActiveCategory("flight")
    setFilters((prev) => ({
      ...prev,
      search: flightId || "",
    }))
  }

  const handleViewMissionFromFlight = (missionId) => {
    setActiveCategory("mission")
    setFilters((prev) => ({
      ...prev,
      missionId: missionId || "ALL",
      search: "",
    }))
    const matchedLog = missionLogs.find((l) => l.missionId === missionId)
    if (matchedLog) {
      setSelectedMissionLog(matchedLog)
      setIsDrawerOpen(true)
    }
  }

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  // Export handlers
  const handleTriggerExport = (format) => {
    setShowExportMenu(false)
    try {
      showAlert({
        type: AlertTypes.INFO,
        title: "Export Started",
        message: `Preparing ${format.toUpperCase()} export for ${activeCategory} logs...`,
        category: AlertCategories.SYSTEM,
        key: "LOGS_EXPORT",
      })
      logService.exportLogs(format, activeCategory, currentDataset)
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "Logs Exported",
        message: `Successfully exported ${currentDataset.length} ${activeCategory} logs as ${format.toUpperCase()}.`,
        category: AlertCategories.SYSTEM,
        key: "LOGS_EXPORT",
      })
    } catch (err) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Export Failed",
        message: err?.message || "Failed to generate log export.",
        category: AlertCategories.SYSTEM,
        key: "LOGS_EXPORT",
      })
    }
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-[#F0F4F9] font-sans select-none text-[#0E2646]">
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-6 p-4 sm:p-5 xl:p-6 2xl:p-7">
        {/* ================================================== */}
        {/* PAGE HEADER                                        */}
        {/* ================================================== */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#D5E1ED]">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0D233A] tracking-tight leading-tight flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-[#1E64D4]" />
                <span>Operations, Flight & Mission Logs</span>
              </h1>

              {/* Status Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isLive
                    ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                    : "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLive ? "bg-[#16A34A] animate-pulse" : "bg-[#94A3B8]"
                  }`}
                />
                <span>{isLive ? "LIVE STREAM" : "OFFLINE"}</span>
              </div>
            </div>

            <p className="mt-1 text-xs sm:text-sm text-[#4F657F] font-medium">
              Audit autonomous waypoint missions, inspect recorded MAVLink telemetry, track pilot commands, and export binary flight records.
            </p>
          </div>

          {/* Export Controls Header */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {/* Format Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0E2646] border border-[#CAD8E6] hover:bg-[#F8FAFC] text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#1E64D4]" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white border border-[#D5E1ED] shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleTriggerExport("csv")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0E2646] hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerExport("json")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0E2646] hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-[#1E64D4]" />
                    <span>Export as JSON</span>
                  </button>
                </div>
              )}
            </div>

            {/* Export All Logs (.zip) button */}
            <button
              type="button"
              onClick={() => handleExportUlog("ALL_LATEST")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E64D4] hover:bg-[#1553B8] text-white text-xs sm:text-sm font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export All Logs (.zip)</span>
            </button>
          </div>
        </header>

        {/* ================================================== */}
        {/* LOG CATEGORY TABS                                  */}
        {/* ================================================== */}
        <LogCategoryTabs
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActiveCategory(cat)
          }}
          categoryCounts={categoryCounts}
        />

        {/* ================================================== */}
        {/* SUMMARY KPI CARDS                                  */}
        {/* ================================================== */}
        {(activeCategory === "mission" || activeCategory === "all") && (
          <MissionLogSummary summary={missionSummary} />
        )}

        {/* ================================================== */}
        {/* SEARCH + FILTER WIDGET                             */}
        {/* ================================================== */}
        <MissionLogFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
          missions={missions}
          drones={drones}
          operators={operators}
          eventTypes={eventTypes}
          flightModes={flightModes}
          statuses={statuses}
          totalCount={categoryCounts[activeCategory] || 0}
          filteredCount={currentDataset.length}
        />

        {/* ================================================== */}
        {/* MAIN LOG TABLE CONTENT                             */}
        {/* ================================================== */}
        <main>
          {activeCategory === "mission" && (
            <MissionLogTable
              logs={missionLogs}
              onSelectLog={handleOpenMissionDrawer}
              onViewFlight={handleViewFlightFromMission}
            />
          )}

          {activeCategory === "flight" && (
            <FlightLogsTable
              flightLogs={flightLogs}
              onExport={handleExportUlog}
              onViewMission={handleViewMissionFromFlight}
            />
          )}

          {activeCategory !== "mission" && activeCategory !== "flight" && (
            <GenericLogsTable
              category={activeCategory}
              logs={currentDataset}
              onInspectMission={handleOpenMissionDrawer}
              onViewFlight={handleViewFlightFromMission}
            />
          )}
        </main>

        {/* Mission Detail Inspection Drawer */}
        <MissionLogDetailDrawer
          log={selectedMissionLog}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onViewFlight={handleViewFlightFromMission}
        />

        {/* ================================================== */}
        {/* BOTTOM VALUE PROPOSITION STRIP                     */}
        {/* ================================================== */}
        <BottomInfoStrip />
      </div>
    </div>
  )
}

export default Logs