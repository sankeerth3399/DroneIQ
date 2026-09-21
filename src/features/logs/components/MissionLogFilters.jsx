import { Search, RotateCcw, X } from "lucide-react"

export const MissionLogFilters = ({
  filters = {},
  onChange,
  onReset,
  missions = [],
  drones = [],
  operators = [],
  eventTypes = [],
  flightModes = [],
  statuses = [],
  totalCount = 0,
  filteredCount = 0,
}) => {
  const handleFieldChange = (field, value) => {
    onChange?.({
      ...filters,
      [field]: value,
    })
  }

  const hasActiveFilters =
    Boolean(filters.search) ||
    (filters.missionId && filters.missionId !== "ALL") ||
    (filters.droneId && filters.droneId !== "ALL") ||
    (filters.operator && filters.operator !== "ALL") ||
    (filters.event && filters.event !== "ALL") ||
    (filters.status && filters.status !== "ALL") ||
    (filters.flightMode && filters.flightMode !== "ALL") ||
    (filters.range && filters.range !== "ALL")

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1017] border border-[#1A2633] space-y-3 font-mono text-xs select-none">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => handleFieldChange("search", e.target.value)}
            placeholder="Search by mission, ID, drone, operator, or event..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-white placeholder-[#64748B] focus:border-[#35E0FF] focus:outline-none focus:ring-1 focus:ring-[#35E0FF] transition text-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleFieldChange("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status count badge & Reset button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px]">
          <span className="text-[#8E9EAA]">
            Showing <span className="text-[#35E0FF] font-bold">{filteredCount}</span> of{" "}
            <span className="text-white font-bold">{totalCount}</span> events
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-[#93C5FD] transition cursor-pointer border border-[#374151]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 pt-1 border-t border-[#16212E]">
        {/* Mission Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Mission
          </label>
          <select
            value={filters.missionId || "ALL"}
            onChange={(e) => handleFieldChange("missionId", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Missions</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id}
              </option>
            ))}
          </select>
        </div>

        {/* Drone Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Drone
          </label>
          <select
            value={filters.droneId || "ALL"}
            onChange={(e) => handleFieldChange("droneId", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Drones</option>
            {drones.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Operator Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Operator
          </label>
          <select
            value={filters.operator || "ALL"}
            onChange={(e) => handleFieldChange("operator", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Operators</option>
            {operators.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        {/* Event Type Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Event Type
          </label>
          <select
            value={filters.event || "ALL"}
            onChange={(e) => handleFieldChange("event", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Events</option>
            {eventTypes.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Status
          </label>
          <select
            value={filters.status || "ALL"}
            onChange={(e) => handleFieldChange("status", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Flight Mode Filter */}
        <div>
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Flight Mode
          </label>
          <select
            value={filters.flightMode || "ALL"}
            onChange={(e) => handleFieldChange("flightMode", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            {flightModes.map((fm) => (
              <option key={fm} value={fm}>
                {fm}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] text-[#64748B] block mb-1 uppercase tracking-wider">
            Time Range
          </label>
          <select
            value={filters.range || "ALL"}
            onChange={(e) => handleFieldChange("range", e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#070A0F] border border-[#1E293B] text-[#CBD5E1] text-[11px] focus:border-[#35E0FF] focus:outline-none transition cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="Today">Today</option>
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="7 Days">Last 7 Days</option>
            <option value="30 Days">Last 30 Days</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default MissionLogFilters
