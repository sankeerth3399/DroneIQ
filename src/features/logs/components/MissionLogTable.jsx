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
  ChevronLeft,
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
        color: "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]",
      }
    }
    if (ev.includes("ABORTED") || ev.includes("FAILED") || ev.includes("FAILSAFE")) {
      return {
        icon: AlertTriangle,
        color: "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]",
      }
    }
    if (ev.includes("STARTED") || ev.includes("RUNNING")) {
      return {
        icon: Play,
        color: "text-[#1E64D4] bg-[#EFF6FF] border-[#BFDBFE]",
      }
    }
    if (ev.includes("WAYPOINT")) {
      return {
        icon: MapPin,
        color: "text-[#0284C7] bg-[#F0F9FF] border-[#BAE6FD]",
      }
    }
    if (ev.includes("GEOFENCE")) {
      return {
        icon: Shield,
        color: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
      }
    }
    if (ev.includes("UPLOADED")) {
      return {
        icon: Upload,
        color: "text-[#7C3AED] bg-[#FAF5FF] border-[#E9D5FF]",
      }
    }
    return {
      icon: Info,
      color: "text-[#475569] bg-[#F1F5F9] border-[#E2E8F0]",
    }
  }

  const getStatusBadge = (status = "") => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]"
      case "RUNNING":
        return "text-[#0284C7] bg-[#F0F9FF] border-[#BAE6FD]"
      case "READY":
        return "text-[#1E64D4] bg-[#EFF6FF] border-[#BFDBFE]"
      case "FAILED":
        return "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]"
      case "CANCELLED":
        return "text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]"
      case "DRAFT":
      default:
        return "text-[#475569] bg-[#F8FAFC] border-[#CAD8E6]"
    }
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#D5E1ED] p-12 text-center font-sans shadow-xs">
        <Target className="w-10 h-10 text-[#94A3B8] mx-auto mb-3 opacity-80" />
        <h3 className="text-[#0D233A] font-bold text-sm sm:text-base">No Mission Logs Recorded</h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
          No waypoint or geofence lifecycle events match your active filters.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#D5E1ED] overflow-hidden shadow-xs select-none font-sans flex flex-col">
      {/* Desktop View: Full Table (lg+) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-xs font-sans border-collapse">
          <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-[140px]">Timestamp</th>
              <th className="px-4 py-3.5 w-[160px]">Mission / Project</th>
              <th className="px-4 py-3.5 w-[200px]">Event / Milestone</th>
              <th className="px-3.5 py-3.5 w-[130px]">Target / Drone</th>
              <th className="px-3.5 py-3.5 w-[130px]">Operator</th>
              <th className="px-3.5 py-3.5 w-[130px]">Status</th>
              <th className="px-4 py-3.5">Mission Details & Context</th>
              <th className="px-4 py-3.5 text-right w-[110px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {paginatedLogs.map((log) => {
              const evBadge = getEventBadge(log.event)
              const EvIcon = evBadge.icon
              const isExpanded = expandedRowId === log.id

              return (
                <tr key={log.id} className="hover:bg-[#F8FAFC] transition">
                  {/* Timestamp */}
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <div className="font-mono font-bold text-[#0D233A] text-xs">
                      {formatLogTime(log.timestamp)}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                      {formatLogDate(log.timestamp)}
                    </div>
                  </td>

                  {/* Mission / Project */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="font-bold text-[#0D233A] text-xs truncate max-w-[150px]">
                      {log.missionName || log.missionId}
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] truncate mt-0.5">
                      {log.missionId}
                    </div>
                  </td>

                  {/* Event / Milestone */}
                  <td className="px-4 py-3.5 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${evBadge.color}`}
                    >
                      <EvIcon className="w-3.5 h-3.5" />
                      <span>{log.event}</span>
                    </span>
                  </td>

                  {/* Drone */}
                  <td className="px-3.5 py-3.5 align-middle font-mono font-semibold text-[#0E2646]">
                    {log.droneId || "DRONE-001"}
                  </td>

                  {/* Operator */}
                  <td className="px-3.5 py-3.5 align-middle text-[#475569] font-medium">
                    {log.operator || "Operator"}
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${getStatusBadge(
                        log.status
                      )}`}
                    >
                      {log.status || "Ready"}
                    </span>
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3.5 align-middle text-[#334155] leading-relaxed max-w-md">
                    <div className={isExpanded ? "" : "line-clamp-2"}>
                      {log.details || "--"}
                    </div>
                    {log.flightId && (
                      <button
                        type="button"
                        onClick={() => onViewFlight?.(log.flightId)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] hover:underline mt-1 cursor-pointer"
                      >
                        <span>Flight Sortie {log.flightId}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectLog?.(log)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1E64D4] hover:underline cursor-pointer"
                    >
                      <span>Inspect &gt;</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 bg-white border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-[#0D233A]">{(currentPage - 1) * actualPageSize + 1}</strong> to{" "}
            <strong className="text-[#0D233A]">
              {Math.min(currentPage * actualPageSize, logs.length)}
            </strong>{" "}
            of <strong className="text-[#0D233A]">{logs.length}</strong> records
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-7 px-1.5 rounded-lg bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-semibold text-[#0E2646] focus:border-[#1E64D4] outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="ALL">All</option>
            </select>
          </div>
        </div>

        {pageSize !== "ALL" && totalPages > 1 && (
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CAD8E6] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-[#0D233A]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CAD8E6] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MissionLogTable
