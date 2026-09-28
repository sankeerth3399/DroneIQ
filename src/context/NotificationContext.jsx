import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { NotificationContext } from "./notificationContextCore.js";
import {
  AlertTypes,
  AlertCategories,
  DEFAULT_ALERT_DURATIONS,
  registerAlertListener,
} from "@/services/notification/alertService.js";

const HISTORY_STORAGE_KEY = "aeronexus_alert_history";
const MAX_VISIBLE_ALERTS = 4;
const MAX_HISTORY_ITEMS = 50;

export const NotificationProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Timers mapped by alert ID
  const timersRef = useRef(new Map());
  // Recent alert fingerprints for debounce: Map of "key:type:message" -> timestamp
  const recentAlertsRef = useRef(new Map());

  // Save history to storage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
    } catch {
      // Safe ignore storage write errors
    }
  }, [history]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  /**
   * Dismiss an active visible alert by ID or Key
   */
  const dismissAlert = useCallback((idOrKey) => {
    if (!idOrKey) return;
    setAlerts((prev) => {
      const target = prev.find((a) => a.id === idOrKey || a.key === idOrKey);
      if (target) {
        const timer = timersRef.current.get(target.id);
        if (timer) {
          clearTimeout(timer);
          timersRef.current.delete(target.id);
        }
        return prev.filter((a) => a.id !== target.id);
      }
      return prev;
    });
  }, []);

  /**
   * Clear all active visible alerts
   */
  const clearAllAlerts = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setAlerts([]);
  }, []);

  /**
   * Schedule auto-dismiss timer for an alert
   */
  const scheduleAutoDismiss = useCallback(
    (id, duration) => {
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id));
        timersRef.current.delete(id);
      }
      if (typeof duration === "number" && duration > 0) {
        const timer = setTimeout(() => {
          dismissAlert(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismissAlert]
  );

  /**
   * Core internal add/update alert handler
   */
  const handleAlert = useCallback(
    (alertPayload) => {
      if (!alertPayload || !alertPayload.message) return;

      const now = Date.now();
      const alertKey = alertPayload.key || null;
      const type = alertPayload.type || AlertTypes.INFO;
      const fingerprint = `${alertKey || ""}:${type}:${alertPayload.message}`;

      // Deduplication check: if identical message triggered within last 1200ms, suppress duplicate
      const lastTriggered = recentAlertsRef.current.get(fingerprint);
      if (lastTriggered && now - lastTriggered < 1200 && !alertKey) {
        return;
      }
      recentAlertsRef.current.set(fingerprint, now);

      // Clean up stale fingerprints (older than 10s)
      if (recentAlertsRef.current.size > 100) {
        for (const [k, ts] of recentAlertsRef.current.entries()) {
          if (now - ts > 10000) {
            recentAlertsRef.current.delete(k);
          }
        }
      }

      const id = alertPayload.id || `alert-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const duration =
        typeof alertPayload.duration === "number"
          ? alertPayload.duration
          : DEFAULT_ALERT_DURATIONS[type] ?? 4000;

      const newAlertItem = {
        id,
        key: alertKey,
        type,
        title: alertPayload.title,
        message: alertPayload.message,
        category: alertPayload.category || AlertCategories.SYSTEM,
        duration,
        timestamp: alertPayload.timestamp || new Date().toISOString(),
        action: alertPayload.action || null,
        read: false,
      };

      setAlerts((prev) => {
        // If an alert with the same key is already visible, update it in place!
        // This is crucial for:
        // 1. Loading state transitions (e.g. Loading -> Success / Failure)
        // 2. Continuous telemetry/connection states (Offline -> Online)
        if (alertKey) {
          const existingIndex = prev.findIndex((a) => a.key === alertKey);
          if (existingIndex !== -1) {
            const existingId = prev[existingIndex].id;
            scheduleAutoDismiss(existingId, duration);

            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...newAlertItem,
              id: existingId, // preserve same ID
            };
            return updated;
          }
        }

        // Otherwise append new alert, enforcing visible alert limit
        scheduleAutoDismiss(id, duration);
        const next = [...prev, newAlertItem];
        if (next.length > MAX_VISIBLE_ALERTS) {
          const removed = next.shift();
          if (removed && timersRef.current.has(removed.id)) {
            clearTimeout(timersRef.current.get(removed.id));
            timersRef.current.delete(removed.id);
          }
        }
        return next;
      });

      // Add to notification history (skip loading states in permanent history)
      if (type !== AlertTypes.LOADING) {
        setHistory((prev) => {
          const next = [newAlertItem, ...prev.filter((item) => item.key !== alertKey || !alertKey)];
          return next.slice(0, MAX_HISTORY_ITEMS);
        });
      }

      return id;
    },
    [scheduleAutoDismiss]
  );

  // Wire up alertService listener and DOM event listeners
  useEffect(() => {
    const unsubService = registerAlertListener(handleAlert);

    const onAlertEvent = (e) => {
      if (e.detail) handleAlert(e.detail);
    };

    const onToastEvent = (e) => {
      if (e.detail?.message) {
        handleAlert({
          message: e.detail.message,
          type: e.detail.type || AlertTypes.INFO,
          title: e.detail.title || (
            e.detail.type === "success" ? "Success" :
            e.detail.type === "warning" ? "Warning" :
            e.detail.type === "error" ? "Error" : "Notification"
          ),
        });
      }
    };

    const onDismissEvent = (e) => {
      if (e.detail?.idOrKey) {
        dismissAlert(e.detail.idOrKey);
      }
    };

    const onClearEvent = () => {
      clearAllAlerts();
    };

    window.addEventListener("aeronexus:alert", onAlertEvent);
    window.addEventListener("aeronexus:toast", onToastEvent);
    window.addEventListener("aeronexus:dismiss-alert", onDismissEvent);
    window.addEventListener("aeronexus:clear-alerts", onClearEvent);

    return () => {
      unsubService();
      window.removeEventListener("aeronexus:alert", onAlertEvent);
      window.removeEventListener("aeronexus:toast", onToastEvent);
      window.removeEventListener("aeronexus:dismiss-alert", onDismissEvent);
      window.removeEventListener("aeronexus:clear-alerts", onClearEvent);
    };
  }, [handleAlert, dismissAlert, clearAllAlerts]);

  /**
   * Public showAlert method
   */
  const showAlert = useCallback(
    (options) => {
      if (typeof options === "string") {
        return handleAlert({ message: options, type: AlertTypes.INFO });
      }
      return handleAlert(options);
    },
    [handleAlert]
  );

  /**
   * Public showToast adapter
   */
  const showToast = useCallback(
    (message, type = "info", title = null) => {
      return handleAlert({
        message,
        type,
        title: title || (type === "success" ? "Success" : type === "error" ? "Error" : "Notification"),
      });
    },
    [handleAlert]
  );

  /**
   * History Management
   */
  const markHistoryRead = useCallback(() => {
    setHistory((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Safe ignore
    }
  }, []);

  const unreadCount = useMemo(() => {
    return history.filter((item) => !item.read).length;
  }, [history]);

  const value = useMemo(
    () => ({
      alerts,
      history,
      unreadCount,
      showAlert,
      showToast,
      dismissAlert,
      clearAllAlerts,
      isHistoryOpen,
      setIsHistoryOpen,
      markHistoryRead,
      clearHistory,
    }),
    [
      alerts,
      history,
      unreadCount,
      showAlert,
      showToast,
      dismissAlert,
      clearAllAlerts,
      isHistoryOpen,
      markHistoryRead,
      clearHistory,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
