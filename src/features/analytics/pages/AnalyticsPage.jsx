import { useAnalytics } from "../hooks/useAnalytics.js"
import AnalyticsLanding from "../components/AnalyticsLanding.jsx"
import DashboardDetailHeader from "../components/DashboardDetailHeader.jsx"
import DataContextBar from "../components/DataContextBar.jsx"
import AnalyticsFilters from "../components/AnalyticsFilters.jsx"
import FlightHistoryTable from "../components/FlightHistoryTable.jsx"
import FlightDetailDrawer from "../components/FlightDetailDrawer.jsx"

// 8 Detailed Analytical Views
import FleetOverviewView from "../components/views/FleetOverviewView.jsx"
import FlightAnalyticsView from "../components/views/FlightAnalyticsView.jsx"
import DronePerformanceView from "../components/views/DronePerformanceView.jsx"
import MissionAnalyticsView from "../components/views/MissionAnalyticsView.jsx"
import TelemetryHealthView from "../components/views/TelemetryHealthView.jsx"
import BatteryAnalyticsView from "../components/views/BatteryAnalyticsView.jsx"
import SafetyIncidentsView from "../components/views/SafetyIncidentsView.jsx"
import OperatorActivityView from "../components/views/OperatorActivityView.jsx"

import { AlertTriangle, RefreshCw } from "lucide-react"

export const AnalyticsPage = () => {
  const {
    isLive,
    activeDashboard,
    setActiveDashboard,
    navigateToLanding,
    filters,
    handleFilterChange,
    handleResetFilters,
    handleApplyFilters,
    fleetData,
    flightData,
    missionData,
    telemetryData,
    batteryData,
    incidentData,
    operatorData,
    flightHistory,
    drones,
    missions,
    operators,
    selectedFlight,
    flightDetail,
    isDetailOpen,
    handleSelectFlight,
    handleCloseDetail,
    isLoading,
    isRefreshing,
    error,
    refresh,
    handleExport,
  } = useAnalytics()

  const totalFlights = flightHistory.length || (fleetData?.kpis?.totalFlights ?? 0)
  const totalMissions = missions.length || (fleetData?.kpis?.missionsCompleted ?? 0)

  return (
    <div className="relative h-full min-h-0 w-full overflow-y-auto bg-[#06090E] p-4 sm:p-6 lg:p-8 select-none font-mono text-white space-y-6">
      {error ? (
        /* Error State with Retry Button */
        <div className="p-8 rounded-2xl bg-[#1F1315] border border-[#5E2222] text-center font-mono text-xs text-[#FF8585] space-y-3 shadow-xl">
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <AlertTriangle className="w-5 h-5 text-[#FF4141]" />
            <span>Telemetry & Analytics Pipeline Disrupted</span>
          </div>
          <p className="text-[#8E9EAA] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="px-4 py-2 rounded-lg bg-[#FF414126] border border-[#FF41414D] hover:bg-[#FF41414D] text-white font-bold transition cursor-pointer"
          >
            Retry Analytics Sync
          </button>
        </div>
      ) : isLoading ? (
        /* Skeleton / Loading State */
        <div className="p-16 rounded-2xl bg-[#0B1017] border border-[#1A2633] text-center font-mono text-xs text-[#35E0FF] space-y-4 shadow-xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#35E0FF]" />
          <div className="text-base font-bold text-white tracking-wide">
            Aggregating Drone Operational Intelligence...
          </div>
          <p className="text-xs text-[#8E9EAA] max-w-sm mx-auto">
            Synchronizing flight sorties, GNSS satellite fixes, battery profiles, and MAVLink event logs
          </p>
        </div>
      ) : !activeDashboard ? (
        /* ============================================================ */
        /* 1. ANALYTICS DASHBOARD LANDING PAGE                          */
        /* ============================================================ */
        <AnalyticsLanding
          isLive={isLive}
          fleetData={fleetData}
          drones={drones}
          missions={missions}
          flightHistory={flightHistory}
          onOpenDashboard={(dashboardId) => setActiveDashboard(dashboardId)}
          onSelectDrone={(droneId) => {
            handleFilterChange("droneId", droneId)
            setActiveDashboard("drones")
          }}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          onExport={handleExport}
        />
      ) : (
        /* ============================================================ */
        /* 2. DETAILED DRILL-DOWN DASHBOARD PAGE                        */
        /* ============================================================ */
        <div className="space-y-6">
          {/* Header with ← All Dashboards navigation */}
          <DashboardDetailHeader
            activeDashboard={activeDashboard}
            onBackToLanding={navigateToLanding}
            onSelectDashboard={setActiveDashboard}
            isLive={isLive}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            onExport={handleExport}
          />

          {/* Dataset Context Bar */}
          <DataContextBar
            title={`DRONE FLEET / ${String(activeDashboard).toUpperCase()} DATASET`}
            isLive={isLive}
            dronesCount={drones.length}
            flightsCount={totalFlights}
            missionsCount={totalMissions}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
          />

          {/* Global Analytics Filters */}
          <AnalyticsFilters
            filters={filters}
            onChangeFilter={handleFilterChange}
            onResetFilters={handleResetFilters}
            onApplyFilters={handleApplyFilters}
            drones={drones}
            missions={missions}
            operators={operators}
          />

          {/* Active Detailed View */}
          {activeDashboard === "fleet" && (
            <FleetOverviewView
              data={fleetData}
              isLive={isLive}
              onSelectDrone={(droneId) => {
                handleFilterChange("droneId", droneId)
                setActiveDashboard("drones")
              }}
              onSelectFlight={handleSelectFlight}
            />
          )}

          {activeDashboard === "flights" && (
            <FlightAnalyticsView flightData={flightData} />
          )}

          {activeDashboard === "drones" && (
            <DronePerformanceView
              drones={drones}
              selectedDroneId={filters.droneId !== "ALL" ? filters.droneId : "DRONE-001"}
              onSelectDrone={(droneId) => handleFilterChange("droneId", droneId)}
              onSelectFlight={handleSelectFlight}
            />
          )}

          {activeDashboard === "missions" && (
            <MissionAnalyticsView
              missionData={missionData}
              onSelectMission={(mission) => handleFilterChange("missionId", mission.id)}
            />
          )}

          {activeDashboard === "telemetry" && (
            <TelemetryHealthView telemetryData={telemetryData} />
          )}

          {activeDashboard === "battery" && (
            <BatteryAnalyticsView batteryData={batteryData} />
          )}

          {activeDashboard === "safety" && (
            <SafetyIncidentsView incidentData={incidentData} />
          )}

          {activeDashboard === "operators" && (
            <OperatorActivityView
              operatorData={operatorData}
              onSelectOperator={(op) => handleFilterChange("operator", op.username)}
            />
          )}

          {/* Sorties Table for flight-focused views */}
          {["fleet", "flights", "drones", "operators"].includes(activeDashboard) && (
            <div className="pt-2">
              <FlightHistoryTable
                flights={flightHistory}
                onSelectFlight={handleSelectFlight}
                onExportCsv={() => handleExport("csv")}
              />
            </div>
          )}
        </div>
      )}

      {/* Flight Detail Drill-Down Slide-over Drawer */}
      <FlightDetailDrawer
        flight={selectedFlight}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        telemetrySamples={flightDetail?.telemetrySamples || []}
      />
    </div>
  )
}

export default AnalyticsPage
