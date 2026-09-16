import { useTelemetry } from "@/hooks/useTelemetry.js";
import { ShieldCheck, ShieldAlert, Info, X } from "lucide-react";

/**
 * Reusable HUD Toast Notification for Flight Safety & Drone State Alerts
 * 
 * Non-blocking, auto-dismissing notification banner floating over the application.
 */
export const FlightToast = () => {
  const { toast, clearToast } = useTelemetry();

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isWarning = toast.type === "warning" || toast.type === "error";

  const getIcon = () => {
    if (isSuccess) return <ShieldCheck className="w-4 h-4 text-[#2FE089]" />;
    if (isWarning) return <ShieldAlert className="w-4 h-4 text-[#FF4141]" />;
    return <Info className="w-4 h-4 text-[#35E0FF]" />;
  };

  return (
    <div
      className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2"
      role="alert"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-lg bg-[#080C14F2] border border-[#223240] shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md text-white font-mono select-none">
        <div
          className={`p-1 rounded border ${
            isSuccess
              ? "bg-[#0E281ECC] border-[#1D4A38]"
              : isWarning
              ? "bg-[#2E1414CC] border-[#5E2222]"
              : "bg-[#142232CC] border-[#203C54]"
          }`}
        >
          {getIcon()}
        </div>

        <div className="flex flex-col text-left">
          <span
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isSuccess
                ? "text-[#2FE089]"
                : isWarning
                ? "text-[#FF8585]"
                : "text-[#35E0FF]"
            }`}
          >
            {isSuccess ? "Flight Safety" : isWarning ? "Flight Warning" : "Notification"}
          </span>
          <span className="text-[11.5px] sm:text-[12.5px] font-medium text-[#EEF4F8]">
            {toast.message}
          </span>
        </div>

        <button
          type="button"
          onClick={clearToast}
          className="ml-2 p-1 text-[#64748B] hover:text-[#EEF4F8] transition"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default FlightToast;
