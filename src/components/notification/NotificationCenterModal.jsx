import { useState, useMemo, useEffect, useRef } from "react";
import { useNotification } from "@/hooks/useNotification.js";
import { AlertTypes } from "@/services/notification/alertService.js";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Trash2,
  X,
} from "lucide-react";

export const NotificationCenterModal = () => {
  const {
    history,
    isHistoryOpen,
    setIsHistoryOpen,
    markHistoryRead,
    clearHistory,
  } = useNotification();

  const [activeCategory, setActiveCategory] = useState("ALL");
  const modalRef = useRef(null);

  // Mark all as read when opening history
  useEffect(() => {
    if (isHistoryOpen) {
      markHistoryRead();
    }
  }, [isHistoryOpen, markHistoryRead]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsHistoryOpen(false);
    };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        // Only close if not clicking the bell trigger itself
        const bellBtn = e.target.closest?.("#notification-bell-btn");
        if (!bellBtn) {
          setIsHistoryOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isHistoryOpen, setIsHistoryOpen]);

  const categories = ["ALL", "FLIGHT", "MISSION", "TELEMETRY", "SECURITY", "SYSTEM"];

  const filteredHistory = useMemo(() => {
    if (activeCategory === "ALL") return history;
    return history.filter(
      (item) => String(item.category || "").toUpperCase() === activeCategory
    );
  }, [history, activeCategory]);

  if (!isHistoryOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case AlertTypes.SUCCESS:
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#2FE089]" />;
      case AlertTypes.WARNING:
        return <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case AlertTypes.ERROR:
        return <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />;
      case AlertTypes.DANGER:
        return <AlertOctagon className="w-3.5 h-3.5 text-[#FF4141]" />;
      case AlertTypes.INFO:
      default:
        return <Info className="w-3.5 h-3.5 text-[#35E0FF]" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      ref={modalRef}
      className="absolute top-[calc(100%+8px)] right-0 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] rounded-xl bg-[#080C14F8] border border-[#1A2633] shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-md z-50 flex flex-col font-mono text-white animate-in fade-in slide-in-from-top-2 overflow-hidden"
      role="dialog"
      aria-label="Notification Center"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A2633] bg-[#0C121A]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#35E0FF]" />
          <span className="text-xs font-bold tracking-wider uppercase text-[#E2E8F0]">
            Notification Center
          </span>
          <span className="text-[10px] bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF33] px-1.5 py-0.2 rounded font-bold">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#8E9EAA] hover:text-[#FF8585] hover:bg-[#251010] transition"
              title="Clear all notification history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsHistoryOpen(false)}
            className="p-1 text-[#8E9EAA] hover:text-white transition"
            aria-label="Close Notification Center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#16202C] bg-[#080C14] overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-[9.5px] font-bold px-2 py-1 rounded transition shrink-0 uppercase ${
                isActive
                  ? "bg-[#35E0FF22] text-[#35E0FF] border border-[#35E0FF55]"
                  : "text-[#64748B] hover:text-[#94A3B8] border border-transparent"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Alert Items List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-[#141C26] scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <div className="py-12 px-4 text-center text-[#64748B] text-xs">
            <Bell className="w-6 h-6 mx-auto mb-2 opacity-30 text-[#8E9EAA]" />
            <p>No notifications in this category.</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-3 hover:bg-[#0D1520] transition flex items-start gap-2.5 text-left"
            >
              <div className="p-1 rounded bg-[#101822] border border-[#1A2633] mt-0.5 shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-[#E2E8F0] truncate">
                    {item.title}
                  </span>
                  <span className="text-[9px] text-[#64748B] shrink-0 font-mono">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                <p className="text-[11px] text-[#8E9EAA] leading-snug mt-0.5 break-words">
                  {item.message}
                </p>

                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[8.5px] text-[#64748B] uppercase tracking-wider font-semibold">
                    {item.category || "System"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenterModal;
