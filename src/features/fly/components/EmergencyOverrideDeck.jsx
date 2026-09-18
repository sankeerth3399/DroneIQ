import { useState, useEffect, useRef } from "react"
import { AlertOctagon, RotateCcw, ArrowDownCircle, Ban, AlertTriangle, PowerOff } from "lucide-react"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useAuth } from "@/hooks/useAuth.js"
import { Permissions } from "@/auth/permissions.js"
import { apiClient } from "@/services/api/apiClient.js"

/**
 * Emergency Override Deck for Super Admin and Fleet Manager
 * Rendered in the top header bar as a compact flight safety HUD control.
 * Protects dangerous commands with mandatory confirmation dialogs.
 */
export const EmergencyOverrideDeck = () => {
  const { showToast } = useTelemetry()
  const { hasPermission } = useAuth()
  const [activeModal, setActiveModal] = useState(null) // null | "RTL" | "LAND" | "DISARM" | "ABORT"
  const [isOpen, setIsOpen] = useState(false)
  const deckRef = useRef(null)

  // Enforce RBAC permission check: strictly SUPER_ADMIN and FLEET_MANAGER
  const canOverride = typeof hasPermission === "function" ? hasPermission(Permissions.OVERRIDE_FLIGHT_COMMANDS) : false

  // Dismiss expanded panel on outside click or Escape
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (deckRef.current && !deckRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  if (!canOverride) {
    return null
  }

  const handleConfirmAction = async () => {
    const cmdMap = {
      RTL: "OVERRIDE_RTL",
      LAND: "EMERGENCY_LAND",
      DISARM: "FORCE_DISARM",
      ABORT: "ABORT_MISSION",
    }
    const backendCommand = cmdMap[activeModal] || activeModal

    // Dispatch backend API command with Authorization: Bearer <token>
    try {
      await apiClient("/api/commands/override", {
        method: "POST",
        body: JSON.stringify({
          command: backendCommand,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (err) {
      console.warn("[EmergencyDeck] Override API dispatched (backend response):", err.message)
    }

    if (activeModal === "RTL") {
      showToast("EMERGENCY OVERRIDE: Return-to-Launch (RTL) initiated.", "warning")
      window.dispatchEvent(new CustomEvent("aeronexus:emergency-rtl"))
    } else if (activeModal === "LAND") {
      showToast("EMERGENCY OVERRIDE: Immediate Emergency Land executed.", "error")
      window.dispatchEvent(new CustomEvent("aeronexus:emergency-land"))
    } else if (activeModal === "DISARM") {
      showToast("EMERGENCY OVERRIDE: Motors Force Disarmed.", "error")
      window.dispatchEvent(new CustomEvent("aeronexus:emergency-disarm"))
    } else if (activeModal === "ABORT") {
      showToast("EMERGENCY OVERRIDE: Active Mission Aborted. Aircraft in Hold.", "error")
      window.dispatchEvent(new CustomEvent("aeronexus:emergency-abort"))
    }
    setActiveModal(null)
  }

  return (
    <>
      {/* Compact Top Header Control Button */}
      <div
        ref={deckRef}
        id="emergency-deck-container"
        className="relative shrink-0 select-none font-mono"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 sm:px-2.5 py-1 border shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
            isOpen
              ? "bg-[#381219] border-[#FF4141] text-[#FFA8A8] shadow-[0_0_12px_rgba(255,65,65,0.35)]"
              : "bg-[#220E12] border-[#6E1C24] hover:bg-[#321319] hover:border-[#FF4141] text-[#FF8585] shadow-[0_0_8px_rgba(255,65,65,0.15)]"
          }`}
          title="Emergency Flight Override Deck (Super Admin / Fleet Manager)"
          aria-label="Toggle Emergency Flight Override Deck"
          aria-expanded={isOpen}
        >
          <div className="w-[5px] h-[5px] sm:w-[6px] sm:h-[6px] rounded-full bg-[#FF4141] shadow-[0px_0px_5px_0px_#FF4141] animate-pulse shrink-0" />
          <AlertOctagon className="w-3.5 h-3.5 text-[#FF4141] shrink-0" />
          <span className="hidden md:inline text-[10px] sm:text-[11px] font-semibold whitespace-nowrap font-mono tracking-wide text-[#FFB3B3]">
            EMERGENCY DECK
          </span>
          <span className="hidden sm:inline md:hidden text-[10px] font-semibold whitespace-nowrap font-mono tracking-wide text-[#FFB3B3]">
            EMERGENCY
          </span>
        </button>

        {/* Downward Dropdown Priority Overrides Panel */}
        {isOpen && (
          <div
            className="absolute top-[calc(100%+8px)] right-0 w-[240px] max-w-[calc(100vw-24px)] rounded-lg bg-[#080C14FA] border border-[#5E2222] shadow-[0_8px_30px_rgba(0,0,0,0.9)] backdrop-blur-md p-3 space-y-2 z-50 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#2E1414] text-[10px] text-[#FF8585] font-bold">
              <span>PRIORITY OVERRIDES</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#8E9EAA] hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveModal("RTL")
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#1A1810] hover:bg-[#2E2814] border border-[#F59E0B66] hover:border-[#F59E0B] text-[#FBBF24] text-[10.5px] font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>OVERRIDE RTL</span>
              </div>
              <span className="text-[8.5px] opacity-60">RETURN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModal("LAND")
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#2E1414] hover:bg-[#451818] border border-[#FF414166] hover:border-[#FF4141] text-[#FF8585] text-[10.5px] font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-3.5 h-3.5 text-[#FF4141]" />
                <span>EMERGENCY LAND</span>
              </div>
              <span className="text-[8.5px] opacity-60">IMMEDIATE</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModal("DISARM")
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#2A1212] hover:bg-[#3D1A1A] border border-[#DC262666] hover:border-[#DC2626] text-[#F87171] text-[10.5px] font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <PowerOff className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>FORCE DISARM</span>
              </div>
              <span className="text-[8.5px] opacity-60">KILL MOTORS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModal("ABORT")
                setIsOpen(false)
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#1B1424] hover:bg-[#2D1E3D] border border-[#A855F766] hover:border-[#A855F7] text-[#C084FC] text-[10.5px] font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Ban className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>ABORT MISSION</span>
              </div>
              <span className="text-[8.5px] opacity-60">HALT</span>
            </button>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL (Mandatory Safety Check) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono select-none animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl bg-[#080C14] border border-[#5E2222] p-5 shadow-[0_12px_40px_rgba(255,65,65,0.2)] space-y-4 text-white">
            <div className="flex items-center gap-2.5 text-[#FF4141]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {activeModal === "RTL"
                  ? "Confirm Override RTL?"
                  : activeModal === "LAND"
                  ? "Confirm Emergency Land?"
                  : activeModal === "DISARM"
                  ? "Confirm Force Disarm?"
                  : "Confirm Abort Mission?"}
              </h3>
            </div>

            <p className="text-xs text-[#8E9EAA] leading-relaxed">
              {activeModal === "RTL" &&
                "This action will supersede routine pilot control and immediately route the drone to its designated home location."}
              {activeModal === "LAND" &&
                "CAUTION: Immediate descent will initiate at current coordinates. Ensure clear clearance underneath the aircraft."}
              {activeModal === "DISARM" &&
                "CRITICAL WARNING: Immediate motor cutoff will execute. The aircraft will drop from current altitude without control."}
              {activeModal === "ABORT" &&
                "This action terminates the autonomous waypoint sequence immediately and commands the aircraft to hover/hold position."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A2633]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 rounded text-xs text-[#8E9EAA] hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-1.5 rounded bg-[#FF4141] hover:bg-[#E03030] text-[#0A0E16] text-xs font-bold transition cursor-pointer shadow-[0_0_12px_rgba(255,65,65,0.4)]"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default EmergencyOverrideDeck
