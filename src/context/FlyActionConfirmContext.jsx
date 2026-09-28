import { useState, useCallback, useRef } from "react";
import { FlyActionConfirmContext } from "./flyActionConfirmContextCore.js";
import { FLY_ACTION_CONFIG } from "@/features/fly/constants/flyActionConfig.js";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { useTelemetry } from "@/hooks/useTelemetry.js";
import { ConnectionState } from "@/services/telemetry/telemetryTypes.js";

export const FlyActionConfirmProvider = ({ children }) => {
  const { hasPermission } = useAuth();
  const { showToast, selectedDroneId, telemetry, connectionState, isLive } = useTelemetry();

  // Dialog state
  const [dialogState, setDialogState] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const executingRef = useRef(false);

  /**
   * Request confirmation for a discrete operational action.
   * 
   * Strict safety workflow:
   * 1. Check user authorization / RBAC. If denied, trigger notification and abort without opening dialog.
   * 2. Populate confirmation details from centralized FLY_ACTION_CONFIG + call-site overrides.
   * 3. Display modal with focused Cancel button.
   * 4. Upon explicit user confirmation, re-validate current drone & connection state.
   * 5. Dispatch command API exactly once.
   */
  const requestActionConfirmation = useCallback(
    (options = {}) => {
      if (!options || typeof options !== "object") return;

      const actionKey = options.action || "";
      const baseConfig = FLY_ACTION_CONFIG[actionKey] || {};
      const activeDroneId = options.droneId || selectedDroneId || telemetry?.droneId || "DRONE-001";

      // Strict DroneIQ Confirmation Policy (Section 1 & 24)
      // ONLY the following 6 actions require confirmation:
      // 1. ARM
      // 2. DISARM
      // 3. TAKEOFF
      // 4. LAND
      // 5. START MISSION
      // 6. GUIDED DROPDOWN / FLIGHT-MODE OPTIONS
      const CONFIRMATION_ACTIONS = new Set([
        "ARM",
        "DISARM",
        "FORCE_DISARM",
        "TAKEOFF",
        "LAND",
        "EMERGENCY_LAND",
        "START_MISSION",
        "START MISSION",
        "FLIGHT_MODE_CHANGE",
      ]);

      // All other actions execute normally without confirmation and without action notification (Section 14 & 26)
      if (!CONFIRMATION_ACTIONS.has(actionKey)) {
        if (typeof options.onConfirm === "function") {
          try {
            const res = options.onConfirm();
            if (res && typeof res.catch === "function") {
              res.catch((err) => {
                console.error(`[FlyConfirmation] Immediate ${actionKey} execution error:`, err);
              });
            }
          } catch (err) {
            console.error(`[FlyConfirmation] Immediate ${actionKey} execution error:`, err);
          }
        }
        return;
      }

      // 1. Initial Permission Check (Preserve RBAC per Section 21)
      const requiredPerm = options.requiredPermission || baseConfig.requiredPermission;
      if (requiredPerm && typeof hasPermission === "function" && !hasPermission(requiredPerm)) {
        const actionTitle = options.title || baseConfig.title || actionKey;
        showToast(`Access Denied: You do not have permission to execute "${actionTitle}".`, "warning");
        return;
      }

      // 2. Custom permission validator if supplied
      if (typeof options.validatePermissions === "function" && !options.validatePermissions()) {
        return;
      }

      // Compute display strings
      let resolvedMessage = options.message;
      if (!resolvedMessage && typeof baseConfig.message === "function") {
        resolvedMessage = baseConfig.message(activeDroneId);
      } else if (!resolvedMessage) {
        resolvedMessage = baseConfig.message || "Are you sure you want to proceed with this operation?";
      }

      let resolvedWarning = options.warning;
      if (!resolvedWarning && typeof baseConfig.warning === "function") {
        resolvedWarning = baseConfig.warning(options.currentState);
      } else if (!resolvedWarning) {
        resolvedWarning = baseConfig.warning || null;
      }

      const title = options.title || baseConfig.title || "Confirm Action";
      const severity = options.severity || baseConfig.severity || "warning";
      const confirmLabel = options.confirmLabel || baseConfig.confirmLabel;
      const cancelLabel = options.cancelLabel || baseConfig.cancelLabel || "Cancel";
      const targetAltitude = options.targetAltitude || baseConfig.targetAltitude || null;

      setDialogState({
        action: actionKey,
        title,
        message: resolvedMessage,
        warning: resolvedWarning,
        severity,
        confirmLabel,
        cancelLabel,
        droneId: activeDroneId,
        currentState: options.currentState,
        currentMode: options.currentMode,
        newMode: options.newMode,
        targetAltitude,
        missionId: options.missionId,
        missionName: options.missionName,
        validateState: options.validateState,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    },
    [hasPermission, selectedDroneId, telemetry, showToast]
  );

  /**
   * Cancel and close dialog with NO command dispatched.
   */
  const handleCancel = useCallback(() => {
    if (executingRef.current) return;
    if (dialogState?.onCancel) {
      try {
        dialogState.onCancel();
      } catch (err) {
        console.error("[FlyConfirmation] Error in onCancel callback:", err);
      }
    }
    setDialogState(null);
  }, [dialogState]);

  /**
   * Re-validate current drone state if hook provided, then execute command exactly once.
   * Section 16: System events / background connection must NOT block flight actions on frontend.
   */
  const handleConfirm = useCallback(async () => {
    if (!dialogState || executingRef.current) return;

    executingRef.current = true;
    setIsExecuting(true);

    try {
      // 1. Custom state revalidation hook if explicitly provided (e.g. already in mode)
      if (typeof dialogState.validateState === "function") {
        const validationResult = await dialogState.validateState();
        if (validationResult === false || (typeof validationResult === "string" && validationResult)) {
          const reason = typeof validationResult === "string" ? validationResult : "Current vehicle state does not permit this action.";
          showToast(`Action cancelled: ${reason}`, "warning");
          setDialogState(null);
          return;
        }
      }

      // 2. Execute authoritative command
      if (typeof dialogState.onConfirm === "function") {
        await dialogState.onConfirm();
      }
    } catch (err) {
      console.error("[FlyConfirmation] Command execution error:", err);
    } finally {
      executingRef.current = false;
      setIsExecuting(false);
      setDialogState(null);
    }
  }, [dialogState, showToast]);

  return (
    <FlyActionConfirmContext.Provider
      value={{
        requestActionConfirmation,
        isConfirmOpen: Boolean(dialogState),
        activeAction: dialogState?.action || null,
        cancelConfirmation: handleCancel,
      }}
    >
      {children}

      {/* Centralized High-Z-Index Confirmation Modal */}
      {dialogState && (
        <ConfirmActionDialog
          open={Boolean(dialogState)}
          action={dialogState.action}
          title={dialogState.title}
          message={dialogState.message}
          warning={dialogState.warning}
          severity={dialogState.severity}
          confirmLabel={dialogState.confirmLabel}
          cancelLabel={dialogState.cancelLabel}
          droneId={dialogState.droneId}
          currentState={dialogState.currentState}
          currentMode={dialogState.currentMode}
          newMode={dialogState.newMode}
          targetAltitude={dialogState.targetAltitude}
          missionId={dialogState.missionId}
          missionName={dialogState.missionName}
          loading={isExecuting}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </FlyActionConfirmContext.Provider>
  );
};

export default FlyActionConfirmProvider;
