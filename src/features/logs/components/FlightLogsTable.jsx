import { HardDrive, Download, ExternalLink, Plane, Clock, ShieldCheck } from "lucide-react"

export const FlightLogsTable = ({
  flightLogs = [],
  onExport,
  onViewMission,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-[#D5E1ED] overflow-hidden shadow-xs select-none font-sans">
      {/* Table Card Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-[#1E64D4]" />
          <h2 className="text-base font-bold text-[#0D233A]">Recorded Flight Sorties</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE]">
          {flightLogs.length} Sorties on Disk
        </span>
      </div>

      {/* Desktop View: Full Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-[140px]">Flight Sortie</th>
              <th className="px-4 py-3.5 w-[150px]">Date / Time</th>
              <th className="px-3.5 py-3.5 w-[130px]">Aircraft</th>
              <th className="px-3.5 py-3.5 w-[120px]">Duration</th>
              <th className="px-3.5 py-3.5 w-[140px]">Max Alt / Dist</th>
              <th className="px-3.5 py-3.5 w-[130px]">Status</th>
              <th className="px-4 py-3.5">Mission Association</th>
              <th className="px-4 py-3.5 text-right w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {flightLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F8FAFC] transition">
                {/* Flight ID */}
                <td className="px-4 py-3.5 align-middle font-mono font-bold text-[#1E64D4]">
                  {log.id}
                </td>

                {/* Date */}
                <td className="px-4 py-3.5 align-middle text-[#334155] font-medium">
                  {log.date}
                </td>

                {/* Drone */}
                <td className="px-3.5 py-3.5 align-middle font-mono font-bold text-[#0D233A]">
                  {log.callsign || log.droneId}
                </td>

                {/* Duration */}
                <td className="px-3.5 py-3.5 align-middle">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                    <Clock className="w-3 h-3" />
                    {log.duration}
                  </span>
                </td>

                {/* Alt / Dist */}
                <td className="px-3.5 py-3.5 align-middle text-[#475569] font-medium">
                  {log.maxAlt} • {log.dist}
                </td>

                {/* Status */}
                <td className="px-3.5 py-3.5 align-middle">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
                    <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                    {log.status || "Completed"}
                  </span>
                </td>

                {/* Mission Association */}
                <td className="px-4 py-3.5 align-middle">
                  {log.missionId ? (
                    <button
                      type="button"
                      onClick={() => onViewMission?.(log.missionId)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1E64D4] hover:underline cursor-pointer"
                    >
                      <span>{log.missionName || log.missionId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[#94A3B8]">Manual Flight Sortie</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onExport?.(log.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E64D4] border border-[#BFDBFE] font-bold text-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.ULG</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FlightLogsTable
