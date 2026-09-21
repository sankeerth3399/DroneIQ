import { useState } from "react"

export const BarComparisonChart = ({
  data = [],
  xKey = "label",
  yKey = "value",
  unit = "",
  color = "#35E0FF",
  height = 200,
  onBarClick,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs font-mono text-[#64748B] border border-dashed border-[#1E2E3E] rounded-lg"
      >
        No comparative data available
      </div>
    )
  }

  const values = data.map((d) => Number(d[yKey]) || 0)
  const maxValue = Math.max(...values, 1)

  const w = 500
  const padBottom = 26
  const padTop = 15
  const padLeft = 20
  const padRight = 20
  const plotW = w - padLeft - padRight
  const plotH = height - padTop - padBottom

  const barCount = data.length
  const slotW = plotW / barCount
  const barWidth = Math.min(36, Math.max(12, slotW * 0.55))

  return (
    <div className="relative w-full select-none font-mono">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Baseline */}
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={w - padRight}
          y2={padTop + plotH}
          stroke="#1A2633"
          strokeWidth="1.5"
        />

        {data.map((item, idx) => {
          const val = Number(item[yKey]) || 0
          const barH = Math.max(3, (val / maxValue) * plotH)
          const x = padLeft + idx * slotW + (slotW - barWidth) / 2
          const y = padTop + plotH - barH
          const isHovered = hoverIndex === idx
          const barColor = item.color || color

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onClick={() => onBarClick?.(item)}
            >
              {/* Invisible capture area */}
              <rect
                x={padLeft + idx * slotW}
                y="0"
                width={slotW}
                height={height}
                fill="transparent"
              />

              {/* Bar background highlight */}
              {isHovered && (
                <rect
                  x={padLeft + idx * slotW + 2}
                  y={padTop}
                  width={slotW - 4}
                  height={plotH}
                  fill="#35E0FF0D"
                  rx="3"
                />
              )}

              {/* Main Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={barColor}
                opacity={isHovered ? 1 : 0.85}
                rx="2"
                className="transition-all duration-150"
              />

              {/* Top accent glow */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height="2"
                fill="#FFFFFF"
                opacity={isHovered ? 0.9 : 0.4}
              />

              {/* Value on top of bar if hovered */}
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="fill-white font-bold text-[9.5px] font-mono"
                >
                  {val}
                  {unit}
                </text>
              )}

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className={`text-[9.5px] font-mono transition-colors ${
                  isHovered ? "fill-[#35E0FF] font-bold" : "fill-[#8E9EAA]"
                }`}
              >
                {String(item[xKey]).slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 px-2 py-1 rounded bg-[#0B1017F2] border border-[#223240] text-center shadow-lg"
          style={{
            left: `${((padLeft + hoverIndex * slotW + slotW / 2) / w) * 100}%`,
            top: "2px",
          }}
        >
          <div className="text-[11px] font-bold text-white">
            {data[hoverIndex][yKey]} {unit}
          </div>
          <div className="text-[9px] text-[#8E9EAA]">{data[hoverIndex][xKey]}</div>
        </div>
      )}
    </div>
  )
}

export default BarComparisonChart
