import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * ClearMissionModal
 * Confirms clearing all mission waypoints/items.
 */
export default function ClearMissionModal({ isOpen, onClose, onConfirm, itemCount = 0 }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06090EAA] backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md rounded-2xl bg-[#080C14] border border-[#1A2633] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#151D28] transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[#FF47571A] border border-[#FF475733] text-[#FF4757] shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-[#EEF4F8] font-sans">
              Clear Entire Mission?
            </h3>
            <p className="mt-2 text-xs font-mono text-[#8E9EAA] leading-relaxed">
              This will remove all <span className="text-[#FF4757] font-semibold">{itemCount}</span> waypoint{itemCount !== 1 ? "s" : ""} and route segments from the mission plan.
            </p>
            <p className="mt-1 text-[11px] font-mono text-[#5D707C]">
              Tip: You can use the Undo button (<span className="text-[#35E0FF]">Ctrl+Z</span>) if you clear by mistake.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#8E9EAA] bg-[#0E1520] border border-[#1A2633] hover:bg-[#151D28] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF4757] hover:bg-[#FF2E44] shadow-[0_0_15px_rgba(255,71,87,0.4)] transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Mission</span>
          </button>
        </div>
      </div>
    </div>
  );
}
