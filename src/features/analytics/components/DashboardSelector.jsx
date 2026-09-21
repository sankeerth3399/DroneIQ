import {
  Layers,
  Plane,
  Crosshair,
  Target,
  Activity,
  BatteryCharging,
  ShieldAlert,
  Users,
} from "lucide-react"

const DASHBOARDS = [
  { id: "fleet", num: "01", label: "Fleet Overview", icon: Layers },
  { id: "flights", num: "02", label: "Flight Analytics", icon: Plane },
  { id: "drones", num: "03", label: "Drone Performance", icon: Crosshair },
  { id: "missions", num: "04", label: "Mission Analytics", icon: Target },
  { id: "telemetry", num: "05", label: "Telemetry Health", icon: Activity },
  { id: "battery", num: "06", label: "Battery Analytics", icon: BatteryCharging },
  { id: "safety", num: "07", label: "Safety & Incidents", icon: ShieldAlert },
  { id: "operators", num: "08", label: "Operator Activity", icon: Users },
]

export const DashboardSelector = ({
  activeDashboard = "fleet",
  onSelectDashboard,
}) => {
  return (
    <div className="w-full overflow-x-auto pb-1 select-none font-mono no-scrollbar">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max p-1 rounded-xl bg-[#090D14] border border-[#1A2633]">
        {DASHBOARDS.map((d) => {
          const Icon = d.icon
          const isActive = activeDashboard === d.id

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDashboard?.(d.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? "bg-[#35E0FF1F] text-[#35E0FF] border border-[#35E0FF59] shadow-[0_0_12px_rgba(53,224,255,0.18)]"
                  : "text-[#8E9EAA] hover:text-white hover:bg-[#121A26] border border-transparent"
              }`}
            >
              <span className={`text-[10px] font-bold ${isActive ? "text-[#35E0FF]" : "text-[#64748B]"}`}>
                {d.num}
              </span>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{d.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardSelector
