import { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, Check, ShieldAlert } from "lucide-react"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useAuth } from "@/hooks/useAuth.js"
import { Permissions } from "@/auth/permissions.js"
import { FLIGHT_MODES, getFlightModeLabel } from "../constants/flightModes.js"
import { DEFAULT_FLIGHT_MODE } from "@/services/telemetry/telemetryTypes.js"

/**
 * Functional Flight Mode Dropdown for AeroNexus Top Telemetry Bar
 */
export const FlightModeDropdown = () => {
  const { flightMode, setFlightMode, handleFlightModeChange, showToast } = useTelemetry()
  const { hasPermission } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const canChangeMode = typeof hasPermission === "function"
    ? hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS) || hasPermission(Permissions.OVERRIDE_FLIGHT_COMMANDS)
    : false

  // Determine current active mode from canonical context
  const activeModeId = useMemo(() => {
    const raw = flightMode || DEFAULT_FLIGHT_MODE
    return String(raw).toUpperCase().replace(/\s+/g, "_")
  }, [flightMode])

  const activeModeLabel = getFlightModeLabel(activeModeId)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

  const handleSelectMode = (mode) => {
    if (!canChangeMode) {
      if (typeof showToast === "function") {
        showToast("Flight mode change inhibited: Viewer role is read-only.", "warning")
      }
      setIsOpen(false)
      return
    }

    if (typeof handleFlightModeChange === "function") {
      handleFlightModeChange(mode.id, "USER")
    } else if (typeof setFlightMode === "function") {
      setFlightMode(mode.id)
    }
    setIsOpen(false)
  }

  // Visual status color for the indicator dot based on mode category
  const getDotColor = () => {
    if (activeModeId === "RTL" || activeModeId === "LAND") {
      return "bg-[#F59E0B] shadow-[0px_0px_6px_0px_#F59E0B]" // Warning amber
    }
    if (activeModeId === "BRAKE") {
      return "bg-[#FF4141] shadow-[0px_0px_6px_0px_#FF4141]" // Emergency red
    }
    if (activeModeId === "AUTO") {
      return "bg-[#2FE089] shadow-[0px_0px_6px_0px_#2FE089]" // Active green
    }
    return "bg-[#35E0FF] shadow-[0px_0px_6px_0px_#35E0FF]" // Standard cyan
  }

  return (
    <div
      ref={dropdownRef}
      className="relative shrink-0 select-none font-mono"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button: [ ● MODE_LABEL ▼ ] */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-[4px] border text-[9px] sm:text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer select-none active:scale-95 ${
          isOpen
            ? "bg-[#1A5A683D] border-[#35E0FF] text-[#35E0FF] shadow-[0_0_10px_rgba(53,224,255,0.25)]"
            : "bg-[#0E1722] hover:bg-[#162332] border-[#223547] hover:border-[#35E0FF88] text-[#EEF4F8]"
        }`}
        title={canChangeMode ? `Current Flight Mode: ${activeModeLabel} — Click to change` : `Current Flight Mode: ${activeModeLabel} (Read-only)`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={`w-[5px] h-[5px] rounded-full shrink-0 ${getDotColor()}`} />
        <span className="font-semibold whitespace-nowrap">{activeModeLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-[#8E9EAA] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#35E0FF]" : ""
          }`}
        />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 w-[200px] max-w-[calc(100vw-32px)] rounded-lg bg-[#080C14FA] border border-[#223547] shadow-[0_12px_36px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
        >
          {/* Header Placeholder: Select Mode ▼ */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0E1520] border-b border-[#1A2633] text-[9.5px] font-bold uppercase tracking-wider text-[#8E9EAA]">
            <span>Select Mode</span>
            <ChevronDown className="w-3 h-3 text-[#35E0FF]" />
          </div>

          {/* Viewer notice if read-only */}
          {!canChangeMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1414] border-b border-[#3E1E1E] text-[9px] text-[#FF8585]">
              <ShieldAlert className="w-3 h-3 text-[#FF4141] shrink-0" />
              <span>Read-only: Flight control inhibited</span>
            </div>
          )}

          {/* 10 Mode Options */}
          <div className="max-h-[280px] overflow-y-auto py-1 divide-y divide-[#131D27] scrollbar-thin scrollbar-thumb-[#223547]">
            {FLIGHT_MODES.map((mode) => {
              const isSelected = mode.id === activeModeId
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={!canChangeMode}
                  onClick={() => handleSelectMode(mode)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-[#1A5A6826] text-[#35E0FF] font-bold"
                      : canChangeMode
                      ? "text-[#C2D1DC] hover:bg-[#121B26] hover:text-[#EEF4F8]"
                      : "text-[#627280] cursor-not-allowed"
                  }`}
                  title={`${mode.label}: ${mode.desc}`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">
                      {mode.label}
                    </span>
                    <span className="text-[8.5px] text-[#6E8294] font-normal leading-tight truncate">
                      {mode.desc}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#35E0FF] shrink-0 ml-1" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default FlightModeDropdown
