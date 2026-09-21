import { TrendingUp, TrendingDown } from "lucide-react"

export const KPICard = ({
  label = "Metric",
  value = "0",
  sub = "",
  icon: Icon,
  color = "text-[#35E0FF]",
  bg = "bg-[#35E0FF1A]",
  border = "border-[#35E0FF33]",
  strokeColor = "#35E0FF",
  trend,
  trendUp = true,
  live = false,
  sparklineData,
  onClick,
}) => {
  // Generate mini SVG sparkline if provided
  let sparklinePoints = ""
  if (Array.isArray(sparklineData) && sparklineData.length > 1) {
    const max = Math.max(...sparklineData)
    const min = Math.min(...sparklineData)
    const r = max - min || 1
    const w = 64
    const h = 20
    sparklinePoints = sparklineData
      .map((v, i) => {
        const x = (i / (sparklineData.length - 1)) * w
        const y = h - ((v - min) / r) * (h - 4) - 2
        return `${x},${y}`
      })
      .join(" ")
  }

  return (
    <div
      onClick={onClick}
      className={`relative p-4 sm:p-5 rounded-xl bg-[#0B1017] border border-[#1A2633] hover:border-[#203C54] transition shadow-md font-mono select-none flex flex-col justify-between overflow-hidden ${
        onClick ? "cursor-pointer hover:bg-[#0E1520]" : ""
      }`}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#8E9EAA] uppercase tracking-wider block truncate">
            {label}
          </span>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border ${bg} ${border} ${color} shrink-0`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      {/* Subtitle, Trend, Live Status & Sparkline */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#14202C] text-[10.5px]">
        <div className="flex items-center gap-2 truncate">
          {sub && <span className="text-[#64748B] truncate">{sub}</span>}
          {live && (
            <span className="inline-flex items-center gap-1 text-[#2FE089] font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089] animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sparklinePoints && (
            <svg width="64" height="20" className="overflow-visible opacity-50">
              <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
            </svg>
          )}

          {trend && (
            <div
              className={`flex items-center gap-1 font-semibold ${
                trendUp ? "text-[#2FE089]" : "text-[#FF8585]"
              }`}
            >
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KPICard
