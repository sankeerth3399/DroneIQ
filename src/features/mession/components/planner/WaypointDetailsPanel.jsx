import { useState } from "react";
import { X, Trash2, Check, ArrowUp, Zap, Clock, Compass } from "lucide-react";

export default function WaypointDetailsPanel({
  waypoint,
  onUpdate,
  onDelete,
  onClose,
  validateCoordinates,
}) {
  const [prevId, setPrevId] = useState(waypoint.id);
  const [alt, setAlt] = useState(waypoint.alt ?? 50);
  const [speed, setSpeed] = useState(waypoint.speed ?? 8.5);
  const [holdTime, setHoldTime] = useState(waypoint.holdTime ?? 0);
  const [heading, setHeading] = useState(waypoint.heading ?? "Auto");
  const [customHeading, setCustomHeading] = useState(waypoint.customHeading ?? 0);
  const [latInput, setLatInput] = useState(String(waypoint.lat?.toFixed(6) ?? ""));
  const [lngInput, setLngInput] = useState(String(waypoint.lng?.toFixed(6) ?? ""));
  const [coordError, setCoordError] = useState("");

  // Sync state if selected waypoint id changes
  if (waypoint.id !== prevId) {
    setPrevId(waypoint.id);
    setAlt(waypoint.alt ?? 50);
    setSpeed(waypoint.speed ?? 8.5);
    setHoldTime(waypoint.holdTime ?? 0);
    setHeading(waypoint.heading ?? "Auto");
    setCustomHeading(waypoint.customHeading ?? 0);
    setLatInput(String(waypoint.lat?.toFixed(6) ?? ""));
    setLngInput(String(waypoint.lng?.toFixed(6) ?? ""));
    setCoordError("");
  }

  const handleCoordCommit = (newLatStr, newLngStr) => {
    const parsedLat = parseFloat(newLatStr);
    const parsedLng = parseFloat(newLngStr);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setCoordError("Invalid coordinate format");
      setLatInput(String(waypoint.lat?.toFixed(6) ?? ""));
      setLngInput(String(waypoint.lng?.toFixed(6) ?? ""));
      return;
    }

    if (validateCoordinates) {
      const isValid = validateCoordinates(parsedLat, parsedLng);
      if (!isValid) {
        setCoordError("WAYPOINT OUTSIDE GEOFENCE — Coordinates must remain inside boundary.");
        setLatInput(String(waypoint.lat?.toFixed(6) ?? ""));
        setLngInput(String(waypoint.lng?.toFixed(6) ?? ""));
        return;
      }
    }

    setCoordError("");
    onUpdate(waypoint.id, {
      lat: Number(parsedLat.toFixed(6)),
      lng: Number(parsedLng.toFixed(6)),
    });
  };

  const handleApply = (e) => {
    e?.preventDefault?.();
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    let finalLat = waypoint.lat;
    let finalLng = waypoint.lng;

    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      if (validateCoordinates && !validateCoordinates(parsedLat, parsedLng)) {
        setCoordError("WAYPOINT OUTSIDE GEOFENCE — Coordinates reverted.");
      } else {
        finalLat = Number(parsedLat.toFixed(6));
        finalLng = Number(parsedLng.toFixed(6));
      }
    }

    onUpdate(waypoint.id, {
      lat: finalLat,
      lng: finalLng,
      alt: Number(alt),
      speed: Number(speed),
      holdTime: Number(holdTime),
      heading,
      customHeading: Number(customHeading),
    });
    onClose();
  };

  const handleFieldChange = (field, val) => {
    onUpdate(waypoint.id, { [field]: val });
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
      className="w-72 sm:w-80 rounded-xl bg-[#080C14F5] border border-[#1C2834] shadow-2xl backdrop-blur-md text-xs font-mono text-[#EEF4F8] select-none pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
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
          onClick={onClose}
          className="text-[#8E9EAA] hover:text-white p-1 rounded-md hover:bg-[#1E293B] transition"
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
                onChange={(e) => setLatInput(e.target.value)}
                onBlur={() => handleCoordCommit(latInput, lngInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCoordCommit(latInput, lngInput);
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
                onChange={(e) => setLngInput(e.target.value)}
                onBlur={() => handleCoordCommit(latInput, lngInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCoordCommit(latInput, lngInput);
                }}
                className="w-full px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-[#35E0FF] font-semibold text-xs focus:border-[#35E0FF] outline-none"
              />
            </div>
          </div>
          {coordError && (
            <div className="text-[9px] text-[#EF4444] font-bold leading-tight pt-1">
              {coordError}
            </div>
          )}
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
                const val = Number(e.target.value);
                setAlt(val);
                handleFieldChange("alt", val);
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
                const val = Number(e.target.value);
                setSpeed(val);
                handleFieldChange("speed", val);
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
                const val = Number(e.target.value);
                setHoldTime(val);
                handleFieldChange("holdTime", val);
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
              const val = e.target.value;
              setHeading(val);
              handleFieldChange("heading", val);
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
                  const val = Number(e.target.value);
                  setCustomHeading(val);
                  handleFieldChange("customHeading", val);
                }}
                className="w-16 px-2 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none text-[11px]"
              />
              <span className="text-[#64748B] text-[10px]">°</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#16212E] gap-2">
          <button
            type="button"
            onClick={() => onDelete(waypoint.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#FF4757] hover:bg-[#FF47571A] border border-[#FF475733] transition text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#35E0FF] text-[#06090E] font-bold hover:bg-[#20CAEC] transition shadow-[0_0_10px_rgba(53,224,255,0.3)] text-[11px]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
