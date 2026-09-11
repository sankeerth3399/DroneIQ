import { useState, useEffect } from "react"
import { Compass, Gauge } from "lucide-react"
import DraggableWidget from "./DraggableWidget.jsx"
import AttitudeIndicator from "../instruments/AttitudeIndicator.jsx"
import CompassIndicator from "../instruments/CompassIndicator.jsx"

/**
 * Combined Movable Flight Instruments Widget
 * 
 * Houses two visually and functionally independent circular instruments:
 * 1. Circular Attitude Indicator / Artificial Horizon (pitch, roll, bank arc, wings)
 * 2. Circular Compass (360° rotating heading ring, cardinal marks, lubber line)
 * 
 * The entire widget is draggable as a single unit with localStorage position persistence.
 */
export const FlightInstrumentsWidget = ({
  telemetry = {
    pitch: 0,
    roll: 0,
    heading: 0,
    altitude: 45,
    climbRate: 0,
    groundSpeed: 5,
    flightMode: "GUIDED",
  },
  defaultPosition = { x: 20, y: 20 },
}) => {
  // Dynamic instrument sizing (74px on mobile phones, 90px on desktop - compact 20% footprint)
  const [instrumentSize, setInstrumentSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 74 : 90
  )

  useEffect(() => {
    const handleResize = () => {
      setInstrumentSize(window.innerWidth < 640 ? 74 : 90)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Cardinal direction calculation
  const getCardinal = (deg) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(((deg % 360) / 45)) % 8
    return directions[index]
  }

  const cardinal = getCardinal(telemetry.heading)
  const headingText = `${String(Math.round(telemetry.heading)).padStart(3, "0")}° ${cardinal}`

  return (
    <DraggableWidget
      id="flight_instruments"
      title="FLIGHT INSTRUMENTS"
      icon={Gauge}
      badge={telemetry.flightMode}
      badgeColor="text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]"
      defaultPosition={defaultPosition}
      minimizedContent={
        <div className="flex items-center gap-2 text-[9px] font-mono select-none">
          <span className="text-[#8E9EAA]">
            ATT: <strong className="text-[#35E0FF]">{telemetry.pitch >= 0 ? `+${telemetry.pitch}` : telemetry.pitch}°</strong> /{" "}
            <strong className="text-[#35E0FF]">{telemetry.roll >= 0 ? `+${telemetry.roll}` : telemetry.roll}°</strong>
          </span>
          <div className="w-[1px] h-3 bg-[#223240]" />
          <div className="flex items-center gap-1 text-[#35E0FF]">
            <Compass className="w-2.5 h-2.5" />
            <strong className="text-[10px]">{headingText}</strong>
          </div>
          <div className="w-[1px] h-3 bg-[#223240]" />
          <span className="text-[#8E9EAA]">
            ALT: <strong className="text-[#2FE089]">{telemetry.altitude}m</strong>
          </span>
        </div>
      }
    >
      <div className="flex flex-col items-center select-none">
        {/* TWO SEPARATE INSTRUMENTS SIDE-BY-SIDE */}
        <div className="flex items-center gap-2 p-0.5">
          {/* 1. SEPARATE CIRCULAR ATTITUDE INDICATOR (ARTIFICIAL HORIZON) */}
          <div className="flex flex-col items-center">
            <span className="text-[7.5px] font-mono font-semibold text-[#8E9EAA] uppercase tracking-wider mb-0.5">
              ATTITUDE
            </span>

            <div className="relative p-0.5 rounded-full bg-[#070A10] border border-[#1E293B] shadow-inner">
              <AttitudeIndicator
                pitch={telemetry.pitch}
                roll={telemetry.roll}
                size={instrumentSize}
              />
            </div>

            {/* Attitude Telemetry Readout */}
            <div className="flex items-center gap-1 mt-0.5 font-mono text-[8px] sm:text-[8.5px]">
              <span className="text-[#8E9EAA]">
                P: <strong className={telemetry.pitch !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}>
                  {telemetry.pitch >= 0 ? `+${telemetry.pitch}` : telemetry.pitch}°
                </strong>
              </span>
              <span className="text-[#64748B]">|</span>
              <span className="text-[#8E9EAA]">
                R: <strong className={telemetry.roll !== 0 ? "text-[#35E0FF]" : "text-[#EEF4F8]"}>
                  {telemetry.roll >= 0 ? `+${telemetry.roll}` : telemetry.roll}°
                </strong>
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-24 bg-[#1B2836] self-center opacity-70" />

          {/* 2. SEPARATE CIRCULAR COMPASS */}
          <div className="flex flex-col items-center">
            <span className="text-[7.5px] font-mono font-semibold text-[#8E9EAA] uppercase tracking-wider mb-0.5">
              COMPASS
            </span>

            <div className="relative flex items-center justify-center p-0.5 rounded-full bg-[#070A10] border border-[#1E293B] shadow-inner">
              <CompassIndicator
                heading={telemetry.heading}
                size={instrumentSize}
                innerSize={Math.round(instrumentSize * 0.58)}
              />

              {/* Center Heading Arrow / Silhouette */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#35E0FF] drop-shadow-[0_0_4px_#35E0FF]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#162230] border border-[#35E0FF] -mt-0.5" />
              </div>
            </div>

            {/* Heading Telemetry Readout */}
            <div className="flex items-center gap-1 mt-0.5 font-mono text-[8px] sm:text-[8.5px]">
              <Compass className="w-2.5 h-2.5 text-[#35E0FF]" />
              <strong className="text-[#35E0FF]">{headingText}</strong>
            </div>
          </div>
        </div>

        {/* SHARED BOTTOM FLIGHT DATA STRIP */}
        <div className="grid grid-cols-3 gap-1 w-full mt-1 pt-1 border-t border-[#16222E] text-[8px] sm:text-[8.5px] font-mono text-center">
          <div className="bg-[#0C121B] py-0.5 px-0.5 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[6.5px] block">ALTITUDE</span>
            <strong className="text-[#2FE089] text-[8.5px]">{telemetry.altitude}m</strong>
          </div>

          <div className="bg-[#0C121B] py-0.5 px-0.5 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[6.5px] block">SPEED</span>
            <strong className="text-[#35E0FF] text-[8.5px]">{telemetry.groundSpeed}m/s</strong>
          </div>

          <div className="bg-[#0C121B] py-0.5 px-0.5 rounded border border-[#1B2938]">
            <span className="text-[#64748B] text-[6.5px] block">CLIMB VSI</span>
            <strong
              className={`text-[8.5px] ${
                telemetry.climbRate > 0
                  ? "text-[#2FE089]"
                  : telemetry.climbRate < 0
                  ? "text-[#FF8585]"
                  : "text-[#EEF4F8]"
              }`}
            >
              {telemetry.climbRate >= 0 ? `+${telemetry.climbRate}` : telemetry.climbRate}
            </strong>
          </div>
        </div>

        {/* COMPACT INTEGRATED GPS COORDINATES STRIP */}
        <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-[#16222E] px-0.5 text-[8px] sm:text-[8.5px] font-mono select-none">
          <div className="flex items-center gap-1">
            <span className="text-[#64748B] text-[7.5px] font-semibold">LAT</span>
            <strong className="text-[#35E0FF] tracking-tight">
              {typeof telemetry.latitude === "number" ? telemetry.latitude.toFixed(5) : "17.38500"}
            </strong>
          </div>

          <div className="w-[1px] h-2.5 bg-[#1B2836]" />

          <div className="flex items-center gap-1">
            <span className="text-[#64748B] text-[7.5px] font-semibold">LNG</span>
            <strong className="text-[#35E0FF] tracking-tight">
              {typeof telemetry.longitude === "number" ? telemetry.longitude.toFixed(5) : "78.48670"}
            </strong>
          </div>

          <div className="w-[1px] h-2.5 bg-[#1B2836] hidden xs:block" />

          <div className="hidden xs:flex items-center gap-1">
            <span className="text-[#64748B] text-[7.5px] font-semibold">HDG</span>
            <strong className="text-[#35E0FF] tracking-tight">
              {Math.round(telemetry.heading || 0)}°
            </strong>
          </div>
        </div>
      </div>
    </DraggableWidget>
  )
}

export default FlightInstrumentsWidget
