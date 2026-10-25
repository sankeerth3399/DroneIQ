import React from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

export const AdvisoriesCard = ({ advisories = [] }) => {
  const activeAdvisories = advisories.filter((a) => a.active)
  const infoAdvisories = advisories.filter((a) => !a.active)

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-[#0F284E] tracking-tight mb-3">Advisories</h3>

        <div className="space-y-3">
          {/* Active Warning Advisory */}
          {activeAdvisories.map((adv) => (
            <div
              key={adv.id}
              className="bg-[#FEF9C3]/80 border border-[#FDE047] rounded-xl p-3.5 flex items-start gap-3 shadow-2xs"
            >
              <AlertTriangle className="w-4 h-4 text-[#CA8A04] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#713F12] leading-tight">
                  {adv.title}
                </h4>
                <p className="text-[11.5px] text-[#854D0E] leading-relaxed">
                  {adv.description}
                </p>
              </div>
            </div>
          ))}

          {/* General Clear / Status Info Advisory */}
          {infoAdvisories.map((adv) => (
            <div
              key={adv.id}
              className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-start gap-2.5 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#14532D] leading-tight">
                  {adv.title}
                </h4>
                <p className="text-[11px] text-[#166534]">
                  {adv.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdvisoriesCard
