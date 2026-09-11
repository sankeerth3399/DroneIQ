import { useState, useCallback, useEffect, useRef } from "react"
import { Gamepad2, EyeOff } from "lucide-react"
import VirtualJoystick from "./VirtualJoystick.jsx"

/**
 * Dual Joystick Overlay (Mode 2 standard)
 * 
 * - Left Stick: Throttle (Vertical) / Yaw (Horizontal)
 * - Right Stick: Pitch (Vertical) / Roll (Horizontal)
 * - Pure Floating Circular HUD: No rectangular boxes, borders, or outer panels
 * - Dynamic Collision Avoidance Engine:
 *     Main Cam: Right Joystick sits at lower-right corner.
 *     FPV Cam: If camera expands, Right Joystick automatically repositions to a safe,
 *              collision-free location, ensuring the camera widget is never covered.
 * - Minimal Show / Hide Joysticks HUD control
 */
export const DualJoystickOverlay = ({
  onStickUpdate,
  visible = true,
  onToggleVisible,
  camSelected = "main",
  mapIsLarge = true,
  cameraSelector = "#drone-live-feed",
}) => {
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 })
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 })
  const springThrottle = true

  // Standard responsive base size
  const [baseSize, setBaseSize] = useState(142)

  // Dynamic layout coordinates for right joystick
  const [rightPos, setRightPos] = useState({
    right: 28,
    bottom: 26,
    size: 142,
  })

  const rightContainerRef = useRef(null)

  // 1. Calculate responsive base size on viewport changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      if (width < 440 || height < 440) {
        setBaseSize(100)
      } else if (width < 640 || height < 540) {
        setBaseSize(114)
      } else if (width < 1024 || height < 720) {
        setBaseSize(128)
      } else {
        setBaseSize(142)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // 2. Collision avoidance layout engine for Right Joystick vs Camera Widget
  const updateRightStickLayout = useCallback(() => {
    const winW = window.innerWidth
    const winH = window.innerHeight

    const defaultRight = winW < 640 ? 12 : (winW < 1024 ? 20 : 28)
    const defaultBottom = winW < 640 ? 12 : (winW < 1024 ? 20 : 26)
    const margin = 16

    // Case A: Map is not large (Camera is full screen) -> docked mini controls at bottom-right
    if (!mapIsLarge) {
      setRightPos({
        right: defaultRight,
        bottom: 84, // lifted safely above docked mini controls (h ~65px)
        size: baseSize,
      })
      return
    }

    // Case B: Map is large (Normal Fly view) -> Camera is PiP in top-right
    const camEl = document.querySelector(cameraSelector)
    if (!camEl) {
      setRightPos({
        right: defaultRight,
        bottom: defaultBottom,
        size: baseSize,
      })
      return
    }

    const camRect = camEl.getBoundingClientRect()
    const joyW = baseSize
    const joyH = baseSize

    // In viewport coordinates:
    const testJoyTop = winH - defaultBottom - joyH
    const testJoyBottom = winH - defaultBottom
    const testJoyLeft = winW - defaultRight - joyW
    const testJoyRight = winW - defaultRight

    // Check intersection with camera widget bounding box (plus safety margin):
    const intersectsHorizontal = (
      testJoyLeft < camRect.right + margin &&
      testJoyRight > camRect.left - margin
    )
    const intersectsVertical = (
      testJoyTop < camRect.bottom + margin &&
      testJoyBottom > camRect.top - margin
    )

    // Check if FPV mode requires proactive spatial separation:
    const needsFpvSeparation = (
      camSelected === "fpv" &&
      intersectsHorizontal &&
      testJoyTop < camRect.bottom + 40
    )

    if ((intersectsHorizontal && intersectsVertical) || needsFpvSeparation) {
      // Collision detected or tight space! Camera widget has higher layout priority.
      const spaceBelow = winH - (camRect.bottom + margin) - defaultBottom

      if (spaceBelow >= 120 && !needsFpvSeparation) {
        // Fits below camera in right column: adjust size if needed to never overlap
        const safeSize = Math.max(90, Math.min(baseSize, Math.round(spaceBelow - 10)))
        setRightPos({
          right: defaultRight,
          bottom: defaultBottom,
          size: safeSize,
        })
      } else {
        // Dynamically shift right joystick leftward outside camera column
        const safeRight = Math.round((winW - camRect.left) + margin)
        // Clamp to screen bounds:
        const clampedRight = Math.min(winW - joyW - 20, Math.max(defaultRight, safeRight))
        setRightPos({
          right: clampedRight,
          bottom: defaultBottom,
          size: baseSize,
        })
      }
    } else {
      // No collision: return to default position
      setRightPos({
        right: defaultRight,
        bottom: defaultBottom,
        size: baseSize,
      })
    }
  }, [baseSize, mapIsLarge, cameraSelector, camSelected])

  // Recalculate layout on relevant triggers, resize, and camera ResizeObserver
  useEffect(() => {
    const t0 = setTimeout(updateRightStickLayout, 0)
    const t1 = setTimeout(updateRightStickLayout, 50)
    const t2 = setTimeout(updateRightStickLayout, 150)
    const t3 = setTimeout(updateRightStickLayout, 320)

    window.addEventListener("resize", updateRightStickLayout)

    const camEl = document.querySelector(cameraSelector)
    let ro = null
    if (camEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateRightStickLayout()
      })
      ro.observe(camEl)
    }

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener("resize", updateRightStickLayout)
      if (ro) ro.disconnect()
    }
  }, [updateRightStickLayout, cameraSelector, camSelected])

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

  if (!visible) {
    return (
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleVisible}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#080C14CC] hover:bg-[#0A0E16EE] border border-[#1E293B] hover:border-[#35E0FF] text-[#35E0FF] text-[10px] sm:text-[10.5px] font-mono backdrop-blur-md shadow-md transition group"
          title="Show Virtual Joysticks"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-[#35E0FF] group-hover:scale-105 transition-transform" />
          <span>Show Joysticks</span>
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* LEFT CIRCULAR JOYSTICK: Throttle & Yaw (Lower-left floating HUD control) */}
      <div className="pointer-events-auto absolute left-3 sm:left-6 md:left-8 bottom-3 sm:bottom-6 md:bottom-8 select-none">
        <VirtualJoystick
          label="LEFT"
          axisXLabel="YAW"
          axisYLabel="THR"
          size={baseSize}
          knobSize={Math.round(baseSize * 0.32)}
          springX={true}
          springY={springThrottle}
          defaultY={0}
          onChange={handleLeftChange}
        />
      </div>

      {/* MINIMAL HIDE JOYSTICKS BUTTON (Centered at bottom) */}
      {onToggleVisible && (
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-1.5 sm:bottom-2">
          <button
            type="button"
            onClick={onToggleVisible}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#080C14B3] hover:bg-[#0A0E16EE] border border-[#1E293B] hover:border-[#35E0FF66] text-[#8E9EAA] hover:text-[#35E0FF] text-[9.5px] font-mono backdrop-blur-sm shadow-sm transition group"
            title="Hide Virtual Joysticks"
          >
            <EyeOff className="w-3 h-3 text-[#35E0FF] group-hover:scale-105 transition-transform" />
            <span>Hide Joysticks</span>
          </button>
        </div>
      )}

      {/* RIGHT CIRCULAR JOYSTICK: Pitch & Roll (Lower-right floating HUD control with camera collision avoidance) */}
      <div
        ref={rightContainerRef}
        style={{
          right: `${rightPos.right}px`,
          bottom: `${rightPos.bottom}px`,
        }}
        className="pointer-events-auto absolute transition-all duration-300 ease-out select-none"
      >
        <VirtualJoystick
          label="RIGHT"
          axisXLabel="ROL"
          axisYLabel="PIT"
          size={rightPos.size}
          knobSize={Math.round(rightPos.size * 0.32)}
          springX={true}
          springY={true}
          defaultY={0}
          onChange={handleRightChange}
        />
      </div>
    </div>
  )
}

export default DualJoystickOverlay
