import { useState, useCallback } from "react"

import MapLoad from "@/components/Map/mapContainer.jsx"
import Live from "@/features/mession/components/live.jsx"
import { useDroneTelemetry } from "@/features/mession/hooks/useDroneTelemetry.js"
import DualJoystickOverlay from "@/features/mession/components/joysticks/DualJoystickOverlay.jsx"
import FlightInstrumentsWidget from "@/features/mession/components/widgets/FlightInstrumentsWidget.jsx"
import CaptureControlsWidget from "@/features/mession/components/widgets/CaptureControlsWidget.jsx"
import CaptureToast from "@/features/mession/components/toast/CaptureToast.jsx"
import { Plane, LayoutGrid } from "lucide-react"

const pipClass =
  "absolute right-4 top-4 z-20 flex h-[208px] w-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border border-[#223240] bg-[#171F27B2] shadow-2xl backdrop-blur-md transition-all"
const fullClass = "absolute inset-0 z-0 overflow-hidden"

const toggleBtn = (active) =>
  `text-[10px] font-mono font-semibold rounded-[4px] px-3 py-2 transition ${
    active
      ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.2)]"
      : "text-[#5D707C] hover:text-[#94A3B8]"
  }`

const SmallWindowBar = ({ options, value, onChange }) => (
  <div
    className="flex h-[44px] shrink-0 items-center justify-center gap-1.5 bg-[#0A0E12F2] border-t border-[#1C2834]"
    onClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
  >
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        className={toggleBtn(value === option.id)}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
)

const cameraOptions = [
  { id: "main", label: "Main Cam" },
  { id: "fpv", label: "FPV Cam" },
]

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
]

