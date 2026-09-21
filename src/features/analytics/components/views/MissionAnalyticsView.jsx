import { Target, CheckCircle2, Clock, MapPin, AlertTriangle, Activity, Compass } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"
import DonutChart from "../charts/DonutChart.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"

export const MissionAnalyticsView = ({ missionData, onSelectMission }) => {
  if (!missionData) return null

  const {
    kpis,
    missionActivity = [],
    missionStatusDistribution = [],
    missionDurationComparison = [],
    missionDistanceComparison = [],
    waypointCompletionComparison = [],
    missionsTable = [],
  } = missionData

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. KPI CARDS (6 CARDS AS SPECIFIED IN SECTION 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Total Missions"
          value={kpis.totalMissions}
          sub="Planned Sorties"
          icon={Target}
          color="text-[#10B981]"
          bg="bg-[#10B9811A]"
          border="border-[#10B98133]"
          strokeColor="#10B981"
          sparklineData={[2, 4, 6, 8, 10, 12, 14, kpis.totalMissions]}
        />
        <KPICard
          label="Completed"
          value={kpis.completedMissions}
          sub="100% Executed"
          icon={CheckCircle2}
          color="text-[#2FE089]"
          bg="bg-[#2FE0891A]"
          border="border-[#2FE08933]"
          strokeColor="#2FE089"
          sparklineData={[2, 4, 5, 7, 8, 10, 12, kpis.completedMissions]}
        />
        <KPICard
          label="Active"
          value={kpis.activeMissions}
          sub="In Transit"
          icon={Activity}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[1, 0, 1, 2, 1, 0, 1, kpis.activeMissions]}
        />
        <KPICard
          label="Failed"
          value={kpis.failedMissions}
          sub="Aborted"
          icon={AlertTriangle}
          color="text-[#FF4141]"
          bg="bg-[#FF41411A]"
          border="border-[#FF414133]"
          strokeColor="#FF4141"
          sparklineData={[0, 0, 1, 0, 0, 1, 0, kpis.failedMissions]}
        />
        <KPICard
          label="Success Rate"
          value={kpis.missionSuccessRate}
          sub="Zero Loss"
          icon={Target}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[92, 94, 95, 96, 98, 97, 99, 100]}
        />
        <KPICard
          label="Waypoint Completion"
          value={kpis.waypointCompletionRate}
          sub={`Avg ${kpis.avgWaypoints} WP`}
          icon={MapPin}
          color="text-[#A855F7]"
          bg="bg-[#A855F71A]"
          border="border-[#A855F733]"
          strokeColor="#A855F7"
          sparklineData={[90, 92, 94, 96, 95, 98, 98, 98]}
        />
      </div>

      {/* 2. CHARTS ROW 1: MISSION ACTIVITY & MISSION STATUS (Rhythm: Large + Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Mission Activity"
          subtitle="Mission sortie initiation volume across operational calendar"
          icon={Activity}
          className="lg:col-span-2"
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={missionActivity}
              xKey="date"
              yKey="missions"
              unit=" missions"
              label="MISSIONS"
              color="#10B981"
              gradientId="msnActGrad"
              height={210}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Mission Status"
          subtitle="Proportion of completed, active and aborted survey plans"
          icon={Target}
          className="lg:col-span-1"
        >
          <div className="pt-2 flex items-center justify-center min-h-[210px]">
            <DonutChart
              data={missionStatusDistribution}
              title="Status"
              size={170}
              centerLabel="Plans"
            />
          </div>
        </ChartCard>
      </div>

      {/* 3. CHARTS ROW 2: MISSION DURATION, MISSION DISTANCE & WAYPOINT COMPLETION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Mission Duration"
          subtitle="Flight time per survey mission"
          icon={Clock}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={missionDurationComparison}
              xKey="label"
              yKey="value"
              unit=" min"
              color="#35E0FF"
              height={180}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Mission Distance"
          subtitle="Total corridor path length per mission"
          icon={Compass}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={missionDistanceComparison}
              xKey="label"
              yKey="value"
              unit=" km"
              color="#10B981"
              height={180}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Waypoint Completion"
          subtitle="Waypoints successfully surveyed per plan"
          icon={MapPin}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={waypointCompletionComparison}
              xKey="label"
              yKey="value"
              unit=" pts"
              color="#A855F7"
              height={180}
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. MISSION TABLE */}
      <ChartCard
        title="Mission Fleet Directory"
        subtitle="Full operational waypoint mission plans and aircraft assignments"
        icon={MapPin}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
              <tr>
                <th className="py-2.5 px-3">Mission</th>
                <th className="py-2.5 px-3">Drone</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Waypoints</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2633]">
              {missionsTable.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelectMission?.(m)}
                  className="hover:bg-[#121A26] transition cursor-pointer"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-[#10B981]">{m.name}</div>
                    <div className="text-[10px] text-[#64748B]">{m.id}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[#35E0FF] font-semibold">{m.droneId}</td>
                  <td className="py-2.5 px-3 text-[#8E9EAA]">{m.operator}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{m.duration}</td>
                  <td className="py-2.5 px-3 text-[#2FE089] font-medium">{m.distanceKm}</td>
                  <td className="py-2.5 px-3 text-[#A855F7] font-semibold">{m.waypoints} pts</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === "Completed"
                          ? "bg-[#102A20] text-[#2FE089] border border-[#1F4A38]"
                          : m.status === "Aborted"
                          ? "bg-[#2A1414] text-[#FF4141] border border-[#4A1F1F]"
                          : "bg-[#142232] text-[#35E0FF] border border-[#203C54]"
                      }`}
                    >
                      {m.status}
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

export default MissionAnalyticsView
