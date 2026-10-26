import React from "react"
import { Ban, AlertTriangle, Route, ShieldCheck, AlertCircle } from "lucide-react"

export const AirspaceKpiBar = ({ metrics = {}, loading = false, isStale = false }) => {
  const kpis = [
    {
      id: "no-fly",
      label: "No-Fly Zones",
      value: loading ? null : (typeof metrics.noFlyZonesCount === "number" ? metrics.noFlyZonesCount : "N/A"),
      sublabel: metrics.noFlyMapplsCount > 0 ? "Mappls & Local" : "Verified Local",
      icon: Ban,
      iconBg: "bg-red-500",
      iconColor: "text-white",
      boxBg: "bg-[#FEE2E2]",
    },
    {
      id: "restricted",
      label: "Restricted Areas",
      value: loading ? null : (typeof metrics.restrictedAreasCount === "number" ? metrics.restrictedAreasCount : "N/A"),
      sublabel: metrics.restrictedMapplsCount > 0 ? "DGCA & Local" : "Verified Local",
      icon: AlertTriangle,
      iconBg: "bg-amber-500",
      iconColor: "text-white",
      boxBg: "bg-[#FEF3C7]",
    },
    {
      id: "safe-corridors",
      label: "Safe Corridors",
      value: loading ? null : (typeof metrics.safeCorridorsCount === "number" ? metrics.safeCorridorsCount : "N/A"),
      sublabel: metrics.safeCorridorsCount > 0 ? "Configured" : "None Defined",
      icon: Route,
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      boxBg: "bg-[#DCFCE7]",
    },
    {
      id: "permissions",
      label: "Permissions Valid Today",
      value: loading ? null : (typeof metrics.permissionsValidTodayCount === "number" ? metrics.permissionsValidTodayCount : "N/A"),
      sublabel: `${metrics.permissionsTotal || 0} Registered`,
      icon: ShieldCheck,
      iconBg: "bg-[#1B68D2]",
      iconColor: "text-white",
      boxBg: "bg-[#DBEAFE]",
    },
    {
      id: "advisories",
      label: "Advisory Active",
      value: loading ? null : (typeof metrics.activeAdvisoriesCount === "number" ? metrics.activeAdvisoriesCount : "N/A"),
      sublabel: metrics.activeAdvisoriesCount > 0 ? "Active Warning" : "None Active",
      icon: AlertCircle,
      iconBg: metrics.activeAdvisoriesCount > 0 ? "bg-orange-500" : "bg-slate-400",
      iconColor: "text-white",
      boxBg: metrics.activeAdvisoriesCount > 0 ? "bg-[#FFEDD5]" : "bg-slate-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.id}
            className={`bg-white rounded-2xl border ${
              isStale ? "border-amber-300" : "border-[#CBD5E1]"
            } p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 hover:border-[#94A3B8] transition`}
          >
            {/* Square/Rounded Icon Badge */}
            <div
              className={`w-11 h-11 rounded-xl ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Metric & Label */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-2xl sm:text-[26px] font-black font-mono text-[#0F284E] leading-tight tracking-tight">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    kpi.value
                  )}
                </div>
                {kpi.sublabel && !loading && (
                  <span className="text-[10px] font-semibold text-slate-400 truncate">
                    {kpi.sublabel}
                  </span>
                )}
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
