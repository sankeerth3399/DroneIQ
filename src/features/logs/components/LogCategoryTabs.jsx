import {
  ListFilter,
  Plane,
  Target,
  Activity,
  Terminal,
  Server,
  ShieldAlert,
} from "lucide-react"

const CATEGORIES = [
  { id: "all", label: "All Logs", icon: ListFilter },
  { id: "flight", label: "Flight Logs", icon: Plane },
  { id: "mission", label: "Mission Logs", icon: Target },
  { id: "telemetry", label: "Telemetry Logs", icon: Activity },
  { id: "command", label: "Command Logs", icon: Terminal },
  { id: "system", label: "System Logs", icon: Server },
  { id: "incident", label: "Incident Logs", icon: ShieldAlert },
]

export const LogCategoryTabs = ({
  activeCategory = "all",
  onSelectCategory,
  categoryCounts = {},
}) => {
  return (
    <div className="w-full overflow-x-auto pb-1 select-none font-sans no-scrollbar">
      <div className="flex items-center gap-2 min-w-max p-1.5 rounded-2xl bg-white border border-[#D5E1ED] shadow-2xs">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          const count = categoryCounts[cat.id]

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-[#1E64D4] text-white shadow-xs border border-[#1E64D4]"
                  : "bg-transparent text-[#475569] hover:text-[#0D233A] hover:bg-[#F8FAFC] border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{cat.label}</span>
              {typeof count === "number" && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LogCategoryTabs
