import { HardDrive, Download, ExternalLink, Plane } from "lucide-react"

export const FlightLogsTable = ({
  flightLogs = [],
  onExport,
  onViewMission,
}) => {
  return (
    <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-lg select-none font-mono">
      {/* Table Card Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#1A2633] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#35E0FF]" />
          <h2 className="text-sm sm:text-base font-semibold text-white">Recorded Flight Sorties</h2>
        </div>
        <span className="text-[11px] font-mono text-[#8E9EAA]">
          {flightLogs.length} Sorties on Local Disk
        </span>
      </div>

      {/* Mobile View: Cards (< sm) */}
      <div className="sm:hidden divide-y divide-[#16212E]">
        {flightLogs.map((log) => (
          <div key={log.id} className="p-3.5 space-y-2.5 hover:bg-[#111A26] transition font-mono">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-[#35E0FF] truncate">{log.id}</span>
              <span className="text-[10px] text-[#2FE089] bg-[#2FE0891A] px-1.5 py-0.5 rounded border border-[#2FE08933]">
                {log.duration}
              </span>
            </div>

            {log.missionName && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8E9EAA] truncate">Mission: {log.missionName}</span>
                {log.missionId && (
                  <button
                    type="button"
                    onClick={() => onViewMission?.(log.missionId)}
                    className="inline-flex items-center gap-1 text-[#35E0FF] text-[10px] hover:underline shrink-0"
                  >
                    <span>View Mission</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8]">
              <div>
                <span className="text-[#64748B] text-[9px] block">DATE / TIME</span>
                <span>{log.date}</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">AIRCRAFT</span>
                <span className="text-white font-bold">{log.callsign || log.droneId}</span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">MAX ALT / DIST</span>
                <span>
                  {log.maxAlt} • {log.dist}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] text-[9px] block">BATTERY</span>
                <span className="text-[#F59E0B]">{log.batteryDelta}</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-[#64748B]">{log.size}</span>
              <button
                type="button"
                onClick={() => onExport?.(log.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#172230] border border-[#23354A] hover:border-[#35E0FF] hover:text-[#35E0FF] text-[#B7F3FF] text-xs min-h-[36px] transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ULog</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / Tablet View: Table (sm+) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Log ID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Drone</th>
              <th className="px-4 py-3">Mission Link</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3 hidden md:table-cell">Max Alt</th>
              <th className="px-4 py-3 hidden lg:table-cell">Distance</th>
              <th className="px-4 py-3">Battery Usage</th>
              <th className="px-4 py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
            {flightLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#111A26] transition">
                <td className="px-4 py-3 font-semibold text-[#35E0FF] whitespace-nowrap">
                  {log.id}
                </td>
                <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap">{log.date}</td>
                <td className="px-4 py-3 whitespace-nowrap font-bold text-white">
                  <span className="flex items-center gap-1">
                    <Plane className="w-3 h-3 text-[#35E0FF]" />
                    {log.callsign || log.droneId}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {log.missionId ? (
                    <button
                      type="button"
                      onClick={() => onViewMission?.(log.missionId)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#38BDF8] hover:text-[#35E0FF] hover:underline cursor-pointer"
                    >
                      <span>{log.missionName || log.missionId}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ) : (
                    <span className="text-[#64748B] text-[11px]">Manual Flight</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[#2FE089]">{log.duration}</td>
                <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{log.maxAlt}</td>
                <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">{log.dist}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[#F59E0B]">
                  {log.batteryDelta}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onExport?.(log.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#172230] border border-[#23354A] hover:border-[#35E0FF] hover:text-[#35E0FF] transition text-[#B7F3FF] text-[11px] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ULog</span>
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
