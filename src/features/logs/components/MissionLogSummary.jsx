import { Target, CheckCircle2, AlertTriangle, XCircle, Activity, Sparkles } from "lucide-react"

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
      color: "text-[#0284C7]",
      bg: "bg-[#F0F9FF]",
      border: "border-[#BAE6FD]",
    },
    {
      label: "Active Missions",
      value: activeMissions,
      sub: "Running / Ready",
      icon: Activity,
      color: "text-[#1E64D4]",
      bg: "bg-[#EFF6FF]",
      border: "border-[#BFDBFE]",
    },
    {
      label: "Completed",
      value: completedMissions,
      sub: "Fully Surveyed",
      icon: CheckCircle2,
      color: "text-[#16A34A]",
      bg: "bg-[#F0FDF4]",
      border: "border-[#BBF7D0]",
    },
    {
      label: "Failed",
      value: failedMissions,
      sub: "Failsafe Aborted",
      icon: AlertTriangle,
      color: "text-[#DC2626]",
      bg: "bg-[#FEF2F2]",
      border: "border-[#FECACA]",
    },
    {
      label: "Cancelled",
      value: cancelledMissions,
      sub: "Operator Aborted",
      icon: XCircle,
      color: "text-[#64748B]",
      bg: "bg-[#F1F5F9]",
      border: "border-[#E2E8F0]",
    },
    {
      label: "Mission Events",
      value: missionEvents,
      sub: "Audit Milestones",
      icon: Sparkles,
      color: "text-[#7C3AED]",
      bg: "bg-[#FAF5FF]",
      border: "border-[#E9D5FF]",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 select-none font-sans">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white border border-[#D5E1ED] shadow-xs flex flex-col justify-between overflow-hidden hover:border-[#CAD8E6] transition"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block truncate">
                {card.label}
              </span>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-xl border ${card.bg} ${card.border} ${card.color} shrink-0`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-[#0D233A] tracking-tight leading-none">
                {card.value}
              </div>
              <div className="text-[11px] text-[#64748B] font-medium truncate mt-1">
                {card.sub}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MissionLogSummary
