import React from "react";
import { Sliders, Gamepad2, Wifi, WifiOff, RefreshCw } from "lucide-react";
import {
  normalizeAxisToPercentage,
  rawAxisToPercentage,
  getBipolarFill,
  applyDeadzone,
} from "@/utils/axisCalculations.js";

export { normalizeAxisToPercentage, rawAxisToPercentage, getBipolarFill, applyDeadzone };

/**
 * Single Axis Indicator Bar
 * Features:
 * - Centered bipolar scale with 50% neutral midpoint
 * - Distinct center notch/marker at 50%
 * - Bipolar fill expanding left (low) or right (high) from 50%
 * - Distinct indicator knob sitting at exact percentage
 * - Low, Neutral, and High state badges
 * - High readability against dark theme
 */
export const AxisBar = ({
  id,
  label,
  rawVal,
  accentColor = "#38BDF8",
  gradientFrom = "#0284C7",
  gradientTo = "#38BDF8",
  lowLabel = "LOW",
  highLabel = "HIGH",
  isDisconnected = false,
}) => {
  const percentage = rawAxisToPercentage(rawVal);
  const displayPercentage = Math.round(percentage);

  // States: Low (< 48%), Neutral (48% - 52%), High (> 52%)
  const isNeutral = displayPercentage >= 48 && displayPercentage <= 52;
  const isLow = displayPercentage < 48;
  const isHigh = displayPercentage > 52;

  // Bipolar fill calculation: starts from 50% and expands left or right
  const fill = getBipolarFill(percentage);

  return (
    <div className="space-y-1.5" id={id} data-testid={id}>
      {/* Top row: Label, State Pill, and Numerical Percentage */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[#E2E8F0] tracking-wide text-[11px]">
            {label}
          </span>

          {/* Low / Neutral / High / Offline Badge */}
          {isDisconnected ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/30">
              OFFLINE
            </span>
          ) : isNeutral ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#1C2C42]/80 text-[#94A3B8] border border-[#334155]/60">
              NEUTRAL
            </span>
          ) : isLow ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#0369A1]/25 text-[#38BDF8] border border-[#0284C7]/40 flex items-center gap-0.5">
              <span>←</span> {lowLabel}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#047857]/25 text-[#34D399] border border-[#059669]/40 flex items-center gap-0.5">
              {highLabel} <span>→</span>
            </span>
          )}
        </div>

        {/* Numerical Percentage Value */}
        <div className="flex items-baseline gap-1 font-mono">
          <span
            className={`text-xs font-black transition-colors ${
              isDisconnected
                ? "text-[#64748B]"
                : isNeutral
                ? "text-white"
                : isLow
                ? "text-[#38BDF8]"
                : "text-[#34D399]"
            }`}
          >
            {isDisconnected ? "—" : `${displayPercentage}%`}
          </span>
        </div>
      </div>

      {/* Track & Indicator Bar Container */}
      <div className="relative pt-1 pb-1">
        {/* Horizontal Track */}
        <div className="relative h-2.5 w-full rounded-full bg-[#07111E] border border-[#1C2C42] shadow-inner overflow-hidden">
          {/* Subtle 25% and 75% tick marks */}
          <div className="absolute left-1/4 top-0 bottom-0 w-px bg-[#1C2C42]" />
          <div className="absolute left-3/4 top-0 bottom-0 w-px bg-[#1C2C42]" />

          {/* Bipolar Dynamic Fill Bar (originating from 50% midpoint) */}
          {!isDisconnected && fill.width !== "0%" && (
            <div
              className="absolute top-0 bottom-0 transition-[left,width] duration-75 rounded-full"
              style={{
                left: fill.left,
                width: fill.width,
                backgroundColor: accentColor,
                backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
                boxShadow: `0 0 8px ${accentColor}80`,
              }}
            />
          )}

          {/* Center 50% Divider Line inside track */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#64748B] -translate-x-1/2 z-10" />
        </div>

        {/* Distinct 50% Center Marker (extending slightly above/below track) */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 pointer-events-none z-20 flex flex-col justify-between items-center"
          style={{ height: "100%" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] -mt-0.5" />
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] -mb-0.5" />
        </div>

        {/* Positioned Indicator Knob / Needle */}
        {!isDisconnected && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-30 transition-all duration-75 flex flex-col items-center"
            style={{ left: `${percentage}%` }}
          >
            {/* Visual Indicator Pin */}
            <div
              className="w-2.5 h-4.5 rounded-xs bg-white border-2 shadow-[0_0_8px_rgba(255,255,255,0.8)] flex items-center justify-center"
              style={{ borderColor: accentColor }}
            >
              <div
                className="w-0.5 h-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>
        )}

        {/* Axis Scale Calibration Legend */}
        <div className="flex justify-between text-[8px] font-mono text-[#64748B] px-0.5 mt-0.5 select-none">
          <span>0%</span>
          <span className="text-[#94A3B8] font-bold">50% CTR</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

/**
 * AxesWidget
 * Dedicated widget displaying the four axes:
 * - LX — Yaw
 * - LY — Throttle
 * - RX — Roll
 * - RY — Pitch
 */
export const AxesWidget = ({
  axes = { lxYaw: 0, lyThrottle: 0, rxRoll: 0, ryPitch: 0 },
  controllerState = {
    type: "demo",
    connected: false,
    name: "Demo joystick",
    isManuallyDisconnected: false,
  },
  onToggleDisconnect,
  onCalibrate,
}) => {
  const isDisconnected = controllerState.isManuallyDisconnected;

  return (
    <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-3 shadow-sm">
      {/* Widget Header with Status and Actions */}
      <div className="flex items-center justify-between border-b border-[#1C2C42] pb-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
          <h3 className="text-xs font-bold text-white tracking-tight uppercase">
            Axes
          </h3>
        </div>

        {/* Source Badge & Disconnect Test Toggle */}
        <div className="flex items-center gap-1.5">
          {isDisconnected ? (
            <span className="flex items-center gap-1 text-[9.5px] text-[#EF4444] font-mono font-bold bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/30">
              <WifiOff className="w-3 h-3 text-[#EF4444]" />
              DISCONNECTED
            </span>
          ) : controllerState.type === "physical" && controllerState.connected ? (
            <span className="flex items-center gap-1 text-[9.5px] text-[#10B981] font-mono font-bold bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              PHYSICAL GAMEPAD
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9.5px] text-[#38BDF8] font-mono font-bold bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              DEMO JOYSTICK
            </span>
          )}

          {/* Test Disconnect / Reconnect Button */}
          {onToggleDisconnect && (
            <button
              type="button"
              onClick={onToggleDisconnect}
              title={isDisconnected ? "Reconnect controller input" : "Simulate controller disconnect"}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition cursor-pointer flex items-center gap-1 ${
                isDisconnected
                  ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 hover:bg-[#10B981]/30"
                  : "bg-[#1C2C42] text-[#94A3B8] border-[#334155] hover:text-white hover:bg-[#25364D]"
              }`}
            >
              {isDisconnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              <span>{isDisconnected ? "Reconnect" : "Disconnect"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Four Centered Bipolar Axis Bars */}
      <div className="space-y-2.5">
        {/* LX — Yaw */}
        <AxisBar
          id="axis-lx-yaw"
          label="LX — Yaw"
          rawVal={axes.lxYaw}
          accentColor="#38BDF8"
          gradientFrom="#0284C7"
          gradientTo="#38BDF8"
          lowLabel="LEFT"
          highLabel="RIGHT"
          isDisconnected={isDisconnected}
        />

        {/* LY — Throttle */}
        <AxisBar
          id="axis-ly-throttle"
          label="LY — Throttle"
          rawVal={axes.lyThrottle}
          accentColor="#10B981"
          gradientFrom="#059669"
          gradientTo="#10B981"
          lowLabel="DOWN"
          highLabel="UP"
          isDisconnected={isDisconnected}
        />

        {/* RX — Roll */}
        <AxisBar
          id="axis-rx-roll"
          label="RX — Roll"
          rawVal={axes.rxRoll}
          accentColor="#A855F7"
          gradientFrom="#7C3AED"
          gradientTo="#A855F7"
          lowLabel="LEFT"
          highLabel="RIGHT"
          isDisconnected={isDisconnected}
        />

        {/* RY — Pitch */}
        <AxisBar
          id="axis-ry-pitch"
          label="RY — Pitch"
          rawVal={axes.ryPitch}
          accentColor="#F59E0B"
          gradientFrom="#D97706"
          gradientTo="#F59E0B"
          lowLabel="BACK"
          highLabel="FWD"
          isDisconnected={isDisconnected}
        />
      </div>

      {/* Controller Calibration & Rates Info Footer */}
      <div className="flex items-center justify-between text-[9px] text-[#8E9EAA] pt-1.5 border-t border-[#1C2C42] font-mono">
        <span>Dead zone 6% · Expo 30% · Rates: normal</span>
        {onCalibrate && (
          <button
            type="button"
            onClick={onCalibrate}
            className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Calibrate</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AxesWidget;
