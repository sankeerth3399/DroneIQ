import { useState, useRef, useMemo } from "react"

export const AreaTimeSeriesChart = ({
  data = [],
  xKey = "date",
  yKey = "value",
  unit = "",
  label = "Metric",
  color = "#35E0FF",
  gradientId = "cyanGrad",
  height = 220,
}) => {
  const containerRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  // Bounds and coordinates calculation
  const { points, areaPath, linePath, minY, maxY, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], areaPath: "", linePath: "", minY: 0, maxY: 10, yTicks: [0, 5, 10] }
    }

    const values = data.map((d) => Number(d[yKey]) || 0)
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const minY = rawMin < 0 ? rawMin : 0
    const maxY = rawMax === minY ? minY + 10 : Math.ceil(rawMax * 1.15)

    const w = 500
    const h = height
    const padTop = 15
    const padBottom = 30
    const padLeft = 40
    const padRight = 15

    const plotW = w - padLeft - padRight
    const plotH = h - padTop - padBottom

    const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW / 2

    const pts = data.map((d, i) => {
      const val = Number(d[yKey]) || 0
      const normY = maxY === minY ? 0.5 : (val - minY) / (maxY - minY)
      const cx = padLeft + (data.length > 1 ? i * stepX : plotW / 2)
      const cy = padTop + plotH - normY * plotH
      return { cx, cy, val, raw: d }
    })

    // Construct smooth line path
    let lPath = ""
    pts.forEach((p, i) => {
      if (i === 0) lPath += `M ${p.cx} ${p.cy}`
      else lPath += ` L ${p.cx} ${p.cy}`
    })

    // Construct area path
    const baselineY = padTop + plotH
    const aPath = pts.length > 0
      ? `${lPath} L ${pts[pts.length - 1].cx} ${baselineY} L ${pts[0].cx} ${baselineY} Z`
      : ""

    // 4 Y Ticks
    const ticks = [
      minY,
      Math.round(minY + (maxY - minY) * 0.33),
      Math.round(minY + (maxY - minY) * 0.66),
      maxY,
    ]

    return { points: pts, areaPath: aPath, linePath: lPath, minY, maxY, yTicks: ticks }
  }, [data, yKey, height])

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs font-mono text-[#64748B] border border-dashed border-[#1E2E3E] rounded-lg"
      >
        No time-series data available
      </div>
    )
  }

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null

  return (
    <div ref={containerRef} className="relative w-full select-none font-mono">
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="85%" stopColor={color} stopOpacity="0.02" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines */}
        {yTicks.map((tick, idx) => {
          const normY = maxY === minY ? 0.5 : (tick - minY) / (maxY - minY)
          const y = 15 + (height - 45) - normY * (height - 45)
          return (
            <g key={idx}>
              <line
                x1="40"
                y1={y}
                x2="485"
                y2={y}
                stroke="#1A2633"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x="32"
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#64748B] text-[9px] font-mono"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Foreground line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X-axis labels & interactive hover targets */}
        {points.map((p, idx) => {
          const isHovered = hoverIndex === idx
          return (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoverIndex(idx)}>
              {/* Invisible wide capture area */}
              <rect
                x={p.cx - 20}
                y="0"
                width="40"
                height={height}
                fill="transparent"
              />

              {/* Data points */}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isHovered ? 5 : 2.5}
                fill={isHovered ? "#FFFFFF" : color}
                stroke={color}
                strokeWidth={isHovered ? "2.5" : "1"}
                className="transition-all duration-150"
              />

              {/* X label */}
              <text
                x={p.cx}
                y={height - 8}
                textAnchor="middle"
                className={`text-[9.5px] font-mono transition-colors ${
                  isHovered ? "fill-[#35E0FF] font-bold" : "fill-[#8E9EAA]"
                }`}
              >
                {p.raw[xKey]}
              </text>
            </g>
          )
        })}

        {/* Interactive Crosshair Tracking Line */}
        {activePoint && (
          <g pointerEvents="none">
            <line
              x1={activePoint.cx}
              y1="15"
              x2={activePoint.cx}
              y2={height - 30}
              stroke="#35E0FF"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0.8"
            />
            <circle
              cx={activePoint.cx}
              cy={activePoint.cy}
              r="7"
              fill="none"
              stroke="#35E0FF"
              strokeWidth="2"
              opacity="0.6"
              className="animate-ping"
            />
          </g>
        )}
      </svg>

      {/* Cybernetic Floating Tooltip */}
      {activePoint && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded bg-[#080C14E6] border border-[#223240] shadow-xl backdrop-blur-md text-left"
          style={{
            left: `${(activePoint.cx / 500) * 100}%`,
            top: `${Math.max(10, activePoint.cy - 12)}px`,
          }}
        >
          <div className="text-[9px] text-[#8E9EAA] uppercase tracking-wider">
            {activePoint.raw[xKey]}
          </div>
          <div className="text-[12px] font-bold text-white flex items-center gap-1">
            <span style={{ color }}>{activePoint.val}</span>
            <span className="text-[10px] text-[#8E9EAA] font-normal">{unit}</span>
          </div>
          <div className="text-[8.5px] text-[#64748B]">{label}</div>
        </div>
      )}
    </div>
  )
}

export default AreaTimeSeriesChart
