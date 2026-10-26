import { Info } from "lucide-react"
import { useBackendInfo } from "@/hooks/useBackendInfo.js"

/**
 * Global Info Console Header Button
 * 
 * Permanently displayed in the top header beside Emergency Deck.
 * Accessible to all authenticated users across all pages.
 */
export const GlobalInfoButton = () => {
  const { isOpen, toggleOpen, eventCount } = useBackendInfo()

  return (
    <div id="global-info-button-container" className="relative shrink-0 font-mono select-none">
      <button
        id="global-backend-info-btn"
        type="button"
        onClick={toggleOpen}
        className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide transition cursor-pointer select-none active:scale-95 ${
          isOpen
            ? "border-[#35E0FF] bg-[#10242B] text-[#B7F3FF] shadow-[0_0_12px_rgba(53,224,255,0.28)]"
            : "border-[#24424C] bg-[#101920] text-[#69DDF1] hover:border-[#35E0FF] hover:bg-[#14252C] hover:text-[#B7F3FF]"
        }`}
        title="Toggle backend information console (live events)"
        aria-label="Toggle backend information console"
        aria-expanded={isOpen}
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden xl:inline">INFO</span>
        {eventCount > 0 && (
          <span
            className="ml-0.5 inline-flex items-center justify-center rounded-full bg-[#183647] border border-[#2E586E] px-1.5 py-0.5 text-[9px] font-mono font-semibold text-[#35E0FF]"
            title={`${eventCount} captured backend events`}
          >
            {eventCount > 99 ? "99+" : eventCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default GlobalInfoButton
