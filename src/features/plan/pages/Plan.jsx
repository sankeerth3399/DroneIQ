import { useNavigate } from "react-router-dom"
import { MapPin, ShieldAlert, Route, Play, SlidersHorizontal } from "lucide-react"

const planParameters = [
  { label: "Mission Pattern", value: "Survey Grid Lawn-Mower", unit: "Auto" },
  { label: "Cruise Altitude (AGL)", value: "50", unit: "meters" },
  { label: "Nominal Airspeed", value: "8.5", unit: "m/s" },
  { label: "Forward Overlap", value: "75%", unit: "overlap" },
  { label: "Side Overlap", value: "65%", unit: "overlap" },
  { label: "Geofence Floor / Ceiling", value: "10m / 120m", unit: "AGL" },
  { label: "Fail-safe Action", value: "Return-To-Home (RTH)", unit: "Auto" },
]

const Plan = () => {
  const navigate = useNavigate()

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-5xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Route className="w-6 h-6 text-[#35E0FF]" />
            Autonomous Mission Plan
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Configure autonomous survey grids, safety geofences, and fail-safe return behaviors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/waypts")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#35E0FF] text-[#06090E] text-xs sm:text-sm font-semibold hover:bg-[#20CAEC] transition shadow-[0_0_12px_rgba(53,224,255,0.3)] self-start sm:self-auto shrink-0"
        >
          <MapPin className="w-4 h-4" />
          <span>View Waypoints</span>
        </button>
      </div>

      {/* Plan Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#16212E]">
            <SlidersHorizontal className="w-4 h-4 text-[#35E0FF]" />
            <h2 className="text-sm sm:text-base font-semibold text-white">Flight Profile Settings</h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {planParameters.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1522] border border-[#1A2633]"
              >
                <span className="text-[#8E9EAA]">{p.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#EEF4F8] font-bold">{p.value}</span>
                  <span className="text-[10px] text-[#64748B] hidden sm:inline">{p.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#16212E]">
              <ShieldAlert className="w-4 h-4 text-[#2FE089]" />
              <h2 className="text-sm sm:text-base font-semibold text-white">Airspace & Geofence Status</h2>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#2FE0890D] border border-[#2FE08933] text-[#2FE089]">
                <p className="font-bold">GEOFENCE ACTIVE</p>
                <p className="text-[11px] text-[#2FE089CC] mt-0.5">
                  Cylinder radius: 500m centered on Home Lat: 17.385000, Lng: 78.486700.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0E1522] border border-[#1A2633] text-[#8E9EAA]">
                <p className="font-bold text-[#EEF4F8]">RTH TRIGGER CONDITIONS</p>
                <p className="text-[11px] mt-0.5">
                  Automatic return triggers if battery &lt; 20% or telemetry link lost for &gt; 5 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#16212E]">
            <button
              type="button"
              onClick={() => navigate("/mission")}
              className="w-full py-2.5 rounded-lg bg-[#35E0FF] text-[#06090E] text-xs font-semibold hover:bg-[#20CAEC] transition font-mono flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(53,224,255,0.25)]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute in Mission Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Plan