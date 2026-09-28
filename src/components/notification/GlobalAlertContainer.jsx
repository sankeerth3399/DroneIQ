import { useNotification } from "@/hooks/useNotification.js";
import { AlertTypes } from "@/services/notification/alertService.js";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

/**
 * Universal Global Alert Container for DroneIQ GCS / AeroNexus.
 * Displays floating, stacked, responsive notifications at top-right below the header.
 * Non-blocking, keyboard/touch dismissible, with accessible announcements.
 */
export const GlobalAlertContainer = () => {
  const { alerts, dismissAlert } = useNotification();

  if (!alerts || alerts.length === 0) return null;

  const getAlertStyles = (type) => {
    switch (type) {
      case AlertTypes.SUCCESS:
        return {
          border: "border-[#2FE08955] hover:border-[#2FE089]",
          iconBg: "bg-[#0E281ECC] border-[#1D4A38]",
          tagColor: "text-[#2FE089]",
          tagBg: "bg-[#2FE0891A] border-[#2FE08940]",
          titleColor: "text-[#2FE089]",
          icon: <CheckCircle2 className="w-4 h-4 text-[#2FE089]" />,
          label: "SUCCESS",
        };
      case AlertTypes.WARNING:
        return {
          border: "border-[#F59E0B55] hover:border-[#F59E0B]",
          iconBg: "bg-[#2E2010CC] border-[#5A3E16]",
          tagColor: "text-[#FBBF24]",
          tagBg: "bg-[#F59E0B1A] border-[#F59E0B40]",
          titleColor: "text-[#FBBF24]",
          icon: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
          label: "WARNING",
        };
      case AlertTypes.ERROR:
        return {
          border: "border-[#EF444466] hover:border-[#EF4444]",
          iconBg: "bg-[#2E1414CC] border-[#5E2222]",
          tagColor: "text-[#FF8585]",
          tagBg: "bg-[#EF44441A] border-[#EF444440]",
          titleColor: "text-[#FF8585]",
          icon: <AlertCircle className="w-4 h-4 text-[#EF4444]" />,
          label: "ERROR",
        };
      case AlertTypes.DANGER:
        return {
          border: "border-[#DC2626] shadow-[0_0_20px_rgba(220,38,38,0.35)]",
          iconBg: "bg-[#381219] border-[#FF4141] animate-pulse",
          tagColor: "text-[#FF4141]",
          tagBg: "bg-[#DC26262A] border-[#DC262660]",
          titleColor: "text-[#FFB3B3]",
          icon: <AlertOctagon className="w-4 h-4 text-[#FF4141]" />,
          label: "CRITICAL",
        };
      case AlertTypes.LOADING:
        return {
          border: "border-[#35E0FF55]",
          iconBg: "bg-[#142232CC] border-[#203C54]",
          tagColor: "text-[#35E0FF]",
          tagBg: "bg-[#35E0FF1A] border-[#35E0FF40]",
          titleColor: "text-[#35E0FF]",
          icon: <Loader2 className="w-4 h-4 text-[#35E0FF] animate-spin" />,
          label: "PROCESSING",
        };
      case AlertTypes.INFO:
      default:
        return {
          border: "border-[#35E0FF55] hover:border-[#35E0FF]",
          iconBg: "bg-[#142232CC] border-[#203C54]",
          tagColor: "text-[#35E0FF]",
          tagBg: "bg-[#35E0FF1A] border-[#35E0FF40]",
          titleColor: "text-[#35E0FF]",
          icon: <Info className="w-4 h-4 text-[#35E0FF]" />,
          label: "INFO",
        };
    }
  };

  return (
    <div
      className="fixed top-14 sm:top-16 right-3 sm:right-6 z-50 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-[380px] w-full pointer-events-none"
      aria-label="Alerts"
    >
      {alerts.map((alert) => {
        const styles = getAlertStyles(alert.type);
        const isAssertive = alert.type === AlertTypes.ERROR || alert.type === AlertTypes.DANGER;

        return (
          <div
            key={alert.id}
            role="alert"
            aria-live={isAssertive ? "assertive" : "polite"}
            aria-atomic="true"
            className={`pointer-events-auto rounded-xl border bg-[#080C14F2] shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-md p-3 sm:p-3.5 font-mono text-white transition-all duration-300 animate-in slide-in-from-top-2 fade-in select-none ${styles.border}`}
          >
            <div className="flex items-start gap-2.5">
              {/* Icon Container */}
              <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${styles.iconBg}`}>
                {styles.icon}
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 flex flex-col text-left">
                <div className="flex items-center justify-between gap-2 pb-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${styles.tagBg} ${styles.tagColor}`}>
                      {styles.label}
                    </span>
                    {alert.category && (
                      <span className="text-[9px] text-[#64748B] uppercase tracking-wider font-semibold truncate">
                        ● {alert.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`text-xs sm:text-[13px] font-bold leading-snug mt-0.5 truncate ${styles.titleColor}`}>
                  {alert.title}
                </div>

                {alert.message && (
                  <div className="text-[11px] sm:text-xs text-[#94A3B8] leading-relaxed mt-0.5 break-words">
                    {alert.message}
                  </div>
                )}

                {/* Optional Custom Action Button */}
                {alert.action && (
                  <div className="mt-2 pt-1 border-t border-[#1E293B]">
                    <button
                      type="button"
                      onClick={() => {
                        alert.action.onClick?.();
                        dismissAlert(alert.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#35E0FF] hover:text-white transition uppercase"
                    >
                      <span>{alert.action.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismissAlert(alert.id)}
                className="p-1 rounded text-[#64748B] hover:text-[#EEF4F8] hover:bg-[#1E293B55] transition shrink-0 ml-1"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GlobalAlertContainer;
