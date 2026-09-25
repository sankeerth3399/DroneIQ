import { useState } from "react"
import {
  Target,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Shield,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"
import { formatLogDate, formatLogTime } from "@/services/api/logService.js"

export const MissionLogTable = ({
  logs = [],
  onSelectLog,
  onViewFlight,
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [expandedRowId, setExpandedRowId] = useState(null)

  const actualPageSize = pageSize === "ALL" ? Math.max(1, logs.length) : Number(pageSize) || 25
  const totalPages = Math.ceil(logs.length / actualPageSize) || 1
  const paginatedLogs = logs.slice((currentPage - 1) * actualPageSize, currentPage * actualPageSize)

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedRowId((prev) => (prev === id ? null : id))
  }

  const getEventBadge = (event = "") => {
    const ev = event.toUpperCase()
    if (ev.includes("COMPLETED")) {
      return {
        icon: CheckCircle2,
        color: "text-[#2FE089] bg-[#2FE0891F] border-[#2FE08940]",
      }
    }
    if (ev.includes("ABORTED") || ev.includes("FAILED") || ev.includes("FAILSAFE")) {
      return {
        icon: AlertTriangle,
        color: "text-[#FF4141] bg-[#FF41411F] border-[#FF414140]",
      }
    }
    if (ev.includes("STARTED") || ev.includes("RUNNING")) {
      return {
        icon: Play,
        color: "text-[#38BDF8] bg-[#38BDF81F] border-[#38BDF840]",
      }
    }
    if (ev.includes("WAYPOINT")) {
      return {
        icon: MapPin,
        color: "text-[#35E0FF] bg-[#35E0FF1F] border-[#35E0FF40]",
      }
    }
    if (ev.includes("GEOFENCE")) {
      return {
        icon: Shield,
        color: "text-[#F59E0B] bg-[#F59E0B1F] border-[#F59E0B40]",
      }
    }
    if (ev.includes("UPLOADED")) {
      return {
        icon: Upload,
        color: "text-[#A855F7] bg-[#A855F71F] border-[#A855F740]",
      }
    }
    return {
      icon: Info,
      color: "text-[#94A3B8] bg-[#94A3B81F] border-[#94A3B840]",
    }
  }

  const getStatusBadge = (status = "") => {
    const s = status.toLowerCase()
    switch (s) {
      case "completed":
        return "text-[#2FE089] bg-[#2FE0891F] border-[#2FE08940]"
      case "running":
        return "text-[#38BDF8] bg-[#38BDF81F] border-[#38BDF840] animate-pulse"
      case "ready":
        return "text-[#35E0FF] bg-[#35E0FF1F] border-[#35E0FF40]"
      case "failed":
      case "aborted":
        return "text-[#FF4141] bg-[#FF41411F] border-[#FF414140]"
      case "cancelled":
        return "text-[#94A3B8] bg-[#94A3B81F] border-[#94A3B840]"
      case "draft":
      default:
        return "text-[#E2E8F0] bg-[#33415533] border-[#47556940]"
    }
  }

  const getModeBadge = (mode = "") => {
    switch (mode) {
      case "AUTO":
        return "text-[#A855F7] bg-[#A855F71A] border-[#A855F733]"
      case "GUIDED":
        return "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]"
      case "RTL":
        return "text-[#F59E0B] bg-[#F59E0B1A] border-[#F59E0B33]"
      default:
        return "text-[#94A3B8] bg-[#1E293B] border-[#334155]"
    }
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] p-12 text-center font-mono">
        <Target className="w-10 h-10 text-[#64748B] mx-auto mb-3 opacity-60" />
        <h3 className="text-white font-semibold text-sm">No Mission Logs Match Criteria</h3>
        <p className="text-xs text-[#8E9EAA] mt-1 max-w-sm mx-auto">
          Try adjusting your search query, status filters, or date range to view logged mission milestones.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-xl select-none font-mono">
      {/* Mobile View: Expandable Cards (< lg) */}
      <div className="lg:hidden divide-y divide-[#16212E]">
        {paginatedLogs.map((log) => {
          const isExpanded = expandedRowId === log.id
          const evBadge = getEventBadge(log.event)
          const EvIcon = evBadge.icon

          return (
            <div
              key={log.id}
              onClick={() => onSelectLog?.(log)}
              className="p-3.5 space-y-2.5 hover:bg-[#111A26] transition cursor-pointer"
            >
              {/* Row 1: Mission + Status + Event */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {log.missionName || log.projectName}
                  </span>
                  <span className="text-[10px] text-[#35E0FF] bg-[#35E0FF14] px-1.5 py-0.5 rounded border border-[#35E0FF33] shrink-0">
                    {log.missionId}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase shrink-0 ${getStatusBadge(
                    log.status
                  )}`}
                >
                  {log.status}
                </span>
              </div>

              {/* Row 2: Event Badge + Flight Mode */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${evBadge.color}`}
                >
                  <EvIcon className="w-3 h-3" />
                  <span>{log.event}</span>
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getModeBadge(
                    log.flightMode
                  )}`}
                >
                  {log.flightMode}
                </span>
              </div>

              {/* Row 3: Drone, Operator, Time */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-[#94A3B8] bg-[#070B11] p-2 rounded-lg border border-[#141E2B]">
                <div>
                  <span className="text-[#64748B] block text-[9px]">DRONE</span>
                  <span className="text-white font-bold">{log.droneId}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[9px]">OPERATOR</span>
                  <span className="text-[#CBD5E1] truncate block">{log.operator}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[9px]">TIMESTAMP</span>
                  <span className="text-[#94A3B8]">
                    {formatLogTime(log.timestamp)}
                  </span>
                </div>
              </div>

              {/* Row 4: Short Details */}
              <p className="text-[11px] text-[#8E9EAA] line-clamp-2 leading-relaxed">
                {log.details}
              </p>

              {/* Expand Toggle */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-[#35E0FF]">
                <button
                  type="button"
                  onClick={(e) => toggleExpand(log.id, e)}
                  className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <span>Hide Extra</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Inspect Details</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>

                {log.flightId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewFlight?.(log.flightId)
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-[#2FE089] hover:underline"
                  >
                    <span>Flight Log</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 p-2.5 rounded bg-[#05080E] border border-[#1A2633] space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Date:</span>
                    <span className="text-white">{formatLogDate(log.timestamp)}</span>
                  </div>
                  {log.waypointCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Waypoints Progress:</span>
                      <span className="text-[#35E0FF]">
                        {log.completedWaypoints ?? 0} / {log.waypointCount} Completed
                      </span>
                    </div>
                  )}
                  {log.duration && log.duration !== "--" && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Sortie Duration:</span>
                      <span className="text-[#2FE089]">{log.duration}</span>
                    </div>
                  )}
                  {log.distance && log.distance !== "--" && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Flight Distance:</span>
                      <span className="text-white">{log.distance}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop / Tablet View: Full Table (lg+) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-3.5 py-3">Timestamp</th>
              <th className="px-3.5 py-3">Mission / Project</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Drone</th>
              <th className="px-3.5 py-3">Operator</th>
              <th className="px-3.5 py-3">Event</th>
              <th className="px-2.5 py-3">Mode</th>
              <th className="px-2.5 py-3">Status</th>
              <th className="px-4 py-3">Milestone Details</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
            {paginatedLogs.map((log) => {
              const evBadge = getEventBadge(log.event)
              const EvIcon = evBadge.icon

              return (
                <tr
                  key={log.id}
                  onClick={() => onSelectLog?.(log)}
                  className="hover:bg-[#111A26] transition cursor-pointer group"
                >
                  {/* Timestamp */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="font-semibold text-white text-[11px]">
                      {formatLogTime(log.timestamp)}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {formatLogDate(log.timestamp)}
                    </div>
                  </td>

                  {/* Mission Name */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="font-bold text-white group-hover:text-[#35E0FF] transition max-w-[160px] truncate">
                      {log.missionName || log.projectName}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {log.waypointCount ? `${log.waypointCount} Waypoints` : "General Plan"}
                    </div>
                  </td>

                  {/* Mission ID */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-[10px] font-mono font-semibold text-[#35E0FF] bg-[#35E0FF14] px-1.5 py-0.5 rounded border border-[#35E0FF33]">
                      {log.missionId}
                    </span>
                  </td>

                  {/* Drone ID */}
                  <td className="px-3 py-3 whitespace-nowrap font-bold text-white">
                    {log.droneId}
                  </td>

                  {/* Operator */}
                  <td className="px-3.5 py-3 whitespace-nowrap text-[#CBD5E1]">
                    {log.operator}
                  </td>

                  {/* Event Badge */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${evBadge.color}`}
                    >
                      <EvIcon className="w-3 h-3 shrink-0" />
                      <span>{log.event}</span>
                    </span>
                  </td>

                  {/* Flight Mode */}
                  <td className="px-2.5 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getModeBadge(
                        log.flightMode
                      )}`}
                    >
                      {log.flightMode}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-2.5 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase ${getStatusBadge(
                        log.status
                      )}`}
                    >
                      {log.status}
                    </span>
                  </td>

                  {/* Milestone Details */}
                  <td className="px-4 py-3 max-w-[280px]">
                    <div className="text-[11px] text-[#94A3B8] truncate leading-tight">
                      {log.details}
                    </div>
                    {log.completedWaypoints !== undefined && log.waypointCount > 0 && (
                      <div className="text-[9px] text-[#64748B] mt-0.5">
                        WP: {log.completedWaypoints}/{log.waypointCount}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectLog?.(log)
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#172230] border border-[#23354A] hover:border-[#35E0FF] hover:text-[#35E0FF] text-[#B7F3FF] text-[11px] transition cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-3 bg-[#0B1017] border-t border-[#1A2633] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#8E9EAA] text-[11px]">
            Page <span className="text-white font-bold">{currentPage}</span> of{" "}
            <span className="text-white font-bold">{totalPages}</span> ({logs.length} Total Logs)
          </span>

          <div className="flex items-center gap-1.5 text-[11px] text-[#8E9EAA]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                setPageSize(val)
                setCurrentPage(1)
              }}
              className="bg-[#16212E] text-white border border-[#23354A] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-[#35E0FF] cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">All</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-[#16212E] text-[#CBD5E1] hover:bg-[#202F42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-xs"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-[#64748B]">...</span>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded text-xs transition cursor-pointer ${
                    p === currentPage
                      ? "bg-[#35E0FF] text-[#0A0E16] font-bold"
                      : "bg-[#16212E] text-[#CBD5E1] hover:bg-[#202F42]"
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-[#16212E] text-[#CBD5E1] hover:bg-[#202F42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default MissionLogTable
