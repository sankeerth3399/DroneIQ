import { useState } from "react"
import { Filter, RotateCcw, ChevronDown, SlidersHorizontal, Check } from "lucide-react"

export const AnalyticsFilters = ({
  filters = {},
  onChangeFilter,
  onResetFilters,
  onApplyFilters,
  drones = [],
  missions = [],
  operators = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    if (key === "range" && val === "Last 7 Days") return false
    return val && val !== "ALL"
  }).length

  return (
    <div className="w-full rounded-xl bg-[#090D14] border border-[#1A2633] p-3 sm:p-4 font-mono select-none space-y-3">
      {/* Top Filter Bar Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#EEF4F8]">
          <SlidersHorizontal className="w-4 h-4 text-[#35E0FF]" />
          <span>GLOBAL ANALYTICS FILTERS</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#35E0FF26] text-[#35E0FF] text-[10px] font-bold border border-[#35E0FF4D]">
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E1520] hover:bg-[#162232] border border-[#1A2633] text-[#8E9EAA] hover:text-white text-[11px] transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E1520] border border-[#1A2633] text-[#35E0FF] text-[11px]"
          >
            <Filter className="w-3 h-3" />
            <span>{isExpanded ? "Hide" : "Filters"}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs ${
          isExpanded ? "block" : "hidden sm:grid"
        }`}
      >
        {/* Date Range Selector */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Time Range</label>
          <select
            value={filters.range || "Last 7 Days"}
            onChange={(e) => onChangeFilter("range", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer"
          >
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="Custom">Custom Date</option>
          </select>
        </div>

        {/* Drone Filter */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Aircraft Drone</label>
          <select
            value={filters.droneId || "ALL"}
            onChange={(e) => onChangeFilter("droneId", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer truncate"
          >
            <option value="ALL">All Fleet Drones</option>
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.name || d.model})
              </option>
            ))}
          </select>
        </div>

        {/* Mission Filter */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Target Mission</label>
          <select
            value={filters.missionId || "ALL"}
            onChange={(e) => onChangeFilter("missionId", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer truncate"
          >
            <option value="ALL">All Missions</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.projectName || m.id}
              </option>
            ))}
          </select>
        </div>

        {/* Operator Filter */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Flight Operator</label>
          <select
            value={filters.operator || "ALL"}
            onChange={(e) => onChangeFilter("operator", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer truncate"
          >
            <option value="ALL">All Operators</option>
            {operators.map((op) => (
              <option key={op.username || op.name} value={op.username || op.name}>
                {op.name || op.username} ({op.role || "Operator"})
              </option>
            ))}
          </select>
        </div>

        {/* Flight Mode Filter */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Flight Mode</label>
          <select
            value={filters.flightMode || "ALL"}
            onChange={(e) => onChangeFilter("flightMode", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer"
          >
            <option value="ALL">All Flight Modes</option>
            <option value="AUTO">AUTO (Autonomous)</option>
            <option value="GUIDED">GUIDED</option>
            <option value="LOITER">LOITER</option>
            <option value="POSHOLD">POSHOLD</option>
            <option value="RTL">RTL</option>
            <option value="MANUAL">MANUAL</option>
          </select>
        </div>

        {/* Mission Status Filter */}
        <div>
          <label className="block text-[10px] text-[#8E9EAA] uppercase mb-1">Sortie Status</label>
          <select
            value={filters.missionStatus || "ALL"}
            onChange={(e) => onChangeFilter("missionStatus", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1A2633] text-white text-[11px] focus:outline-none focus:border-[#35E0FF] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABORTED">Aborted / Failed</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Row when 'Custom' is selected */}
      {filters.range === "Custom" && (
        <div className="flex items-center gap-3 pt-2 border-t border-[#14202C] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8E9EAA] text-[10px]">Start:</span>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onChangeFilter("startDate", e.target.value)}
              className="px-2 py-1 rounded bg-[#06090E] border border-[#1A2633] text-white text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8E9EAA] text-[10px]">End:</span>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onChangeFilter("endDate", e.target.value)}
              className="px-2 py-1 rounded bg-[#06090E] border border-[#1A2633] text-white text-xs"
            />
          </div>
          <button
            type="button"
            onClick={onApplyFilters}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#35E0FF] text-[#0A0E16] font-bold text-xs hover:bg-[#25C8E5] transition"
          >
            <Check className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default AnalyticsFilters
