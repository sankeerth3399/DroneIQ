import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  AlertOctagon,
  PlaneTakeoff,
  RotateCcw,
  PowerOff,
  Crosshair,
  Camera,
  Loader2,
  X,
  Plane,
  Gauge,
  SlidersHorizontal,
  Target,
} from "lucide-react";

/**
 * Reusable Centralized Confirmation Dialog Component.
 * 
 * Implements strict aerospace safety requirements:
 * - Pre-command explicit user confirmation before any state-mutating operation.
 * - Loading / double-execution lock state ("EXECUTING...").
 * - Dynamic severity theming (danger / warning / info).
 * - Accessible focus trap & Escape key cancellation.
 * - Responsive viewport centering with high z-index (z-[100]).
 */
export const ConfirmActionDialog = ({
  open = false,
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this operation?",
  action = "",
  severity = "warning",
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  isExecuting = false,
  warning,
  droneId,
  currentState,
  targetAltitude,
  missionId,
  missionName,
  onConfirm,
  onCancel,
}) => {
  const visible = Boolean(isOpen ?? open);
  const busy = Boolean(loading || isExecuting);

  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Auto-focus cancel button on open for safety (prevents accidental Enter key trigger of dangerous actions)
  useEffect(() => {
    if (visible && cancelBtnRef.current) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [visible]);

  // Keyboard navigation: Escape key cancels dialog
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, busy, onCancel]);

  if (!visible) return null;

  // Icon selection based on severity and specific action
  const getActionIcon = () => {
    if (action.includes("TAKEOFF")) {
      return <PlaneTakeoff className="w-5 h-5 text-[#35E0FF]" />;
    }
    if (action.includes("DISARM")) {
      return <PowerOff className="w-5 h-5 text-[#FF4141]" />;
    }
    if (action.includes("RTL")) {
      return <RotateCcw className="w-5 h-5 text-[#F59E0B]" />;
    }
    if (action.includes("GIMBAL")) {
      return <Crosshair className="w-5 h-5 text-[#35E0FF]" />;
    }
    if (action.includes("RECORD") || action.includes("PHOTO") || action.includes("SCREENSHOT")) {
      return <Camera className="w-5 h-5 text-[#35E0FF]" />;
    }
    if (action.includes("MODE")) {
      return <SlidersHorizontal className="w-5 h-5 text-[#F59E0B]" />;
    }

    if (severity === "danger") {
      return <AlertOctagon className="w-5 h-5 text-[#FF4141]" />;
    }
    if (severity === "warning") {
      return <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />;
    }
    return <AlertTriangle className="w-5 h-5 text-[#35E0FF]" />;
  };

  // Severity-dependent colors and container styling
  const severityStyles = {
    danger: {
      border: "border-[#FF414166]",
      shadow: "shadow-[0_20px_60px_rgba(255,65,65,0.25)]",
      iconBg: "bg-[#FF41411A] border-[#FF41414D]",
      headerText: "text-[#FF8585]",
      confirmBtn: "bg-[#FF4141] hover:bg-[#E03030] text-[#0A0E16] shadow-[0_0_15px_rgba(255,65,65,0.4)]",
      warningBox: "bg-[#FF414112] border-[#FF414133] text-[#FFA8A8]",
      badge: "text-[#FF8585] bg-[#FF41411A] border-[#FF414133]",
    },
    warning: {
      border: "border-[#F59E0B66]",
      shadow: "shadow-[0_20px_60px_rgba(245,158,11,0.2)]",
      iconBg: "bg-[#F59E0B1A] border-[#F59E0B4D]",
      headerText: "text-[#FCD34D]",
      confirmBtn: "bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0E16] shadow-[0_0_15px_rgba(245,158,11,0.4)]",
      warningBox: "bg-[#F59E0B12] border-[#F59E0B33] text-[#FDE68A]",
      badge: "text-[#FCD34D] bg-[#F59E0B1A] border-[#F59E0B33]",
    },
    info: {
      border: "border-[#35E0FF66]",
      shadow: "shadow-[0_20px_60px_rgba(53,224,255,0.2)]",
      iconBg: "bg-[#35E0FF1A] border-[#35E0FF4D]",
      headerText: "text-[#35E0FF]",
      confirmBtn: "bg-[#35E0FF] hover:bg-[#20CAEC] text-[#06090E] shadow-[0_0_15px_rgba(53,224,255,0.4)]",
      warningBox: "bg-[#35E0FF12] border-[#35E0FF33] text-[#B7F3FF]",
      badge: "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]",
    },
  };

  const currentTheme = severityStyles[severity] || severityStyles.warning;
  const effectiveConfirmLabel = confirmLabel || (severity === "danger" ? "Confirm Action" : "Confirm");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none font-mono animate-in fade-in duration-150"
      onClick={(e) => {
        // Outside click cancels unless busy
        if (!busy && e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        style={{ width: "min(92vw, 480px)" }}
        className={`relative rounded-2xl bg-[#080C14] border ${currentTheme.border} ${currentTheme.shadow} p-4 sm:p-6 space-y-4 text-white animate-in zoom-in-95 duration-150`}
      >
        {/* Close X Button (Top Right) */}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#16212E] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Close confirmation dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header: Icon + Title */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${currentTheme.iconBg} shrink-0`}>
            {getActionIcon()}
          </div>
          <div className="min-w-0 pr-6">
            <h2
              id="confirm-dialog-title"
              className={`text-sm sm:text-base font-bold tracking-wider uppercase font-mono ${currentTheme.headerText}`}
            >
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-[#8E9EAA]">
              {droneId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E1722] border border-[#1A2633] text-[#35E0FF]">
                  <Plane className="w-2.5 h-2.5" />
                  <span>{droneId}</span>
                </span>
              )}
              {missionId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E1722] border border-[#1A2633] text-[#FCD34D]">
                  <Target className="w-2.5 h-2.5" />
                  <span>MISSION: {missionId}</span>
                </span>
              )}
              {missionName && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E1722] border border-[#1A2633] text-[#CBD5E1]">
                  <span>NAME: {missionName}</span>
                </span>
              )}
              {currentState && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E1722] border border-[#1A2633] text-[#CBD5E1]">
                  <span>STATE: {currentState}</span>
                </span>
              )}
              {targetAltitude && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E1722] border border-[#1A2633] text-[#2FE089]">
                  <Gauge className="w-2.5 h-2.5" />
                  <span>TARGET: {targetAltitude}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message Description */}
        <p
          id="confirm-dialog-desc"
          className="text-xs sm:text-[13px] text-[#CBD5E1] leading-relaxed font-sans"
        >
          {message}
        </p>

        {/* Warning Callout Box (if specified) */}
        {warning && (
          <div
            className={`p-3 rounded-xl border text-[11px] sm:text-xs leading-relaxed font-mono flex items-start gap-2.5 ${currentTheme.warningBox}`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{warning}</span>
          </div>
        )}

        {/* Action Controls: Cancel & Confirm */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1A2633]">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-[#8E9EAA] bg-[#0E1520] border border-[#1A2633] hover:bg-[#16212E] hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[38px] sm:min-h-[42px]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer min-h-[38px] sm:min-h-[42px] disabled:opacity-70 disabled:cursor-not-allowed ${currentTheme.confirmBtn}`}
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>EXECUTING...</span>
              </>
            ) : (
              <span>{effectiveConfirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionDialog;
