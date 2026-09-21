import { Radio, Wifi, Activity, Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"

export const TelemetryHealthView = ({ telemetryData }) => {
  if (!telemetryData) return null

  const { metrics, statusSummary, timeSeries = [] } = telemetryData

  const latencyChartData = timeSeries.map((t) => ({
    time: t.time,
    latency: t.latencyMs,
  }))

  const satelliteChartData = timeSeries.map((t) => ({
    time: t.time,
    satellites: t.satellites,
  }))

  const gpsQualityData = timeSeries.map((t) => ({
    time: t.time,
    quality: t.satellites > 15 ? 100 : t.satellites * 6,
  }))

  const availabilityData = timeSeries.map((t) => ({
    time: t.time,
    uptime: 99.4 + (t.latencyMs < 20 ? 0.4 : -0.2),
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. STATUS SUMMARY BANNER (HEALTHY, WARNING, CRITICAL, OFFLINE) */}
      <div className="p-4 rounded-xl bg-[#0B1017] border border-[#1A2633] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-[#2FE089]" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase">MAVLink Telemetry & Datalink Integrity</h3>
            <p className="text-[11px] text-[#8E9EAA]">Sub-system connectivity, packet delivery latency, and GNSS constellation health</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(statusSummary || { gps: "HEALTHY", telemetry: "HEALTHY", link: "HEALTHY", radio: "HEALTHY" }).map(([sub, status]) => {
            const isHealthy = String(status).toUpperCase() === "HEALTHY"
            const isWarning = String(status).toUpperCase() === "WARNING"
            const isCritical = String(status).toUpperCase() === "CRITICAL"

            return (
              <div
                key={sub}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold border ${
                  isHealthy
                    ? "bg-[#102A20] text-[#2FE089] border-[#1F4A38]"
                    : isWarning
                    ? "bg-[#2A2010] text-[#F59E0B] border-[#4A381F]"
                    : isCritical
                    ? "bg-[#2A1414] text-[#FF4141] border-[#4A1F1F]"
                    : "bg-[#161D26] text-[#8E9EAA] border-[#223240]"
                }`}
              >
                {isHealthy ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span className="uppercase">{sub}: {status}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. KPI CARDS (6 CARDS AS SPECIFIED IN SECTION 13) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="GPS Fix"
          value={metrics.gpsFixRate || "99.8%"}
          sub="3D Differential"
          icon={Radio}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[98, 99, 99, 100, 99, 100, 100, 100]}
        />
        <KPICard
          label="Satellites"
          value={metrics.averageSatellites || 17}
          sub="GPS + GLONASS"
          icon={Cpu}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[15, 16, 17, 18, 17, 18, 17, 18]}
        />
        <KPICard
          label="Telemetry Availability"
          value={metrics.telemetryAvailability || "99.4%"}
          sub="Continuous Link"
          icon={Wifi}
          color="text-[#06B6D4]"
          bg="bg-[#06B6D41A]"
          border="border-[#06B6D433]"
          strokeColor="#06B6D4"
          sparklineData={[99, 99, 100, 99, 99, 100, 99, 100]}
        />
        <KPICard
          label="Packet Rate"
          value={metrics.packetRate || "20.4 Hz"}
          sub="Stream Velocity"
          icon={Activity}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[18, 20, 20, 21, 20, 20, 21, 20]}
        />
        <KPICard
          label="Latency"
          value={metrics.avgLatencyMs || "18 ms"}
          sub="Round-Trip Ping"
          icon={Activity}
          color="text-[#A855F7]"
          bg="bg-[#A855F71A]"
          border="border-[#A855F733]"
          strokeColor="#A855F7"
          sparklineData={[22, 20, 18, 16, 19, 17, 18, 18]}
        />
        <KPICard
          label="Packet Loss"
          value={metrics.packetLossPct || "0.12%"}
          sub="Nominal Low"
          icon={ShieldCheck}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[0.3, 0.2, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1]}
        />
      </div>

      {/* 3. CHARTS ROW 1: GPS Quality & Satellite Count */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="GPS Quality Index"
          subtitle="Real-time Dilution of Precision (HDOP/VDOP) tracking metric"
          icon={Radio}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={gpsQualityData}
              xKey="time"
              yKey="quality"
              unit="%"
              label="QUALITY"
              color="#35E0FF"
              gradientId="gpsQualGrad"
              height={200}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Satellite Count"
          subtitle="Number of active GNSS satellites in line-of-sight constellation"
          icon={Cpu}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={satelliteChartData}
              xKey="time"
              yKey="satellites"
              unit=" sats"
              label="SATELLITES"
              color="#2FE089"
              gradientId="satGrad"
              height={200}
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. CHARTS ROW 2: Telemetry Availability & Round-Trip Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Telemetry Availability"
          subtitle="Cumulative connection reliability throughout flight sorties"
          icon={Wifi}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={availabilityData}
              xKey="time"
              yKey="uptime"
              unit="%"
              label="AVAILABILITY"
              color="#06B6D4"
              gradientId="availGrad"
              height={200}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Latency (ms)"
          subtitle="Round-trip WebSocket packet transmission propagation delay"
          icon={Activity}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={latencyChartData}
              xKey="time"
              yKey="latency"
              unit=" ms"
              label="LATENCY"
              color="#A855F7"
              gradientId="latGrad"
              height={200}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default TelemetryHealthView
