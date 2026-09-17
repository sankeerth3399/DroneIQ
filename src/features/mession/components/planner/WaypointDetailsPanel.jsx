import { useState } from "react";
import { X, Trash2, Check, ArrowUp, Zap, Clock, Compass, AlertTriangle } from "lucide-react";

export default function WaypointDetailsPanel({
  waypoint,
  onUpdate,
  onDelete,
  onClose,
  validateCoordinates,
}) {
  const [prevId, setPrevId] = useState(waypoint.id);
  const [prevCoords, setPrevCoords] = useState({ lat: waypoint.lat, lng: waypoint.lng });
  const [alt, setAlt] = useState(waypoint.alt ?? 50);
  const [speed, setSpeed] = useState(waypoint.speed ?? 8.5);
  const [holdTime, setHoldTime] = useState(waypoint.holdTime ?? 0);
  const [heading, setHeading] = useState(waypoint.heading ?? "Auto");
  const [customHeading, setCustomHeading] = useState(waypoint.customHeading ?? 0);
  const [latInput, setLatInput] = useState(String(waypoint.lat?.toFixed(6) ?? ""));
  const [lngInput, setLngInput] = useState(String(waypoint.lng?.toFixed(6) ?? ""));
  const [coordError, setCoordError] = useState("");

  // Sync draft state if selected waypoint changes or coordinates update from map drag
  if (waypoint.id !== prevId) {
    setPrevId(waypoint.id);
    setPrevCoords({ lat: waypoint.lat, lng: waypoint.lng });
    setAlt(waypoint.alt ?? 50);
    setSpeed(waypoint.speed ?? 8.5);
    setHoldTime(waypoint.holdTime ?? 0);
    setHeading(waypoint.heading ?? "Auto");
    setCustomHeading(waypoint.customHeading ?? 0);
    setLatInput(String(waypoint.lat?.toFixed(6) ?? ""));
    setLngInput(String(waypoint.lng?.toFixed(6) ?? ""));
    setCoordError("");
  } else if (waypoint.lat !== prevCoords.lat || waypoint.lng !== prevCoords.lng) {
    setPrevCoords({ lat: waypoint.lat, lng: waypoint.lng });
    setLatInput(String(waypoint.lat?.toFixed(6) ?? ""));
    setLngInput(String(waypoint.lng?.toFixed(6) ?? ""));
  }

  // Close: discard uncommitted draft changes and close panel
  const handleClose = (e) => {
    e?.stopPropagation?.();
    setCoordError("");
    onClose?.();
  };

  // Delete: remove waypoint
  const handleDelete = (e) => {
    e?.stopPropagation?.();
    onDelete?.(waypoint.id);
  };

  // Done: validate changes, commit, and close panel
  const handleApply = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    // 1. Latitude validation
    const parsedLat = parseFloat(latInput);
    if (latInput === "" || isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setCoordError("Invalid latitude.");
      return;
    }

    // 2. Longitude validation
    const parsedLng = parseFloat(lngInput);
    if (lngInput === "" || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setCoordError("Invalid longitude.");
      return;
    }

    // 3. Altitude validation
    const parsedAlt = parseFloat(alt);
    if (alt === "" || isNaN(parsedAlt) || parsedAlt < 0 || parsedAlt > 1000) {
      setCoordError("Altitude must be valid.");
      return;
    }

    // 4. Speed validation
    const parsedSpeed = parseFloat(speed);
    if (speed === "" || isNaN(parsedSpeed) || parsedSpeed <= 0 || parsedSpeed > 50) {
      setCoordError("Speed must be valid.");
      return;
    }

    // 5. Hold time validation
    const parsedHoldTime = parseFloat(holdTime);
    if (holdTime === "" || isNaN(parsedHoldTime) || parsedHoldTime < 0) {
      setCoordError("Hold time must be valid.");
      return;
    }

    // 6. Custom heading validation (if Custom selected)
    let parsedCustomHeading = parseFloat(customHeading);
    if (heading === "Custom") {
      if (
        customHeading === "" ||
        isNaN(parsedCustomHeading) ||
        parsedCustomHeading < 0 ||
        parsedCustomHeading > 360
      ) {
        setCoordError("Heading must be between 0° and 360°.");
        return;
      }
    } else {
      parsedCustomHeading = 0;
    }

    // 7. Active Geofence boundary validation
    if (validateCoordinates) {
      const isInside = validateCoordinates(parsedLat, parsedLng);
      if (!isInside) {
        setCoordError("Waypoint outside geofence.");
        return;
      }
    }

    // Valid: Clear error, commit draft updates, and close panel
    setCoordError("");
    onUpdate?.(waypoint.id, {
      lat: Number(parsedLat.toFixed(6)),
      lng: Number(parsedLng.toFixed(6)),
      alt: Number(parsedAlt),
      speed: Number(parsedSpeed),
      holdTime: Number(parsedHoldTime),
      heading,
      customHeading: Number(parsedCustomHeading),
    });
    onClose?.();
  };

  const isTakeoff = waypoint.type === "TAKEOFF";
  const isLand = waypoint.type === "LAND";
  const isRtl = waypoint.type === "RTL";

  let typeBadgeColor = "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF4D]";
  if (isTakeoff) typeBadgeColor = "text-[#2FE089] bg-[#2FE0891A] border-[#2FE0894D]";
  if (isLand) typeBadgeColor = "text-[#F59E0B] bg-[#F59E0B1A] border-[#F59E0B4D]";
  if (isRtl) typeBadgeColor = "text-[#A78BFA] bg-[#A78BFA1A] border-[#A78BFA4D]";

  return (
    <div
      className="w-full max-w-[340px] sm:w-80 max-h-[calc(100dvh-80px)] overflow-y-auto rounded-xl bg-[#080C14FA] border border-[#1C2834] shadow-2xl backdrop-blur-md text-xs font-mono text-[#EEF4F8] select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A2633] bg-[#0C121DF2]">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadgeColor}`}>
            {waypoint.label || `WP${waypoint.seq || 1}`}
          </span>
          <span className="font-semibold text-white text-[11px] truncate max-w-[130px]">
            {waypoint.type}
          </span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="text-[#8E9EAA] hover:text-white p-1 rounded-md hover:bg-[#1E293B] transition cursor-pointer"
          title="Close (X)"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* GPS Coordinates Editable Inputs */}
        <div className="p-2 rounded-lg bg-[#0C131F] border border-[#16212E] space-y-1.5 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#64748B] block text-[9px] uppercase tracking-wider mb-0.5">Latitude (°)</label>
              <input
                type="number"
                step="0.000001"
                value={latInput}
                onChange={(e) => {
                  setLatInput(e.target.value);
                  setCoordError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply(e);
                }}
                className="w-full px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-[#35E0FF] font-semibold text-xs focus:border-[#35E0FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[#64748B] block text-[9px] uppercase tracking-wider mb-0.5">Longitude (°)</label>
              <input
                type="number"
                step="0.000001"
                value={lngInput}
                onChange={(e) => {
                  setLngInput(e.target.value);
                  setCoordError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply(e);
                }}
                className="w-full px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-[#35E0FF] font-semibold text-xs focus:border-[#35E0FF] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Altitude Input */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[#8E9EAA]">
            <ArrowUp className="w-3.5 h-3.5 text-[#35E0FF]" />
            <span>ALTITUDE</span>
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="500"
              step="1"
              value={alt}
              onChange={(e) => {
                setAlt(e.target.value);
                setCoordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply(e);
              }}
              className="w-16 px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
            />
            <span className="text-[#64748B] text-[10px]">m</span>
          </div>
        </div>

        {/* Speed Input */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[#8E9EAA]">
            <Zap className="w-3.5 h-3.5 text-[#EEF4F8]" />
            <span>SPEED</span>
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0.5"
              max="25"
              step="0.5"
              value={speed}
              onChange={(e) => {
                setSpeed(e.target.value);
                setCoordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply(e);
              }}
              className="w-16 px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
            />
            <span className="text-[#64748B] text-[10px]">m/s</span>
          </div>
        </div>

        {/* Hold Time Input */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[#8E9EAA]">
            <Clock className="w-3.5 h-3.5 text-[#2FE089]" />
            <span>HOLD TIME</span>
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="600"
              step="1"
              value={holdTime}
              onChange={(e) => {
                setHoldTime(e.target.value);
                setCoordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply(e);
              }}
              className="w-16 px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
            />
            <span className="text-[#64748B] text-[10px]">sec</span>
          </div>
        </div>

        {/* Heading Dropdown */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[#8E9EAA]">
            <Compass className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>HEADING</span>
          </label>
          <select
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              setCoordError("");
            }}
            className="px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-white text-[11px] focus:border-[#35E0FF] outline-none"
          >
            <option value="Auto">Auto (Follow Leg)</option>
            <option value="North">North (0°)</option>
            <option value="East">East (90°)</option>
            <option value="South">South (180°)</option>
            <option value="West">West (270°)</option>
            <option value="Custom">Custom Deg</option>
          </select>
        </div>

        {/* Custom Heading Input (if Custom selected) */}
        {heading === "Custom" && (
          <div className="flex items-center justify-between pl-5">
            <span className="text-[10px] text-[#64748B]">DEGREES</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="359"
                value={customHeading}
                onChange={(e) => {
                  setCustomHeading(e.target.value);
                  setCoordError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply(e);
                }}
                className="w-16 px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none text-[11px]"
              />
              <span className="text-[#64748B] text-[10px]">°</span>
            </div>
          </div>
        )}

        {/* Prominent Validation Error Banner */}
        {coordError && (
          <div className="p-2 rounded-lg bg-[#EF44441A] border border-[#EF44444D] text-[#EF4444] text-[10px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{coordError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#16212E] gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#FF4757] hover:bg-[#FF47571A] border border-[#FF475733] transition text-[11px] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#35E0FF] text-[#06090E] font-bold hover:bg-[#20CAEC] transition shadow-[0_0_10px_rgba(53,224,255,0.3)] text-[11px] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
