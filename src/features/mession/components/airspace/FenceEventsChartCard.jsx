import React from "react"
import { BarChart3 } from "lucide-react"

export const FenceEventsChartCard = ({ eventsData }) => {
  const categories = eventsData?.categories || [
    { label: "Buffer touched", count: 21 },
    { label: "Auto re-route", count: 9 },
    { label: "Hover and alert", count: 4 },
    { label: "Breach", count: 3 },
  ]
  const summary =
    eventsData?.summary ||
    "All 3 breaches were under 10 m and under 5 seconds. Two were at the refinery tank farm in gusty wind; the buffer there is now 30 m."

  const maxVal = Math.max(...categories.map((c) => c.count), 25)
  const yTicks = [25, 18.8, 12.5, 6.3, 0]

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <h3 className="text-base font-bold text-[#0F284E] tracking-tight mb-4">
          Fence events, last 30 days
        </h3>

        {/* Chart Viewport */}
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
                className={`w-full h-[1px] ${idx === yTicks.length - 1 ? "bg-slate-300" : "bg-slate-100"}`}
              />
            ))}
          </div>

          {/* 4 Bars Grid */}
          <div className="relative w-full h-full flex items-end justify-around z-10">
            {categories.map((cat, idx) => {
              const heightPercent = Math.min(100, Math.max(8, (cat.count / 25) * 100))
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  {/* Metric Value Label on Top of Bar */}
                  <span className="text-[11px] font-mono font-bold text-[#0F284E] mb-1.5 transition-transform group-hover:scale-110">
                    {cat.count}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-8 sm:w-10 bg-[#1B68D2] hover:bg-[#124E9D] rounded-t-sm transition-all duration-300 shadow-2xs group-hover:brightness-110"
                    style={{ height: `${heightPercent}%` }}
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
      </div>

      {/* Explanatory Summary Note matching reference screenshot */}
      <div className="mt-7 pt-3 border-t border-[#F1F5F9] text-xs text-[#475569] leading-relaxed">
        {summary}
      </div>
    </div>
  )
}

export default FenceEventsChartCard
