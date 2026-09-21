import { Users, Clock, Plane, Shield, Terminal, Target } from "lucide-react"
import KPICard from "../KPICard.jsx"
import ChartCard from "../ChartCard.jsx"
import BarComparisonChart from "../charts/BarComparisonChart.jsx"
import AreaTimeSeriesChart from "../charts/AreaTimeSeriesChart.jsx"

export const OperatorActivityView = ({ operatorData, onSelectOperator }) => {
  if (!operatorData) return null

  const {
    kpis = {},
    flightsByOperator = [],
    missionsByOperator = [],
    flightHoursByOperator = [],
    commandActivity = [],
    operators = [],
  } = operatorData

  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. KPI CARDS (5 CARDS AS SPECIFIED IN SECTION 16) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          label="Active Operators"
          value={kpis.activeOperators ?? operators.length}
          sub="Licensed Flight Crew"
          icon={Users}
          color="text-[#6366F1]"
          bg="bg-[#6366F11A]"
          border="border-[#6366F133]"
          strokeColor="#6366F1"
          sparklineData={[2, 3, 3, 4, 4, 4, 4, kpis.activeOperators || operators.length]}
        />
        <KPICard
          label="Flights"
          value={kpis.flights ?? 6}
          sub="Sorties Piloted"
          icon={Plane}
          color="text-[#35E0FF]"
          bg="bg-[#35E0FF1A]"
          border="border-[#35E0FF33]"
          strokeColor="#35E0FF"
          sparklineData={[4, 8, 12, 16, 20, 24, 28, kpis.flights || 6]}
        />
        <KPICard
          label="Missions"
          value={kpis.missions ?? 6}
          sub="Survey Projects"
          icon={Target}
          color="text-[#10B981]"
          bg="bg-[#10B9811A]"
          border="border-[#10B98133]"
          strokeColor="#10B981"
          sparklineData={[2, 4, 6, 8, 10, 12, 14, kpis.missions || 6]}
        />
        <KPICard
          label="Operational Hours"
          value={kpis.operationalHours || "18.4 h"}
          sub="Cumulative Log"
          icon={Clock}
          color="text-[#F59E0B]"
          bg="bg-[#F59E0B1A]"
          border="border-[#F59E0B33]"
          strokeColor="#F59E0B"
          sparklineData={[2, 5, 8, 11, 14, 16, 17, 18]}
        />
        <KPICard
          label="Commands"
          value={kpis.commands ?? 182}
          sub="Uplinked MAVLink"
          icon={Terminal}
          color="text-[#A855F7]"
          bg="bg-[#A855F71A]"
          border="border-[#A855F733]"
          strokeColor="#A855F7"
          sparklineData={[40, 60, 85, 110, 135, 155, 170, kpis.commands || 182]}
        />
      </div>

      {/* 2. CHARTS ROW 1: Flights by Operator & Missions by Operator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Flights by Operator"
          subtitle="Sorties piloted per flight crew member"
          icon={Plane}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={flightsByOperator}
              xKey="label"
              yKey="value"
              unit=" flights"
              color="#6366F1"
              height={190}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Missions by Operator"
          subtitle="Autonomous and survey mission allocations"
          icon={Target}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={missionsByOperator}
              xKey="label"
              yKey="value"
              unit=" missions"
              color="#10B981"
              height={190}
            />
          </div>
        </ChartCard>
      </div>

      {/* 3. CHARTS ROW 2: Flight Hours & Command Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Flight Hours"
          subtitle="Cumulative PIC airtime logged per crew member"
          icon={Clock}
        >
          <div className="pt-2">
            <BarComparisonChart
              data={flightHoursByOperator}
              xKey="label"
              yKey="value"
              unit=" h"
              color="#F59E0B"
              height={190}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Command Activity"
          subtitle="Volume of uplinked GCS flight commands and mode requests"
          icon={Terminal}
        >
          <div className="pt-2">
            <AreaTimeSeriesChart
              data={commandActivity}
              xKey="date"
              yKey="commands"
              unit=" cmds"
              label="COMMANDS"
              color="#35E0FF"
              gradientId="cmdActGrad"
              height={190}
            />
          </div>
        </ChartCard>
      </div>

      {/* 4. GROUND STATION PILOT DIRECTORY TABLE */}
      <ChartCard
        title="Ground Station Pilot Directory"
        subtitle="Pilot in Command flight hours, sorties tally, and RBAC privilege level"
        icon={Shield}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
              <tr>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Sorties</th>
                <th className="py-2.5 px-3">Flight Hours</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Commands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2633]">
              {operators.map((op) => (
                <tr
                  key={op.id}
                  onClick={() => onSelectOperator?.(op)}
                  className="hover:bg-[#121A26] transition cursor-pointer"
                >
                  <td className="py-2.5 px-3 font-semibold text-white">
                    <div>{op.name}</div>
                    <div className="text-[10px] text-[#64748B]">@{op.username}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#142232] text-[#35E0FF] border border-[#203C54]">
                      {op.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{op.flightsCount}</td>
                  <td className="py-2.5 px-3 text-[#2FE089] font-medium">{op.flightHours} h</td>
                  <td className="py-2.5 px-3 text-[#8E9EAA]">{op.totalDistanceKm} km</td>
                  <td className="py-2.5 px-3 text-[#A855F7] font-semibold">{op.commandsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default OperatorActivityView
