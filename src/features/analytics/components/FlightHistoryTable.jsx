import { useState, useMemo } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Eye,
  Plane,
} from "lucide-react"

export const FlightHistoryTable = ({
  flights = [],
  onSelectFlight,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortField, setSortField] = useState("startTime")
  const [sortOrder, setSortOrder] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Filtered & Sorted Flights
  const processedFlights = useMemo(() => {
    let list = [...flights]

    if (statusFilter !== "ALL") {
      list = list.filter((f) => f.status.toUpperCase() === statusFilter.toUpperCase())
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        (f) =>
          f.id.toLowerCase().includes(q) ||
          f.droneId.toLowerCase().includes(q) ||
          f.operator.toLowerCase().includes(q) ||
          f.missionName.toLowerCase().includes(q) ||
          f.flightMode.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      return sortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0)
    })

    return list
  }, [flights, statusFilter, searchTerm, sortField, sortOrder])

  const totalPages = Math.ceil(processedFlights.length / pageSize) || 1
  const paginatedFlights = processedFlights.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  return (
    <div className="rounded-xl bg-[#0B1017] border border-[#1A2633] overflow-hidden font-mono select-none shadow-lg">
      {/* Table Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-[#1A2633] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-[#35E0FF]" />
          <h3 className="font-bold text-white uppercase tracking-wider">
            Fleet Flight Sorties ({processedFlights.length})
          </h3>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search flight, drone, op..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#06090E] border border-[#1E2E3E] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#35E0FF]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-[#1E2E3E] text-white text-xs cursor-pointer focus:outline-none focus:border-[#35E0FF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABORTED">Aborted</option>
          </select>

          {/* Quick Export CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1520] hover:bg-[#162232] border border-[#1E2E3E] text-[#35E0FF] text-xs transition cursor-pointer"
            title="Export filtered table as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Desktop / Tablet Table (sm+) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center gap-1">
                  <span>Flight ID</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white"
                onClick={() => handleSort("droneId")}
              >
                <div className="flex items-center gap-1">
                  <span>Drone</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Mission</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white"
                onClick={() => handleSort("durationSeconds")}
              >
                <div className="flex items-center gap-1">
                  <span>Duration</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white"
                onClick={() => handleSort("distanceKm")}
              >
                <div className="flex items-center gap-1">
                  <span>Distance</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-4">Max Alt / Spd</th>
              <th className="py-3 px-4">Battery</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2633]">
            {paginatedFlights.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-8 text-center text-[#64748B]">
                  No flights found matching search criteria.
                </td>
              </tr>
            ) : (
              paginatedFlights.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => onSelectFlight?.(f)}
                  className="hover:bg-[#121A26] transition cursor-pointer group"
                >
                  <td className="py-3 px-4 font-bold text-[#35E0FF] group-hover:underline">
                    {f.id}
                  </td>
                  <td className="py-3 px-4 text-white font-semibold">{f.droneId}</td>
                  <td className="py-3 px-4 text-[#8E9EAA]">{f.operator}</td>
                  <td className="py-3 px-4 text-[#EEF4F8] max-w-[140px] truncate" title={f.missionName}>
                    {f.missionName}
                  </td>
                  <td className="py-3 px-4 text-white">{f.durationFormatted}</td>
                  <td className="py-3 px-4 text-[#8E9EAA]">{f.distanceKm} km</td>
                  <td className="py-3 px-4 text-[#8E9EAA]">
                    {f.maxAltitudeM}m • {f.maxSpeedMs}m/s
                  </td>
                  <td className="py-3 px-4 text-[#F59E0B]">
                    {f.batteryStart}% → {f.batteryEnd}%
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#142232] text-[#35E0FF] border border-[#203C54]">
                      {f.flightMode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.status === "Completed"
                          ? "bg-[#102A20] text-[#2FE089] border border-[#1F4A38]"
                          : "bg-[#2A1414] text-[#FF8585] border border-[#5E2222]"
                      }`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      className="p-1 rounded text-[#35E0FF] hover:bg-[#35E0FF26] transition"
                      title="View telemetry drill-down"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (< sm) */}
      <div className="sm:hidden divide-y divide-[#1A2633]">
        {paginatedFlights.map((f) => (
          <div
            key={f.id}
            onClick={() => onSelectFlight?.(f)}
            className="p-3.5 space-y-2 hover:bg-[#121A26] transition cursor-pointer text-xs font-mono"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#35E0FF]">{f.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  f.status === "Completed"
                    ? "bg-[#102A20] text-[#2FE089] border border-[#1F4A38]"
                    : "bg-[#2A1414] text-[#FF8585] border border-[#5E2222]"
                }`}
              >
                {f.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8E9EAA]">
              <div>
                <span className="text-[#64748B] text-[9px] block">AIRCRAFT</span>
                <span className="text-white font-semibold">{f.droneId}</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">OPERATOR</span>
                <span>{f.operator}</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">DURATION / DISTANCE</span>
                <span className="text-white">{f.durationFormatted} • {f.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">BATTERY DELTA</span>
                <span className="text-[#F59E0B]">{f.batteryStart}% → {f.batteryEnd}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-[#1A2633] flex items-center justify-between gap-3 text-xs text-[#8E9EAA]">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="bg-[#06090E] border border-[#1E2E3E] rounded px-2 py-0.5 text-white"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded bg-[#0E1520] hover:bg-[#14202C] disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded bg-[#0E1520] hover:bg-[#14202C] disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FlightHistoryTable
