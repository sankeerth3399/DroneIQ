import { useState, useRef } from "react"
import { GripHorizontal, RotateCcw, Minimize2, Maximize2, Compass, X } from "lucide-react"
import AttitudeIndicator from "./AttitudeIndicator.jsx"
import CompassIndicator from "./CompassIndicator.jsx"

/**
 * Combined Movable Flight Instruments Widget
 * 
 * Features:
 * - High-tech combined circular Attitude Indicator (Artificial Horizon) + Compass Ring
 * - Fully draggable anywhere on the screen with boundary constraints
 * - Reset position button & Minimize/Expand toggle
 * - Integrated real-time flight data readouts: Heading, Pitch, Roll, Speed, Altitude, VSI
 */
export const FlightInstruments = ({
  telemetry = {
    pitch: 0,
    roll: 0,
    heading: 0,
    altitude: 45,
    climbRate: 0,
    groundSpeed: 5,
    flightMode: "GUIDED",
  },
  defaultPosition = { x: 16, y: 16 },
  visible = true,
  onToggleVisible,
}) => {
  const [position, setPosition] = useState(defaultPosition)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 })
  const widgetRef = useRef(null)

  // Cardinal direction text
  const getCardinal = (deg) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(((deg % 360) / 45)) % 8
    return directions[index]
  }

  // Pointer drag handling for moving widget
  const handlePointerDown = (e) => {
    // Only drag when clicking the header bar
    if (e.button !== 0) return
    e.preventDefault()

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    }
    setIsDragging(true)

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.mouseX
      const dy = moveEvent.clientY - dragStartRef.current.mouseY

      // Constrain position within viewport boundaries
      const maxX = Math.max(10, window.innerWidth - (widgetRef.current?.offsetWidth || 260) - 10)
      const maxY = Math.max(10, window.innerHeight - (widgetRef.current?.offsetHeight || 300) - 10)

      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.initialX + dx))
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.initialY + dy))

      setPosition({ x: nextX, y: nextY })
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  const handleResetPosition = (e) => {
    e.stopPropagation()
    setPosition(defaultPosition)
  }

  if (!visible) return null

  const headingText = `${String(Math.round(telemetry.heading)).padStart(3, "0")}° ${getCardinal(telemetry.heading)}`

  return (
    <div
      ref={widgetRef}
      className={`absolute z-25 select-none transition-shadow ${
        isDragging ? "shadow-[0_0_25px_rgba(53,224,255,0.3)] cursor-grabbing" : "shadow-2xl"
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
      }}
    >
      <div className="relative rounded-xl bg-[#080C14EB] border border-[#1E293B] backdrop-blur-md overflow-hidden">
        {/* Corner HUD Accent Brackets */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#35E0FF] pointer-events-none" />

        {/* HEADER DRAG HANDLE BAR */}
        <div
          onPointerDown={handlePointerDown}
          className="flex items-center justify-between px-2.5 py-1.5 bg-[#0C121CC0] border-b border-[#1A2633] cursor-grab active:cursor-grabbing"
          title="Click and drag to reposition flight instruments"
        >
          <div className="flex items-center gap-1.5 text-xs text-[#8E9EAA]">
            <GripHorizontal className="w-3.5 h-3.5 text-[#35E0FF] shrink-0" />
            <span className="font-semibold tracking-wider text-[#EEF4F8] text-[10px] font-mono">
              FLIGHT INSTRUMENTS
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Reset position */}
            <button
              type="button"
              onClick={handleResetPosition}
              className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#FFFFFF0D] transition"
              title="Reset Position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Minimize / Expand */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized((prev) => !prev)
              }}
              className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#FFFFFF0D] transition"
              title={isMinimized ? "Expand Instrument" : "Minimize Instrument"}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>

            {/* Hide Instrument Button */}
            {onToggleVisible && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisible()
                }}
                className="p-1 rounded text-[#8E9EAA] hover:text-[#FF8585] hover:bg-[#FFFFFF0D] transition"
                title="Hide Flight Instruments"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* COMPACT MINIMIZED VIEW */}
        {isMinimized ? (
          <div className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-[#35E0FF]">
              <Compass className="w-3.5 h-3.5" />
              <strong>{headingText}</strong>
            </div>
            <div className="w-[1px] h-3 bg-[#223240]" />
            <span className="text-[#8E9EAA]">
              P: <strong className="text-[#EEF4F8]">{telemetry.pitch >= 0 ? `+${telemetry.pitch}` : telemetry.pitch}°</strong>
            </span>
            <span className="text-[#8E9EAA]">
              R: <strong className="text-[#EEF4F8]">{telemetry.roll >= 0 ? `+${telemetry.roll}` : telemetry.roll}°</strong>
            </span>
            <div className="w-[1px] h-3 bg-[#223240]" />
            <span className="text-[#8E9EAA]">
              ALT: <strong className="text-[#2FE089]">{telemetry.altitude}m</strong>
            </span>
          </div>
        ) : (
          /* EXPANDED FULL INSTRUMENT VIEW */
          <div className="p-3 flex flex-col items-center">
            {/* Top Heading Banner */}
            <div className="flex items-center justify-between w-full mb-2 px-1 text-[11px] font-mono">
              <div className="flex items-center gap-1 text-[#35E0FF] bg-[#35E0FF15] border border-[#35E0FF33] px-2 py-0.5 rounded">
                <Compass className="w-3 h-3" />
                <span className="font-bold">{headingText}</span>
              </div>
              <div className="text-[10px] text-[#8E9EAA] bg-[#141E28] border border-[#233544] px-1.5 py-0.5 rounded">
                {telemetry.flightMode}
              </div>
            </div>

            {/* COMBINED CIRCULAR INSTRUMENT: Attitude Horizon in center, Compass Ring on outer bezel */}
            <div className="relative flex items-center justify-center">
              {/* Outer Rotating Compass Bezel */}
              <CompassIndicator
                heading={telemetry.heading}
                size={210}
                innerSize={136}
              />

              {/* Inner Attitude Indicator / Artificial Horizon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AttitudeIndicator
                  pitch={telemetry.pitch}
                  roll={telemetry.roll}
                  size={136}
                />
              </div>

              {/* Left Speed Ribbon Badge */}
              <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 flex flex-col items-center bg-[#070A10E6] border border-[#1E293B] rounded px-1 py-0.5 shadow font-mono text-[9px]">
                <span className="text-[#8E9EAA] text-[7px] leading-tight">SPD</span>
                <strong className="text-[#35E0FF] leading-tight">{telemetry.groundSpeed}</strong>
                <span className="text-[#64748B] text-[7px] leading-tight">m/s</span>
              </div>

              {/* Right Altitude Ribbon Badge */}
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 flex flex-col items-center bg-[#070A10E6] border border-[#1E293B] rounded px-1 py-0.5 shadow font-mono text-[9px]">
                <span className="text-[#8E9EAA] text-[7px] leading-tight">ALT</span>
                <strong className="text-[#2FE089] leading-tight">{telemetry.altitude}</strong>
                <span className="text-[#64748B] text-[7px] leading-tight">m</span>
              </div>
            </div>

            {/* Bottom Primary Flight Telemetry Strip */}
            <div className="grid grid-cols-3 gap-1.5 w-full mt-2.5 pt-2 border-t border-[#16222E] text-[10px] font-mono text-center">
              <div className="bg-[#0C121B] py-1 px-1.5 rounded border border-[#1B2938]">
                <span className="text-[#64748B] text-[8px] block">PITCH</span>
                <span className={`font-semibold ${telemetry.pitch !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}`}>
                  {telemetry.pitch >= 0 ? `+${telemetry.pitch}` : telemetry.pitch}°
                </span>
              </div>

              <div className="bg-[#0C121B] py-1 px-1.5 rounded border border-[#1B2938]">
                <span className="text-[#64748B] text-[8px] block">ROLL</span>
                <span className={`font-semibold ${telemetry.roll !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}`}>
                  {telemetry.roll >= 0 ? `+${telemetry.roll}` : telemetry.roll}°
                </span>
              </div>

              <div className="bg-[#0C121B] py-1 px-1.5 rounded border border-[#1B2938]">
                <span className="text-[#64748B] text-[8px] block">CLIMB VSI</span>
                <span className={`font-semibold ${telemetry.climbRate > 0 ? "text-[#2FE089]" : telemetry.climbRate < 0 ? "text-[#FFB3B3]" : "text-[#EEF4F8]"}`}>
                  {telemetry.climbRate >= 0 ? `+${telemetry.climbRate}` : telemetry.climbRate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlightInstruments
