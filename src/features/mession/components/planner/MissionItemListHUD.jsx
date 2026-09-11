import { useState } from "react";
import {
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Crosshair,
  PlaneTakeoff,
  PlaneLanding,
  Navigation,
} from "lucide-react";

export default function MissionItemListHUD({
  items = [],
  selectedWaypointId,
  onSelectWaypoint,
  onMoveOrder,
  onDeleteWaypoint,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const getItemIcon = (type) => {
    switch (type) {
      case "TAKEOFF":
        return <PlaneTakeoff className="w-3.5 h-3.5 text-[#2FE089]" />;
      case "LAND":
        return <PlaneLanding className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case "RTL":
        return <Navigation className="w-3.5 h-3.5 text-[#A78BFA]" />;
      default:
        return <Crosshair className="w-3.5 h-3.5 text-[#35E0FF]" />;
    }
  };

  return (
    <div className="rounded-xl bg-[#080C14F2] border border-[#1A2633] shadow-2xl backdrop-blur-md text-xs font-mono text-[#EEF4F8] select-none pointer-events-auto overflow-hidden flex flex-col max-h-[calc(100vh-220px)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A2633] bg-[#0C121DF2] shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-1.5 text-[#35E0FF] font-bold text-[11px] hover:text-white transition"
        >
          <List className="w-3.5 h-3.5" />
          <span>MISSION ITEMS</span>
          <span className="px-1.5 py-0.2 rounded bg-[#35E0FF1A] text-[9.5px] border border-[#35E0FF33]">
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-[#8E9EAA] hover:text-white p-1 rounded-md hover:bg-[#1E293B] transition"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Items List */}
      {!collapsed && (
        <div className="overflow-y-auto p-1.5 space-y-1 w-64 sm:w-72 divide-y divide-[#141F2B]">
          {items.length === 0 ? (
            <div className="p-4 text-center text-[#64748B] text-[11px]">
              No mission items yet.
              <br />
              Click <span className="text-[#35E0FF] font-semibold">+ Waypoint</span> to begin.
            </div>
          ) : (
            items.map((it, idx) => {
              const isSelected = it.id === selectedWaypointId;

              return (
                <div
                  key={it.id}
                  onClick={() => onSelectWaypoint(it.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? "bg-[#35E0FF1A] border border-[#35E0FF4D] text-white shadow-[0_0_8px_rgba(53,224,255,0.15)]"
                      : "hover:bg-[#0E1520] border border-transparent text-[#94A3B8]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[10px] text-[#64748B] w-4 text-right">{String(idx + 1).padStart(2, "0")}</span>
                    {getItemIcon(it.type)}
                    <span className={`font-semibold text-[11px] ${isSelected ? "text-[#35E0FF]" : "text-[#EEF4F8]"}`}>
                      {it.label || `WP${it.seq}`}
                    </span>
                    <span className="text-[10px] text-[#2FE089] bg-[#2FE08914] px-1 rounded">
                      {it.alt}m
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveOrder(idx, -1)}
                      className="p-1 text-[#8E9EAA] hover:text-white disabled:opacity-20 disabled:hover:text-[#8E9EAA] transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => onMoveOrder(idx, 1)}
                      className="p-1 text-[#8E9EAA] hover:text-white disabled:opacity-20 disabled:hover:text-[#8E9EAA] transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteWaypoint(it.id)}
                      className="p-1 text-[#8E9EAA] hover:text-[#FF4757] transition ml-1"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
