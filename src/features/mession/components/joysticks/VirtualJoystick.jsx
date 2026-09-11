import { useRef, useState, useCallback, useEffect } from "react"

/**
 * QGC-Style Virtual Joystick Component
 * 
 * Features:
 * - Fluid 360° and diagonal movement with Euclidean circular boundary clamping
 * - Independent multi-touch and mouse pointer handling using setPointerCapture
 * - Configurable deadzone and spring-to-center physics
 * - High-tech QGC HUD graphics (crosshairs, radial ticks, concentric range rings)
 * - Normalized coordinate output [-1.00, +1.00]
 */
export const VirtualJoystick = ({
  label = "STICK",
  axisXLabel = "X",
  axisYLabel = "Y",
  size = 170,
  knobSize = 54,
  deadzone = 0.05,
  springX = true,
  springY = true,
  defaultY = 0,
  onChange,
  onActiveChange,
}) => {
  const containerRef = useRef(null)
  const activePointerIdRef = useRef(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: -defaultY * ((size - knobSize) / 2) })
  const [isDragging, setIsDragging] = useState(false)
  const [normalized, setNormalized] = useState({ x: 0, y: defaultY })

  const maxRadius = (size - knobSize) / 2

  // Apply deadzone and clamp to [-1, 1]
  const processAxis = useCallback((raw) => {
    if (Math.abs(raw) < deadzone) return 0
    const sign = raw > 0 ? 1 : -1
    const scaled = (Math.abs(raw) - deadzone) / (1 - deadzone)
    return Number((sign * Math.min(1, scaled)).toFixed(2))
  }, [deadzone])

  const calculatePosition = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { px: 0, py: 0, normX: 0, normY: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY

    const distance = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)

    // Clamp distance within circular boundary
    const clampedDistance = Math.min(distance, maxRadius)
    const px = Math.cos(angle) * clampedDistance
    const py = Math.sin(angle) * clampedDistance

    // Screen Y is inverted: moving up is negative dy, but positive control input
    const rawX = px / maxRadius
    const rawY = -py / maxRadius

    const normX = processAxis(rawX)
    const normY = processAxis(rawY)

    return { px, py, normX, normY }
  }, [maxRadius, processAxis])

  const handlePointerDown = (e) => {
    // Only capture primary touch/click per stick
    if (activePointerIdRef.current !== null) return

    e.preventDefault()
    e.stopPropagation()

    activePointerIdRef.current = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignore if pointer capture fails
    }

    setIsDragging(true)
    onActiveChange?.(true)

    const { px, py, normX, normY } = calculatePosition(e.clientX, e.clientY)
    setKnobPos({ x: px, y: py })
    setNormalized({ x: normX, y: normY })
    onChange?.({ x: normX, y: normY })
  }

  const handlePointerMove = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()

    const { px, py, normX, normY } = calculatePosition(e.clientX, e.clientY)
    setKnobPos({ x: px, y: py })
    setNormalized({ x: normX, y: normY })
    onChange?.({ x: normX, y: normY })
  }

  const handlePointerUp = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignore
    }

    activePointerIdRef.current = null
    setIsDragging(false)
    onActiveChange?.(false)

    // Spring return
    const nextPx = springX ? 0 : knobPos.x
    const nextPy = springY ? -defaultY * maxRadius : knobPos.y
    const nextNormX = springX ? 0 : normalized.x
    const nextNormY = springY ? defaultY : normalized.y

    setKnobPos({ x: nextPx, y: nextPy })
    setNormalized({ x: nextNormX, y: nextNormY })
    onChange?.({ x: nextNormX, y: nextNormY })
  }

  // Handle window blur / release
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (activePointerIdRef.current !== null) {
        activePointerIdRef.current = null
        setIsDragging(false)
        onActiveChange?.(false)
        if (springX || springY) {
          const nextPx = springX ? 0 : knobPos.x
          const nextPy = springY ? -defaultY * maxRadius : knobPos.y
          const nextNormX = springX ? 0 : normalized.x
          const nextNormY = springY ? defaultY : normalized.y
          setKnobPos({ x: nextPx, y: nextPy })
          setNormalized({ x: nextNormX, y: nextNormY })
          onChange?.({ x: nextNormX, y: nextNormY })
        }
      }
    }
    window.addEventListener("pointercancel", handleGlobalRelease)
    return () => window.removeEventListener("pointercancel", handleGlobalRelease)
  }, [springX, springY, defaultY, maxRadius, knobPos.x, knobPos.y, normalized.x, normalized.y, onChange, onActiveChange])

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing border transition-all duration-200 select-none touch-none ${
        isDragging
          ? "border-[#35E0FF] bg-[#0A0E16E6] shadow-[0_0_24px_rgba(53,224,255,0.35)] ring-1 ring-[#35E0FF4D]"
          : "border-[#203342] bg-[#0A0E16B3] shadow-[0_4px_20px_rgba(0,0,0,0.65)] backdrop-blur-md hover:border-[#35E0FF66] hover:shadow-[0_0_15px_rgba(53,224,255,0.15)]"
      }`}
      style={{ width: `${size}px`, height: `${size}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label={label}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={normalized.y}
    >
      {/* Outer Radial Tick Marks & Range Rings */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Concentric Range Rings */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={maxRadius * 0.33}
          fill="none"
          stroke="#1F3342"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={maxRadius * 0.66}
          fill="none"
          stroke="#1F3342"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={maxRadius}
          fill="none"
          stroke="#263E52"
          strokeWidth="1"
        />

        {/* Crosshair Axes */}
        <line
          x1={size / 2}
          y1={8}
          x2={size / 2}
          y2={size - 8}
          stroke="#223647"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1={8}
          y1={size / 2}
          x2={size - 8}
          y2={size / 2}
          stroke="#223647"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Active Vector Line from Center to Stick */}
        {isDragging && (
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + knobPos.x}
            y2={size / 2 + knobPos.y}
            stroke="#35E0FF"
            strokeWidth="1.5"
            strokeOpacity="0.75"
          />
        )}

        {/* 45° Diagonal Alignment Ticks */}
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180
          const x1 = size / 2 + Math.cos(rad) * (maxRadius - 4)
          const y1 = size / 2 + Math.sin(rad) * (maxRadius - 4)
          const x2 = size / 2 + Math.cos(rad) * (maxRadius + 2)
          const y2 = size / 2 + Math.sin(rad) * (maxRadius + 2)
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#35E0FF44"
              strokeWidth="1"
            />
          )
        })}
      </svg>

      {/* Directional HUD Axis Labels */}
      <span className="absolute top-1 text-[8px] font-mono text-[#5D707C] tracking-tight uppercase pointer-events-none select-none">
        ▲ {axisYLabel}
      </span>
      <span className="absolute bottom-1 text-[8px] font-mono text-[#5D707C] tracking-tight uppercase pointer-events-none select-none">
        ▼ {axisYLabel}
      </span>
      <span className="absolute left-1.5 text-[8px] font-mono text-[#5D707C] tracking-tight uppercase pointer-events-none select-none">
        ◄ {axisXLabel}
      </span>
      <span className="absolute right-1.5 text-[8px] font-mono text-[#5D707C] tracking-tight uppercase pointer-events-none select-none">
        {axisXLabel} ►
      </span>

      {/* Stick Knob Thumb */}
      <div
        className={`absolute rounded-full flex items-center justify-center pointer-events-none select-none transition-transform will-change-transform ${
          !isDragging ? "transition-all duration-200 ease-out" : ""
        }`}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
      >
        {/* Knob Outer Shell */}
        <div
          className={`w-full h-full rounded-full flex items-center justify-center border shadow-lg ${
            isDragging
              ? "bg-gradient-to-b from-[#1C3242] to-[#0D1820] border-[#35E0FF] shadow-[0_0_15px_rgba(53,224,255,0.45)]"
              : "bg-gradient-to-b from-[#1E293B] to-[#0A0E16] border-[#35E0FF55] shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          }`}
        >
          {/* Concentric Grip Ring */}
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#2B4255] flex items-center justify-center bg-[#0C141D]">
            {/* Glowing Center Core */}
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                isDragging
                  ? "bg-[#35E0FF] shadow-[0_0_10px_#35E0FF] scale-110"
                  : "bg-[#35E0FF99] shadow-[0_0_5px_#35E0FF66]"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VirtualJoystick
