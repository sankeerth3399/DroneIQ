import { useState } from "react"

export const MultiMetricChart = ({
  data = [],
  xKey = "time",
  metrics = [
    { key: "altitude", label: "Altitude", unit: "m", color: "#35E0FF" },
    { key: "speed", label: "Speed", unit: "m/s", color: "#2FE089" },
    { key: "battery", label: "Battery", unit: "%", color: "#F59E0B" },
  ],
  height = 200,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs font-mono text-[#64748B] border border-dashed border-[#1E2E3E] rounded-lg"
      >
        No telemetry track data available
      </div>
    )
  }

  const w = 500
  const padTop = 15
  const padBottom = 26
  const padLeft = 30
  const padRight = 15
  const plotW = w - padLeft - padRight
  const plotH = height - padTop - padBottom

  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW / 2

  // For each metric, compute normalized path
  const metricLines = metrics.map((m) => {
    const values = data.map((d) => Number(d[m.key]) || 0)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values, 1)

    const pts = data.map((d, i) => {
      const val = Number(d[m.key]) || 0
      const norm = maxVal === minVal ? 0.5 : (val - minVal) / (maxVal - minVal)
      const cx = padLeft + (data.length > 1 ? i * stepX : plotW / 2)
      const cy = padTop + plotH - norm * plotH
      return { cx, cy, val }
    })

    let pathStr = ""
    pts.forEach((p, i) => {
      if (i === 0) pathStr += `M ${p.cx} ${p.cy}`
      else pathStr += ` L ${p.cx} ${p.cy}`
    })

    return {
      ...m,
      points: pts,
      path: pathStr,
    }
  })

  const activeIndex = hoverIndex !== null ? hoverIndex : null

  return (
    <div className="relative w-full select-none font-mono">
      {/* Metrics Legend Toggles */}
      <div className="flex items-center justify-end gap-3 mb-2 text-[10.5px]">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[#8E9EAA]">{m.label}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = padTop + plotH * (1 - ratio)
          return (
            <line
              key={i}
              x1={padLeft}
              y1={y}
              x2={w - padRight}
              y2={y}
              stroke="#1A2633"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )
        })}

        {/* Render lines for each metric */}
        {metricLines.map((m) => (
          <g key={m.key}>
            <path
              d={m.path}
              fill="none"
              stroke={m.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {m.points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.cx}
                cy={p.cy}
                r={hoverIndex === idx ? 4 : 2}
                fill={m.color}
                stroke="#080C14"
                strokeWidth="1"
              />
            ))}
          </g>
        ))}

        {/* X labels and capture rects */}
        {data.map((d, idx) => {
          const cx = padLeft + (data.length > 1 ? idx * stepX : plotW / 2)
          return (
            <g key={idx} onMouseEnter={() => setHoverIndex(idx)} className="cursor-pointer">
              <rect
                x={cx - stepX / 2}
                y="0"
                width={stepX}
                height={height}
                fill="transparent"
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                className={`text-[9.5px] font-mono ${
                  hoverIndex === idx ? "fill-[#35E0FF] font-bold" : "fill-[#8E9EAA]"
                }`}
              >
                {d[xKey]}
              </text>
            </g>
          )
        })}

        {/* Hover Crosshair line */}
        {activeIndex !== null && (
          <line
            x1={padLeft + (data.length > 1 ? activeIndex * stepX : plotW / 2)}
            y1={padTop}
            x2={padLeft + (data.length > 1 ? activeIndex * stepX : plotW / 2)}
            y2={padTop + plotH}
            stroke="#35E0FF"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            opacity="0.7"
          />
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {activeIndex !== null && data[activeIndex] && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-2 rounded bg-[#080C14F2] border border-[#223240] shadow-2xl backdrop-blur-md text-left text-xs min-w-[120px]"
          style={{
            left: `${((padLeft + (data.length > 1 ? activeIndex * stepX : plotW / 2)) / w) * 100}%`,
            top: "20px",
          }}
        >
          <div className="text-[10px] text-[#8E9EAA] uppercase font-bold border-b border-[#1A2633] pb-1 mb-1">
            Time: {data[activeIndex][xKey]}
          </div>
          <div className="space-y-1">
            {metrics.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#8E9EAA]">{m.label}:</span>
                <span className="font-bold" style={{ color: m.color }}>
                  {data[activeIndex][m.key]} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiMetricChart
