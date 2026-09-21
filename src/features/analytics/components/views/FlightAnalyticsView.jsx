import { useState } from "react"
import { Clock, Compass, Activity, Plane, Layers } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"
import DonutChart from "../charts/DonutChart.jsx"

export const FlightAnalyticsView = ({ flightData }) => {
  const [metric, setMetric] = useState("flights")

  if (!flightData) return null

  const {
    kpis,
    activityTrend = [],
    durationDistribution = [],
    flightsByDrone = [],
    flightModeDistribution = [],
    hourlyDistribution = [],
  } = flightData

  const metricKey = metric === "duration" ? "duration" : metric === "distance" ? "distance" : "flights"
  const metricUnit = metric === "duration" ? "min" : metric === "distance" ? "km" : "sorties"

  const hourlyChartData = (hourlyDistribution || []).map((h) => ({
    label: h.hour,
    value: h.flights,
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Total Flights"
          value={kpis.totalFlights}
          sub="Logged Sorties"
          icon={Plane}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[12, 16, 20, 24, 28, 35, 42, kpis.totalFlights]}
        />
        <KPICard
          label="Flight Hours"
          value={kpis.flightHours}
          sub="Cumulative Airtime"
          icon={Clock}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[8, 14, 22, 35, 48, 62, 75, 84]}
        />
        <KPICard
          label="Distance"
          value={kpis.totalDistance}
          sub="Corridor Coverage"
          icon={Compass}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[5, 12, 18, 22, 29, 36, 42, 50]}
        />
        <KPICard
          label="Average Duration"
          value={kpis.avgFlightDuration}
          sub={`Max Sortie: ${kpis.maxFlightDuration}`}
          icon={Activity}
          color="text-[#A855F7]"
          bg="bg-[#A855F71A]"
          border="border-[#A855F733]"
          strokeColor="#A855F7"
          sparklineData={[18, 20, 24, 22, 26, 25, 28, 24]}
        />
      </div>

      {/* 2. MAIN ANALYTICAL SECTION: FLIGHT ACTIVITY */}
      <ChartCard
        title="Flight Activity"
        subtitle="Operational flight activity trend across time with selectable metrics"
        icon={Activity}
        action={
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-[10.5px]">
            {["flights", "duration", "distance"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                  metric === m
                    ? "bg-[#35E0FF] text-[#0A0E16] font-bold"
                    : "text-[#8E9EAA] hover:text-white"
                }`}
              >
                {m}
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
            label={metric.toUpperCase()}
            color="#35E0FF"
            gradientId="flightActivityGrad"
            height={220}
          />
        </div>
      </ChartCard>

      {/* 3. ROW 2: Flight Duration Distribution & Flights by Drone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Flight Duration Distribution"
          subtitle="Sorties categorized by elapsed operational flight time"
          icon={Clock}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={durationDistribution}
              xKey="label"
              yKey="value"
              unit=" sorties"
              color="#3B82F6"
              height={190}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Flights by Drone"
          subtitle="Number of autonomous and guided missions per airframe"
          icon={Plane}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={flightsByDrone}
              xKey="label"
              yKey="value"
              unit=" sorties"
              color="#35E0FF"
              height={190}
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. ROW 3: Flight Mode Distribution & Daily/Hourly Flight Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Flight Mode Distribution"
          subtitle="Proportion of Autopilot vs Guided/Loiter modes"
          icon={Layers}
          className="lg:col-span-1"
        >
          <div className="pt-2 flex items-center justify-center min-h-[200px]">
            <DonutChart
              data={flightModeDistribution}
              title="Modes"
              size={170}
              centerLabel="Sorties"
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Daily Flight Activity"
          subtitle="Sortie distribution across diurnal operational windows"
          icon={Activity}
          className="lg:col-span-2"
        >
          <div className="pt-2">
            <BarComparisonChart
              data={hourlyChartData}
              xKey="label"
              yKey="value"
              unit=" flights"
              color="#10B981"
              height={190}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default FlightAnalyticsView
