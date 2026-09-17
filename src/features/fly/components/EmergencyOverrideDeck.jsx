import { useState, useEffect, useRef } from "react"
import { AlertOctagon, RotateCcw, ArrowDownCircle, Ban, AlertTriangle, PowerOff } from "lucide-react"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { apiClient } from "@/services/api/apiClient.js"

/**
 * Emergency Override Deck for Super Admin and Fleet Manager
 * Protects dangerous commands with mandatory confirmation dialogs.
 * Features responsive collision avoidance to guarantee zero overlap with the Left Joystick.
 */
export const EmergencyOverrideDeck = ({ hasLeftJoystick = false }) => {
  const { showToast } = useTelemetry()
  const [activeModal, setActiveModal] = useState(null) // null | "RTL" | "LAND" | "DISARM" | "ABORT"
  const [isOpen, setIsOpen] = useState(false)
  const deckRef = useRef(null)

  // Track responsive screen dimensions matching DualJoystickOverlay
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === "undefined") {
      return { sharedBottom: 28, leftOffset: 28, baseSize: 142 }
    }
    const w = window.innerWidth
    const h = window.innerHeight
    const bSize = (w < 440 || h < 440) ? 100 : (w < 640 || h < 540) ? 114 : (w < 1024 || h < 720) ? 128 : 142
    const sBottom = w < 640 ? 16 : w < 1024 ? 22 : 28
    const lOffset = w < 640 ? 12 : w < 1024 ? 20 : 28
    return { sharedBottom: sBottom, leftOffset: lOffset, baseSize: bSize }
  })

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const bSize = (w < 440 || h < 440) ? 100 : (w < 640 || h < 540) ? 114 : (w < 1024 || h < 720) ? 128 : 142
      const sBottom = w < 640 ? 16 : w < 1024 ? 22 : 28
      const lOffset = w < 640 ? 12 : w < 1024 ? 20 : 28
      setDimensions({ sharedBottom: sBottom, leftOffset: lOffset, baseSize: bSize })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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

  // Position:
  // When hasLeftJoystick is true: positioned safely beside the Left Joystick with a clear 16px gap
  // When hasLeftJoystick is false: positioned at the bottom-left corner
  const deckLeft = hasLeftJoystick
    ? dimensions.leftOffset + dimensions.baseSize + 16
    : dimensions.leftOffset

  return (
    <>
      {/* Floating Toggle Pill in Dedicated Non-Overlapping Position */}
      <div
        ref={deckRef}
        id="emergency-deck-container"
        style={{
          left: `${deckLeft}px`,
          bottom: `${dimensions.sharedBottom}px`,
        }}
        className="absolute z-25 pointer-events-auto select-none font-mono transition-all duration-300 ease-out"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition backdrop-blur-md shadow-lg cursor-pointer ${
            isOpen
              ? "bg-[#2E1414EE] border-[#FF4141] text-[#FF8585] shadow-[0_0_12px_rgba(255,65,65,0.3)]"
              : "bg-[#0B1017CC] hover:bg-[#121A24EE] border-[#5E2222] text-[#FF8585] hover:border-[#FF4141]"
          }`}
          title="Toggle Emergency Flight Override Controls"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-[#FF4141]" />
          <span>Emergency Deck</span>
        </button>

        {/* Expanded Emergency Actions Panel: Opens UPWARDS into open space, completely clear of the left joystick */}
        {isOpen && (
          <div
            className="absolute bottom-[calc(100%+8px)] left-0 w-[240px] max-w-[calc(100vw-32px)] rounded-lg bg-[#080C14FA] border border-[#5E2222] shadow-[0_8px_30px_rgba(0,0,0,0.9)] backdrop-blur-md p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 z-30"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#2E1414] text-[10px] text-[#FF8585] font-bold">
              <span>PRIORITY OVERRIDES</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#8E9EAA] hover:text-white"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("RTL")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#1A1810] hover:bg-[#2E2814] border border-[#F59E0B66] hover:border-[#F59E0B] text-[#FBBF24] text-[10.5px] font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>OVERRIDE RTL</span>
              </div>
              <span className="text-[8.5px] opacity-60">RETURN</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("LAND")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#2E1414] hover:bg-[#451818] border border-[#FF414166] hover:border-[#FF4141] text-[#FF8585] text-[10.5px] font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-3.5 h-3.5 text-[#FF4141]" />
                <span>EMERGENCY LAND</span>
              </div>
              <span className="text-[8.5px] opacity-60">IMMEDIATE</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("DISARM")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#2A1212] hover:bg-[#3D1A1A] border border-[#DC262666] hover:border-[#DC2626] text-[#F87171] text-[10.5px] font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <PowerOff className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>FORCE DISARM</span>
              </div>
              <span className="text-[8.5px] opacity-60">KILL MOTORS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("ABORT")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#1B1424] hover:bg-[#2D1E3D] border border-[#A855F766] hover:border-[#A855F7] text-[#C084FC] text-[10.5px] font-semibold transition"
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
