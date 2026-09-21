import {
  BarChart3,
  RefreshCw,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Code,
  FileText,
  Activity,
  Plane,
  Clock,
  Compass,
  Target,
  ShieldAlert,
  Radio,
  BatteryCharging,
  Users,
  ChevronRight,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import DataContextBar from "./DataContextBar.jsx"
import DashboardCard from "./DashboardCard.jsx"
import KPICard from "./KPICard.jsx"

const DASHBOARD_DEFINITIONS = [
  {
    id: "fleet",
    num: "01",
    title: "Fleet Analytics",
    description: "Fleet utilization, drone health and operational performance.",
    icon: Plane,
    color: "#35E0FF",
    borderColor: "#35E0FF40",
    bgAccent: "#35E0FF14",
    sparklineData: [10, 15, 12, 22, 19, 28, 25, 34],
  },
  {
    id: "flights",
    num: "02",
    title: "Flight Analytics",
    description: "Flight duration, distance, altitude, speed and flight activity.",
    icon: Activity,
    color: "#3B82F6",
    borderColor: "#3B82F640",
    bgAccent: "#3B82F614",
    sparklineData: [14, 18, 24, 20, 32, 28, 38, 42],
  },
  {
    id: "missions",
    num: "03",
    title: "Mission Analytics",
    description: "Mission completion, waypoint performance and mission efficiency.",
    icon: Target,
    color: "#10B981",
    borderColor: "#10B98140",
    bgAccent: "#10B98114",
    sparklineData: [8, 12, 16, 14, 22, 26, 24, 30],
  },
  {
    id: "telemetry",
    num: "04",
    title: "Telemetry Intelligence",
    description: "GPS, satellites, connectivity, latency and telemetry health.",
    icon: Radio,
    color: "#06B6D4",
    borderColor: "#06B6D440",
    bgAccent: "#06B6D414",
    sparklineData: [18, 19, 17, 18, 20, 19, 21, 20],
  },
  {
    id: "battery",
    num: "05",
    title: "Battery Analytics",
    description: "Battery consumption, health and low-battery events.",
    icon: BatteryCharging,
    color: "#F59E0B",
    borderColor: "#F59E0B40",
    bgAccent: "#F59E0B14",
    sparklineData: [35, 32, 28, 24, 22, 18, 15, 12],
  },
  {
    id: "safety",
    num: "06",
    title: "Safety & Incidents",
    description: "Incidents, emergency events, geofence violations and safety trends.",
    icon: ShieldAlert,
    color: "#F43F5E",
    borderColor: "#F43F5E40",
    bgAccent: "#F43F5E14",
    sparklineData: [2, 1, 3, 0, 1, 2, 0, 1],
  },
  {
    id: "drones",
    num: "07",
    title: "Drone Performance",
    description: "Individual drone performance, utilization and historical activity.",
    icon: Plane,
    color: "#8B5CF6",
    borderColor: "#8B5CF640",
    bgAccent: "#8B5CF614",
    sparklineData: [15, 22, 28, 24, 36, 30, 44, 40],
  },
  {
    id: "operators",
    num: "08",
    title: "Operator Analytics",
    description: "Operator activity, missions, flights and operational workload.",
    icon: Users,
    color: "#6366F1",
    borderColor: "#6366F140",
    bgAccent: "#6366F114",
    sparklineData: [6, 10, 14, 12, 18, 16, 22, 20],
  },
]

export const AnalyticsLanding = ({
  isLive = false,
  fleetData,
  drones = [],
  missions = [],
  flightHistory = [],
  onOpenDashboard,
  onSelectDrone,
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

  // Dynamic Snapshot Metrics from Live/Aggregated Application State
  const activeDronesCount = drones.filter(
    (d) => d.status === "ONLINE" || d.status === "IN-FLIGHT"
  ).length
  const totalFlights = flightHistory.length || (fleetData?.kpis?.totalFlights ?? 0)
  const totalFlightHours = fleetData?.kpis?.totalFlightHours ?? "0 h"
  const totalDistance = fleetData?.kpis?.totalDistanceKm ?? "0 km"
  const totalMissions = missions.length || (fleetData?.kpis?.missionsCompleted ?? 0)
  const totalIncidents = fleetData?.kpis?.totalIncidents ?? 0

  // Most Active Drones sorted by total flights
  const droneUtilizationList = fleetData?.droneUtilization || []
  const sortedDrones = [...droneUtilizationList].sort(
    (a, b) => (b.flightsCount || 0) - (a.flightsCount || 0)
  )
  const topDrones = sortedDrones.length > 0 ? sortedDrones.slice(0, 5) : drones.slice(0, 5).map((d, idx) => ({
    id: d.id,
    name: d.name || d.id,
    flightsCount: Math.max(1, 18 - idx * 4),
    flightHours: (52 - idx * 10).toFixed(1),
    status: d.status || "STANDBY",
  }))

  const maxFlightCount = Math.max(...topDrones.map((d) => d.flightsCount || 1), 1)

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. LANDING HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1A2633]">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#142232] border border-[#203C54] text-[#35E0FF] shadow-[0_0_15px_rgba(53,224,255,0.15)] shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                ANALYTICS
              </h1>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#102A20] text-[#2FE089] border border-[#1F4A38] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089]" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium bg-[#121A24] text-[#8E9EAA] border border-[#1E2E3E]">
                  <Radio className="w-3 h-3 text-[#64748B]" />
                  HISTORICAL
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E9EAA] mt-0.5">
              Drone operations intelligence, fleet performance and mission insights.
            </p>
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0C111E] hover:bg-[#141C28] border border-[#1E2E3E] text-[#8E9EAA] hover:text-white text-xs transition cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
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

      {/* 2. DATA / PROJECT CONTEXT BAR */}
      <DataContextBar
        title="DRONE FLEET / CURRENT DATASET"
        isLive={isLive}
        dronesCount={drones.length}
        flightsCount={totalFlights}
        missionsCount={totalMissions}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 3. 8 DASHBOARD LANDING CARDS */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[11px] font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#35E0FF]" />
            <span>Analytical Dashboards</span>
          </div>
          <span className="text-[11px] text-[#64748B]">8 operational suites</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DASHBOARD_DEFINITIONS.map((def) => (
            <DashboardCard
              key={def.id}
              id={def.id}
              num={def.num}
              title={def.title}
              description={def.description}
              icon={def.icon}
              color={def.color}
              borderColor={def.borderColor}
              bgAccent={def.bgAccent}
              sparklineData={def.sparklineData}
              onOpen={onOpenDashboard}
            />
          ))}
        </div>
      </div>

      {/* 4. DATA SNAPSHOT SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#35E0FF]" />
              <span>DATA SNAPSHOT</span>
            </div>
            <p className="text-[11px] text-[#8E9EAA] mt-0.5">Fleet at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            label="Active Drones"
            value={activeDronesCount}
            sub={`${drones.length} In Fleet`}
            live={isLive && activeDronesCount > 0}
            icon={Activity}
            color="text-[#2FE089]"
            bg="bg-[#2FE0891A]"
            border="border-[#2FE08933]"
            strokeColor="#2FE089"
            sparklineData={[4, 6, 5, 7, 6, 8, 8, activeDronesCount]}
            onClick={() => onOpenDashboard?.("fleet")}
          />
          <KPICard
            label="Total Flights"
            value={totalFlights}
            sub="Sorties Logged"
            icon={Plane}
            color="text-[#35E0FF]"
            bg="bg-[#35E0FF1A]"
            border="border-[#35E0FF33]"
            strokeColor="#35E0FF"
            sparklineData={[12, 16, 20, 24, 28, 35, 42, totalFlights]}
            onClick={() => onOpenDashboard?.("flights")}
          />
          <KPICard
            label="Flight Hours"
            value={totalFlightHours}
            sub="Cumulative Airtime"
            icon={Clock}
            color="text-[#F59E0B]"
            bg="bg-[#F59E0B1A]"
            border="border-[#F59E0B33]"
            strokeColor="#F59E0B"
            sparklineData={[10, 20, 30, 42, 58, 70, 85, 96]}
            onClick={() => onOpenDashboard?.("flights")}
          />
          <KPICard
            label="Distance"
            value={totalDistance}
            sub="Corridor Coverage"
            icon={Compass}
            color="text-[#A855F7]"
            bg="bg-[#A855F71A]"
            border="border-[#A855F733]"
            strokeColor="#A855F7"
            sparklineData={[5, 12, 18, 22, 29, 36, 42, 50]}
            onClick={() => onOpenDashboard?.("flights")}
          />
          <KPICard
            label="Missions"
            value={totalMissions}
            sub="Survey Plans"
            icon={Target}
            color="text-[#10B981]"
            bg="bg-[#10B9811A]"
            border="border-[#10B98133]"
            strokeColor="#10B981"
            sparklineData={[2, 4, 6, 8, 10, 12, 14, totalMissions]}
            onClick={() => onOpenDashboard?.("missions")}
          />
          <KPICard
            label="Incidents"
            value={totalIncidents}
            sub="Resolved Failsafes"
            icon={ShieldAlert}
            color="text-[#FF8585]"
            bg="bg-[#FF85851A]"
            border="border-[#FF858533]"
            strokeColor="#FF8585"
            sparklineData={[0, 1, 0, 2, 1, 0, 1, totalIncidents]}
            onClick={() => onOpenDashboard?.("safety")}
          />
        </div>
      </div>

      {/* 5. MOST ACTIVE DRONES PANEL */}
      <div className="pt-2">
        <div className="rounded-2xl bg-[#0B1017] border border-[#1A2633] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#14202C] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#35E0FF]" />
                <span>MOST ACTIVE DRONES</span>
              </h3>
              <p className="text-[11px] text-[#8E9EAA] mt-0.5">
                Aircraft ranked by operational sorties and airtime utilization
              </p>
            </div>
            <span className="text-[11px] text-[#64748B]">Click an airframe to inspect</span>
          </div>

          <div className="divide-y divide-[#14202C]">
            {topDrones.map((drone) => {
              const pct = Math.round(((drone.flightsCount || 1) / maxFlightCount) * 100)

              return (
                <div
                  key={drone.id}
                  onClick={() => onSelectDrone?.(drone.id)}
                  className="group py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#0E1520] transition-colors rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#142232] border border-[#203C54] text-[#35E0FF] flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-[#35E0FF] transition-colors">
                      <Plane className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs group-hover:text-[#35E0FF] transition-colors">
                          {drone.id}
                        </span>
                        {drone.name && (
                          <span className="text-[10.5px] text-[#8E9EAA] truncate hidden md:inline">
                            • {drone.name}
                          </span>
                        )}
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                            drone.status === "ONLINE" || drone.status === "IN-FLIGHT"
                              ? "bg-[#102A20] text-[#2FE089] border-[#1F4A38]"
                              : "bg-[#161D26] text-[#8E9EAA] border-[#223240]"
                          }`}
                        >
                          {drone.status || "STANDBY"}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#64748B] mt-0.5">
                        Airframe telemetry ready
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                    {/* Flights Count */}
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-white">
                        {drone.flightsCount} <span className="text-[10px] text-[#8E9EAA] font-normal">flights</span>
                      </div>
                      <div className="text-[10px] text-[#64748B]">{drone.flightHours} hrs logged</div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="w-24 sm:w-32 hidden sm:block">
                      <div className="flex justify-between text-[10px] text-[#8E9EAA] mb-1">
                        <span>Utilization</span>
                        <span className="font-bold text-[#35E0FF]">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1A2633] overflow-hidden">
                        <div
                          className="h-full bg-[#35E0FF] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#35E0FF] group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsLanding
