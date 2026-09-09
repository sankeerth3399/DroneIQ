import { useState, useRef, useEffect, useCallback } from "react"
import { GripHorizontal, RotateCcw, Minimize2, Maximize2 } from "lucide-react"

/**
 * Reusable Draggable Widget Container with localStorage persistence
 * 
 * Features:
 * - Fluid pointer drag-and-drop repositioning
 * - Viewport boundary collision prevention (cannot be dragged off-screen)
 * - Automatic position persistence in localStorage
 * - Header with drag handle, title, icon, reset button, and minimize/expand toggle
 * - Clean GCS cybernetic aesthetic with corner brackets and backdrop blur
 */
export const DraggableWidget = ({
  id,
  title = "WIDGET",
  icon: Icon,
  badge,
  badgeColor = "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]",
  defaultPosition = { x: 20, y: 20 },
  children,
  minimizedContent,
  className = "",
  onReset,
}) => {
  const storageKey = `aeronexus_widget_pos_${id}`

  // Load persisted position from localStorage or fallback to default
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed
        }
      }
    } catch {
      // Fallback
    }
    return defaultPosition
  })

  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem(`aeronexus_widget_min_${id}`) === "true"
    } catch {
      return false
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const widgetRef = useRef(null)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 })

  // Validate and clamp position within viewport on resize or initial load
  const clampPosition = useCallback((x, y) => {
    const el = widgetRef.current
    const width = el ? el.offsetWidth : 200
    const height = el ? el.offsetHeight : 150

    const maxX = Math.max(8, window.innerWidth - width - 8)
    const maxY = Math.max(8, window.innerHeight - height - 8)

    return {
      x: Math.max(8, Math.min(maxX, x)),
      y: Math.max(8, Math.min(maxY, y)),
    }
  }, [])

  // Keep widget inside viewport if window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const clamped = clampPosition(prev.x, prev.y)
        if (clamped.x !== prev.x || clamped.y !== prev.y) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(clamped))
          } catch {
            // Ignore
          }
          return clamped
        }
        return prev
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [clampPosition, storageKey])

  // Drag handling with pointer events
  const handlePointerDown = (e) => {
    if (e.button !== 0) return // Only primary click
    e.preventDefault()

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    }
    setIsDragging(true)

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.mouseX
      const dy = moveEvent.clientY - dragStartRef.current.mouseY

      const rawX = dragStartRef.current.initialX + dx
      const rawY = dragStartRef.current.initialY + dy

      const clamped = clampPosition(rawX, rawY)
      setPosition(clamped)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)

      // Persist final position in localStorage
      setPosition((currentPos) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(currentPos))
        } catch {
          // Ignore
        }
        return currentPos
      })
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  // Reset to default position
  const handleReset = (e) => {
    e.stopPropagation()
    const clamped = clampPosition(defaultPosition.x, defaultPosition.y)
    setPosition(clamped)
    try {
      localStorage.setItem(storageKey, JSON.stringify(clamped))
    } catch {
      // Ignore
    }
    onReset?.()
  }

  // Toggle minimize state and persist
  const handleToggleMinimize = (e) => {
    e.stopPropagation()
    setIsMinimized((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`aeronexus_widget_min_${id}`, String(next))
      } catch {
        // Ignore
      }
      return next
    })
  }

  return (
    <div
      ref={widgetRef}
      className={`absolute z-25 select-none transition-shadow ${
        isDragging
          ? "shadow-[0_0_24px_rgba(53,224,255,0.35)] cursor-grabbing scale-[1.01]"
          : "shadow-2xl"
      } ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
      }}
    >
      <div className="relative rounded-xl bg-[#080C14EB] border border-[#1E293B] backdrop-blur-md overflow-hidden">
        {/* Corner HUD Accent Brackets */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#35E0FF] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#35E0FF] pointer-events-none" />

        {/* HEADER DRAG HANDLE BAR */}
        <div
          onPointerDown={handlePointerDown}
          className="flex items-center justify-between px-2.5 py-1.5 bg-[#0C121CC0] border-b border-[#1A2633] cursor-grab active:cursor-grabbing"
          title={`Click and drag to move ${title}`}
        >
          <div className="flex items-center gap-1.5 text-xs text-[#8E9EAA]">
            <GripHorizontal className="w-3.5 h-3.5 text-[#35E0FF] shrink-0" />
            {Icon && <Icon className="w-3.5 h-3.5 text-[#35E0FF] shrink-0" />}
            <span className="font-semibold tracking-wider text-[#EEF4F8] text-[10px] font-mono">
              {title}
            </span>
            {badge && (
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Reset Position Button */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#FFFFFF0D] transition"
              title="Reset Position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={handleToggleMinimize}
              className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#FFFFFF0D] transition"
              title={isMinimized ? "Expand Widget" : "Minimize Widget"}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* BODY */}
        {isMinimized ? (
          <div className="px-2.5 py-1.5 text-[10px] font-mono">
            {minimizedContent || (
              <span className="text-[#8E9EAA]">{title} (Minimized)</span>
            )}
          </div>
        ) : (
          <div className="p-2.5">{children}</div>
        )}
      </div>
    </div>
  )
}

export default DraggableWidget
