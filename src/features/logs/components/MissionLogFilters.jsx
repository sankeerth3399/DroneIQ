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
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D5E1ED] shadow-xs space-y-4 font-sans select-none">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => handleFieldChange("search", e.target.value)}
            placeholder="Search by mission ID, drone, operator or event…"
            className="w-full h-11 sm:h-12 pl-10 pr-9 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 outline-none transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleFieldChange("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0D233A] p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status count badge & Reset button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="text-[#64748B] font-medium">
            Showing <strong className="text-[#1E64D4] font-bold">{filteredCount}</strong> of{" "}
            <strong className="text-[#0D233A] font-bold">{totalCount}</strong> events
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E64D4] border border-[#CBD5E1] font-bold text-xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-3 border-t border-[#E2E8F0]">
        {/* Mission Filter */}
        <div>
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Mission
          </label>
          <select
            value={filters.missionId || "ALL"}
            onChange={(e) => handleFieldChange("missionId", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
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
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Drone
          </label>
          <select
            value={filters.droneId || "ALL"}
            onChange={(e) => handleFieldChange("droneId", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
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
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Operator
          </label>
          <select
            value={filters.operator || "ALL"}
            onChange={(e) => handleFieldChange("operator", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
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
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Event Type
          </label>
          <select
            value={filters.event || "ALL"}
            onChange={(e) => handleFieldChange("event", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
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
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Status
          </label>
          <select
            value={filters.status || "ALL"}
            onChange={(e) => handleFieldChange("status", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
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
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Flight Mode
          </label>
          <select
            value={filters.flightMode || "ALL"}
            onChange={(e) => handleFieldChange("flightMode", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            {flightModes.map((fm) => (
              <option key={fm} value={fm}>
                {fm}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Filter */}
        <div>
          <label className="text-xs font-semibold text-[#18314C] block mb-1.5">
            Time Range
          </label>
          <select
            value={filters.range || "ALL"}
            onChange={(e) => handleFieldChange("range", e.target.value)}
            className="w-full h-10 px-2.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] outline-none transition cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default MissionLogFilters
