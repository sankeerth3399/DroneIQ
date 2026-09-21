import { useState, useMemo } from "react"

const DEFAULT_SLICE_COLORS = ["#35E0FF", "#2FE089", "#F59E0B", "#FF4141", "#A855F7", "#38BDF8"]

function computeSlices(data, total, circumference) {
  let offset = 0
  return data.map((item, idx) => {
    const val = Number(item.value || item.count) || 0
    const pct = total > 0 ? val / total : 0
    const strokeDash = pct * circumference
    const sliceOffset = offset
    offset += strokeDash
    const sliceColor = item.color || DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length]

    return {
      ...item,
      val,
      pct: Math.round(pct * 100),
      strokeDash,
      offset: sliceOffset,
      color: sliceColor,
    }
  })
}

export const DonutChart = ({
  data = [],
  title = "Distribution",
  size = 180,
  strokeWidth = 24,
  centerLabel = "Total",
  onSliceClick,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null)

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (Number(item.value || item.count) || 0), 0)
  }, [data])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const slices = useMemo(() => {
    return computeSlices(data, total, circumference)
  }, [data, total, circumference])

  const activeSlice = hoverIndex !== null ? slices[hoverIndex] : null

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        style={{ height: size }}
        className="flex items-center justify-center text-xs font-mono text-[#64748B] border border-dashed border-[#1E2E3E] rounded-lg"
      >
        No distribution data
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 font-mono select-none">
      {/* Donut Circle */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#101824"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice, idx) => {
            const isHovered = hoverIndex === idx
            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
                strokeDashoffset={-slice.offset}
                className="cursor-pointer transition-all duration-200"
                opacity={hoverIndex === null || isHovered ? 1 : 0.4}
                onMouseEnter={() => setHoverIndex(idx)}
                onClick={() => onSliceClick?.(slice)}
              />
            )
          })}
        </svg>

        {/* Center Label & Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] text-[#8E9EAA] uppercase tracking-wider">
            {activeSlice ? activeSlice.name || activeSlice.mode || activeSlice.type : centerLabel}
          </span>
          <span className="text-base font-bold text-white leading-tight">
            {activeSlice ? `${activeSlice.pct}%` : total}
          </span>
          {activeSlice && (
            <span className="text-[9px] text-[#64748B]">
              ({activeSlice.val} count)
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-[140px] text-xs">
        <div className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold mb-1">
          {title}
        </div>
        {slices.map((slice, idx) => {
          const isHovered = hoverIndex === idx
          return (
            <button
              key={idx}
              type="button"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => onSliceClick?.(slice)}
              className={`flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition ${
                isHovered ? "bg-[#142232] text-white" : "text-[#8E9EAA] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.name || slice.mode || slice.type}</span>
              </div>
              <span className="font-bold text-white shrink-0">{slice.pct}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DonutChart
