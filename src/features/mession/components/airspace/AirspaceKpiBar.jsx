import React from "react"
import { Ban, AlertTriangle, Route, ShieldCheck, AlertCircle } from "lucide-react"

export const AirspaceKpiBar = ({ metrics }) => {
  const kpis = [
    {
      id: "no-fly",
      label: "No-Fly Zones",
      value: metrics.noFlyZonesCount ?? 14,
      icon: Ban,
      iconBg: "bg-red-500",
      iconColor: "text-white",
      boxBg: "bg-[#FEE2E2]",
    },
    {
      id: "restricted",
      label: "Restricted Areas",
      value: metrics.restrictedAreasCount ?? 9,
      icon: AlertTriangle,
      iconBg: "bg-amber-500",
      iconColor: "text-white",
      boxBg: "bg-[#FEF3C7]",
    },
    {
      id: "safe-corridors",
      label: "Safe Corridors",
      value: metrics.safeCorridorsCount ?? 11,
      icon: Route,
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      boxBg: "bg-[#DCFCE7]",
    },
    {
      id: "permissions",
      label: "Permissions Valid Today",
      value: metrics.permissionsValidTodayCount ?? 6,
      icon: ShieldCheck,
      iconBg: "bg-[#1B68D2]",
      iconColor: "text-white",
      boxBg: "bg-[#DBEAFE]",
    },
    {
      id: "advisories",
      label: "Advisory Active",
      value: metrics.activeAdvisoriesCount ?? 1,
      icon: AlertCircle,
      iconBg: "bg-orange-500",
      iconColor: "text-white",
      boxBg: "bg-[#FFEDD5]",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.id}
            className="bg-white rounded-2xl border border-[#CBD5E1] p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 hover:border-[#94A3B8] transition"
          >
            {/* Square/Rounded Icon Badge */}
            <div
              className={`w-11 h-11 rounded-xl ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Metric & Label */}
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-[26px] font-black font-mono text-[#0F284E] leading-tight tracking-tight">
                {kpi.value}
              </div>
              <div className="text-xs font-semibold text-[#334155] truncate mt-0.5">
                {kpi.label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AirspaceKpiBar
