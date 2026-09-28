import { useContext } from "react";
import { NotificationContext } from "@/context/notificationContextCore.js";
import { alertService } from "@/services/notification/alertService.js";

/**
 * Universal hook to access the centralized notification system.
 * If used outside NotificationProvider, falls back gracefully to global alertService.
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      alerts: [],
      history: [],
      unreadCount: 0,
      showAlert: alertService.show,
      showToast: alertService.toast,
      dismissAlert: alertService.dismiss,
      clearAllAlerts: alertService.clearAll,
      isHistoryOpen: false,
      setIsHistoryOpen: () => {},
      markHistoryRead: () => {},
      clearHistory: () => {},
    };
  }
  return context;
};

export default useNotification;
