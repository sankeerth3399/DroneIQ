import { memo } from "react";
import Live from "@/features/mession/components/live.jsx";
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
 * CameraPreview: Video stream viewport with shutter flash and FPV crosshairs
 */
export const CameraPreview = ({
  isFpv = false,
  isDroneFlashing = false,
  showExpandHint = false,
}) => (
  <div className="relative h-full w-full overflow-hidden">
    <Live />

    {/* Shutter flash effect */}
    {isDroneFlashing && (
      <div className="absolute inset-0 z-40 bg-white/90 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
    )}

    {/* FPV Crosshair / Gimbal Grid Overlay */}
    {isFpv && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
        <div className="w-16 h-16 border border-[#35E0FF4D] rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#35E0FF] rounded-full" />
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

const getPipClass = (isFpv) =>
  `absolute right-2 top-2 sm:right-4 sm:top-4 z-20 flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27B2] shadow-2xl backdrop-blur-md transition-all duration-300 ${
    isFpv
      ? "h-[195px] w-[250px] sm:h-[245px] sm:w-[320px] md:h-[295px] md:w-[390px]"
      : "h-[124px] w-[155px] sm:h-[156px] sm:w-[205px] md:h-[188px] md:w-[245px]"
  }`;

const fullClass = "absolute inset-0 z-0 overflow-hidden";

/**
 * CameraWidget: Composed QGC-style camera feed, tabs, and action capture banner
 */
export const CameraWidget = memo(function CameraWidget({
  mapIsLarge = true,
  onToggleLarge,
  camSelected = "main",
  onChangeCam,
  telemetry,
  onCaptureToast,
  onTriggerDroneFlash,
  onTriggerScreenFlash,
  isDroneFlashing = false,
}) {
  const isFpv = camSelected === "fpv";

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
          </>
        )}
      </div>

      {/* 2. Docked Mini Controls when Camera Feed is Full Screen */}
      {!mapIsLarge && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27E6] shadow-2xl backdrop-blur-md w-[185px] sm:w-[230px]">
          <CameraTabs value={camSelected} onChange={onChangeCam} />
          <CameraCaptureBanner
            telemetry={telemetry}
            onCaptureToast={onCaptureToast}
            onTriggerDroneFlash={onTriggerDroneFlash}
            onTriggerScreenFlash={onTriggerScreenFlash}
          />
        </div>
      )}
    </>
  );
});

export default CameraWidget;
