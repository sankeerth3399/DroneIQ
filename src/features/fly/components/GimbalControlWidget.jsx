import { useState, useRef } from "react";
import {
  Camera,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
} from "lucide-react";
import { DraggableWidget } from "@/features/mession/components/widgets/DraggableWidget.jsx";
import { AttitudeIndicator } from "@/features/mession/components/instruments/AttitudeIndicator.jsx";
import { getCardinalDirection } from "@/utils/heading.js";

/**
 * QGroundControl-Inspired Gimbal Control HUD Widget
 * 
 * Features:
 * - Real-time gimbal telemetry (Pitch, Roll, Yaw)
 * - Mini artificial horizon representing camera gimbal pitch and roll
 * - Interactive 2-axis control pad (Pitch: vertical, Yaw: horizontal)
 * - Discrete nudge buttons for precision fine-tuning
 * - Roll adjustments (⟲ -5°, ⟳ +5°, 0° level reset)
 * - Quick pitch presets (0° Forward, -90° Nadir / Straight Down, +45° Up)
 * - Smooth Gimbal Center action (realigns camera forward with vehicle heading)
 * - Draggable positioning with localStorage persistence and collapse to mini pill
 */
export default function GimbalControlWidget({
  gimbalState = { pitch: 0, roll: 0, yaw: 0 },
  setGimbalPitch,
  setGimbalRoll,
  setGimbalYaw,
  setGimbalOrientation,
  centerGimbal,
  droneHeading = 0,
}) {
  const padRef = useRef(null);
  const [isDraggingPad, setIsDraggingPad] = useState(false);
  const dragOriginRef = useRef({ startX: 0, startY: 0, startPitch: 0, startYaw: 0 });

  const cardinal = getCardinalDirection(gimbalState.yaw);

  // Format angles with sign and 1 decimal place
  const formatPitch = `${gimbalState.pitch >= 0 ? "+" : ""}${gimbalState.pitch.toFixed(1)}°`;
  const formatRoll = `${gimbalState.roll >= 0 ? "+" : ""}${gimbalState.roll.toFixed(1)}°`;
  const formatYaw = `${String(Math.round(gimbalState.yaw)).padStart(3, "0")}.0°`;

  // Discrete nudge actions
  const nudgePitch = (delta) => {
    setGimbalPitch?.(gimbalState.pitch + delta);
  };

  const nudgeYaw = (delta) => {
    setGimbalYaw?.(gimbalState.yaw + delta);
  };

  const nudgeRoll = (delta) => {
    setGimbalRoll?.(gimbalState.roll + delta);
  };

  // Center button: returns gimbal to 0° pitch, 0° roll, and aligns yaw with drone heading
  const handleCenter = () => {
    centerGimbal?.(droneHeading);
  };

  // Interactive 2-axis touchpad pointer handling
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDraggingPad(true);
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPitch: gimbalState.pitch,
      startYaw: gimbalState.yaw,
    };

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragOriginRef.current.startX;
      const dy = moveEvent.clientY - dragOriginRef.current.startY;

      // Sensitivity: 0.8 degrees per pixel
      // Moving up (negative dy) increases pitch (looking up)
      // Moving right (positive dx) increases yaw (panning right)
      const nextPitch = dragOriginRef.current.startPitch - dy * 0.75;
      const nextYaw = dragOriginRef.current.startYaw + dx * 0.75;

      setGimbalOrientation?.({
        pitch: nextPitch,
        yaw: nextYaw,
      });
    };

    const handlePointerUp = () => {
      setIsDraggingPad(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  // Minimized single-line HUD representation
  const minimizedPill = (
    <div className="flex items-center gap-2 text-[9.5px] font-mono text-[#EEF4F8]">
      <span>
        P: <strong className="text-[#35E0FF]">{formatPitch}</strong>
      </span>
      <span className="text-[#334155]">|</span>
      <span>
        R: <strong className="text-[#2FE089]">{formatRoll}</strong>
      </span>
      <span className="text-[#334155]">|</span>
      <span>
        Y: <strong className="text-[#A78BFA]">{formatYaw}</strong>
      </span>
    </div>
  );

  return (
    <DraggableWidget
      id="gimbal"
      title="GIMBAL"
      icon={Camera}
      badge="CAM"
      badgeColor="text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]"
      defaultPosition={{ x: 16, y: 195 }}
      minimizedContent={minimizedPill}
      className="w-[172px] sm:w-[185px]"
    >
      <div className="flex flex-col gap-2 p-1 text-xs select-none">
        {/* 1. Telemetry Readouts & Mini Attitude Indicator */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#0C121DF2] border border-[#1C2834]">
          {/* Numerical Values */}
          <div className="flex flex-col gap-1 font-mono text-[9.5px] leading-tight flex-1">
            <div className="flex items-center justify-between text-[#8E9EAA]">
              <span>PITCH</span>
              <strong className="text-[#35E0FF] font-semibold">{formatPitch}</strong>
            </div>
            <div className="flex items-center justify-between text-[#8E9EAA]">
              <span>ROLL</span>
              <strong className="text-[#2FE089] font-semibold">{formatRoll}</strong>
            </div>
            <div className="flex items-center justify-between text-[#8E9EAA]">
              <span>YAW</span>
              <strong className="text-[#A78BFA] font-semibold">
                {formatYaw} <span className="text-[8px] text-[#64748B]">{cardinal}</span>
              </strong>
            </div>
          </div>

          {/* Mini Gimbal Attitude Horizon */}
          <div className="relative shrink-0 flex flex-col items-center justify-center p-0.5 rounded-full border border-[#1E293B] bg-[#070A10] shadow-inner">
            <AttitudeIndicator
              pitch={gimbalState.pitch}
              roll={gimbalState.roll}
              size={48}
            />
          </div>
        </div>

        {/* 2. Interactive 2-Axis Gimbal Control Pad */}
        <div className="relative flex flex-col items-center justify-center p-1 rounded-lg bg-[#0B1017] border border-[#16212E]">
          {/* Up Pitch Button */}
          <button
            type="button"
            onClick={() => nudgePitch(5)}
            className="p-1 text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#1E293B] rounded transition"
            title="Pitch Up (+5°)"
            aria-label="Pitch Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Middle Row: Left Yaw, Center Touchpad, Right Yaw */}
          <div className="flex items-center justify-between w-full px-1">
            <button
              type="button"
              onClick={() => nudgeYaw(-5)}
              className="p-1 text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#1E293B] rounded transition"
              title="Yaw Left (-5°)"
              aria-label="Yaw Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Circular Touch / Drag Pad */}
            <div
              ref={padRef}
              onPointerDown={handlePointerDown}
              className={`relative w-16 h-16 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
                isDraggingPad
                  ? "border-[#35E0FF] bg-[#35E0FF1A] shadow-[0_0_12px_rgba(53,224,255,0.3)]"
                  : "border-[#1E293B] bg-[#070D15] hover:border-[#35E0FF88]"
              }`}
              title="Drag to Pitch & Pan Gimbal"
            >
              {/* Concentric Crosshairs */}
              <div className="absolute inset-2 rounded-full border border-dashed border-[#1E293B] pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-[#1E293B] pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-[#1E293B] pointer-events-none" />

              {/* Center Thumb Knob */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-transform ${
                  isDraggingPad
                    ? "bg-[#35E0FF] shadow-[0_0_8px_#35E0FF]"
                    : "bg-[#1E293B] text-[#8E9EAA]"
                }`}
              >
                <Crosshair className={`w-2.5 h-2.5 ${isDraggingPad ? "text-[#06090E]" : "text-[#35E0FF]"}`} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => nudgeYaw(5)}
              className="p-1 text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#1E293B] rounded transition"
              title="Yaw Right (+5°)"
              aria-label="Yaw Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Down Pitch Button */}
          <button
            type="button"
            onClick={() => nudgePitch(-5)}
            className="p-1 text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#1E293B] rounded transition"
            title="Pitch Down (-5°)"
            aria-label="Pitch Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Roll Trim / Nudge Controls */}
        <div className="flex items-center justify-between px-1 py-1 rounded bg-[#090D14] border border-[#16212E] text-[9px] font-mono">
          <span className="text-[#64748B] text-[8.5px] uppercase">ROLL</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudgeRoll(-5)}
              className="p-1 rounded text-[#8E9EAA] hover:text-white hover:bg-[#1E293B] transition"
              title="Roll CCW (-5°)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => setGimbalRoll?.(0)}
              className="px-1 py-0.5 rounded text-[8px] font-bold text-[#2FE089] hover:bg-[#2FE0891A] border border-[#2FE08933] transition"
              title="Level Roll to 0°"
            >
              0°
            </button>
            <button
              type="button"
              onClick={() => nudgeRoll(5)}
              className="p-1 rounded text-[#8E9EAA] hover:text-white hover:bg-[#1E293B] transition"
              title="Roll CW (+5°)"
            >
              <RotateCw className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 4. Quick Pitch Presets & Center Action */}
        <div className="grid grid-cols-3 gap-1 text-[8.5px] font-mono font-semibold">
          <button
            type="button"
            onClick={() => setGimbalPitch?.(0)}
            className={`py-1 px-0.5 rounded text-center border transition ${
              Math.abs(gimbalState.pitch) < 0.5
                ? "bg-[#35E0FF22] border-[#35E0FF66] text-[#35E0FF]"
                : "bg-[#0E1520] border-[#1C2834] text-[#8E9EAA] hover:text-white"
            }`}
            title="Set Pitch to 0° (Forward Level)"
          >
            0° FWD
          </button>
          <button
            type="button"
            onClick={() => setGimbalPitch?.(-90)}
            className={`py-1 px-0.5 rounded text-center border transition ${
              Math.abs(gimbalState.pitch - -90) < 0.5
                ? "bg-[#35E0FF22] border-[#35E0FF66] text-[#35E0FF]"
                : "bg-[#0E1520] border-[#1C2834] text-[#8E9EAA] hover:text-white"
            }`}
            title="Set Pitch to -90° (Nadir / Down)"
          >
            -90° NADIR
          </button>
          <button
            type="button"
            onClick={() => setGimbalPitch?.(45)}
            className={`py-1 px-0.5 rounded text-center border transition ${
              Math.abs(gimbalState.pitch - 45) < 0.5
                ? "bg-[#35E0FF22] border-[#35E0FF66] text-[#35E0FF]"
                : "bg-[#0E1520] border-[#1C2834] text-[#8E9EAA] hover:text-white"
            }`}
            title="Set Pitch to +45° (Sky / Tilt Up)"
          >
            +45° UP
          </button>
        </div>

        {/* 5. Prominent Center Gimbal Action */}
        <button
          type="button"
          onClick={handleCenter}
          className="flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] hover:bg-[#35E0FF2E] font-mono text-[9.5px] font-bold shadow-[0_0_8px_rgba(53,224,255,0.2)] transition active:scale-[0.98]"
          title="Align Gimbal Forward with Drone Heading (Pitch 0°, Roll 0°, Yaw = Drone Heading)"
        >
          <Crosshair className="w-3 h-3 text-[#35E0FF]" />
          <span>GIMBAL CENTER</span>
        </button>
      </div>
    </DraggableWidget>
  );
}
