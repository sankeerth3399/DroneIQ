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
      return "text-[#35E0FF] bg-[#35E0FF1A] border-[#35E0FF33]"
    case "FLIGHT":
      return "text-[#2FE089] bg-[#2FE0891A] border-[#2FE08933]"
    case "TELEMETRY":
      return "text-[#38BDF8] bg-[#38BDF81A] border-[#38BDF833]"
    case "COMMAND":
      return "text-[#EAB308] bg-[#EAB3081A] border-[#EAB30833]"
    case "SYSTEM":
      return "text-[#A855F7] bg-[#A855F71A] border-[#A855F733]"
    case "INCIDENT":
      return "text-[#FF4141] bg-[#FF41411A] border-[#FF414133]"
    default:
      return "text-[#94A3B8] bg-[#1E293B] border-[#334155]"
  }
}

const getSeverityBadge = (severity = "INFO") => {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return {
        icon: AlertOctagon,
        cls: "text-[#FF4141] bg-[#FF41411F] border-[#FF41414D]",
      }
    case "WARNING":
      return {
        icon: AlertTriangle,
        cls: "text-[#F59E0B] bg-[#F59E0B1F] border-[#F59E0B4D]",
      }
    case "SUCCESS":
      return {
        icon: CheckCircle2,
        cls: "text-[#2FE089] bg-[#2FE0891F] border-[#2FE0894D]",
      }
    case "INFO":
    default:
      return {
        icon: Info,
        cls: "text-[#94A3B8] bg-[#1E293B] border-[#334155]",
      }
  }
}

const renderCategoryEmptyIcon = (category) => {
  const Icon = getCategoryIcon(category)
  return <Icon className="w-10 h-10 text-[#64748B] mx-auto mb-3 opacity-60" />
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
    return (
      <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] p-12 text-center font-mono">
        {renderCategoryEmptyIcon(category)}
        <h3 className="text-white font-semibold text-sm">No Log Entries Found</h3>
        <p className="text-xs text-[#8E9EAA] mt-1 max-w-sm mx-auto">
          No records currently exist for this category matching active search filters.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-xl select-none font-mono">
      {/* Mobile Card View (< lg) */}
      <div className="lg:hidden divide-y divide-[#16212E]">
        {paginatedLogs.map((log) => {
          const sev = getSeverityBadge(log.severity)
          const SevIcon = sev.icon

          return (
            <div key={log.id} className="p-3.5 space-y-2.5 hover:bg-[#111A26] transition font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-[#35E0FF] truncate">{log.id}</span>
                {category === "all" && log.category && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getCategoryBadge(
                      log.category
                    )}`}
                  >
                    {log.category}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${sev.cls}`}
                >
                  <SevIcon className="w-2.5 h-2.5" />
                  <span>{log.status || log.severity || "OK"}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="truncate">{log.event || log.type || log.id}</span>
                <span className="text-[10px] text-[#64748B] font-normal font-mono">
                  {formatLogTime(log.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#94A3B8] bg-[#070B11] p-2 rounded-lg border border-[#141E2B]">
                <div>
                  <span className="text-[#64748B] block text-[9px]">TARGET / DRONE</span>
                  <span className="text-white font-bold">{log.droneId || log.callsign || "GCS System"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[9px]">OPERATOR / SOURCE</span>
                  <span className="text-[#CBD5E1] truncate block">{log.operator || "System Daemon"}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#8E9EAA] leading-relaxed line-clamp-2">
                {log.details || log.description || "--"}
              </p>

              {(log.missionId || log.flightId) && (
                <div className="flex items-center gap-2 pt-1">
                  {log.missionId && (
                    <button
                      type="button"
                      onClick={() => onInspectMission?.(log)}
                      className="inline-flex items-center gap-1 text-[10px] text-[#35E0FF] hover:underline"
                    >
                      <span>Mission: {log.missionId}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {log.flightId && (
                    <button
                      type="button"
                      onClick={() => onViewFlight?.(log.flightId)}
                      className="inline-flex items-center gap-1 text-[10px] text-[#2FE089] hover:underline"
                    >
                      <span>Flight Sortie</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop View: Full Table (lg+) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-3.5 py-3">Timestamp</th>
              {category === "all" && <th className="px-3 py-3">Category</th>}
              <th className="px-3.5 py-3">Event / Operation</th>
              <th className="px-3 py-3">Target / Drone</th>
              <th className="px-3.5 py-3">Operator / Source</th>
              <th className="px-3 py-3">Severity / Status</th>
              <th className="px-4 py-3">Log Details & Context</th>
              <th className="px-3 py-3 text-right">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
            {paginatedLogs.map((log) => {
              const sev = getSeverityBadge(log.severity)
              const SevIcon = sev.icon

              return (
                <tr key={log.id} className="hover:bg-[#111A26] transition">
                  {/* Timestamp */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="font-semibold text-white text-[11px]">
                      {formatLogTime(log.timestamp)}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {formatLogDate(log.timestamp)}
                    </div>
                  </td>

                  {/* Category (for All Logs) */}
                  {category === "all" && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getCategoryBadge(
                          log.category
                        )}`}
                      >
                        {log.category || "LOG"}
                      </span>
                    </td>
                  )}

                  {/* Event Name */}
                  <td className="px-3.5 py-3 whitespace-nowrap font-bold text-white">
                    <div className="max-w-[190px] truncate">{log.event || log.type || log.id}</div>
                  </td>

                  {/* Target / Drone */}
                  <td className="px-3 py-3 whitespace-nowrap text-white font-bold">
                    {log.droneId || log.callsign || "GCS System"}
                  </td>

                  {/* Operator */}
                  <td className="px-3.5 py-3 whitespace-nowrap text-[#CBD5E1]">
                    {log.operator || "System Daemon"}
                  </td>

                  {/* Severity / Status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold ${sev.cls}`}
                    >
                      <SevIcon className="w-3 h-3 shrink-0" />
                      <span>{log.status || log.severity || "OK"}</span>
                    </span>
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3 max-w-[320px]">
                    <div className="text-[11px] text-[#94A3B8] truncate">
                      {log.details || log.description || "--"}
                    </div>
                  </td>

                  {/* Reference Actions */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {log.missionId ? (
                      <button
                        type="button"
                        onClick={() => onInspectMission?.(log)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#172230] border border-[#23354A] hover:border-[#35E0FF] hover:text-[#35E0FF] text-[#B7F3FF] text-[11px] transition cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : log.flightId ? (
                      <button
                        type="button"
                        onClick={() => onViewFlight?.(log.flightId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#172230] border border-[#23354A] hover:border-[#2FE089] hover:text-[#2FE089] text-[#2FE089] text-[11px] transition cursor-pointer"
                      >
                        <span>Flight</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#64748B]">Recorded</span>
                    )}
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
            className="px-2.5 py-1 rounded bg-[#16212E] text-[#CBD5E1] hover:bg-[#202F42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-xs cursor-pointer"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-[#16212E] text-[#CBD5E1] hover:bg-[#202F42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-xs cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default GenericLogsTable
