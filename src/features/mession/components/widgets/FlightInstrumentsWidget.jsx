import { useState, useEffect, memo } from "react";
import { Compass } from "lucide-react";
import AttitudeIndicator from "../instruments/AttitudeIndicator.jsx";
import CompassIndicator from "../instruments/CompassIndicator.jsx";
import { getCardinalDirection } from "@/utils/heading.js";

/**
 * Shared Flight Data Metrics Strip (Altitude, Speed, Climb VSI)
 * Rendered as lightweight floating HUD pills directly beneath the instruments
 */
export const TelemetryStrip = memo(function TelemetryStrip({ telemetry }) {
  const altVal = typeof telemetry.altitude === "number" ? telemetry.altitude.toFixed(1) : "0.0";
  const spdVal =
    typeof telemetry.speed === "number"
      ? telemetry.speed.toFixed(1)
      : typeof telemetry.groundSpeed === "number"
      ? telemetry.groundSpeed.toFixed(1)
      : "0.0";
  const climbVal =
    typeof telemetry.verticalSpeed === "number"
      ? telemetry.verticalSpeed
      : typeof telemetry.climbRate === "number"
      ? telemetry.climbRate
      : 0;

  return (
    <div className="grid grid-cols-3 gap-1.5 w-full mt-2 text-[8px] sm:text-[8.5px] font-mono text-center select-none">
      <div className="bg-[#080C14EE] border border-[#1E293B] backdrop-blur-md py-1 px-1 rounded-md shadow-md">
        <span className="text-[#94A3B8] text-[7px] block font-medium">ALTITUDE</span>
        <strong className="text-[#2FE089] text-[9px] font-bold">{altVal}m</strong>
      </div>

      <div className="bg-[#080C14EE] border border-[#1E293B] backdrop-blur-md py-1 px-1 rounded-md shadow-md">
        <span className="text-[#94A3B8] text-[7px] block font-medium">SPEED</span>
        <strong className="text-[#35E0FF] text-[9px] font-bold">{spdVal}m/s</strong>
      </div>

      <div className="bg-[#080C14EE] border border-[#1E293B] backdrop-blur-md py-1 px-1 rounded-md shadow-md">
        <span className="text-[#94A3B8] text-[7px] block font-medium">CLIMB VSI</span>
        <strong
          className={`text-[9px] font-bold ${
            climbVal > 0
              ? "text-[#2FE089]"
              : climbVal < 0
              ? "text-[#FF8585]"
              : "text-[#F8FAFC]"
          }`}
        >
          {climbVal > 0 ? `+${climbVal.toFixed(1)}` : climbVal.toFixed(1)}
        </strong>
      </div>
    </div>
  );
});

/**
 * Floating HUD Flight Instruments (Attitude Indicator + Compass + Flight Telemetry)
 * 
 * Free-floating circular HUD instruments directly over the map with NO outer panel,
 * box, border, or card background.
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
}) => {
  const [instrumentSize, setInstrumentSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 74 : 88
  );

  useEffect(() => {
    const handleResize = () => {
      setInstrumentSize(window.innerWidth < 640 ? 74 : 88);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cardinal = getCardinalDirection(telemetry.heading);
  const headingText = `${String(Math.round(telemetry.heading)).padStart(3, "0")}° ${cardinal}`;

  return (
    <div
      className="absolute top-2 left-2 sm:top-3.5 sm:left-4 z-20 pointer-events-auto flex flex-col items-start select-none bg-transparent border-none shadow-none"
      style={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      {/* Two Standalone Floating Circular Instruments Side-by-Side */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* 1. ATTITUDE INDICATOR (ARTIFICIAL HORIZON) */}
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-mono font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded bg-[#080C14EE] border border-[#1E293B] shadow-sm">
            ATTITUDE
          </span>

          <div className="relative p-0.5 rounded-full bg-[#070A10EE] border border-[#1E293B] shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <AttitudeIndicator
              pitch={telemetry.pitch}
              roll={telemetry.roll}
              size={instrumentSize}
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-[#080C14EE] border border-[#1E293B] shadow-md font-mono text-[8.5px] sm:text-[9px] backdrop-blur-md">
            <span className="text-[#94A3B8]">
              P: <strong className={telemetry.pitch !== 0 ? "text-[#35E0FF]" : "text-[#F8FAFC]"}>
                {telemetry.pitch >= 0 ? `+${telemetry.pitch}` : telemetry.pitch}°
              </strong>
            </span>
            <span className="text-[#475569]">|</span>
            <span className="text-[#94A3B8]">
              R: <strong className={telemetry.roll !== 0 ? "text-[#35E0FF]" : "text-[#F8FAFC]"}>
                {telemetry.roll >= 0 ? `+${telemetry.roll}` : telemetry.roll}°
              </strong>
            </span>
          </div>
        </div>

        {/* 2. COMPASS INDICATOR */}
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-mono font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded bg-[#080C14EE] border border-[#1E293B] shadow-sm">
            COMPASS
          </span>

          <div className="relative flex items-center justify-center p-0.5 rounded-full bg-[#070A10EE] border border-[#1E293B] shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-sm">
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

          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-md bg-[#080C14EE] border border-[#1E293B] shadow-md font-mono text-[8.5px] sm:text-[9px] backdrop-blur-md">
            <Compass className="w-2.5 h-2.5 text-[#35E0FF] shrink-0" />
            <strong className="text-[#35E0FF]">{headingText}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightInstrumentsWidget;
