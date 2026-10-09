import { useState } from "react"
import {
  Activity,
  Terminal,
  Server,
  ShieldAlert,
  ListFilter,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronLeft,
  ChevronDown,
} from "lucide-react"
import { formatLogDate, formatLogTime } from "@/services/api/logService.js"

const getCategoryIcon = (category) => {
  switch (category) {
    case "telemetry":
      return Activity
    case "command":
      return Terminal
    case "system":
      return Server
    case "incident":
      return ShieldAlert
    default:
      return ListFilter
  }
}

const getCategoryBadge = (cat = "") => {
  switch (cat.toUpperCase()) {
    case "MISSION":
      return "text-[#1E64D4] bg-[#EFF6FF] border-[#BFDBFE]"
    case "FLIGHT":
      return "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]"
    case "TELEMETRY":
      return "text-[#0284C7] bg-[#F0F9FF] border-[#BAE6FD]"
    case "COMMAND":
      return "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]"
    case "SYSTEM":
      return "text-[#7C3AED] bg-[#FAF5FF] border-[#E9D5FF]"
    case "INCIDENT":
      return "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]"
    default:
      return "text-[#475569] bg-[#F1F5F9] border-[#E2E8F0]"
  }
}

const getSeverityBadge = (severity = "INFO", status = "") => {
  const check = (status || severity || "INFO").toUpperCase()

  if (check.includes("CRITICAL") || check.includes("FAIL") || check.includes("ERROR")) {
    return {
      icon: AlertOctagon,
      cls: "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]",
    }
  }
  if (check.includes("WARN") || check.includes("ALERT")) {
    return {
      icon: AlertTriangle,
      cls: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
    }
  }
  if (check.includes("SUCCESS") || check.includes("HEALTHY") || check.includes("AUTH") || check.includes("COMPLETED")) {
    return {
      icon: CheckCircle2,
      cls: "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]",
    }
  }
  if (check.includes("ACTIVE") || check.includes("RUNNING") || check.includes("READY")) {
    return {
      icon: Activity,
      cls: "text-[#1E64D4] bg-[#EFF6FF] border-[#BFDBFE]",
    }
  }
  return {
    icon: Info,
    cls: "text-[#475569] bg-[#F1F5F9] border-[#E2E8F0]",
  }
}

