import React from "react"

/**
 * DynamicDroneLabel
 * Authoritative, reusable component for rendering dynamic drone labels, badges,
 * and selector tabs derived strictly from real drone records and incoming telemetry.
 */
export const DynamicDroneLabel = ({
  drone,
  telemetry = null,
  variant = "badge",
  selected = false,
  onClick = null,
  showRole = true,
  showMission = true,
  showStatus = true,
  className = "",
}) => {
  if (!drone && !telemetry) return null

  const id = drone?.id || drone?.droneId || telemetry?.droneId || "DRONE"
  const name = drone?.name && drone?.name !== id ? drone.name : null

  // Variant: Tab (used in selectors across pages)
  if (variant === "tab") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
          selected
            ? "bg-[#2563EB] text-white shadow-sm"
            : "text-[#8E9EAA] hover:text-white hover:bg-[#121F33]"
        } ${className}`}
      >
        <span>{id}</span>
        {name && <span className="opacity-80 font-sans font-normal text-[11px] truncate max-w-[90px]">· {name}</span>}
      </button>
    )
  }

  // Variant: Pill Chip (compact inline)
  if (variant === "chip") {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
          selected
            ? "bg-[#193D63] text-[#B7F3FF] border border-[#345A82]"
            : "bg-[#0F172A] text-[#94A3B8] border border-[#1E293B]"
        } ${onClick ? "cursor-pointer" : ""} ${className}`}
      >
        <span className="text-white font-bold">{id}</span>
        {name && <span className="text-[#8CC8FF] text-[10px] font-sans">· {name}</span>}
      </span>
    )
  }

  // Variant: Card summary header
  if (variant === "card") {
    return (
      <div className={`flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-white text-sm tracking-tight">{id}</span>
          {name && <span className="text-xs text-[#8CC8FF] font-semibold truncate">· {name}</span>}
        </div>
      </div>
    )
  }

  // Default Variant: Badge
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold text-white bg-[#0B192C]/95 border ${
        selected ? "border-[#35E0FF]" : "border-[#1E3A5F]"
      } px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <span className="text-white tracking-wide">{id}</span>
      {name && <span className="text-[#8CC8FF] font-semibold text-[10px] font-sans">· {name}</span>}
    </div>
  )
}

export default DynamicDroneLabel
