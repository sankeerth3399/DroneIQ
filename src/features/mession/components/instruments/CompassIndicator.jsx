import { useMemo } from "react"

/**
 * High-Tech Rotating Compass Ring Bezel
 * 
 * Accurately renders:
 * - 360-degree rotating compass ring responding dynamically to heading
 * - Cardinal points: N (red/cyan), E, S, W
 * - Intercardinal points: NE, SE, SW, NW
 * - Major ticks every 30 degrees, minor ticks every 10 degrees
 * - Fixed Lubber Line index pointing to the current heading
 */
export const CompassIndicator = ({
  heading = 0, // degrees: 0 to 359.9
  size = 220,  // outer diameter
  innerSize = 144, // inner hole where attitude indicator fits
}) => {
  const radius = size / 2

  // Generate 36-tick degree array (every 10 degrees)
  const ticks = useMemo(() => {
    const list = []
    for (let deg = 0; deg < 360; deg += 10) {
      let label = ""
      let isCardinal = false

      if (deg === 0) {
        label = "N"
        isCardinal = true
      } else if (deg === 90) {
        label = "E"
        isCardinal = true
      } else if (deg === 180) {
        label = "S"
        isCardinal = true
      } else if (deg === 270) {
        label = "W"
        isCardinal = true
      } else if (deg === 45) {
        label = "NE"
      } else if (deg === 135) {
        label = "SE"
      } else if (deg === 225) {
        label = "SW"
      } else if (deg === 315) {
        label = "NW"
      } else if (deg % 30 === 0) {
        label = `${deg / 10}` // aviation heading notation (e.g. 03, 06, 12)
      }

      list.push({ deg, label, isCardinal })
    }
    return list
  }, [])

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* ROTATING COMPASS BEZEL */}
      <svg
        className="absolute inset-0 w-full h-full will-change-transform"
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${-heading}deg)`,
          transformOrigin: "center center",
          transition: "transform 0.05s linear",
        }}
      >
        {/* Outer Ring Border */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="#080C14"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* Inner Ring Border separating compass from attitude indicator */}
        <circle
          cx={radius}
          cy={radius}
          r={innerSize / 2 + 1}
          fill="none"
          stroke="#1E293B"
          strokeWidth="1"
        />

        {/* Ticks and Cardinal Labels */}
        {ticks.map(({ deg, label, isCardinal }) => {
          // Angle offset so 0 deg is at top (270 deg in SVG polar coordinates)
          const rad = ((deg - 90) * Math.PI) / 180
          const isCompact = size < 190
          const isMajor = deg % 30 === 0
          const tickLen = isCardinal
            ? (isCompact ? 6 : 10)
            : isMajor
            ? (isCompact ? 4 : 7)
            : (isCompact ? 2.5 : 4)

          const rOuter = radius - (isCompact ? 2.5 : 4)
          const rInner = rOuter - tickLen
          const rText = rInner - (isCompact ? 5.5 : 8)

          const x1 = radius + Math.cos(rad) * rOuter
          const y1 = radius + Math.sin(rad) * rOuter
          const x2 = radius + Math.cos(rad) * rInner
          const y2 = radius + Math.sin(rad) * rInner
          const xt = radius + Math.cos(rad) * rText
          const yt = radius + Math.sin(rad) * rText

          return (
            <g key={deg}>
              {/* Tick Mark */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={deg === 0 ? "#FF4141" : isMajor ? "#35E0FF" : "#64748B"}
                strokeWidth={isMajor ? "1.5" : "1"}
              />

              {/* Text Label */}
              {label && (
                <text
                  x={xt}
                  y={yt}
                  fill={
                    deg === 0
                      ? "#FF4141"
                      : isCardinal
                      ? "#35E0FF"
                      : isMajor
                      ? "#E2E8F0"
                      : "#8E9EAA"
                  }
                  fontSize={isCardinal ? (isCompact ? "8.5" : "10") : (isCompact ? "6.5" : "8")}
                  fontWeight={isCardinal ? "bold" : "500"}
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${deg}, ${xt}, ${yt})`}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* FIXED TOP LUBBER LINE (Heading Index Marker) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#35E0FF] drop-shadow-[0_0_4px_#35E0FF]" />
        <div className="w-[1.5px] h-[6px] bg-[#35E0FF]" />
      </div>

      {/* FIXED 90°, 180°, 270° REFERENCE PIPS */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-[2px] bg-[#35E0FF66] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-1 bg-[#35E0FF66] pointer-events-none" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[2px] bg-[#35E0FF66] pointer-events-none" />
    </div>
  )
}

export default CompassIndicator
