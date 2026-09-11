import { useState } from "react";
import { Settings, X, Check, ArrowUp, Zap, Clock, Compass, ShieldAlert } from "lucide-react";

export default function MissionSettingsModal({
  settings,
  onSaveSettings,
  onClose,
}) {
  const [alt, setAlt] = useState(settings.defaultAlt ?? 50);
  const [speed, setSpeed] = useState(settings.defaultSpeed ?? 8.5);
  const [holdTime, setHoldTime] = useState(settings.defaultHoldTime ?? 0);
  const [heading, setHeading] = useState(settings.defaultHeading ?? "Auto");
  const [onComplete, setOnComplete] = useState(settings.onComplete ?? "RTL");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({
      defaultAlt: Number(alt),
      defaultSpeed: Number(speed),
      defaultHoldTime: Number(holdTime),
      defaultHeading: heading,
      onComplete,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 select-none font-mono">
      <div className="w-full max-w-md rounded-2xl bg-[#080C14FA] border border-[#1A2633] shadow-2xl overflow-hidden text-xs text-[#EEF4F8]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A2633] bg-[#0C121DF2]">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#35E0FF]" />
            <h2 className="text-sm font-bold text-white tracking-wide">MISSION DEFAULT SETTINGS</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E9EAA] hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[11px] text-[#8E9EAA]">
            Set baseline parameters applied automatically to newly placed mission waypoints.
          </p>

          {/* Default Alt */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C131F] border border-[#16212E]">
            <label className="flex items-center gap-2 text-[#94A3B8]">
              <ArrowUp className="w-4 h-4 text-[#35E0FF]" />
              <span>DEFAULT ALTITUDE</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="500"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="w-20 px-2.5 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
              />
              <span className="text-[#64748B] text-[11px]">meters</span>
            </div>
          </div>

          {/* Default Speed */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C131F] border border-[#16212E]">
            <label className="flex items-center gap-2 text-[#94A3B8]">
              <Zap className="w-4 h-4 text-[#EEF4F8]" />
              <span>DEFAULT SPEED</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="25"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-20 px-2.5 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
              />
              <span className="text-[#64748B] text-[11px]">m/s</span>
            </div>
          </div>

          {/* Default Hold Time */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C131F] border border-[#16212E]">
            <label className="flex items-center gap-2 text-[#94A3B8]">
              <Clock className="w-4 h-4 text-[#2FE089]" />
              <span>DEFAULT HOLD TIME</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="300"
                value={holdTime}
                onChange={(e) => setHoldTime(e.target.value)}
                className="w-20 px-2.5 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-right text-white font-bold focus:border-[#35E0FF] outline-none"
              />
              <span className="text-[#64748B] text-[11px]">sec</span>
            </div>
          </div>

          {/* Default Heading */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C131F] border border-[#16212E]">
            <label className="flex items-center gap-2 text-[#94A3B8]">
              <Compass className="w-4 h-4 text-[#A78BFA]" />
              <span>DEFAULT HEADING</span>
            </label>
            <select
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="px-3 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-white text-xs focus:border-[#35E0FF] outline-none"
            >
              <option value="Auto">Auto (Follow Course)</option>
              <option value="North">North (0°)</option>
              <option value="East">East (90°)</option>
              <option value="South">South (180°)</option>
              <option value="West">West (270°)</option>
            </select>
          </div>

          {/* Mission Completion Action */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C131F] border border-[#16212E]">
            <label className="flex items-center gap-2 text-[#94A3B8]">
              <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
              <span>ON COMPLETION</span>
            </label>
            <select
              value={onComplete}
              onChange={(e) => setOnComplete(e.target.value)}
              className="px-3 py-1 bg-[#0E1520] border border-[#1C2834] rounded text-[#F59E0B] font-bold text-xs focus:border-[#35E0FF] outline-none"
            >
              <option value="RTL">Return to Launch (RTL)</option>
              <option value="LAND">Precision Land</option>
              <option value="HOVER">Hover at Final Point</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1A2633]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#1E293B] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#35E0FF] text-[#06090E] font-bold hover:bg-[#20CAEC] transition shadow-[0_0_12px_rgba(53,224,255,0.3)]"
            >
              <Check className="w-4 h-4" />
              <span>Apply Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
