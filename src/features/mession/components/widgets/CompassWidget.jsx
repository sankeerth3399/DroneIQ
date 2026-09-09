import { Compass } from "lucide-react"
import DraggableWidget from "./DraggableWidget.jsx"
import CompassIndicator from "../instruments/CompassIndicator.jsx"

/**
 * Standalone Draggable Compass UI Widget
 * 
 * - Fully draggable anywhere within the viewport with boundary clamping
 * - Position persisted via localStorage
 * - Dynamically responds to real-time drone heading telemetry
 */
export const CompassWidget = ({
  heading = 0,
  defaultPosition = { x: 20, y: 20 },
}) => {
  const getCardinal = (deg) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(((deg % 360) / 45)) % 8
    return directions[index]
  }

  const cardinal = getCardinal(heading)
  const headingStr = `${String(Math.round(heading)).padStart(3, "0")}° ${cardinal}`

  return (
    <DraggableWidget
      id="compass"
      title="COMPASS"
      icon={Compass}
      badge={headingStr}
      badgeColor="text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]"
      defaultPosition={defaultPosition}
      minimizedContent={
        <div className="flex items-center gap-1.5 text-[#35E0FF] font-mono">
          <Compass className="w-3.5 h-3.5" />
          <strong className="text-xs">{headingStr}</strong>
        </div>
      }
    >
      <div className="flex flex-col items-center select-none">
        {/* Circular Compass Dial */}
        <div className="relative flex items-center justify-center p-1">
          <CompassIndicator
            heading={heading}
            size={180}
            innerSize={110}
          />

          {/* Center Heading Arrow / Drone Silhouette */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[14px] border-l-transparent border-r-transparent border-b-[#35E0FF] drop-shadow-[0_0_6px_#35E0FF]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#1E293B] border border-[#35E0FF] -mt-1" />
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between w-full px-2 py-1 mt-1 bg-[#0C121B] border border-[#1B2938] rounded font-mono text-[10px]">
          <span className="text-[#8E9EAA]">
            HEADING: <strong className="text-[#35E0FF]">{heading.toFixed(1)}°</strong>
          </span>
          <span className="text-[#64748B]">
            DIR: <strong className="text-[#EEF4F8]">{cardinal}</strong>
          </span>
        </div>
      </div>
    </DraggableWidget>
  )
}

export default CompassWidget
