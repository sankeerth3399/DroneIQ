import { useMemo } from "react"

/**
 * High-Tech Circular Attitude Indicator (Artificial Horizon)
 * 
 * Accurately renders:
 * - Dynamic pitch ladder responding to pitch degrees
 * - Dynamic horizon rotation responding to roll degrees
 * - Fixed aircraft reference symbol (wings and center dot)
 * - Bank angle scale arc with standard tick marks (0, 10, 20, 30, 45, 60 deg)
 * - Roll pointer triangle
 */
export const AttitudeIndicator = ({
  pitch = 0, // degrees: -90 to +90
  roll = 0,  // degrees: -180 to +180
  size = 140, // diameter in pixels
}) => {
  const radius = size / 2
  // Dynamically scale pixels per degree of pitch based on instrument size
  const scaleRatio = size / 140
  const pitchScale = scaleRatio * 1.4

  // Ladder lines for pitch: +/- 10, 20, 30 degrees scaled to size
  const pitchRungs = useMemo(() => [
    { deg: 30, width: Math.round(44 * scaleRatio), dashed: false },
    { deg: 20, width: Math.round(34 * scaleRatio), dashed: false },
    { deg: 10, width: Math.round(24 * scaleRatio), dashed: false },
    { deg: -10, width: Math.round(24 * scaleRatio), dashed: true },
    { deg: -20, width: Math.round(34 * scaleRatio), dashed: true },
    { deg: -30, width: Math.round(44 * scaleRatio), dashed: true },
  ], [scaleRatio])

  // Pitch translation (clamped to radius so horizon stays visible)
  const pitchOffset = Math.max(-radius * 0.85, Math.min(radius * 0.85, pitch * pitchScale))

  return (
    <div
      className="relative rounded-full overflow-hidden select-none bg-[#070A10]"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* ROTATING & TRANSLATING HORIZON SPHERE */}
      <div
        className="absolute inset-[-60%] will-change-transform"
        style={{
          transform: `rotate(${-roll}deg) translateY(${pitchOffset}px)`,
          transformOrigin: "center center",
        }}
      >
        {/* SKY HALF */}
        <div
          className="absolute top-0 left-0 right-0 bottom-1/2 bg-gradient-to-t from-[#005B82] via-[#0E354F] to-[#081B2B]"
        />

        {/* HORIZON DIVIDING LINE */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-[#FFFFFF] shadow-[0_0_6px_rgba(255,255,255,0.8)]" />

        {/* GROUND HALF */}
        <div
          className="absolute top-1/2 left-0 right-0 bottom-0 bg-gradient-to-b from-[#422208] via-[#2A1605] to-[#120A03]"
        />

        {/* PITCH LADDER RUNGS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {pitchRungs.map((rung) => {
            const y = -rung.deg * pitchScale
            const isNegative = rung.deg < 0
            return (
              <div
                key={rung.deg}
                className="absolute flex items-center justify-center"
                style={{ transform: `translateY(${y}px)` }}
              >
                {/* Left degree label */}
                <span className="text-[7px] font-mono font-bold text-[#E2E8F0] mr-1 select-none">
                  {Math.abs(rung.deg)}
                </span>

                {/* Pitch rung bar */}
                <div
                  className={`h-[1.5px] relative ${
                    isNegative ? "border-t border-dashed border-[#F59E0B]" : "bg-[#FFFFFF]"
                  }`}
                  style={{ width: `${rung.width}px` }}
                >
                  {/* Downward/Upward tick ends pointing towards horizon */}
                  <div
                    className={`absolute left-0 w-[1.5px] h-[4px] ${
                      isNegative ? "bg-[#F59E0B] -top-1" : "bg-[#FFFFFF] top-0"
                    }`}
                  />
                  <div
                    className={`absolute right-0 w-[1.5px] h-[4px] ${
                      isNegative ? "bg-[#F59E0B] -top-1" : "bg-[#FFFFFF] top-0"
                    }`}
                  />
                </div>

                {/* Right degree label */}
                <span className="text-[7px] font-mono font-bold text-[#E2E8F0] ml-1 select-none">
                  {Math.abs(rung.deg)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Dynamic Roll Pointer (attached to rotating horizon at 12 o'clock) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#35E0FF]" />
      </div>

      {/* FIXED BANK ANGLE ARC (Outer boundary overlay) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Zero Bank Marker (Top center inverted triangle) */}
        <polygon
          points={`${radius},6 ${radius - 4},14 ${radius + 4},14`}
          fill="#FFFFFF"
        />

        {/* Bank angle tick marks: 10, 20, 30, 45, 60 degrees left and right */}
        {[-60, -45, -30, -20, -10, 10, 20, 30, 45, 60].map((deg) => {
          // Angle measured from top center (270 deg)
          const rad = ((deg - 90) * Math.PI) / 180
          const tickLen = Math.abs(deg) % 30 === 0 ? 8 : 5
          const x1 = radius + Math.cos(rad) * (radius - 2)
          const y1 = radius + Math.sin(rad) * (radius - 2)
          const x2 = radius + Math.cos(rad) * (radius - 2 - tickLen)
          const y2 = radius + Math.sin(rad) * (radius - 2 - tickLen)

          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#E2E8F0"
              strokeWidth={Math.abs(deg) % 30 === 0 ? "1.5" : "1"}
            />
          )
        })}
      </svg>

      {/* FIXED AIRCRAFT REFERENCE SYMBOL (Centered yellow wings) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Left wing */}
        <div className="relative flex items-center">
          <div
            className="h-[2px] bg-[#FACC15] shadow-[0_0_4px_#000000] border-y border-[#000000]"
            style={{ width: `${Math.round(24 * scaleRatio)}px` }}
          />
          <div
            className="h-[5px] bg-[#FACC15] border border-[#000000]"
            style={{ width: "2px", marginLeft: "-2px", marginTop: "3px" }}
          />
        </div>

        {/* Center dot */}
        <div
          className="rounded-full bg-[#FACC15] border border-[#000000] shadow-[0_0_6px_rgba(250,204,21,0.8)]"
          style={{
            width: `${Math.max(6, Math.round(8 * scaleRatio))}px`,
            height: `${Math.max(6, Math.round(8 * scaleRatio))}px`,
            marginLeft: `${Math.max(3, Math.round(5 * scaleRatio))}px`,
            marginRight: `${Math.max(3, Math.round(5 * scaleRatio))}px`,
          }}
        />

        {/* Right wing */}
        <div className="relative flex items-center">
          <div
            className="h-[5px] bg-[#FACC15] border border-[#000000]"
            style={{ width: "2px", marginRight: "-2px", marginTop: "3px" }}
          />
          <div
            className="h-[2px] bg-[#FACC15] shadow-[0_0_4px_#000000] border-y border-[#000000]"
            style={{ width: `${Math.round(24 * scaleRatio)}px` }}
          />
        </div>
      </div>

      {/* Inner Vignette / Radial Shadow for spherical depth */}
      <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_16px_rgba(0,0,0,0.8)] border border-[#35E0FF33]" />
    </div>
  )
}

export default AttitudeIndicator
