import { FileText, Download, HardDrive } from "lucide-react"

const logsList = [
  {
    id: "FLIGHT-LOG-20260910-001",
    date: "2026-09-10 15:42",
    callsign: "DRONE-001",
    duration: "18m 34s",
    maxAlt: "64.2m",
    dist: "3.42 km",
    batteryDelta: "84% -> 38%",
    size: "4.8 MB",
  },
  {
    id: "FLIGHT-LOG-20260909-003",
    date: "2026-09-09 11:20",
    callsign: "DRONE-001",
    duration: "24m 10s",
    maxAlt: "82.0m",
    dist: "5.18 km",
    batteryDelta: "98% -> 22%",
    size: "6.2 MB",
  },
  {
    id: "FLIGHT-LOG-20260908-002",
    date: "2026-09-08 17:05",
    callsign: "DRONE-002",
    duration: "12m 45s",
    maxAlt: "45.0m",
    dist: "2.10 km",
    batteryDelta: "95% -> 58%",
    size: "3.1 MB",
  },
]

const Logs = () => {
  const handleExport = (logId) => {
    alert(`Downloading telemetry binary log ${logId}.ulg / .tlog...`)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-6xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#35E0FF]" />
            Flight Operations & Telemetry Logs
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Browse, inspect, and export recorded MAVLink flight telemetry, incident traces, and battery profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleExport("ALL_LATEST")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1A2634] text-[#35E0FF] border border-[#35E0FF4D] text-xs sm:text-sm font-semibold hover:bg-[#35E0FF] hover:text-[#06090E] transition shrink-0 self-start sm:self-auto font-mono"
        >
          <Download className="w-4 h-4" />
          <span>Export All Logs (.zip)</span>
        </button>
      </div>

      {/* Logs Table Card */}
      <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-lg">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#1A2633] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#35E0FF]" />
            <h2 className="text-sm sm:text-base font-semibold text-white">Recorded Flight Sorties</h2>
          </div>
          <span className="text-[11px] font-mono text-[#8E9EAA]">
            3 Sorties on Local Disk
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 hidden sm:table-cell">Drone</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 hidden md:table-cell">Max Alt</th>
                <th className="px-4 py-3 hidden lg:table-cell">Distance</th>
                <th className="px-4 py-3 hidden sm:table-cell">Battery Usage</th>
                <th className="px-4 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
              {logsList.map((log) => (
                <tr key={log.id} className="hover:bg-[#111A26] transition">
                  <td className="px-4 py-3 font-semibold text-[#35E0FF] whitespace-nowrap">
                    {log.id}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap">{log.date}</td>
                  <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap font-bold text-white">
                    {log.callsign}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#2FE089]">{log.duration}</td>
                  <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">{log.maxAlt}</td>
                  <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">{log.dist}</td>
                  <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap text-[#F59E0B]">
                    {log.batteryDelta}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleExport(log.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#172230] border border-[#23354A] hover:border-[#35E0FF] hover:text-[#35E0FF] transition text-[#B7F3FF] text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ULog</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Logs