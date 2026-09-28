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
  deadzone = 0.08,
  springX = true,
  springY = true,
  defaultY = 0,
  onChange,
  onActiveChange,
}) => {
  const containerRef = useRef(null)
  const activePointerIdRef = useRef(null)
  const cleanupsRef = useRef(null)

  const onChangeRef = useRef(onChange)
  const onActiveChangeRef = useRef(onActiveChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange
  }, [onActiveChange])

  const maxRadius = (size - knobSize) / 2
  const initialPy = -defaultY * maxRadius

  const [knobPos, setKnobPos] = useState({ x: 0, y: initialPy })
  const [isDragging, setIsDragging] = useState(false)
  const [normalized, setNormalized] = useState({ x: 0, y: defaultY })

  const posRef = useRef({
    px: 0,
    py: initialPy,
    normX: 0,
    normY: defaultY,
  })

  // Apply deadzone and clamp to [-1, 1]
  const processAxis = useCallback((raw) => {
    if (Math.abs(raw) < deadzone) return 0
    const sign = raw > 0 ? 1 : -1
    const scaled = (Math.abs(raw) - deadzone) / (1 - deadzone)
    return Number((sign * Math.min(1, Math.max(0, scaled))).toFixed(3))
  }, [deadzone])

  const calculatePosition = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { px: 0, py: 0, normX: 0, normY: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    let dx = clientX - centerX
    let dy = clientY - centerY

    const radius = Math.min(rect.width, rect.height) / 2
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Circular clamping: clamp vector length to radius
    if (distance > radius && distance > 0) {
      dx = (dx / distance) * radius
      dy = (dy / distance) * radius
    }

    // Normalized screen coordinates: X [-1=left, 1=right], Y [-1=down, 1=up]
    const rawX = dx / radius
    const rawY = -(dy / radius)

    // Deadzone processing
    let normX = processAxis(rawX)
    let normY = processAxis(rawY)

    if (Math.abs(rawX) < deadzone && Math.abs(rawY) < deadzone) {
      normX = 0
      normY = 0
    }

    // Visual knob displacement: travel bounded so knob thumb remains inside base
    const maxKnobTravel = (size - knobSize) / 2
    const px = (dx / radius) * maxKnobTravel
    const py = (dy / radius) * maxKnobTravel

    return { px, py, normX, normY }
  }, [size, knobSize, processAxis, deadzone])

  // Clean up any global listeners on unmount
  useEffect(() => {
    return () => {
      if (cleanupsRef.current) {
        cleanupsRef.current()
        cleanupsRef.current = null
      }
    }
  }, [])

  const updatePosition = useCallback((clientX, clientY) => {
    const pos = calculatePosition(clientX, clientY)
    posRef.current = pos
    setKnobPos({ x: pos.px, y: pos.py })
    setNormalized({ x: pos.normX, y: pos.normY })
    onChangeRef.current?.({ x: pos.normX, y: pos.normY })
  }, [calculatePosition])

  const handlePointerDown = (e) => {
    // Only capture primary pointer per stick
    if (activePointerIdRef.current !== null) return

    e.preventDefault()
    e.stopPropagation()

    const targetElement = e.currentTarget
    const pointerId = e.pointerId
    activePointerIdRef.current = pointerId
    setIsDragging(true)
    onActiveChangeRef.current?.(true)

    if (import.meta.env?.DEV) {
      console.log(`[JOYSTICK POINTER DOWN] ${label.toLowerCase()} pointerId:${pointerId} clientX:${e.clientX} clientY:${e.clientY}`);
    }

    try {
      targetElement.setPointerCapture(pointerId)
    } catch {
      // Safe fallback
    }

    updatePosition(e.clientX, e.clientY)
  }

  const handlePointerMove = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    if (import.meta.env?.DEV) {
      console.log(`[JOYSTICK POINTER MOVE] ${label.toLowerCase()} pointerId:${e.pointerId} clientX:${e.clientX} clientY:${e.clientY}`);
    }

    updatePosition(e.clientX, e.clientY)
  }

  const handlePointerUp = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    if (import.meta.env?.DEV) {
      console.log(`[JOYSTICK POINTER UP] ${label.toLowerCase()} pointerId:${e.pointerId}`);
    }

    try {
      if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Safe fallback
    }

    activePointerIdRef.current = null
    setIsDragging(false)
    onActiveChangeRef.current?.(false)

    // Return knob to center on release according to spring configuration
    const finalNormX = springX ? 0 : posRef.current.normX
    const finalNormY = springY ? 0 : posRef.current.normY
    const finalPx = springX ? 0 : posRef.current.px
    const finalPy = springY ? 0 : posRef.current.py

    posRef.current = { px: finalPx, py: finalPy, normX: finalNormX, normY: finalNormY }
    setKnobPos({ x: finalPx, y: finalPy })
    setNormalized({ x: finalNormX, y: finalNormY })
    onChangeRef.current?.({ x: finalNormX, y: finalNormY })
  }

  const handlePointerCancel = (e) => {
    handlePointerUp(e)
  }

  const handleLostPointerCapture = (e) => {
    if (activePointerIdRef.current === e.pointerId) {
      handlePointerUp(e)
    }
  }

  // Safety cleanup if window blurs or unmounts while dragging
  useEffect(() => {
    const handleWindowBlur = () => {
      if (activePointerIdRef.current !== null) {
        activePointerIdRef.current = null
        setIsDragging(false)
        onActiveChangeRef.current?.(false)
        posRef.current = { px: 0, py: 0, normX: 0, normY: 0 }
        setKnobPos({ x: 0, y: 0 })
        setNormalized({ x: 0, y: 0 })
        onChangeRef.current?.({ x: 0, y: 0 })
      }
    }
    window.addEventListener("blur", handleWindowBlur)
    return () => window.removeEventListener("blur", handleWindowBlur)
  }, [])

  return (
    <div
      ref={containerRef}
      id={`virtual-joystick-base-${label.toLowerCase()}`}
      className={`relative flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing border transition-all duration-200 select-none touch-none ${
        isDragging
          ? "border-[#35E0FF] bg-[#0A0E16E6] shadow-[0_0_24px_rgba(53,224,255,0.35)] ring-1 ring-[#35E0FF4D]"
          : "border-[#203342] bg-[#0A0E16B3] shadow-[0_4px_20px_rgba(0,0,0,0.65)] backdrop-blur-md hover:border-[#35E0FF66] hover:shadow-[0_0_15px_rgba(53,224,255,0.15)]"
      }`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
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
