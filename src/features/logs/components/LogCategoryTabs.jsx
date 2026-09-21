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
    <div className="w-full overflow-x-auto pb-1 select-none font-mono no-scrollbar">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max p-1 rounded-xl bg-[#090D14] border border-[#1A2633]">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          const count = categoryCounts[cat.id]

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? "bg-[#35E0FF1F] text-[#35E0FF] border border-[#35E0FF59] shadow-[0_0_12px_rgba(53,224,255,0.18)]"
                  : "text-[#8E9EAA] hover:text-white hover:bg-[#121A26] border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{cat.label}</span>
              {typeof count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-[#35E0FF33] text-[#35E0FF]"
                      : "bg-[#14202C] text-[#64748B]"
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
