import { useTelemetry } from "@/hooks/useTelemetry.js";

/**
 * Interactive ARM / UNARMED Flight Safety Control Button
 * 
 * Centralized flight-control switch in the AeroNexus header:
 * - When ARMED: red indicator, burgundy background, flight movement unlocked
 * - When UNARMED: neutral/gray indicator, dark background, flight movement completely locked
 */
export const ArmStatusButton = () => {
  const { isArmed, toggleArmed } = useTelemetry();

  return (
    <button
      type="button"
      onClick={toggleArmed}
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
