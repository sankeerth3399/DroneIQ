import { useState, useCallback, useEffect } from "react"
import { Gamepad2, EyeOff, RotateCcw, Sliders } from "lucide-react"
import VirtualJoystick from "./VirtualJoystick.jsx"

/**
 * Dual Joystick Overlay (Mode 2 standard)
 * 
 * - Left Stick: Throttle (Vertical) / Yaw (Horizontal)
 * - Right Stick: Pitch (Vertical) / Roll (Horizontal)
 * - Simultaneous multi-touch / dual mouse pointer support
 * - Real-time normalized telemetry readouts
 * - Safe corner margins to prevent overlaps
 */
export const DualJoystickOverlay = ({
  onStickUpdate,
  visible = true,
  onToggleVisible,
}) => {
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 })
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 })
  const [springThrottle, setSpringThrottle] = useState(true)
  const [activeSticks, setActiveSticks] = useState({ left: false, right: false })
  const [responsiveSize, setResponsiveSize] = useState(168)

  // Dynamically adapt joystick size to viewport
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      if (width < 440 || height < 440) {
        setResponsiveSize(116)
      } else if (width < 640 || height < 540) {
        setResponsiveSize(132)
      } else if (width < 1024 || height < 720) {
        setResponsiveSize(150)
      } else {
        setResponsiveSize(170)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleLeftChange = useCallback(
    (val) => {
      setLeftStick(val)
      onStickUpdate?.({
        yaw: val.x,
        throttle: val.y,
        pitch: rightStick.y,
        roll: rightStick.x,
      })
    },
    [onStickUpdate, rightStick.x, rightStick.y]
  )

  const handleRightChange = useCallback(
    (val) => {
      setRightStick(val)
      onStickUpdate?.({
        yaw: leftStick.x,
        throttle: leftStick.y,
        pitch: val.y,
        roll: val.x,
      })
    },
    [leftStick.x, leftStick.y, onStickUpdate]
  )

  const handleResetSticks = () => {
    setLeftStick({ x: 0, y: 0 })
    setRightStick({ x: 0, y: 0 })
    onStickUpdate?.({
      yaw: 0,
      throttle: 0,
      pitch: 0,
      roll: 0,
    })
  }

  if (!visible) {
    return (
      <div className="absolute bottom-12 sm:bottom-16 md:bottom-[72px] left-2.5 sm:left-6 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleVisible}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0A0E16CC] border border-[#223240] text-[#35E0FF] text-[11px] sm:text-xs font-medium backdrop-blur-md shadow-lg hover:border-[#35E0FF] hover:bg-[#0E1520] transition"
          title="Show Virtual Joysticks"
        >
          <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Show Joysticks</span>
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 sm:bottom-16 md:bottom-[72px] z-20 px-2 sm:px-6">
      <div className="relative flex items-end justify-between w-full pointer-events-none">
        {/* LEFT JOYSTICK: Throttle & Yaw */}
        <div className="pointer-events-auto">
          <div className="relative p-1.5 sm:p-2 rounded-xl bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md shadow-2xl">
            <VirtualJoystick
              label="LEFT"
              subLabel="THR / YAW"
              axisXLabel="YAW"
              axisYLabel="THR"
              size={responsiveSize}
              knobSize={Math.round(responsiveSize * 0.32)}
              springX={true}
              springY={springThrottle}
              defaultY={0}
              onChange={handleLeftChange}
              onActiveChange={(active) =>
                setActiveSticks((prev) => ({ ...prev, left: active }))
              }
            />
          </div>
        </div>

        {/* BOTTOM-CENTER HUD UTILITY BAR */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[-36px] sm:bottom-0">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#080C14D9] border border-[#1E293B] backdrop-blur-md shadow-xl text-[9.5px] sm:text-[11px] whitespace-nowrap">
            {/* Mode 2 Badge with Active Stick Indicators */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-[#8E9EAA] font-mono">
              <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#35E0FF]" />
              <span className="font-semibold text-[#EEF4F8]">MODE 2</span>
              <div className="flex items-center gap-1 ml-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    activeSticks.left ? "bg-[#35E0FF] shadow-[0_0_6px_#35E0FF]" : "bg-[#2A3B4C]"
                  }`}
                  title="Left Stick Active"
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    activeSticks.right ? "bg-[#35E0FF] shadow-[0_0_6px_#35E0FF]" : "bg-[#2A3B4C]"
                  }`}
                  title="Right Stick Active"
                />
              </div>
            </div>

            <div className="w-[1px] h-3.5 bg-[#253342]" />

            {/* Spring Throttle Toggle */}
            <button
              type="button"
              onClick={() => setSpringThrottle((prev) => !prev)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                springThrottle
                  ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                  : "text-[#8E9EAA] hover:text-[#EEF4F8]"
              }`}
              title="Toggle Spring Throttle Auto-Centering"
            >
              <Sliders className="w-3 h-3" />
              <span className="hidden sm:inline">Spring Throttle</span>
              <span className="text-[9px] uppercase">
                {springThrottle ? "ON" : "OFF"}
              </span>
            </button>

            <div className="w-[1px] h-3.5 bg-[#253342]" />

            {/* Reset Sticks Button */}
            <button
              type="button"
              onClick={handleResetSticks}
              className="flex items-center gap-1 text-[#8E9EAA] hover:text-[#EEF4F8] transition"
              title="Recenter Both Sticks"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Center</span>
            </button>

            {/* Hide Joysticks Button */}
            {onToggleVisible && (
              <>
                <div className="w-[1px] h-3.5 bg-[#253342]" />
                <button
                  type="button"
                  onClick={onToggleVisible}
                  className="flex items-center gap-1 text-[#8E9EAA] hover:text-[#35E0FF] transition"
                  title="Hide Joysticks"
                >
                  <EyeOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Hide</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT JOYSTICK: Pitch & Roll (Symmetrically positioned) */}
        <div className="pointer-events-auto">
          <div className="relative p-2 rounded-xl bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md shadow-2xl">
            <VirtualJoystick
              label="RIGHT"
              subLabel="PIT / ROL"
              axisXLabel="ROL"
              axisYLabel="PIT"
              size={responsiveSize}
              knobSize={Math.round(responsiveSize * 0.32)}
              springX={true}
              springY={true}
              defaultY={0}
              onChange={handleRightChange}
              onActiveChange={(active) =>
                setActiveSticks((prev) => ({ ...prev, right: active }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DualJoystickOverlay
