import { memo } from "react";
import { RotateCcw, RotateCw, Crosshair } from "lucide-react";
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx";
import CameraCaptureBanner from "./CameraCaptureBanner.jsx";

const cameraOptions = [
  { id: "main", label: "Main Cam" },
  { id: "fpv", label: "FPV Cam" },
];

const toggleBtn = (active) =>
  `text-[8px] sm:text-[8.5px] font-mono font-semibold rounded-[4px] px-2 sm:px-2.5 py-0.5 transition ${
    active
      ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.2)]"
      : "text-[#5D707C] hover:text-[#94A3B8]"
  }`;

/**
 * CameraTabs: Sub-component for switching between Main Cam and FPV Cam
 */
export const CameraTabs = ({ value, onChange }) => (
  <div
    className="flex h-[22px] sm:h-[25px] shrink-0 items-center justify-center gap-1 sm:gap-1.5 bg-[#0A0E12F2] border-t border-[#1C2834]"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    {cameraOptions.map((opt) => (
      <button
        key={opt.id}
        type="button"
        className={toggleBtn(value === opt.id)}
        onClick={() => onChange(opt.id)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

/**
 * CameraPreview: Video stream viewport with shutter flash and optional FPV crosshairs
 */
export const CameraPreview = ({
  isFpv = false,
  isDroneFlashing = false,
  showExpandHint = false,
  gimbalState = { pitch: 0, roll: 0, yaw: 0 },
  droneId = "DRONE-001",
  camSelected = "main",
}) => {
  const pitchOffset = Math.max(-24, Math.min(24, (gimbalState?.pitch || 0) * 0.35));
  const rollAngle = gimbalState?.roll || 0;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05080C]">
      {/* Live Video Feed with subtle gimbal horizon / pitch stabilization tilt */}
      <div
        className="h-full w-full will-change-transform transition-transform duration-100 ease-out"
        style={{
          transform: `scale(1.06) rotate(${-rollAngle * 0.7}deg) translateY(${pitchOffset}px)`,
        }}
      >
        <LiveDroneFeed droneId={droneId} cameraType={camSelected} />
      </div>

      {/* Shutter flash effect */}
      {isDroneFlashing && (
        <div className="absolute inset-0 z-40 bg-white/90 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
      )}

      {/* FPV Crosshair / Gimbal Grid Overlay */}
      {isFpv && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-70 will-change-transform transition-transform duration-100 ease-out"
          style={{
            transform: `rotate(${-rollAngle}deg) translateY(${pitchOffset}px)`,
          }}
        >
          {/* Pitch / Horizon line */}
          <div className="absolute w-24 h-[1px] bg-[#35E0FF44]" />
          <div className="w-16 h-16 border border-[#35E0FF55] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(53,224,255,0.15)]">
            <div className="w-1.5 h-1.5 bg-[#35E0FF] rounded-full shadow-[0_0_4px_#35E0FF]" />
          </div>
        </div>
      )}

      {/* Hover hint on PiP */}
      {showExpandHint && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black/30 transition group">
          <span className="opacity-0 group-hover:opacity-100 bg-[#080C14D9] text-[#35E0FF] text-[10px] font-mono px-2 py-1 rounded border border-[#35E0FF4D] transition">
            Click to Expand Camera
          </span>
        </div>
      )}
    </div>
  );
};

const getPipClass = (isFpv) =>
  `absolute right-2 top-2 sm:right-4 sm:top-4 z-20 flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27B2] shadow-2xl backdrop-blur-md transition-all duration-300 ${
    isFpv
      ? "h-[250px] w-[250px] sm:h-[305px] sm:w-[320px] md:h-[355px] md:w-[380px]"
      : "h-[190px] w-[185px] sm:h-[225px] sm:w-[220px] md:h-[255px] md:w-[250px]"
  }`;

const fullClass = "absolute inset-0 z-0 overflow-hidden";

/**
 * Integrated Gimbal Roll & Center Control Row
 */
const GimbalRollAndCenterControls = ({
  formatRoll,
  onNudgeRoll,
  onSetRoll,
  onCenterGimbal,
}) => (
  <div
    className="flex flex-col w-full shrink-0 select-none"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    {/* Roll Control Strip */}
    <div className="flex min-h-[24px] sm:min-h-[26px] w-full items-center justify-between px-2 py-0.5 bg-[#070A0FF8] border-t border-[#182330] text-[8.5px] sm:text-[9px] font-mono">
      <div className="flex items-center gap-1">
        <span className="text-[#64748B] font-semibold text-[8px] sm:text-[8.5px]">ROLL</span>
        <strong className="text-[#2FE089] font-bold">{formatRoll}</strong>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNudgeRoll?.(-5);
          }}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#0D1520] border border-[#1E293B] text-[#8E9EAA] hover:text-white hover:border-[#35E0FF66] active:scale-95 transition cursor-pointer"
          title="Roll CCW (-5°)"
          aria-label="Roll counter-clockwise 5 degrees"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>-5°</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetRoll?.(0);
          }}
          className="px-1.5 py-0.5 rounded font-bold text-[#2FE089] bg-[#2FE08914] border border-[#2FE0894D] hover:bg-[#2FE0892E] active:scale-95 transition cursor-pointer"
          title="Level Roll (0°)"
          aria-label="Reset roll to 0 degrees"
        >
          0°
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNudgeRoll?.(5);
          }}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#0D1520] border border-[#1E293B] text-[#8E9EAA] hover:text-white hover:border-[#35E0FF66] active:scale-95 transition cursor-pointer"
          title="Roll CW (+5°)"
          aria-label="Roll clockwise 5 degrees"
        >
          <RotateCw className="w-2.5 h-2.5" />
          <span>+5°</span>
        </button>
      </div>
    </div>

    {/* Gimbal Center Action */}
    <div className="w-full bg-[#070A0FF8] border-t border-[#182330] p-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCenterGimbal?.();
        }}
        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] hover:bg-[#35E0FF2E] hover:border-[#35E0FF] font-mono text-[8.5px] sm:text-[9.5px] font-bold shadow-[0_0_8px_rgba(53,224,255,0.15)] transition active:scale-[0.98] cursor-pointer"
        title="Align Gimbal Forward with Drone Heading (Pitch 0°, Roll 0°, Yaw = Drone Heading)"
      >
        <Crosshair className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#35E0FF]" />
        <span>GIMBAL CENTER</span>
      </button>
    </div>
  </div>
);