const MissionPage = () => {
  const [mapIsLarge, setMapIsLarge] = useState(true)
  const [camSelected, setCamSelected] = useState("main")
  const [mapStyle, setMapStyle] = useState("normal")

  // Virtual joysticks visibility
  const [joysticksVisible, setJoysticksVisible] = useState(true)

  // Telemetry & interactive physics simulation hook
  const {
    telemetry,
    updateStickInputs,
    simMode,
    setSimMode,
    isLive,
  } = useDroneTelemetry()

  // Capture toast notification state
  const [toast, setToast] = useState(null)

  // Shutter flash states: full-screen vs drone-feed-scoped
  const [isScreenFlashing, setIsScreenFlashing] = useState(false)
  const [isDroneFlashing, setIsDroneFlashing] = useState(false)

  const triggerDroneFlash = useCallback(() => {
    setIsDroneFlashing(true)
    setTimeout(() => {
      setIsDroneFlashing(false)
    }, 180)
  }, [])

  const triggerScreenFlash = useCallback(() => {
    setIsScreenFlashing(true)
    setTimeout(() => {
      setIsScreenFlashing(false)
    }, 220)
  }, [])

  // Reset all draggable widget positions to default
  const handleResetLayout = () => {
    try {
      localStorage.removeItem("aeronexus_widget_pos_flight_instruments")
      localStorage.removeItem("aeronexus_widget_min_flight_instruments")
      localStorage.removeItem("aeronexus_widget_pos_compass")
      localStorage.removeItem("aeronexus_widget_pos_attitude")
      localStorage.removeItem("aeronexus_widget_pos_capture_controls")
      localStorage.removeItem("aeronexus_widget_min_capture_controls")
      window.location.reload()
    } catch {
      // Ignore
    }
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* SCREENSHOT FULL SCREEN FLASH OVERLAY */}
      {isScreenFlashing && (
        <div className="absolute inset-0 z-50 bg-white/95 pointer-events-none transition-opacity duration-200 animate-out fade-out" />
      )}

      {/* NON-BLOCKING CAPTURE CONFIRMATION TOAST */}
      <CaptureToast toast={toast} onDismiss={() => setToast(null)} />

      {/* MAP LAYER (Full screen or PiP) */}
      <div className={mapIsLarge ? fullClass : pipClass}>
        <div className={`relative ${mapIsLarge ? "h-full w-full" : "min-h-0 flex-1"}`}>
          <MapLoad mapStyle={mapStyle} telemetry={telemetry} />
          {!mapIsLarge && (
            <button
              type="button"
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 hover:bg-black/40 transition group"
              onClick={() => setMapIsLarge(true)}
              aria-label="Show map full screen"
            >
              <span className="opacity-0 group-hover:opacity-100 bg-[#080C14D9] text-[#35E0FF] text-[10px] font-mono px-2 py-1 rounded border border-[#35E0FF4D] transition">
                Click to Expand Map
              </span>
            </button>
          )}
        </div>
        {!mapIsLarge && (
          <SmallWindowBar
            options={mapStyleOptions}
            value={mapStyle}
            onChange={setMapStyle}
          />
        )}
      </div>

      {/* LIVE DRONE CAMERA FEED LAYER (Full screen or PiP) */}
      <div
        id="drone-live-feed"
        className={mapIsLarge ? pipClass : fullClass}
        onClick={mapIsLarge ? () => setMapIsLarge(false) : undefined}
        role={mapIsLarge ? "button" : undefined}
        tabIndex={mapIsLarge ? 0 : undefined}
        onKeyDown={
          mapIsLarge
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setMapIsLarge(false)
                }
              }
            : undefined
        }
      >
        <div className={`relative ${mapIsLarge ? "min-h-0 flex-1" : "h-full w-full"}`}>
          <Live />

          {/* DRONE PHOTO SHUTTER FLASH OVERLAY (Restricted to Drone Camera Feed) */}
          {isDroneFlashing && (
            <div className="absolute inset-0 z-40 bg-white/90 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
          )}

          {/* FPV Crosshair / Gimbal Grid Overlay if FPV is selected */}
          {camSelected === "fpv" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
              <div className="w-16 h-16 border border-[#35E0FF4D] rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#35E0FF] rounded-full" />
              </div>
            </div>
          )}

          {/* Click to expand hover hint on PiP */}
          {mapIsLarge && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black/30 transition group">
              <span className="opacity-0 group-hover:opacity-100 bg-[#080C14D9] text-[#35E0FF] text-[10px] font-mono px-2 py-1 rounded border border-[#35E0FF4D] transition">
                Click to Expand Camera
              </span>
            </div>
          )}
        </div>

        {mapIsLarge && (
          <SmallWindowBar
            options={cameraOptions}
            value={camSelected}
            onChange={setCamSelected}
          />
        )}
      </div>

      {/* =========================================================================
          DRAGGABLE UI WIDGETS (Viewport-Clamped & LocalStorage-Persisted)
         ========================================================================= */}

      {/* 1. COMBINED FLIGHT INSTRUMENTS WIDGET (Compact Attitude Indicator + Compass) */}
      <FlightInstrumentsWidget
        telemetry={telemetry}
        defaultPosition={{ x: 20, y: 20 }}
      />

      {/* 2. CAPTURE CONTROLS WIDGET (Record, Drone Photo, Screenshot horizontally aligned) */}
      <CaptureControlsWidget
        telemetry={telemetry}
        onCaptureToast={setToast}
        onTriggerDroneFlash={triggerDroneFlash}
        onTriggerScreenFlash={triggerScreenFlash}
        defaultPosition={{ x: 316, y: 20 }}
      />

      {/* DUAL QGC-STYLE VIRTUAL JOYSTICKS (Left: Throttle/Yaw, Right: Pitch/Roll) */}
      <DualJoystickOverlay
        onStickUpdate={updateStickInputs}
        visible={joysticksVisible}
        onToggleVisible={() => setJoysticksVisible((prev) => !prev)}
      />

      {/* TOP-CENTER MISSION TELEMETRY HUD STRIP */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-15 pointer-events-auto hidden md:flex items-center gap-3 px-4 py-1.5 rounded-lg bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md shadow-lg text-[11px] font-mono">
        {/* Live Stream vs Sim Status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-[#2FE089] shadow-[0_0_6px_#2FE089] animate-pulse" : "bg-[#35E0FF] shadow-[0_0_6px_#35E0FF]"}`} />
          <span className={`font-semibold ${isLive ? "text-[#2FE089]" : "text-[#B7F3FF]"}`}>
            {isLive ? "LIVE TELEMETRY" : "SIM TELEMETRY"}
          </span>
        </div>

        <div className="w-[1px] h-3 bg-[#223240]" />

        {/* Armed & Flight Mode */}
        <div className="flex items-center gap-1.5 text-[#EEF4F8]">
          <span className="font-semibold">{telemetry.flightMode}</span>
        </div>

        <div className="w-[1px] h-3 bg-[#223240]" />

        {/* Altitude & Speed */}
        <div className="flex items-center gap-2 text-[#8E9EAA]">
          <span>
            ALT: <strong className="text-[#35E0FF]">{telemetry.altitude}m</strong>
          </span>
          <span>
            SPD: <strong className="text-[#EEF4F8]">{telemetry.groundSpeed}m/s</strong>
          </span>
        </div>

        <div className="w-[1px] h-3 bg-[#223240]" />

        {/* Interactive Simulation Mode Switcher (Active when in sim mode) */}
        {!isLive && (
          <>
            <button
              type="button"
              onClick={() =>
                setSimMode((prev) => (prev === "interactive" ? "patrol" : "interactive"))
              }
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition ${
                simMode === "interactive"
                  ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                  : "bg-[#2FE0891A] text-[#2FE089] border border-[#2FE0894D]"
              }`}
              title="Click to toggle between Manual Joysticks and Autonomous Orbit Demo"
            >
              <Plane className="w-3 h-3" />
              <span>{simMode === "interactive" ? "Manual Stick Flight" : "Auto Patrol Demo"}</span>
            </button>
            <div className="w-[1px] h-3 bg-[#223240]" />
          </>
        )}

        <div className="w-[1px] h-3 bg-[#223240]" />

        {/* Reset Layout Button */}
        <button
          type="button"
          onClick={handleResetLayout}
          className="flex items-center gap-1 text-[10px] text-[#8E9EAA] hover:text-[#35E0FF] transition"
          title="Reset all draggable widgets to default positions"
        >
          <LayoutGrid className="w-3 h-3" />
          <span>Reset Layout</span>
        </button>
      </div>
    </div>
  )
}

export default MissionPage
