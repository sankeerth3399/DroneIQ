import { X, Plane, Download, Activity } from "lucide-react"
import MultiMetricChart from "./charts/MultiMetricChart.jsx"

export const FlightDetailDrawer = ({
  flight,
  isOpen,
  onClose,
  telemetrySamples = [],
}) => {
  if (!isOpen || !flight) return null

  // Default simulated flight telemetry stream if not provided
  const samples = telemetrySamples.length > 0 ? telemetrySamples : [
    { time: "00:00", altitude: 0, speed: 0, battery: flight.batteryStart, pitch: 0, roll: 0 },
    { time: "05:00", altitude: Math.round(flight.maxAltitudeM * 0.6), speed: (flight.avgSpeedMs * 1.1).toFixed(1), battery: flight.batteryStart - 12, pitch: 3.2, roll: 0.8 },
    { time: "10:00", altitude: flight.maxAltitudeM, speed: flight.maxSpeedMs, battery: flight.batteryStart - 26, pitch: -1.2, roll: -1.5 },
    { time: "15:00", altitude: Math.round(flight.maxAltitudeM * 0.85), speed: flight.avgSpeedMs, battery: flight.batteryStart - 40, pitch: 0.5, roll: 0.4 },
    { time: "20:00", altitude: Math.round(flight.maxAltitudeM * 0.4), speed: (flight.avgSpeedMs * 0.8).toFixed(1), battery: flight.batteryStart - 50, pitch: -4.0, roll: -0.2 },
    { time: "24:00", altitude: 0, speed: 0, battery: flight.batteryEnd, pitch: 0, roll: 0 },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-[#090D14] border-l border-[#1A2633] text-white p-5 sm:p-6 overflow-y-auto shadow-2xl flex flex-col justify-between space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A2633] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#142232] border border-[#203C54] text-[#35E0FF]">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{flight.id}</h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        flight.status === "Completed"
                          ? "bg-[#102A20] text-[#2FE089] border border-[#1F4A38]"
                          : "bg-[#2A1414] text-[#FF8585] border border-[#5E2222]"
                      }`}
                    >
                      {flight.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E9EAA]">{flight.missionName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#142232] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-[#0E1520] border border-[#1A2633]">
                <span className="text-[9px] text-[#64748B] block uppercase">Flight Time</span>
                <span className="text-sm font-bold text-white">{flight.durationFormatted}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1520] border border-[#1A2633]">
                <span className="text-[9px] text-[#64748B] block uppercase">Distance</span>
                <span className="text-sm font-bold text-[#35E0FF]">{flight.distanceKm} km</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1520] border border-[#1A2633]">
                <span className="text-[9px] text-[#64748B] block uppercase">Battery Used</span>
                <span className="text-sm font-bold text-[#F59E0B]">{flight.batteryUsed}%</span>
              </div>
            </div>

            {/* Sortie Details Specifications */}
            <div className="p-3.5 rounded-lg bg-[#0E1520] border border-[#1A2633] text-xs space-y-2">
              <div className="text-[10px] font-bold text-[#8E9EAA] uppercase border-b border-[#16222E] pb-1">
                Sortie Specifications
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Aircraft:</span>
                  <span className="font-semibold text-white">{flight.droneId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Operator:</span>
                  <span className="font-semibold text-white">{flight.operator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Max Altitude:</span>
                  <span className="font-semibold text-white">{flight.maxAltitudeM} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Max Speed:</span>
                  <span className="font-semibold text-white">{flight.maxSpeedMs} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Start Time:</span>
                  <span className="text-[#8E9EAA]">{new Date(flight.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">End Time:</span>
                  <span className="text-[#8E9EAA]">{new Date(flight.endTime).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Synchronized Telemetry Profile */}
            <div className="p-3.5 rounded-lg bg-[#0E1520] border border-[#1A2633] space-y-2">
              <div className="flex items-center justify-between border-b border-[#16222E] pb-1">
                <span className="text-[10px] font-bold text-[#35E0FF] uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Flight Telemetry Profile
                </span>
                <span className="text-[9px] text-[#64748B]">Altitude • Speed • Battery</span>
              </div>
              <MultiMetricChart data={samples} height={160} />
            </div>

            {/* Timeline of In-Flight Events */}
            <div className="p-3.5 rounded-lg bg-[#0E1520] border border-[#1A2633] space-y-2.5">
              <div className="text-[10px] font-bold text-[#8E9EAA] uppercase border-b border-[#16222E] pb-1">
                Flight Event Log ({flight.timelineEvents?.length || 0})
              </div>
              <div className="space-y-2 text-xs">
                {(flight.timelineEvents || []).map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[11px]">
                    <span className="text-[10px] text-[#64748B] w-12 shrink-0">{ev.time}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 ${
                        ev.type === "warning"
                          ? "bg-[#2A1414] text-[#FF8585] border border-[#5E2222]"
                          : ev.type === "success"
                          ? "bg-[#102A20] text-[#2FE089] border border-[#1F4A38]"
                          : "bg-[#142232] text-[#35E0FF] border border-[#203C54]"
                      }`}
                    >
                      {ev.event}
                    </span>
                    <span className="text-[#8E9EAA] truncate">{ev.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#1A2633] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141C28] hover:bg-[#1A2636] text-xs font-semibold text-[#8E9EAA] hover:text-white transition cursor-pointer"
            >
              Close Inspector
            </button>

            <button
              type="button"
              onClick={() => alert(`Exporting MAVLink binary telemetry for sortie ${flight.id}...`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#35E0FF] hover:bg-[#25C8E5] text-[#0A0E16] text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sortie Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlightDetailDrawer
