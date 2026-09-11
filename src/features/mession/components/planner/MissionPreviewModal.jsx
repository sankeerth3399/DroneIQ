import { X, Route, ArrowUp, Clock, Target, CheckCircle2 } from "lucide-react";

export default function MissionPreviewModal({
  missionName,
  items = [],
  formattedDistance,
  maxAltitude,
  formattedDuration,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none font-mono">
      <div className="w-full max-w-3xl rounded-2xl bg-[#080C14FA] border border-[#1A2633] shadow-2xl overflow-hidden text-xs text-[#EEF4F8] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A2633] bg-[#0C121DF2] shrink-0">
          <div className="flex items-center gap-2.5">
            <Route className="w-5 h-5 text-[#35E0FF]" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">MISSION PLAN PREVIEW</h2>
              <p className="text-[11px] text-[#8E9EAA]">{missionName} ({items.length} Planned Items)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E9EAA] hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#0A0F17] border-b border-[#16212E] shrink-0">
          <div className="p-2.5 rounded-xl bg-[#0D1522] border border-[#1C2834]">
            <span className="text-[#64748B] text-[10px] block flex items-center gap-1">
              <Target className="w-3 h-3 text-[#35E0FF]" />
              <span>TOTAL ITEMS</span>
            </span>
            <span className="text-base font-bold text-white mt-0.5 block">{items.length}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1522] border border-[#1C2834]">
            <span className="text-[#64748B] text-[10px] block flex items-center gap-1">
              <Route className="w-3 h-3 text-[#35E0FF]" />
              <span>TOTAL DISTANCE</span>
            </span>
            <span className="text-base font-bold text-[#B7F3FF] mt-0.5 block">{formattedDistance}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1522] border border-[#1C2834]">
            <span className="text-[#64748B] text-[10px] block flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-[#2FE089]" />
              <span>MAX ALTITUDE</span>
            </span>
            <span className="text-base font-bold text-[#2FE089] mt-0.5 block">{maxAltitude} m</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1522] border border-[#1C2834]">
            <span className="text-[#64748B] text-[10px] block flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#EEF4F8]" />
              <span>EST FLIGHT TIME</span>
            </span>
            <span className="text-base font-bold text-white mt-0.5 block">{formattedDuration}</span>
          </div>
        </div>

        {/* Table of Items */}
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Type / Label</th>
                <th className="px-3 py-2.5">Latitude</th>
                <th className="px-3 py-2.5">Longitude</th>
                <th className="px-3 py-2.5">Altitude</th>
                <th className="px-3 py-2.5">Speed</th>
                <th className="px-3 py-2.5">Hold</th>
                <th className="px-3 py-2.5">Heading</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
              {items.map((it, idx) => (
                <tr key={it.id} className="hover:bg-[#0D1522] transition">
                  <td className="px-3 py-2 font-bold text-[#35E0FF]">{idx + 1}</td>
                  <td className="px-3 py-2 font-semibold text-white">
                    <span className="px-2 py-0.5 rounded bg-[#172230] border border-[#23354A] text-[10px]">
                      {it.label || it.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#B7F3FF]">{it.lat?.toFixed(6)}°</td>
                  <td className="px-3 py-2 text-[#B7F3FF]">{it.lng?.toFixed(6)}°</td>
                  <td className="px-3 py-2 text-[#2FE089] font-bold">{it.alt} m</td>
                  <td className="px-3 py-2 text-[#94A3B8]">{it.speed} m/s</td>
                  <td className="px-3 py-2 text-[#8E9EAA]">{it.holdTime || 0}s</td>
                  <td className="px-3 py-2 text-[#A78BFA]">{it.heading}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1A2633] bg-[#0C121DF2] shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#2FE089]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mission sequence verified and ready for execution.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-[#35E0FF] text-[#06090E] font-bold hover:bg-[#20CAEC] transition shadow-[0_0_10px_rgba(53,224,255,0.3)] text-xs"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
