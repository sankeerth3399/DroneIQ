import { Target, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react"

export const MissionLogSummary = ({ summary = {} }) => {
  const {
    totalMissions = 0,
    activeMissions = 0,
    completedMissions = 0,
    failedMissions = 0,
    cancelledMissions = 0,
    missionEvents = 0,
  } = summary

  const cards = [
    {
      label: "Total Missions",
      value: totalMissions,
      sub: "Planned Projects",
      icon: Target,
      color: "text-[#35E0FF]",
      bg: "bg-[#35E0FF14]",
      border: "border-[#35E0FF33]",
    },
    {
      label: "Active Missions",
      value: activeMissions,
      sub: "Running / Ready",
      icon: Activity,
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF814]",
      border: "border-[#38BDF833]",
    },
    {
      label: "Completed",
      value: completedMissions,
      sub: "Fully Surveyed",
      icon: CheckCircle2,
      color: "text-[#2FE089]",
      bg: "bg-[#2FE08914]",
      border: "border-[#2FE08933]",
    },
    {
      label: "Failed",
      value: failedMissions,
      sub: "Failsafe Aborted",
      icon: AlertTriangle,
      color: "text-[#FF4141]",
      bg: "bg-[#FF414114]",
      border: "border-[#FF414133]",
    },
    {
      label: "Cancelled",
      value: cancelledMissions,
      sub: "Operator Aborted",
      icon: XCircle,
      color: "text-[#8E9EAA]",
      bg: "bg-[#8E9EAA14]",
      border: "border-[#8E9EAA33]",
    },
    {
      label: "Mission Events",
      value: missionEvents,
      sub: "Audit Milestones",
      icon: Target,
      color: "text-[#A855F7]",
      bg: "bg-[#A855F714]",
      border: "border-[#A855F733]",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 select-none font-mono">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className="p-3.5 sm:p-4 rounded-xl bg-[#0B1017] border border-[#1A2633] shadow-md flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8E9EAA] uppercase tracking-wider block truncate">
                {card.label}
              </span>
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg border ${card.bg} ${card.border} ${card.color} shrink-0`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {card.value}
              </div>
              <div className="text-[10px] text-[#64748B] truncate mt-0.5">{card.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MissionLogSummary
