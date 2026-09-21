import { BatteryCharging, Battery, Zap, AlertTriangle, ShieldCheck } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"

export const BatteryAnalyticsView = ({ batteryData }) => {
  if (!batteryData) return null

  const {
    kpis,
    dischargeProfile = [],
    consumptionByDrone = [],
    usageByMission = [],
    lowBatteryEventsTimeline = [],
  } = batteryData

  const dischargeChartData = dischargeProfile.map((d) => ({
    time: `${d.minute}m`,
    battery: d.batteryPct,
  }))

  const droneBatteryData = consumptionByDrone.map((d) => ({
    label: d.droneId,
    value: d.avgUsed,
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. KPI CARDS (5 CARDS AS SPECIFIED IN SECTION 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          label="Average Battery"
          value={kpis.averageBattery || "84%"}
          sub="Fleet Aggregate SoC"
          icon={BatteryCharging}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[88, 86, 84, 85, 83, 85, 84, 84]}
        />
        <KPICard
          label="Battery Consumption"
          value={kpis.batteryConsumption || "48.5%"}
          sub="Avg Used Per Sortie"
          icon={Zap}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[42, 45, 52, 48, 50, 46, 48, 49]}
        />
        <KPICard
          label="Low Battery Events"
          value={kpis.lowBatteryEvents ?? 2}
          sub="Below 30% Warning"
          icon={AlertTriangle}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[0, 1, 0, 1, 0, 1, 0, 2]}
        />
        <KPICard
          label="Critical Events"
          value={kpis.criticalEvents ?? 0}
          sub="Emergency RTL / Land"
          icon={AlertTriangle}
          color="text-[#FF4141]"
          bg="bg-[#FF41411A]"
          border="border-[#FF414133]"
          strokeColor="#FF4141"
          sparklineData={[0, 0, 0, 0, 0, 0, 0, 0]}
        />
        <KPICard
          label="Battery Health"
          value={kpis.batteryHealth || "98.2%"}
          sub={`Avg Cycles: ${kpis.avgChargeCycles || "42"}`}
          icon={ShieldCheck}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[99, 99, 98, 98, 98, 98, 98, 98]}
        />
      </div>

      {/* 2. CHARTS ROW 1: Battery over Flight & Battery Consumption by Drone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Battery over Flight"
          subtitle="Typical state-of-charge decay curve across 30-minute operational sortie"
          icon={Battery}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={dischargeChartData}
              xKey="time"
              yKey="battery"
              unit="%"
              label="BATTERY %"
              color="#F59E0B"
              gradientId="batGrad"
              height={200}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Battery Consumption by Drone"
          subtitle="Percentage of battery capacity consumed per flight across airframes"
          icon={BatteryCharging}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={droneBatteryData}
              xKey="label"
              yKey="value"
              unit="%"
              color="#35E0FF"
              height={190}
            />
          </div>
        </ChartCard>
      </div>

      {/* 3. CHARTS ROW 2: Battery Usage by Mission & Low Battery Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Battery Usage by Mission"
          subtitle="Battery capacity expended across planned survey projects"
          icon={Zap}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={usageByMission}
              xKey="label"
              yKey="value"
              unit="%"
              color="#F59E0B"
              height={190}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Low Battery Events"
          subtitle="Historical incidence of low-battery telemetry warnings"
          icon={AlertTriangle}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={lowBatteryEventsTimeline}
              xKey="date"
              yKey="events"
              unit=" alerts"
              label="EVENTS"
              color="#FF8585"
              gradientId="lowBatGrad"
              height={190}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default BatteryAnalyticsView
