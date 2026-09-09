import { Gauge } from "lucide-react"
import DraggableWidget from "./DraggableWidget.jsx"
import AttitudeIndicator from "../instruments/AttitudeIndicator.jsx"

/**
 * Standalone Draggable Circular Attitude Indicator / Artificial Horizon UI Widget
 * 
 * - Fully draggable anywhere within the viewport with boundary clamping
 * - Position persisted via localStorage
 * - Dynamically responds to real-time pitch, roll, and climb rate telemetry
 */
export const AttitudeWidget = ({
  pitch = 0,
  roll = 0,
  altitude = 0,
  climbRate = 0,
  flightMode = "GUIDED",
  defaultPosition = { x: 220, y: 20 },
}) => {
  return (
    <DraggableWidget
      id="attitude"
      title="ATTITUDE HORIZON"
      icon={Gauge}
      badge={flightMode}
      badgeColor="text-[#2FE089] bg-[#2FE0891A] border-[#2FE08933]"
      defaultPosition={defaultPosition}
      minimizedContent={
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-[#8E9EAA]">
            P: <strong className="text-[#35E0FF]">{pitch >= 0 ? `+${pitch}` : pitch}°</strong>
          </span>
          <span className="text-[#8E9EAA]">
            R: <strong className="text-[#35E0FF]">{roll >= 0 ? `+${roll}` : roll}°</strong>
          </span>
        </div>
      }
    >
      <div className="flex flex-col items-center select-none">
        {/* Circular Artificial Horizon Instrument */}
        <div className="relative flex items-center justify-center p-1">
          <AttitudeIndicator
            pitch={pitch}
            roll={roll}
            size={160}
          />

          {/* Side Altitude Tape / Indicator Badge */}
          <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 flex flex-col items-center bg-[#070A10E6] border border-[#1E293B] rounded px-1.5 py-0.5 shadow font-mono text-[9px]">
            <span className="text-[#8E9EAA] text-[7px] leading-tight">ALT</span>
            <strong className="text-[#2FE089] leading-tight">{altitude}m</strong>
          </div>
        </div>

        {/* Pitch, Roll, and Climb Telemetry Strip */}
        <div className="grid grid-cols-3 gap-1.5 w-full mt-2 font-mono text-[10px] text-center">
          <div className="bg-[#0C121B] py-1 px-1 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[8px] block">PITCH</span>
            <span className={`font-semibold ${pitch !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}`}>
              {pitch >= 0 ? `+${pitch}` : pitch}°
            </span>
          </div>

          <div className="bg-[#0C121B] py-1 px-1 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[8px] block">ROLL</span>
            <span className={`font-semibold ${roll !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}`}>
              {roll >= 0 ? `+${roll}` : roll}°
            </span>
          </div>

          <div className="bg-[#0C121B] py-1 px-1 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[8px] block">VSI</span>
            <span className={`font-semibold ${climbRate > 0 ? "text-[#2FE089]" : climbRate < 0 ? "text-[#FF8585]" : "text-[#EEF4F8]"}`}>
              {climbRate >= 0 ? `+${climbRate}` : climbRate}
            </span>
          </div>
        </div>
      </div>
    </DraggableWidget>
  )
}

export default AttitudeWidget
