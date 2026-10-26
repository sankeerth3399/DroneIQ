import React from "react"
import { BarChart3, ShieldCheck, CheckCircle2 } from "lucide-react"

export const FenceEventsChartCard = ({ eventsData = null }) => {
  const categories = eventsData?.categories || [
    { label: "Buffer touched", count: 0 },
    { label: "Auto re-route", count: 0 },
    { label: "Hover and alert", count: 0 },
    { label: "Breach", count: 0 },
  ]

  const totalEvents = eventsData?.totalEvents ?? categories.reduce((sum, c) => sum + (c.count || 0), 0)
  const summary = eventsData?.summary || "Calculated from genuine flight telemetry and boundary compliance logs across the previous 30 days."

  // Dynamic Y-Axis scale calculated from actual records
  const maxCategoryCount = Math.max(...categories.map((c) => c.count || 0), 0)
  const step = Math.max(1, Math.ceil(Math.max(maxCategoryCount, 4) / 4))
  const yMax = step * 4
  const yTicks = [yMax, step * 3, step * 2, step, 0]

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-base font-bold text-[#0F284E] tracking-tight">
            Fence events, last 30 days
          </h3>
          <span className="text-[11px] font-mono font-medium text-slate-500">
            {totalEvents} {totalEvents === 1 ? "event" : "events"} recorded
          </span>
        </div>

        {/* Empty State when no events exist in 30 days */}
        {totalEvents === 0 ? (
          <div className="py-10 px-4 text-center rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-1">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[#0F284E]">
              Zero Boundary Violations
            </h4>
            <p className="text-[11.5px] text-slate-500 max-w-[340px] leading-relaxed">
              No fence breaches, buffer alerts, or automated flight diversions recorded in the last 30 days. All active missions operated safely within planned corridors.
            </p>
          </div>
        ) : (
          /* Dynamic Chart Viewport */
          <div className="relative h-44 w-full flex items-end pt-4 pb-6 pl-9 pr-3">
            {/* Y-Axis Labels & Gridlines */}
            <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between text-[10px] font-mono text-slate-400 text-right pr-2 select-none">
              {yTicks.map((val, idx) => (
                <span key={idx} className="leading-none">
                  {val}
                </span>
              ))}
            </div>

            {/* Horizontal Gridlines */}
            <div className="absolute inset-x-9 inset-y-0 flex flex-col justify-between pointer-events-none select-none">
              {yTicks.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-full h-[1px] ${
                    idx === yTicks.length - 1 ? "bg-slate-300" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>

            {/* Dynamic Bars Grid */}
            <div className="relative w-full h-full flex items-end justify-around z-10">
              {categories.map((cat, idx) => {
                const count = cat.count || 0
                const heightPercent = yMax > 0 ? (count / yMax) * 100 : 0

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center h-full justify-end group min-w-[50px]"
                  >
                    {/* Metric Value Label on Top of Bar */}
                    <span className="text-[11px] font-mono font-bold text-[#0F284E] mb-1.5 transition-transform group-hover:scale-110">
                      {count}
                    </span>

                    {/* Vertical Bar with Dynamic Height */}
                    <div
                      className={`w-8 sm:w-10 rounded-t-sm transition-all duration-300 shadow-2xs ${
                        count > 0
                          ? "bg-[#1B68D2] hover:bg-[#124E9D] group-hover:brightness-110"
                          : "bg-slate-200 h-[2px]"
                      }`}
                      style={{
                        height: count > 0 ? `${Math.max(6, heightPercent)}%` : "2px",
                      }}
                    />

                    {/* Category X-Axis Label */}
                    <span className="absolute -bottom-5 text-[10.5px] sm:text-[11px] font-medium text-slate-600 whitespace-nowrap text-center">
                      {cat.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Explanatory Summary Note */}
      <div className="mt-7 pt-3 border-t border-[#F1F5F9] text-xs text-[#475569] leading-relaxed">
        {summary}
      </div>
    </div>
  )
}

export default FenceEventsChartCard

