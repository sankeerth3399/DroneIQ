import { useState, useCallback, useEffect, useRef } from "react"
import { Gamepad2, EyeOff } from "lucide-react"
import VirtualJoystick from "./VirtualJoystick.jsx"
import { DEFAULT_SHOW_JOYSTICKS } from "@/services/telemetry/telemetryTypes.js"

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
  visible = DEFAULT_SHOW_JOYSTICKS,
  onToggleVisible,
  camSelected = "main",
  mapIsLarge = true,
  cameraSelector = "#drone-live-feed",
}) => {
  const leftStickRef = useRef({ x: 0, y: 0 })
  const rightStickRef = useRef({ x: 0, y: 0 })
  const springThrottle = true

  // Standard responsive base size and shared bottom positioning with height and width awareness
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === "undefined") {
      return { sharedBottom: 98, leftOffset: 28, baseSize: 142 }
    }
    const w = window.innerWidth
    const h = window.innerHeight
    const maxByHeight = Math.floor(h * 0.28)
    const maxByWidth = Math.floor((w - 40) / 3.4)
    const targetSize = Math.min(142, maxByHeight, maxByWidth)
    const bSize = Math.max(86, targetSize)

    // Upward shift of ~60-80px from baseline bottom while maintaining responsive safe spacing:
    // Desktop (w >= 1024): 28 + 70 = 98px (strictly within 60-80px range)
    // Tablet (768 <= w < 1024): 20 + 65 = 85px
    // Mobile portrait (w < 768): 14 + 58 = 72px
    // Short screen / landscape (h < 520): 45px to prevent top-edge HUD collision
    let sBottom = 98
    if (h < 520) {
      sBottom = 45
    } else if (w < 640) {
      sBottom = 72
    } else if (w < 1024) {
      sBottom = 85
    }

    const lOffset = w < 440 ? 10 : w < 640 ? 14 : w < 1024 ? 20 : 28
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
      const maxByHeight = Math.floor(h * 0.28)
      const maxByWidth = Math.floor((w - 40) / 3.4)
      const targetSize = Math.min(142, maxByHeight, maxByWidth)
      const bSize = Math.max(86, targetSize)

      let sBottom = 98
      if (h < 520) {
        sBottom = 45
      } else if (w < 640) {
        sBottom = 72
      } else if (w < 1024) {
        sBottom = 85
      }

      const lOffset = w < 440 ? 10 : w < 640 ? 14 : w < 1024 ? 20 : 28
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

  const handleHideJoysticks = useCallback(() => {
    leftStickRef.current = { x: 0, y: 0 }
    rightStickRef.current = { x: 0, y: 0 }
    onStickUpdate?.({
      yaw: 0,
      throttle: 0,
      pitch: 0,
      roll: 0,
    })
    onToggleVisible?.()
  }, [onStickUpdate, onToggleVisible])

  if (!visible) {
    return (
      <div
        style={{
          bottom: `calc(${dimensions.sharedBottom}px + env(safe-area-inset-bottom, 0px))`,
        }}
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none"
      >
        <button
          type="button"
          id="show-joysticks-btn"
          onClick={onToggleVisible}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#080C14E6] hover:bg-[#0E1624] border border-[#1E293B] hover:border-[#35E0FF] text-[#35E0FF] text-[10px] sm:text-[11px] font-mono font-semibold backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all group cursor-pointer active:scale-95"
          title="Show Virtual Joysticks"
          aria-label="Show Virtual Joysticks"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-[#35E0FF] group-hover:scale-110 transition-transform" />
          <span>Show Joysticks</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      style={{
        "--joystick-bottom": `calc(${dimensions.sharedBottom}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* LEFT CIRCULAR JOYSTICK: Throttle & Yaw (Uses shared --joystick-bottom) */}
      <div
        id="fly-left-joystick-container"
        style={{
          left: `calc(${dimensions.leftOffset}px + env(safe-area-inset-left, 0px))`,
          bottom: "var(--joystick-bottom)",
          width: `${dimensions.baseSize}px`,
          height: `${dimensions.baseSize}px`,
        }}
        className="pointer-events-auto absolute transition-all duration-300 ease-out select-none touch-none"
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
          style={{ bottom: "calc(var(--joystick-bottom) - 12px)" }}
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 select-none"
        >
          <button
            type="button"
            id="hide-joysticks-btn"
            onClick={handleHideJoysticks}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#080C14D9] hover:bg-[#0E1624] border border-[#1E293B] hover:border-[#35E0FF88] text-[#8E9EAA] hover:text-[#35E0FF] text-[9.5px] sm:text-[10px] font-mono font-medium backdrop-blur-md shadow-md transition-all group cursor-pointer active:scale-95"
            title="Hide Virtual Joysticks"
            aria-label="Hide Virtual Joysticks"
          >
            <EyeOff className="w-3 h-3 text-[#35E0FF] group-hover:scale-110 transition-transform" />
            <span>Hide Joysticks</span>
          </button>
        </div>
      )}

      {/* RIGHT CIRCULAR JOYSTICK: Pitch & Roll (Uses IDENTICAL --joystick-bottom and size) */}
      <div
        id="fly-right-joystick-container"
        ref={rightContainerRef}
        style={{
          right: `calc(${rightOffset}px + env(safe-area-inset-right, 0px))`,
          bottom: "var(--joystick-bottom)",
          width: `${dimensions.baseSize}px`,
          height: `${dimensions.baseSize}px`,
        }}
        className="pointer-events-auto absolute transition-all duration-300 ease-out select-none touch-none"
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
