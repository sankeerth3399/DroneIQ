import { useState } from "react"
import {
  Activity,
  Plane,
  Clock,
  Compass,
  CheckCircle2,
  ShieldAlert,
  BatteryCharging,
  Radio,
  ChevronRight,
} from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import DonutChart from "../charts/DonutChart.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"

export const FleetOverviewView = ({
  data,
  isLive = false,
  onSelectDrone,
  onSelectFlight,
}) => {
  const [activityMetric, setActivityMetric] = useState("flights")

  if (!data) return null

  const { kpis, activityTrend = [], flightModeDistribution = [], droneUtilization = [], recentEvents = [] } = data

  const metricKey =
    activityMetric === "duration"
      ? "durationMinutes"
      : activityMetric === "distance"
      ? "distanceKm"
      : "flights"

  const metricUnit =
    activityMetric === "duration" ? "min" : activityMetric === "distance" ? "km" : "sorties"

  const droneComparisonData = droneUtilization.map((d) => ({
    label: d.id,
    value: d.flightHours,
    sub: d.name,
    color: "#35E0FF",
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. PRIMARY FLEET KPIS (MATCHING SECTION 9 SPECIFICATION) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Total Flights"
          value={kpis.totalFlights}
          sub="Sorties Logged"
          icon={Plane}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[12, 16, 20, 24, 28, 35, 42, kpis.totalFlights]}
        />
        <KPICard
          label="Flight Hours"
          value={kpis.totalFlightHours}
          sub="Cumulative Airtime"
          icon={Clock}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[8, 14, 22, 35, 48, 62, 75, 84]}
        />
        <KPICard
          label="Active Drones"
          value={kpis.activeDrones}
          sub={`${kpis.totalDrones} in Fleet`}
          live={isLive && kpis.activeDrones > 0}
          icon={Activity}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[4, 6, 5, 7, 6, 8, 8, kpis.activeDrones]}
        />
        <KPICard
          label="Distance"
          value={kpis.totalDistanceKm}
          sub="Corridor Coverage"
          icon={Compass}
          color="text-[#A855F7]"
          bg="bg-[#A855F71A]"
          border="border-[#A855F733]"
          strokeColor="#A855F7"
          sparklineData={[5, 12, 18, 22, 29, 36, 42, 50]}
        />
      </div>

      {/* 2. SECONDARY OPERATIONAL METRIC ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Mission Success"
          value={kpis.missionSuccessRate}
          sub={`${kpis.missionsCompleted} Completed`}
          icon={CheckCircle2}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[94, 95, 96, 98, 97, 99, 100, 100]}
        />
        <KPICard
          label="Battery Consumed"
          value={kpis.avgBatteryConsumption}
          sub="Per Sortie Average"
          icon={BatteryCharging}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[42, 45, 50, 48, 52, 46, 48, 49]}
        />
        <KPICard
          label="Telemetry Health"
          value={kpis.telemetryAvailability}
          sub="Uptime Availability"
          icon={Radio}
          color="text-[#06B6D4]"
          bg="bg-[#06B6D41A]"
          border="border-[#06B6D433]"
          strokeColor="#06B6D4"
          sparklineData={[99, 99, 100, 99, 99, 100, 99, 100]}
        />
        <KPICard
          label="Total Incidents"
          value={kpis.totalIncidents}
          sub="100% Mitigated"
          icon={ShieldAlert}
          color="text-[#FF8585]"
          bg="bg-[#FF85851A]"
          border="border-[#FF858533]"
          strokeColor="#FF8585"
          sparklineData={[1, 0, 1, 0, 0, 1, 0, kpis.totalIncidents]}
        />
      </div>

      {/* 3. CHARTS ROW 1: FLIGHT ACTIVITY & FLIGHT MODE DISTRIBUTION (Large + Donut Rhythm) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Flight Activity Over Time"
          subtitle="Historical trends of drone sorties, duration, and distance"
          icon={Activity}
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-[10.5px]">
              {["flights", "duration", "distance"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActivityMetric(mode)}
                  className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                    activityMetric === mode
                      ? "bg-[#35E0FF] text-[#0A0E16] font-bold"
                      : "text-[#8E9EAA] hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          }
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={activityTrend}
              xKey="date"
              yKey={metricKey}
              unit={metricUnit}
              label={activityMetric.toUpperCase()}
              color="#35E0FF"
              height={220}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Flight Mode Distribution"
          subtitle="Autopilot vs Manual flight execution modes"
          icon={Compass}
        >
          <div className="pt-2 flex items-center justify-center min-h-[220px]">
            <DonutChart
              data={flightModeDistribution}
              title="Modes"
              size={170}
              centerLabel="Sorties"
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. CHARTS ROW 2: DRONE UTILIZATION & RECENT OPERATIONAL EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Fleet Utilization by Drone"
          subtitle="Total operational flight hours accumulated per aircraft"
          icon={Plane}
        >
          <div className="pt-3">
            <BarComparisonChart
              data={droneComparisonData}
              xKey="label"
              yKey="value"
              unit=" h"
              color="#35E0FF"
              height={190}
              onBarClick={(item) => onSelectDrone?.(item.label)}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Recent Operational Sorties"
          subtitle="Real-time timeline of latest fleet executions"
          icon={Clock}
        >
          <div className="divide-y divide-[#14202C] text-xs">
            {recentEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onSelectFlight?.(ev)}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#121A26] transition cursor-pointer px-1 rounded"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#2FE089] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#35E0FF] block truncate">{ev.id}</span>
                    <span className="text-[10px] text-[#8E9EAA] truncate">
                      {ev.droneId} • {ev.operator} • {ev.missionName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <span className="text-white font-semibold text-[11px] block">{ev.durationFormatted}</span>
                    <span className="text-[10px] text-[#64748B]">{ev.distanceKm} km</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default FleetOverviewView
