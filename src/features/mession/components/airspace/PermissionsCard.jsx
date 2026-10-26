import React from "react"
import { ShieldCheck, Plus, AlertCircle, Clock } from "lucide-react"
import { evaluatePermissionStatus } from "@/services/airspaceService.js"

export const PermissionsCard = ({
  permissions = [],
  loading = false,
  onOpenAddPermission,
}) => {
  const formatValidity = (p) => {
    if (p.valid) return p.valid
    if (!p.validFrom && !p.validUntil) return "Standing Approval"

    try {
      const from = p.validFrom ? new Date(p.validFrom) : null
      const until = p.validUntil ? new Date(p.validUntil) : null
      const now = new Date()

      const isToday =
        until &&
        until.getDate() === now.getDate() &&
        until.getMonth() === now.getMonth() &&
        until.getFullYear() === now.getFullYear()

      if (isToday) {
        const fromStr = from ? from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "00:00"
        const untilStr = until.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
        return `Today ${fromStr} – ${untilStr}`
      }

      if (until) {
        return `Until ${until.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`
      }

      return "Indefinite"
    } catch {
      return "Standing"
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1B68D2]" />
            <h3 className="text-base font-bold text-[#0F284E] tracking-tight">Permissions</h3>
          </div>
          {typeof onOpenAddPermission === "function" && (
            <button
              type="button"
              onClick={onOpenAddPermission}
              className="text-xs font-semibold text-[#1B68D2] hover:text-[#0F284E] flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Permissions Content */}
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#1B68D2] rounded-full animate-spin mx-auto" />
            <p>Loading airspace clearance records...</p>
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-7 px-3 text-center rounded-xl bg-slate-50 border border-slate-200">
            <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#0F284E]">No Permissions on Record</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[260px] mx-auto">
              No active airspace clearances registered. Submit a DigitalSky flight plan to log authorization.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-slate-500 font-semibold text-[11px]">
                  <th className="py-2 pr-3 font-semibold">Site</th>
                  <th className="py-2 px-3 font-semibold">Zone</th>
                  <th className="py-2 pl-3 font-semibold text-right">Valid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
                {permissions.map((p) => {
                  const evalResult = evaluatePermissionStatus(p)
                  const isGreen =
                    evalResult.status === "VALID" &&
                    ((p.zoneType || "").toLowerCase() === "green" || (p.zone || "").toLowerCase().includes("green"))

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 pr-3 font-bold text-[#0F284E] whitespace-nowrap">
                        {p.site}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isGreen
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : evalResult.status === "EXPIRED"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : evalResult.status === "EXPIRING"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {p.zone}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right font-medium text-[#475569] whitespace-nowrap">
                        {formatValidity(p)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[11px] text-[#64748B] leading-relaxed">
        Permissions are checked again at Mission Readiness, not only when the plan is saved.
      </div>
    </div>
  )
}

export default PermissionsCard
