import React from "react"
import { AlertTriangle, CheckCircle2, AlertOctagon, Info, Clock, Radio } from "lucide-react"
import { isAdvisoryActive } from "@/services/airspaceService.js"

export const AdvisoriesCard = ({
  advisories = [],
  loading = false,
  isUnavailable = false,
  lastChecked = null,
}) => {
  // Filter genuinely active advisories based on current clock and effective time windows
  const activeAdvisories = advisories.filter(isAdvisoryActive)

  const formatTimeWindow = (adv) => {
    if (!adv.validFrom && !adv.validUntil) return null
    try {
      const from = adv.validFrom ? new Date(adv.validFrom) : null
      const until = adv.validUntil ? new Date(adv.validUntil) : null
      const fromStr = from ? from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : ""
      const untilStr = until ? until.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : ""

      if (fromStr && untilStr) return `${fromStr} – ${untilStr}`
      if (untilStr) return `Until ${untilStr}`
      return `From ${fromStr}`
    } catch {
      return null
    }
  }

  const formatLastChecked = () => {
    if (lastChecked) {
      try {
        return new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } catch {
        return "recently"
      }
    }
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-bold text-[#0F284E] tracking-tight">Advisories</h3>
          <span className="text-[10px] font-mono font-medium text-slate-500">
            Last checked: {formatLastChecked()}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-6 text-center text-xs text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#1B68D2] rounded-full animate-spin mx-auto" />
            <p>Retrieving airspace notices and aerodrome advisories...</p>
          </div>
        )}

        {/* Honest Unavailable State: Never assume clear if source failed */}
        {!loading && isUnavailable && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-900 leading-tight">
                Advisory Feed Unavailable
              </h4>
              <p className="text-[11.5px] text-red-800 leading-relaxed">
                Could not retrieve active NOTAMs or airspace advisories. Missing data does not indicate airspace is clear; verify local aerodrome notices manually prior to launch.
              </p>
            </div>
          </div>
        )}

        {/* Active Real-Time Advisories */}
        {!loading && !isUnavailable && (
          <div className="space-y-3">
            {activeAdvisories.map((adv) => {
              const timeWindow = formatTimeWindow(adv)
              const isCritical = adv.severity === "critical" || adv.severity === "high"

              return (
                <div
                  key={adv.id}
                  className={`rounded-xl p-3.5 border shadow-2xs space-y-1.5 ${
                    isCritical
                      ? "bg-[#FEF2F2] border-[#FECACA]"
                      : "bg-[#FEF9C3]/80 border-[#FDE047]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isCritical ? "text-[#DC2626]" : "text-[#CA8A04]"
                      }`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h4
                          className={`text-xs font-bold leading-tight ${
                            isCritical ? "text-[#991B1B]" : "text-[#713F12]"
                          }`}
                        >
                          {adv.title}
                        </h4>
                        {adv.severity && (
                          <span
                            className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isCritical
                                ? "bg-red-200 text-red-800"
                                : "bg-amber-200 text-amber-900"
                            }`}
                          >
                            {adv.severity}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-[11.5px] leading-relaxed ${
                          isCritical ? "text-[#7F1D1D]" : "text-[#854D0E]"
                        }`}
                      >
                        {adv.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[10.5px] text-[#78350F]">
                        {adv.site && (
                          <span className="font-semibold">
                            Sector: {adv.site}
                          </span>
                        )}
                        {timeWindow && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[#A16207]" />
                            {timeWindow}
                          </span>
                        )}
                        {adv.source && (
                          <span className="text-slate-500 font-medium truncate max-w-[200px]">
                            Source: {adv.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Clear Status Card: When zero advisories are active */}
            {activeAdvisories.length === 0 && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#14532D] leading-tight">
                    No temporary restrictions at monitored sites
                  </h4>
                  <p className="text-[11px] text-[#166534] leading-relaxed">
                    All sectors are clear of active temporary flight restrictions (TFRs) and emergency NOTAMs. Always confirm local aerodrome notices prior to launch.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvisoriesCard

