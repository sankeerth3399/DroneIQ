import { useState, useEffect } from "react"
import { Crosshair, Plane, Battery, Radio, Compass, Gauge, Mountain, Activity, Layers, ChevronDown } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import MultiMetricChart from "../charts/MultiMetricChart.jsx"
import DonutChart from "../charts/DonutChart.jsx"
import { analyticsService } from "@/services/api/analyticsService.js"

export const DronePerformanceView = ({
  drones = [],
  selectedDroneId = "DRONE-001",
  onSelectDrone,
  onSelectFlight,
}) => {
  const [internalDroneId, setInternalDroneId] = useState(selectedDroneId)
  const [droneData, setDroneData] = useState(null)
  const [loading, setLoading] = useState(true)

  const activeDroneId = selectedDroneId && selectedDroneId !== "ALL" ? selectedDroneId : internalDroneId

  useEffect(() => {
    let active = true
    analyticsService
      .getDronePerformance(activeDroneId)
      .then((res) => {
        if (active) {
          setDroneData(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeDroneId])

  const handleDroneChange = (id) => {
    setInternalDroneId(id)
    setLoading(true)
    onSelectDrone?.(id)
  }

  if (loading || !droneData) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[#35E0FF] border border-[#1A2633] rounded-xl bg-[#0B1017]">
        Loading Aircraft Performance Profile...
      </div>
    )
  }

  const {
    totalFlights,
    flightHours,
    distanceKm,
    batteryUsage,
    avgSpeed,
    maxAltitude,
    telemetryTrends = [],
    flightModeDistribution = [],
    activityTrend = [],
    flights = [],
  } = droneData

  // Time-series slices from telemetry
  const gpsQualityData = telemetryTrends.map((t) => ({
    time: t.time,
    satellites: t.satellites,
  }))

  const batteryData = telemetryTrends.map((t) => ({
    time: t.time,
    battery: t.battery,
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. DRONE SELECTOR STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0B1017] border border-[#1A2633]">
        <div className="flex items-center gap-2.5">
          <Crosshair className="w-5 h-5 text-[#8B5CF6]" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase">Aircraft Specific Telemetry & History</h3>
            <p className="text-[11px] text-[#8E9EAA]">Select an individual airframe to analyze performance envelopes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8E9EAA]">Select Airframe:</span>
          <div className="relative">
            <select
              value={activeDroneId}
              onChange={(e) => handleDroneChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-[#06090E] border border-[#203C54] text-[#8B5CF6] text-xs font-bold focus:outline-none focus:border-[#8B5CF6] cursor-pointer hover:border-[#35E0FF] transition"
            >
              {drones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} - {d.name || d.model || "QuadX"}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9EAA] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. KPI CARDS (6 CARDS AS SPECIFIED IN SECTION 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Flights"
          value={totalFlights}
          sub="Sorties"
          icon={Plane}
          color="text-[#8B5CF6]"
          bg="bg-[#8B5CF61A]"
          border="border-[#8B5CF633]"
          strokeColor="#8B5CF6"
          sparklineData={[4, 6, 8, 12, 14, 18, 22, totalFlights]}
        />
        <KPICard
          label="Flight Hours"
          value={flightHours}
          sub="Cumulative"
          icon={Activity}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[2, 6, 12, 18, 25, 34, 42, 50]}
        />
        <KPICard
          label="Distance"
          value={distanceKm}
          sub="Corridor Path"
          icon={Compass}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[3, 8, 14, 19, 26, 32, 40, 48]}
        />
        <KPICard
          label="Battery Usage"
          value={batteryUsage}
          sub="Per Sortie Avg"
          icon={Battery}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[40, 44, 48, 52, 50, 48, 52, 54]}
        />
        <KPICard
          label="Average Speed"
          value={avgSpeed}
          sub={`Peak: ${droneData.maxSpeed}`}
          icon={Gauge}
          color="text-[#38BDF8]"
          bg="bg-[#38BDF81A]"
          border="border-[#38BDF833]"
          strokeColor="#38BDF8"
          sparklineData={[6, 7, 8, 9, 8, 7, 8, 8]}
        />
        <KPICard
          label="Max Altitude"
          value={maxAltitude}
          sub="AGL Ceiling"
          icon={Mountain}
          color="text-[#F43F5E]"
          bg="bg-[#F43F5E1A]"
          border="border-[#F43F5E33]"
          strokeColor="#F43F5E"
          sparklineData={[30, 45, 52, 60, 65, 68, 64, 68]}
        />
      </div>

      {/* 3. CHARTS ROW 1: Flight Activity & Synchronized Speed/Altitude Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Flight Activity Over Time"
          subtitle={`Sorties logged across operational history for ${activeDroneId}`}
          icon={Activity}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={activityTrend}
              xKey="date"
              yKey="flights"
              unit=" sorties"
              label="SORTIES"
              color="#8B5CF6"
              gradientId="droneActGrad"
              height={200}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Speed & Altitude Profile"
          subtitle="Synchronized flight telemetry trajectory"
          icon={Gauge}
        >
          <div className="pt-2">
            <MultiMetricChart data={telemetryTrends} height={200} />
          </div>
        </ChartCard>
      </div>

      {/* 4. CHARTS ROW 2: Battery Curve, GPS Quality, and Flight Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Battery Decay */}
        <ChartCard
          title="Battery Discharge Envelope"
          subtitle="State-of-charge decay across sortie"
          icon={Battery}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={batteryData}
              xKey="time"
              yKey="battery"
              unit="%"
              label="BATTERY"
              color="#F59E0B"
              gradientId="droneBatGrad"
              height={190}
            />
          </div>
        </ChartCard>

        {/* GPS Quality / Satellites */}
        <ChartCard
          title="GNSS Satellites & Signal Quality"
          subtitle="Active constellation tracking health"
          icon={Radio}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={gpsQualityData}
              xKey="time"
              yKey="satellites"
              unit=" sats"
              label="SATELLITES"
              color="#2FE089"
              gradientId="droneGpsGrad"
              height={190}
            />
          </div>
        </ChartCard>

        {/* Flight Modes Donut */}
        <ChartCard
          title="Flight Modes Executed"
          subtitle="Mode proportion for this airframe"
          icon={Layers}
        >
          <div className="pt-2 flex items-center justify-center min-h-[190px]">
            <DonutChart
              data={flightModeDistribution}
              title="Modes"
              size={160}
              centerLabel="Sorties"
            />
          </div>
        </ChartCard>
      </div>

      {/* 5. AIRFRAME RECENT SORTIES LOG */}
      <ChartCard
        title={`${activeDroneId} Logged Sorties`}
        subtitle="Individual flight logs registered by this airframe"
        icon={Plane}
      >
        <div className="divide-y divide-[#14202C] text-xs">
          {flights.map((f) => (
            <div
              key={f.id}
              onClick={() => onSelectFlight?.(f)}
              className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#121A26] transition cursor-pointer px-2 rounded"
            >
              <div>
                <span className="font-bold text-[#8B5CF6]">{f.id}</span>
                <span className="text-[11px] text-[#8E9EAA] block">
                  {f.missionName} • Operator: {f.operator}
                </span>
              </div>
              <div className="text-right">
                <span className="text-white font-semibold">{f.durationFormatted}</span>
                <span className="text-[10px] text-[#64748B] block">
                  {f.distanceKm} km • {f.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

export default DronePerformanceView
