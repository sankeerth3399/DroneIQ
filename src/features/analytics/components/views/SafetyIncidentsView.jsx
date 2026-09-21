import { ShieldAlert, AlertTriangle, ShieldCheck, FileText, Activity, Compass, Plane } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import DonutChart from "../charts/DonutChart.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"

export const SafetyIncidentsView = ({ incidentData }) => {
  if (!incidentData) return null

  const {
    kpis,
    incidentsOverTime = [],
    incidentSeverityBreakdown = [],
    incidentTypeBreakdown = [],
    incidentsByDrone = [],
    geofenceViolations = [],
    incidentsList = [],
  } = incidentData

  const incidentTypesBarData = incidentTypeBreakdown.map((t) => ({
    label: t.type,
    value: t.count,
  }))

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. KPI CARDS (6 CARDS AS SPECIFIED IN SECTION 15) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Total Incidents"
          value={kpis.totalIncidents ?? 4}
          sub="Logged Events"
          icon={ShieldAlert}
          color="text-[#FF8585]"
          bg="bg-[#FF85851A]"
          border="border-[#FF858533]"
          strokeColor="#FF8585"
          sparklineData={[1, 0, 2, 1, 0, 1, 0, kpis.totalIncidents]}
        />
        <KPICard
          label="Critical"
          value={kpis.critical ?? 1}
          sub="Immediate Action"
          icon={AlertTriangle}
          color="text-[#FF4141]"
          bg="bg-[#FF41411A]"
          border="border-[#FF414133]"
          strokeColor="#FF4141"
          sparklineData={[0, 0, 1, 0, 0, 1, 0, kpis.critical]}
        />
        <KPICard
          label="Warnings"
          value={kpis.warnings ?? 3}
          sub="Buffer / Threshold"
          icon={AlertTriangle}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[1, 0, 1, 1, 0, 0, 0, kpis.warnings]}
        />
        <KPICard
          label="Resolved"
          value={kpis.resolvedIncidents ?? 4}
          sub="100% Mitigated"
          icon={ShieldCheck}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[1, 1, 2, 2, 3, 3, 4, kpis.resolvedIncidents]}
        />
        <KPICard
          label="Open"
          value={kpis.openIncidents ?? 0}
          sub="Active Failsafes"
          icon={AlertTriangle}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[0, 0, 0, 0, 0, 0, 0, 0]}
        />
        <KPICard
          label="Emergency Events"
          value={kpis.emergencyEvents ?? 2}
          sub="RTL / Land Disarm"
          icon={ShieldAlert}
          color="text-[#F43F5E]"
          bg="bg-[#F43F5E1A]"
          border="border-[#F43F5E33]"
          strokeColor="#F43F5E"
          sparklineData={[0, 1, 0, 0, 1, 0, 0, kpis.emergencyEvents]}
        />
      </div>

      {/* 2. CHARTS ROW 1: Incidents Over Time & Incident Severity (Large + Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Incidents Over Time"
          subtitle="Frequency of triggered safety events across operational timeline"
          icon={Activity}
          className="lg:col-span-2"
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={incidentsOverTime}
              xKey="date"
              yKey="incidents"
              unit=" events"
              label="INCIDENTS"
              color="#FF8585"
              gradientId="incTimeGrad"
              height={210}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Incident Severity"
          subtitle="Ratio of critical anomalies vs cautionary warnings"
          icon={ShieldAlert}
          className="lg:col-span-1"
        >
          <div className="pt-2 flex items-center justify-center min-h-[210px]">
            <DonutChart
              data={incidentSeverityBreakdown}
              title="Severity"
              size={170}
              centerLabel="Events"
            />
          </div>
        </ChartCard>
      </div>

      {/* 3. CHARTS ROW 2: Incidents by Drone, Incident Types & Geofence Violations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Incidents by Drone"
          subtitle="Event distribution correlated by airframe"
          icon={Plane}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={incidentsByDrone}
              xKey="label"
              yKey="value"
              unit=" events"
              color="#35E0FF"
              height={180}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Incident Types"
          subtitle="Classification of triggered alerts"
          icon={AlertTriangle}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={incidentTypesBarData}
              xKey="label"
              yKey="value"
              unit=" events"
              color="#F59E0B"
              height={180}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Geofence Violations"
          subtitle="Proximity containment alerts"
          icon={Compass}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={geofenceViolations}
              xKey="date"
              yKey="events"
              unit=" events"
              label="GEOFENCE"
              color="#38BDF8"
              gradientId="geoGrad"
              height={180}
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. SAFETY INCIDENT EVENT LOG TABLE */}
      <ChartCard
        title="Flight Safety Event Log"
        subtitle="Audit record of all triggered warnings and failsafe actions"
        icon={FileText}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Aircraft</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Action Taken</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2633]">
              {incidentsList.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#121A26] transition">
                  <td className="py-2.5 px-3 font-bold text-[#FF8585]">{inc.id}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{inc.type}</td>
                  <td className="py-2.5 px-3 text-[#35E0FF] font-semibold">{inc.droneId}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === "Critical"
                          ? "bg-[#2E1414] text-[#FF4141] border border-[#5E2222]"
                          : "bg-[#2E2010] text-[#F59E0B] border border-[#5E421E]"
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#EEF4F8] max-w-xs truncate" title={inc.actionTaken}>
                    {inc.actionTaken}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#102A20] text-[#2FE089] border border-[#1F4A38]">
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default SafetyIncidentsView
