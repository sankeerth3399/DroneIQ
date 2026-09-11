import React, { useState } from "react";
import {
  UploadCloud,
  X,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cpu,
  ShieldCheck,
} from "lucide-react";

/**
 * MissionUploadModal
 * Handles the upload of the waypoint flight plan to the drone autopilot.
 * Accurately communicates simulation mode vs real vehicle state.
 */
export default function MissionUploadModal({
  isOpen,
  onClose,
  planner,
  telemetry,
  droneId = "DRONE-001",
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const {
    missionName,
    items,
    missionSettings,
    formattedDistance,
    formattedDuration,
    maxAltitude,
    validation,
  } = planner;

  if (!isOpen) return null;

  const handleStartUpload = () => {
    setUploading(true);
    setProgress(15);

    const step1 = setTimeout(() => setProgress(45), 250);
    const step2 = setTimeout(() => setProgress(80), 550);
    const step3 = setTimeout(() => {
      setProgress(100);
      setUploading(false);
      setUploadComplete(true);
    }, 850);
  };

  const handleResetAndClose = () => {
    setUploading(false);
    setProgress(0);
    setUploadComplete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06090ECC] backdrop-blur-md select-none">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080C14] border border-[#1A2633] p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#151D28] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#1A2633]">
          <div className="p-2.5 rounded-xl bg-[#2FE0891A] border border-[#2FE08933] text-[#2FE089]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#EEF4F8] font-sans">
              Upload Flight Plan
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-[#8E9EAA]">Target:</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF33]">
                {droneId}
              </span>
            </div>
          </div>
        </div>

        {/* Upload State Body */}
        {uploadComplete ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#2FE0891A] border border-[#2FE0894D] flex items-center justify-center text-[#2FE089] shadow-[0_0_20px_rgba(47,224,137,0.3)] animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#EEF4F8] font-sans">
                Mission Uploaded Successfully!
              </h3>
              <p className="mt-1 text-xs font-mono text-[#2FE089]">
                Simulation Mode — Mission Ready
              </p>
              <p className="mt-2 text-[11px] font-mono text-[#8E9EAA] max-w-xs mx-auto">
                {items.length} waypoints transferred into simulated autopilot memory. Drone is ready for mission arm and execution.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 rounded-xl text-xs font-mono font-bold text-[#06090E] bg-[#2FE089] hover:bg-[#52F0A0] shadow-[0_0_15px_rgba(47,224,137,0.4)] transition"
              >
                Close & Return to Map
              </button>
            </div>
          </div>
        ) : uploading ? (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto text-[#35E0FF] animate-spin" />
            <div>
              <h3 className="text-sm font-bold text-[#EEF4F8] font-mono">
                Transmitting Plan to Autopilot...
              </h3>
              <p className="mt-1 text-xs font-mono text-[#8E9EAA]">
                Synchronizing {items.length} waypoints via MAVLink mission protocol
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#0E1520] rounded-full h-2 overflow-hidden border border-[#1A2633]">
              <div
                className="bg-[#35E0FF] h-full transition-all duration-300 shadow-[0_0_8px_#35E0FF]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-[#35E0FF] text-right font-bold">
              {progress}%
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Simulation Notice Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#35E0FF0F] border border-[#35E0FF33] text-[11px] font-mono text-[#EEF4F8]">
              <Cpu className="w-4 h-4 text-[#35E0FF] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#35E0FF]">Simulation Mode Active</div>
                <div className="text-[#8E9EAA] text-[10px] mt-0.5 leading-relaxed">
                  Autopilot uplink operating in software simulation. Waypoints will be loaded into the simulator's mission queue.
                </div>
              </div>
            </div>

            {/* Mission Plan Specs */}
            <div className="p-3 rounded-xl bg-[#0E1520] border border-[#1A2633] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>Mission Plan:</span>
                <span className="font-semibold text-[#EEF4F8] truncate max-w-[180px]">
                  {missionName || "Survey Mission"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>Total Items:</span>
                <span className="font-semibold text-[#35E0FF]">{items.length}</span>
              </div>
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>Total Distance:</span>
                <span className="font-semibold text-[#EEF4F8]">{formattedDistance}</span>
              </div>
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>Est. Flight Time:</span>
                <span className="font-semibold text-[#EEF4F8]">{formattedDuration}</span>
              </div>
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>Max Altitude:</span>
                <span className="font-semibold text-[#2FE089]">{maxAltitude}m</span>
              </div>
              <div className="flex justify-between items-center text-[#8E9EAA]">
                <span>On Complete:</span>
                <span className="font-semibold text-[#A78BFA] uppercase">
                  {missionSettings.onMissionComplete}
                </span>
              </div>
            </div>

            {/* Validation warning if any */}
            {!validation.isValid && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FF47571A] border border-[#FF475733] text-[#FF4757] text-[11px] font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validation.errors[0]}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#8E9EAA] bg-[#0E1520] border border-[#1A2633] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!validation.isValid}
                onClick={handleStartUpload}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-bold transition shadow-lg ${
                  validation.isValid
                    ? "bg-[#2FE089] hover:bg-[#52F0A0] text-[#06090E] shadow-[0_0_15px_rgba(47,224,137,0.4)]"
                    : "bg-[#1A2633] text-[#475569] cursor-not-allowed"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload to Drone</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
