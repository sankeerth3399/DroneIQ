import { useNavigate } from "react-router-dom"
import { MapPin, Navigation, Play } from "lucide-react"

const waypoints = [
  { seq: 1, type: "TAKEOFF", lat: 17.385000, lng: 78.486700, alt: 25, speed: 4.0, action: "Ascend Vertically" },
  { seq: 2, type: "WAYPOINT", lat: 17.385450, lng: 78.487200, alt: 50, speed: 8.5, action: "Sector Corner 1" },
  { seq: 3, type: "WAYPOINT", lat: 17.385800, lng: 78.486900, alt: 50, speed: 8.5, action: "Photo Trigger 1" },
  { seq: 4, type: "WAYPOINT", lat: 17.385300, lng: 78.486200, alt: 50, speed: 8.5, action: "Survey Leg Turn" },
  { seq: 5, type: "RTH / LAND", lat: 17.385000, lng: 78.486700, alt: 0, speed: 2.0, action: "Precision Land" },
]

const Waypts = () => {
  const navigate = useNavigate()

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-6xl mx-auto text-[#EEF4F8] select-none font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1A2633]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#35E0FF]" />
            Waypoint Navigation Sequence
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9EAA] mt-1">
            Ordered GPS coordinates and automated flight actions for the current mission package.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/mission")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#35E0FF] text-[#06090E] text-xs sm:text-sm font-semibold hover:bg-[#20CAEC] transition shadow-[0_0_12px_rgba(53,224,255,0.3)] shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Map Workspace</span>
          </button>
        </div>
      </div>

      {/* Waypoint Table Card */}
      <div className="rounded-xl bg-[#0A0E16] border border-[#1A2633] overflow-hidden shadow-lg">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#1A2633] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#35E0FF]" />
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Current Package ({waypoints.length} Points)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#2FE089] bg-[#2FE0891A] border border-[#2FE08933] px-2 py-0.5 rounded">
            EST. DURATION: 14m 20s
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D1420] text-[#8E9EAA] border-b border-[#1A2633] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Command</th>
                <th className="px-4 py-3">Latitude</th>
                <th className="px-4 py-3">Longitude</th>
                <th className="px-4 py-3">Altitude</th>
                <th className="px-4 py-3 hidden sm:table-cell">Speed</th>
                <th className="px-4 py-3 hidden md:table-cell">Action / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16212E] text-[#EEF4F8]">
              {waypoints.map((w) => (
                <tr key={w.seq} className="hover:bg-[#111A26] transition">
                  <td className="px-4 py-3 font-bold text-[#35E0FF]">{w.seq}</td>
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-[#172230] border border-[#23354A] text-[10px]">
                      {w.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#B7F3FF] whitespace-nowrap">{w.lat.toFixed(6)}</td>
                  <td className="px-4 py-3 text-[#B7F3FF] whitespace-nowrap">{w.lng.toFixed(6)}</td>
                  <td className="px-4 py-3 text-[#2FE089] whitespace-nowrap">{w.alt} m</td>
                  <td className="px-4 py-3 text-[#94A3B8] hidden sm:table-cell whitespace-nowrap">{w.speed} m/s</td>
                  <td className="px-4 py-3 text-[#8E9EAA] hidden md:table-cell whitespace-nowrap">{w.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Waypts