/**
 * CameraWidget: Composed QGC-style camera feed, tabs, capture banner, and integrated Gimbal Roll & Center
 */
export const CameraWidget = memo(function CameraWidget({
  mapIsLarge = true,
  onToggleLarge,
  camSelected = "main",
  onChangeCam,
  telemetry,
  gimbalState = { pitch: 0, roll: 0, yaw: 0 },
  onSetRoll,
  onNudgeRoll,
  onCenterGimbal,
  onCaptureToast,
  onTriggerDroneFlash,
  onTriggerScreenFlash,
  isDroneFlashing = false,
  droneId,
}) {
  const effectiveDroneId = droneId || telemetry?.droneId || "DRONE-001";
  const isFpv = camSelected === "fpv";
  const currentRoll = gimbalState?.roll ?? telemetry?.gimbal?.roll ?? 0;
  const formatRoll = `${currentRoll >= 0 ? "+" : ""}${Number(currentRoll).toFixed(1)}°`;

  return (
    <>
      {/* 1. Main Feed (PiP in top-right when Map is Large, or Full-Screen when Map is Small) */}
      <div
        id="drone-live-feed"
        className={mapIsLarge ? getPipClass(isFpv) : fullClass}
        onClick={mapIsLarge ? onToggleLarge : undefined}
        role={mapIsLarge ? "button" : undefined}
        tabIndex={mapIsLarge ? 0 : undefined}
        onKeyDown={
          mapIsLarge
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleLarge?.();
                }
              }
            : undefined
        }
      >
        <div className={`relative ${mapIsLarge ? "min-h-0 flex-1" : "h-full w-full"}`}>
          <CameraPreview
            isFpv={isFpv}
            isDroneFlashing={isDroneFlashing}
            showExpandHint={mapIsLarge}
            gimbalState={gimbalState || telemetry?.gimbal}
            droneId={effectiveDroneId}
            camSelected={camSelected}
          />
        </div>

        {mapIsLarge && (
          <>
            <CameraTabs value={camSelected} onChange={onChangeCam} />
            <CameraCaptureBanner
              telemetry={telemetry}
              onCaptureToast={onCaptureToast}
              onTriggerDroneFlash={onTriggerDroneFlash}
              onTriggerScreenFlash={onTriggerScreenFlash}
            />
            <GimbalRollAndCenterControls
              formatRoll={formatRoll}
              onNudgeRoll={onNudgeRoll}
              onSetRoll={onSetRoll}
              onCenterGimbal={onCenterGimbal}
            />
          </>
        )}
      </div>

      {/* 2. Docked Mini Controls when Camera Feed is Full Screen */}
      {!mapIsLarge && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27E6] shadow-2xl backdrop-blur-md w-[190px] sm:w-[235px]">
          <CameraTabs value={camSelected} onChange={onChangeCam} />
          <CameraCaptureBanner
            telemetry={telemetry}
            onCaptureToast={onCaptureToast}
            onTriggerDroneFlash={onTriggerDroneFlash}
            onTriggerScreenFlash={onTriggerScreenFlash}
          />
          <GimbalRollAndCenterControls
            formatRoll={formatRoll}
            onNudgeRoll={onNudgeRoll}
            onSetRoll={onSetRoll}
            onCenterGimbal={onCenterGimbal}
          />
        </div>
      )}
    </>
  );
});

export default CameraWidget;
