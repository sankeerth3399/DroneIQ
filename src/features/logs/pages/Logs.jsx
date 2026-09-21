import { useState, useMemo } from "react"
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

  // Original handler for ULog downloads
  const handleExportUlog = (logId) => {
    alert(`Downloading telemetry binary log ${logId}.ulg / .tlog...`)
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
    logService.exportLogs(format, activeCategory, currentDataset)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#35E0FF]" />
              Operations, Flight & Mission Logs
            </h1>

            {/* Live Telemetry Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isLive
                  ? "bg-[#2FE0891F] text-[#2FE089] border-[#2FE0894D]"
                  : "bg-[#1E293B] text-[#94A3B8] border-[#334155]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-[#2FE089] animate-pulse" : "bg-[#64748B]"
                }`}
              />
              <span>{isLive ? "LIVE STREAM" : "OFFLINE"}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Audit autonomous waypoint missions, inspect recorded MAVLink telemetry, track pilot commands, and export binary flight records.
          </p>
        </div>

        {/* Action Buttons: Export Dropdown + Export All Zips */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
          {/* Format Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F1622] text-[#CBD5E1] border border-[#1E293B] hover:border-[#35E0FF] hover:text-[#35E0FF] text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5 text-[#64748B]" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#090D14] border border-[#1A2633] shadow-2xl p-1 z-20 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleTriggerExport("csv")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#CBD5E1] hover:text-white hover:bg-[#131C28] transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2FE089]" />
                  <span>Export as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerExport("json")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#CBD5E1] hover:text-white hover:bg-[#131C28] transition cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-[#35E0FF]" />
                  <span>Export as JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Original Export All Logs (.zip) button */}
          <button
            type="button"
            onClick={() => handleExportUlog("ALL_LATEST")}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#1A2634] text-[#35E0FF] border border-[#35E0FF4D] text-xs font-semibold hover:bg-[#35E0FF] hover:text-[#06090E] transition shrink-0 font-mono cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export All Logs (.zip)</span>
            <span className="sm:hidden">.ZIP</span>
          </button>
        </div>
      </div>

      {/* 7 Log Category Tabs Navigation */}
      <LogCategoryTabs
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat)
          // Maintain or adjust filters
        }}
        categoryCounts={categoryCounts}
      />

      {/* Mission KPI Summary Cards (visible for 'mission' and 'all' views) */}
      {(activeCategory === "mission" || activeCategory === "all") && (
        <MissionLogSummary summary={missionSummary} />
      )}

      {/* Filter and Search Bar */}
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

      {/* Main Table Content based on active category */}
      <div>
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
      </div>

      {/* Mission Detail Drawer */}
      <MissionLogDetailDrawer
        log={selectedMissionLog}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onViewFlight={handleViewFlightFromMission}
      />
    </div>
  )
}

export default Logs