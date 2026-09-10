import { useNavigate } from "react-router-dom"
import { Plane, CheckCircle2, Play, Radio, Shield, Gauge } from "lucide-react"
import { useTelemetry } from "@/context/TelemetryContext.jsx"

const checklistItems = [
  { label: "Battery Level > 30%", status: "PASSED", val: "84% (24.2V)" },
  { label: "GPS 3D Fix & Satellites", status: "PASSED", val: "18 Sats Locked" },
  { label: "Compass & IMU Calibration", status: "PASSED", val: "HDG 000° Valid" },
  { label: "RC & Telemetry Link", status: "PASSED", val: "Signal 99%" },
  { label: "Geofence Enforcement", status: "ACTIVE", val: "500m Max Radius" },
  { label: "Airspace Clear / No TFRs", status: "CLEAR", val: "Sector Verified" },
]

const Fly = () => {
  const navigate = useNavigate()
  const { selectedDroneId, telemetry } = useTelemetry()

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-5xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Plane className="w-6 h-6 text-[#35E0FF]" />
            Pre-Flight Authorization & Launch
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Validate vehicle status, arm propulsion systems, and initiate guided flight sequences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/mission")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#35E0FF] text-[#06090E] text-xs sm:text-sm font-semibold hover:bg-[#20CAEC] transition shadow-[0_0_12px_rgba(53,224,255,0.3)] self-start sm:self-auto shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Mission View</span>
        </button>
      </div>

      {/* Grid: Pre-flight Checklist & Armed Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Checklist */}
        <div className="lg:col-span-2 rounded-xl bg-[#0A0E16] border border-[#1A2633] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16212E]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2FE089]" />
              <h2 className="text-sm sm:text-base font-semibold text-white">
                Automated System Pre-Flight Checklist
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#2FE089] bg-[#2FE0891A] border border-[#2FE08933] px-2 py-0.5 rounded">
              READY FOR ARM
            </span>
          </div>

          <div className="space-y-2.5">
            {checklistItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-[#0E1522] border border-[#1A2633] text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#2FE089] shrink-0" />
                  <span className="text-[#EEF4F8] truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[#8E9EAA] hidden sm:inline">{item.val}</span>
                  <span className="text-[10px] font-bold text-[#2FE089] bg-[#2FE0891A] px-1.5 py-0.5 rounded">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Telemetry Snapshot */}
        <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#16212E]">
              <Radio className="w-4 h-4 text-[#35E0FF]" />
              <h2 className="text-sm sm:text-base font-semibold text-white">Target Aircraft</h2>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#141C26]">
                <span className="text-[#8E9EAA]">CALLSIGN</span>
                <span className="text-[#35E0FF] font-bold">{selectedDroneId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#141C26]">
                <span className="text-[#8E9EAA]">CURRENT MODE</span>
                <span className="text-[#EEF4F8] font-bold">{telemetry.flightMode || "GUIDED"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#141C26]">
                <span className="text-[#8E9EAA]">ARM STATUS</span>
                <span className={telemetry.armed ? "text-[#FF8585] font-bold" : "text-[#8E9EAA]"}>
                  {telemetry.armed ? "ARMED" : "DISARMED"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#141C26]">
                <span className="text-[#8E9EAA]">ALTITUDE</span>
                <span className="text-[#2FE089] font-bold">{telemetry.altitude || 0} m</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8E9EAA]">BATTERY</span>
                <span className="text-[#F59E0B] font-bold">
                  {Math.round(telemetry.batteryPercentage || 84)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#16212E]">
            <button
              type="button"
              onClick={() => navigate("/mission")}
              className="w-full py-2.5 rounded-lg bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] text-xs font-semibold hover:bg-[#35E0FF] hover:text-[#06090E] transition font-mono flex items-center justify-center gap-2"
            >
              <Gauge className="w-4 h-4" />
              <span>Enter Flight HUD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Fly