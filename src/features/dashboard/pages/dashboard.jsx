import { useNavigate } from "react-router-dom"
import {
  Activity,
  BatteryCharging,
  Clock,
  ShieldCheck,
  ChevronRight,
  Plane,
  Radio,
  ExternalLink,
} from "lucide-react"
import { useTelemetry } from "@/context/TelemetryContext.jsx"

const metrics = [
  {
    label: "Active Drones",
    value: "1 Online",
    sub: "4 Total Registered",
    icon: Activity,
    color: "text-[#35E0FF]",
    bg: "bg-[#35E0FF1A]",
    border: "border-[#35E0FF33]",
  },
  {
    label: "Flight Time Today",
    value: "3h 42m",
    sub: "12 Total Sorties",
    icon: Clock,
    color: "text-[#2FE089]",
    bg: "bg-[#2FE0891A]",
    border: "border-[#2FE08933]",
  },
  {
    label: "Fleet Health Avg",
    value: "98.4%",
    sub: "All Sensors Calibrated",
    icon: ShieldCheck,
    color: "text-[#38BDF8]",
    bg: "bg-[#38BDF81A]",
    border: "border-[#38BDF833]",
  },
  {
    label: "Primary Battery",
    value: "84%",
    sub: "24.2V • 6S LiPo",
    icon: BatteryCharging,
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B1A]",
    border: "border-[#F59E0B33]",
  },
]

const fleetList = [
  {
    id: "DRONE-001",
    model: "AeroNexus Quad-X4",
    status: "IN-FLIGHT",
    battery: 84,
    altitude: "48.5m",
    location: "Grid Sector 4",
    signal: "100%",
  },
  {
    id: "DRONE-002",
    model: "AeroNexus Heavy-Hex6",
    status: "STANDBY",
    battery: 100,
    altitude: "0m",
    location: "Launch Pad A",
    signal: "98%",
  },
  {
    id: "DRONE-003",
    model: "AeroNexus Scout-VTOL",
    status: "CHARGING",
    battery: 62,
    altitude: "0m",
    location: "Hangar Bay 2",
    signal: "95%",
  },
]

const Dashboard = () => {
  const navigate = useNavigate()
  const { selectedDroneId } = useTelemetry()

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#2FE0891A] text-[#2FE089] border border-[#2FE08933]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089] animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Real-time fleet status, UAV flight telemetry, and ground station oversight.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/mission")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#35E0FF] text-[#06090E] text-xs sm:text-sm font-semibold hover:bg-[#20CAEC] transition shadow-[0_0_12px_rgba(53,224,255,0.3)] shrink-0 self-start sm:self-auto"
        >
          <Plane className="w-4 h-4" />
          <span>Open Mission Control</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid (1-col phone, 2-col tablet, 4-col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div
              key={m.label}
              className="p-4 rounded-xl bg-[#0A0E16] border border-[#1A2633] shadow-md flex items-center gap-3.5 hover:border-[#35E0FF4D] transition"
            >
              <div className={`p-2.5 rounded-lg ${m.bg} border ${m.border} shrink-0`}>
                <Icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-[#8E9EAA] font-mono font-medium truncate">
                  {m.label}
                </p>
                <p className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5 truncate">
                  {m.value}
                </p>
                <p className="text-[10px] text-[#64748B] font-mono truncate">{m.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Fleet Vehicles Status Section */}
      <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-lg">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#1A2633] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#35E0FF]" />
            <h2 className="text-sm sm:text-base font-semibold text-white">Registered Fleet Aircraft</h2>
          </div>
          <span className="text-[11px] font-mono text-[#8E9EAA]">
            Active Target: <strong className="text-[#35E0FF]">{selectedDroneId}</strong>
          </span>
        </div>

        {/* Responsive Table / Cards */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Drone ID</th>
                <th className="px-4 py-3 hidden sm:table-cell">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Battery</th>
                <th className="px-4 py-3 hidden md:table-cell">Altitude</th>
                <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
              {fleetList.map((d) => (
                <tr key={d.id} className="hover:bg-[#111A26] transition">
                  <td className="px-4 py-3 font-semibold text-[#35E0FF] whitespace-nowrap">
                    {d.id}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] hidden sm:table-cell whitespace-nowrap">
                    {d.model}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === "IN-FLIGHT"
                          ? "bg-[#2FE0891A] text-[#2FE089] border border-[#2FE0894D]"
                          : d.status === "STANDBY"
                          ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                          : "bg-[#F59E0B1A] text-[#F59E0B] border border-[#F59E0B4D]"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[#EEF4F8] font-bold">{d.battery}%</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#94A3B8] whitespace-nowrap">
                    {d.altitude}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[#94A3B8] whitespace-nowrap">
                    {d.location}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate("/mission")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A2634] hover:bg-[#35E0FF] hover:text-[#06090E] transition text-[#35E0FF] text-[11px] font-semibold"
                    >
                      <span>Control</span>
                      <ExternalLink className="w-3 h-3" />
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

export default Dashboard