export const GenericLogsTable = ({
  category = "all",
  logs = [],
  onInspectMission,
  onViewFlight,
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const actualPageSize = pageSize === "ALL" ? Math.max(1, logs.length) : Number(pageSize) || 25
  const totalPages = Math.ceil(logs.length / actualPageSize) || 1
  const paginatedLogs = logs.slice((currentPage - 1) * actualPageSize, currentPage * actualPageSize)

  if (logs.length === 0) {
    const Icon = getCategoryIcon(category)
    return (
      <div className="rounded-2xl bg-white border border-[#D5E1ED] p-12 text-center font-sans shadow-xs">
        <Icon className="w-10 h-10 text-[#94A3B8] mx-auto mb-3 opacity-80" />
        <h3 className="text-[#0D233A] font-bold text-sm sm:text-base">No Log Entries Found</h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
          No records currently exist for this category matching active search filters.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#D5E1ED] overflow-hidden shadow-xs select-none font-sans flex flex-col">
      {/* Mobile Card View (< lg) */}
      <div className="lg:hidden divide-y divide-[#F1F5F9]">
        {paginatedLogs.map((log) => {
          const sev = getSeverityBadge(log.severity, log.status)
          const SevIcon = sev.icon

          return (
            <div key={log.id} className="p-4 space-y-2.5 hover:bg-[#F8FAFC] transition font-sans">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-[#1E64D4]">{log.id}</span>
                <div className="flex items-center gap-1.5">
                  {category === "all" && log.category && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold ${getCategoryBadge(
                        log.category
                      )}`}
                    >
                      {log.category}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-bold ${sev.cls}`}
                  >
                    <SevIcon className="w-3 h-3" />
                    <span>{log.status || log.severity || "OK"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#0D233A]">
                <span className="truncate">{log.event || log.type || log.id}</span>
                <span className="text-xs text-[#64748B] font-mono font-normal">
                  {formatLogTime(log.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#475569] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block text-[10px] font-semibold uppercase">TARGET / DRONE</span>
                  <span className="text-[#0D233A] font-bold">{log.droneId || log.callsign || "GCS System"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px] font-semibold uppercase">OPERATOR / SOURCE</span>
                  <span className="text-[#0E2646] font-medium truncate block">{log.operator || "System Daemon"}</span>
                </div>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
                {log.details || log.description || "--"}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {log.missionId && (
                    <button
                      type="button"
                      onClick={() => onInspectMission?.(log)}
                      className="inline-flex items-center gap-1 text-xs text-[#1E64D4] font-semibold hover:underline"
                    >
                      <span>Mission: {log.missionId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {log.flightId && (
                    <button
                      type="button"
                      onClick={() => onViewFlight?.(log.flightId)}
                      className="inline-flex items-center gap-1 text-xs text-[#15803D] font-semibold hover:underline"
                    >
                      <span>Flight Sortie</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onInspectMission?.(log)}
                  className="text-xs font-bold text-[#1E64D4] hover:underline flex items-center"
                >
                  <span>Inspect &gt;</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop View: Full Table (lg+) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-[140px]">Timestamp</th>
              {category === "all" && <th className="px-3 py-3.5 w-[100px]">Category</th>}
              <th className="px-4 py-3.5 w-[200px]">Event / Operation</th>
              <th className="px-3.5 py-3.5 w-[130px]">Target / Drone</th>
              <th className="px-3.5 py-3.5 w-[130px]">Operator / Source</th>
              <th className="px-3.5 py-3.5 w-[140px]">Severity / Status</th>
              <th className="px-4 py-3.5">Log Details & Context</th>
              <th className="px-4 py-3.5 text-right w-[110px]">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {paginatedLogs.map((log) => {
              const sev = getSeverityBadge(log.severity, log.status)
              const SevIcon = sev.icon

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

                  {/* Category */}
                  {category === "all" && (
                    <td className="px-3 py-3.5 align-middle">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getCategoryBadge(
                          log.category
                        )}`}
                      >
                        {log.category}
                      </span>
                    </td>
                  )}

                  {/* Event / Operation */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="font-bold text-[#0D233A] text-xs leading-snug">
                      {log.event || log.type || log.id}
                    </div>
                  </td>

                  {/* Target / Drone */}
                  <td className="px-3.5 py-3.5 align-middle font-mono font-semibold text-[#0E2646]">
                    {log.droneId || log.callsign || "GCS System"}
                  </td>

                  {/* Operator / Source */}
                  <td className="px-3.5 py-3.5 align-middle text-[#475569] font-medium">
                    {log.operator || "System Daemon"}
                  </td>

                  {/* Severity / Status */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold whitespace-nowrap ${sev.cls}`}
                    >
                      <SevIcon className="w-3.5 h-3.5" />
                      <span>{log.status || log.severity || "OK"}</span>
                    </span>
                  </td>

                  {/* Log Details & Context */}
                  <td className="px-4 py-3.5 align-middle text-[#334155] leading-relaxed max-w-md">
                    <div className="line-clamp-2">
                      {log.details || log.description || "--"}
                    </div>
                  </td>

                  {/* Reference / Action */}
                  <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    {log.missionId || log.event?.includes("MISSION") || log.event?.includes("GEOFENCE") || log.event?.includes("WAYPOINT") ? (
                      <button
                        type="button"
                        onClick={() => onInspectMission?.(log)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1E64D4] hover:underline cursor-pointer"
                      >
                        <span>Inspect &gt;</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-[#94A3B8]">Recorded</span>
                    )}
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

export default GenericLogsTable
