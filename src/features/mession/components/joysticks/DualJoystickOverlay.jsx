import { useState, useCallback, useEffect, useRef } from "react"
import { Gamepad2, EyeOff } from "lucide-react"
import VirtualJoystick from "./VirtualJoystick.jsx"

/**
 * Dual Joystick Overlay (Mode 2 standard)
 * 
 * - Left Stick: Throttle (Vertical) / Yaw (Horizontal)
 * - Right Stick: Pitch (Vertical) / Roll (Horizontal)
 * - Pure Floating Circular HUD: No rectangular boxes, borders, or outer panels
 * - Deterministic Shared Vertical Alignment:
 *     Left and Right circular joysticks ALWAYS share the exact same vertical height (Y coordinate)
 *     via a common CSS custom property: --joystick-bottom.
 * - Identical Dimensions:
 *     Both circular joysticks share identical width, height, outer diameter, and knob size.
 * - Dynamic Camera Collision Avoidance:
 *     Right Joystick shifts horizontally if needed to avoid camera widgets, while strictly
 *     preserving vertical alignment with the Left Joystick.
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
  const leftStickRef = useRef({ x: 0, y: 0 })
  const rightStickRef = useRef({ x: 0, y: 0 })
  const springThrottle = true

  // Standard responsive base size and shared bottom positioning
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

  // Dynamic horizontal offset for right joystick (horizontal-only adjustment preserves shared Y)
  const [rightOffset, setRightOffset] = useState(28)
  const rightContainerRef = useRef(null)

  // 1. Calculate responsive base size and shared bottom on viewport changes
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const bSize = (w < 440 || h < 440) ? 100 : (w < 640 || h < 540) ? 114 : (w < 1024 || h < 720) ? 128 : 142
      const sBottom = w < 640 ? 16 : w < 1024 ? 22 : 28
      const lOffset = w < 640 ? 12 : w < 1024 ? 20 : 28
      setDimensions({ sharedBottom: sBottom, leftOffset: lOffset, baseSize: bSize })
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // 2. Collision avoidance layout engine for Right Joystick vs Camera Widget (Horizontal shift only)
  const updateRightStickLayout = useCallback(() => {
    const winW = window.innerWidth
    const winH = window.innerHeight

    const defaultRight = winW < 640 ? 12 : (winW < 1024 ? 20 : 28)
    const margin = 16

    // Case A: Map is not large (Camera is full screen) -> docked mini controls at bottom-right
    if (!mapIsLarge) {
      // Shift left of docked mini controls (width ~230px + margin 16px = ~246px)
      // Vertical height remains identical to left joystick (var(--joystick-bottom))
      setRightOffset(winW < 640 ? 195 : 246)
      return
    }

    // Case B: Map is large (Normal Fly view) -> Camera is PiP in top-right
    const camEl = document.querySelector(cameraSelector)
    if (!camEl) {
      setRightOffset(defaultRight)
      return
    }

    const camRect = camEl.getBoundingClientRect()
    const joyW = dimensions.baseSize
    const joyH = dimensions.baseSize

    // In viewport coordinates:
    const testJoyTop = winH - dimensions.sharedBottom - joyH
    const testJoyBottom = winH - dimensions.sharedBottom
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
      // Shift right joystick horizontally leftward outside camera column while preserving vertical alignment
      const safeRight = Math.round((winW - camRect.left) + margin)
      const clampedRight = Math.min(winW - joyW - 20, Math.max(defaultRight, safeRight))
      setRightOffset(clampedRight)
    } else {
      setRightOffset(defaultRight)
    }
  }, [dimensions.baseSize, dimensions.sharedBottom, mapIsLarge, cameraSelector, camSelected])

  // Recalculate layout on relevant triggers, resize, and camera ResizeObserver
  useEffect(() => {
    const t0 = setTimeout(updateRightStickLayout, 0)
    const t1 = setTimeout(updateRightStickLayout, 50)
    const t2 = setTimeout(updateRightStickLayout, 150)
    const t3 = setTimeout(updateRightStickLayout, 320)

    const handleResize = () => {
      updateRightStickLayout()
    }
    window.addEventListener("resize", handleResize)

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
      window.removeEventListener("resize", handleResize)
      if (ro) ro.disconnect()
    }
  }, [updateRightStickLayout, cameraSelector, camSelected])

  const handleLeftChange = useCallback(
    (val) => {
      leftStickRef.current = val
      onStickUpdate?.({
        yaw: val.x,
        throttle: val.y,
        pitch: rightStickRef.current.y,
        roll: rightStickRef.current.x,
      })
    },
    [onStickUpdate]
  )

  const handleRightChange = useCallback(
    (val) => {
      rightStickRef.current = val
      onStickUpdate?.({
        yaw: leftStickRef.current.x,
        throttle: leftStickRef.current.y,
        pitch: val.y,
        roll: val.x,
      })
    },
    [onStickUpdate]
  )

  if (!visible) {
    return (
      <div
        style={{ bottom: "var(--joystick-bottom, 28px)" }}
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      >
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
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      style={{
        "--joystick-bottom": `${dimensions.sharedBottom}px`,
      }}
    >
      {/* LEFT CIRCULAR JOYSTICK: Throttle & Yaw (Uses shared --joystick-bottom) */}
      <div
        id="fly-left-joystick-container"
        style={{
          left: `${dimensions.leftOffset}px`,
          bottom: "var(--joystick-bottom)",
          width: `${dimensions.baseSize}px`,
          height: `${dimensions.baseSize}px`,
        }}
        className="pointer-events-auto absolute transition-all duration-300 ease-out select-none"
      >
        <VirtualJoystick
          label="LEFT"
          axisXLabel="YAW"
          axisYLabel="THR"
          size={dimensions.baseSize}
          knobSize={Math.round(dimensions.baseSize * 0.32)}
          springX={true}
          springY={springThrottle}
          defaultY={0}
          onChange={handleLeftChange}
        />
      </div>

      {/* MINIMAL HIDE JOYSTICKS BUTTON (Centered at bottom) */}
      {onToggleVisible && (
        <div
          style={{ bottom: "calc(var(--joystick-bottom) - 8px)" }}
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2"
        >
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

      {/* RIGHT CIRCULAR JOYSTICK: Pitch & Roll (Uses IDENTICAL --joystick-bottom and size) */}
      <div
        id="fly-right-joystick-container"
        ref={rightContainerRef}
        style={{
          right: `${rightOffset}px`,
          bottom: "var(--joystick-bottom)",
          width: `${dimensions.baseSize}px`,
          height: `${dimensions.baseSize}px`,
        }}
        className="pointer-events-auto absolute transition-all duration-300 ease-out select-none"
      >
        <VirtualJoystick
          label="RIGHT"
          axisXLabel="ROL"
          axisYLabel="PIT"
          size={dimensions.baseSize}
          knobSize={Math.round(dimensions.baseSize * 0.32)}
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
