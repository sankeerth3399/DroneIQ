import React from "react"
import { ShieldCheck, CheckCircle2, Clock } from "lucide-react"

export const PermissionsCard = ({ permissions = [] }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center gap-2 mb-3.5">
          <ShieldCheck className="w-5 h-5 text-[#1B68D2]" />
          <h3 className="text-base font-bold text-[#0F284E] tracking-tight">Permissions</h3>
        </div>

        {/* Permissions Table */}
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
                const isGreen = (p.zoneType || "").toLowerCase() === "green" || (p.zone || "").toLowerCase().includes("green")
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
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {p.zone}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right font-medium text-[#475569] whitespace-nowrap">
                      {p.valid}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[11px] text-[#64748B] leading-relaxed">
        Permissions are checked again at Mission Readiness, not only when the plan is saved.
      </div>
    </div>
  )
}

export default PermissionsCard
