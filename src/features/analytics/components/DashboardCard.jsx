import { ArrowRight } from "lucide-react"

export const DashboardCard = ({
  id,
  num = "01",
  title = "Fleet Analytics",
  description = "Fleet utilization, drone health and operational performance.",
  icon: Icon,
  color = "#35E0FF",
  borderColor = "#35E0FF33",
  bgAccent = "#35E0FF0F",
  sparklineData = [12, 18, 14, 26, 22, 34, 30, 42],
  onOpen,
}) => {
  // Generate a mini decorative SVG sparkline
  const maxVal = Math.max(...sparklineData)
  const minVal = Math.min(...sparklineData)
  const range = maxVal - minVal || 1
  const width = 120
  const height = 36

  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width
      const y = height - ((val - minVal) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div
      onClick={() => onOpen?.(id)}
      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#0A0F16] border border-[#1A2633] hover:border-[#283C4F] transition-all duration-200 shadow-lg cursor-pointer overflow-hidden font-mono select-none"
      style={{
        background: `linear-gradient(180deg, #0B1017 0%, #070B10 100%)`,
      }}
    >
      {/* Subtle Accent Glow on Top Edge */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        }}
      />

      {/* Decorative Waveform / Sparkline on Top Right */}
      <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-45 transition-opacity pointer-events-none">
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      {/* Top Section: Index and Category Icon */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <span
            className="text-xs font-bold tracking-wider px-2 py-0.5 rounded-md border"
            style={{
              color,
              borderColor,
              backgroundColor: bgAccent,
            }}
          >
            {num}
          </span>

          {Icon && (
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg border"
              style={{
                color,
                borderColor,
                backgroundColor: bgAccent,
              }}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-[#35E0FF] transition-colors mb-2">
          {title}
        </h3>
        <p className="text-xs text-[#8E9EAA] leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      {/* Bottom Action Strip */}
      <div className="mt-5 pt-4 border-t border-[#14202C] flex items-center justify-between text-xs font-semibold">
        <span
          className="flex items-center gap-1.5 transition-colors"
          style={{ color }}
        >
          <span>Open Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  )
}

export default DashboardCard
