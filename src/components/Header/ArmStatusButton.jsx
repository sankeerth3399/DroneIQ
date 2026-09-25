import { useTelemetry } from "@/hooks/useTelemetry.js";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { useFlyConfirmation } from "@/hooks/useFlyConfirmation.js";
import { Lock } from "lucide-react";

/**
 * Interactive ARM / UNARMED Flight Safety Control Button with RBAC & Mandatory Confirmation
 * 
 * - When permitted (SUPER_ADMIN, FLIGHT_OPERATOR):
 *   Requests explicit user confirmation (Confirm ARM / Confirm DISARM) before executing command.
 * - When restricted (FLEET_MANAGER, VIEWER):
 *   Inhibited with lock indicator and explanation tooltip.
 */
export const ArmStatusButton = () => {
  const { isArmed, toggleArmed, showToast, selectedDroneId, telemetry } = useTelemetry();
  const { hasPermission } = useAuth();
  const { requestActionConfirmation } = useFlyConfirmation();

  const canExecuteFlight = hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS);
  const activeDroneId = selectedDroneId || telemetry?.droneId || "DRONE-001";

  const handleActionRequest = () => {
    if (!canExecuteFlight) {
      if (typeof showToast === "function") {
        showToast("ARM/DISARM inhibited: Requires Flight Operator or Super Admin role.", "warning");
      }
      return;
    }

    const nextAction = isArmed ? "DISARM" : "ARM";

    requestActionConfirmation({
      action: nextAction,
      droneId: activeDroneId,
      currentState: isArmed ? "ARMED" : "UNARMED",
      validateState: () => {
        if (nextAction === "ARM" && isArmed) {
          return "Drone is already armed.";
        }
        if (nextAction === "DISARM" && !isArmed) {
          return "Drone is already disarmed.";
        }
        return true;
      },
      onConfirm: async () => {
        toggleArmed("USER");
      },
    });
  };

  if (!canExecuteFlight) {
    return (
      <button
        type="button"
        onClick={handleActionRequest}
        className="inline-flex items-center gap-1.5 rounded-[4px] px-2 sm:px-2.5 py-1 border shrink-0 transition-all cursor-not-allowed select-none bg-[#161B22] border-[#2E3842] opacity-70"
        title="ARM/DISARM Inhibited — Flight command permissions required"
        aria-label="ARM/DISARM Inhibited for active role"
      >
        <Lock className="w-3 h-3 text-[#8E9EAA]" />
        <span className="text-[10px] sm:text-[11px] font-semibold whitespace-nowrap font-mono tracking-wide text-[#8E9EAA]">
          {isArmed ? "ARMED (LOCKED)" : "UNARMED"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleActionRequest}
      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 sm:px-2.5 py-1 border shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
        isArmed
          ? "bg-[#5C1F1F] border-[#7A2B2B] hover:bg-[#6E2525] hover:border-[#943434] shadow-[0_0_8px_rgba(255,65,65,0.2)]"
          : "bg-[#1B2836] border-[#2A3E52] hover:bg-[#223344] hover:border-[#3E556E]"
      }`}
      title={isArmed ? "Vehicle is ARMED — Click to DISARM" : "Vehicle is UNARMED — Click to ARM"}
      aria-label={isArmed ? "Vehicle is Armed, click to disarm" : "Vehicle is Unarmed, click to arm"}
    >
      <div
        className={`w-[6px] h-[6px] rounded-full shrink-0 transition-colors ${
          isArmed
            ? "bg-[#FF4141] shadow-[0px_0px_5px_0px_#FF4141]"
            : "bg-[#8E9EAA]"
        }`}
      />
      <span
        className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap font-mono tracking-wide ${
          isArmed ? "text-[#FFB3B3]" : "text-[#8E9EAA]"
        }`}
      >
        {isArmed ? "ARMED" : "UNARMED"}
      </span>
    </button>
  );
};

export default ArmStatusButton;
