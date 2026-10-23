import React, { useState } from "react"
import {
  Sliders,
  Plane,
  ArrowUpRight,
  TrendingDown,
  Navigation,
  Compass,
  BatteryCharging,
  Radio,
  CheckCircle2,
} from "lucide-react"

export const Step7FlightParams = ({
  formData,
  setFormData,
  triggerToast,
}) => {
  const [climbRate, setClimbRate] = useState(3.0)
  const [transitSpeed, setTransitSpeed] = useState(12.0)
  const [surveySpeed, setSurveySpeed] = useState(formData.speed || 8.0)
  const [descentRate, setDescentRate] = useState(2.5)
  const [turnMode, setTurnMode] = useState("Coordinated Bank (Smooth)")
  const [turnRadius, setTurnRadius] = useState(5.0)
  const [headingMode, setHeadingMode] = useState("Along Flight Path")
  const [terrainFollowing, setTerrainFollowing] = useState("Enabled (SRTM 30m DEM)")
  const [linkLossAction, setLinkLossAction] = useState("RTH after 10s timeout")
  const [lowBatteryAction, setLowBatteryAction] = useState("RTH at 25%, Land at 15%")

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1B68D2] flex items-center justify-center shrink-0 border border-blue-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F284E]">
              Flight Segment Parameters & Dynamics
            </h3>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5 font-medium">
              Fine-tune climb rates, cruise velocities, turn banking, terrain following and failsafe timeouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs sm:text-[13px] font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold text-[#0F284E] border border-[#CBD5E1]">
            Cruising: {surveySpeed} m/s @ {formData.flightAltitude || 120} m AGL
          </span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Route Segments & Altitude Profile Chart */}
        <div className="lg:col-span-7 space-y-4">
          {/* Segment Parameters */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Flight Segment Speeds & Altitudes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px]">
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#0F284E]">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Launch & Climb Leg
                  </span>
                  <span className="font-mono text-[#1B68D2] text-sm">{climbRate} m/s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={climbRate}
                  onChange={(e) => setClimbRate(parseFloat(e.target.value))}
                  className="w-full accent-[#1B68D2] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Smooth vertical acceleration to 80m transit floor.</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#0F284E]">
                  <span className="flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-[#1B68D2]" /> Transit Corridor
                  </span>
                  <span className="font-mono text-[#1B68D2] text-sm">{transitSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="18"
                  value={transitSpeed}
                  onChange={(e) => setTransitSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#1B68D2] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Rapid repositioning speed between home and geofence.</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#0F284E]">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-indigo-600" /> Capture / Survey Leg
                  </span>
                  <span className="font-mono text-[#1B68D2] text-sm">{surveySpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="14"
                  value={surveySpeed}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setSurveySpeed(v)
                    setFormData({ ...formData, speed: v })
                  }}
                  className="w-full accent-[#1B68D2] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Maintains shutter motion-blur &lt; 0.5 pixel.</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#0F284E]">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" /> Return & Descent
                  </span>
                  <span className="font-mono text-[#1B68D2] text-sm">{descentRate} m/s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={descentRate}
                  onChange={(e) => setDescentRate(parseFloat(e.target.value))}
                  className="w-full accent-[#1B68D2] cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Controlled descent with ground-effect flare at 3m.</span>
              </div>
            </div>
          </div>

          {/* Altitude Profile SVG Chart */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h4 className="text-sm font-bold text-[#0F284E]">
                Altitude Profile (AGL vs Distance)
              </h4>
              <span className="text-xs font-mono text-[#1B68D2] font-bold">Terrain Clearance: +50 m</span>
            </div>

            <div className="h-44 bg-slate-50 rounded-lg p-2 relative overflow-hidden border border-[#CBD5E1]">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                {/* Terrain Line */}
                <path
                  d="M 0 110 Q 100 90 200 85 T 350 70 T 500 95 L 500 120 L 0 120 Z"
                  fill="#E2E8F0"
                />
                <path
                  d="M 0 110 Q 100 90 200 85 T 350 70 T 500 95"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                />

                {/* Drone Flight Path */}
                <path
                  d="M 10 110 L 40 40 L 150 40 L 200 35 L 350 20 L 460 30 L 490 110"
                  fill="none"
                  stroke="#1B68D2"
                  strokeWidth="2.5"
                />

                {/* Waypoint markers */}
                {[[40, 40], [150, 40], [200, 35], [350, 20], [460, 30]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#1B68D2" strokeWidth="2.5" />
                ))}
              </svg>
              <div className="absolute bottom-2 left-3 text-xs font-mono font-bold text-[#475569]">
                0 km (Home)
              </div>
              <div className="absolute bottom-2 right-3 text-xs font-mono font-bold text-[#475569]">
                2.4 km (Landing)
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Turn Behavior, Heading & Failsafes */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3.5">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Autopilot Maneuvering Behavior
            </h4>

            <div className="space-y-3.5 text-xs sm:text-[13px]">
              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Turn Behavior</label>
                <select
                  value={turnMode}
                  onChange={(e) => setTurnMode(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>Coordinated Bank (Smooth continuous curve)</option>
                  <option>Stop and Turn (Precise corner stop)</option>
                  <option>Reverse Thrust Overlap</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#0F284E] font-bold">Corner Turn Radius</span>
                  <span className="font-mono font-bold text-[#1B68D2] text-sm">{turnRadius} m</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={turnRadius}
                  onChange={(e) => setTurnRadius(parseFloat(e.target.value))}
                  className="w-full accent-[#1B68D2] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Heading Alignment</label>
                <select
                  value={headingMode}
                  onChange={(e) => setHeadingMode(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>Along Flight Path (Nose forward)</option>
                  <option>Fixed Yaw to Point of Interest (POI)</option>
                  <option>Independent Gimbal Yaw Decoupled</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Terrain Following</label>
                <select
                  value={terrainFollowing}
                  onChange={(e) => setTerrainFollowing(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>Enabled (SRTM 30m DEM)</option>
                  <option>Enabled (LiDAR Laser Altimeter Live)</option>
                  <option>Disabled (Flat Barometric Reference)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] text-[#475569] font-medium">Link Loss Action:</span>
                  <span className="font-bold text-[#0F284E] text-xs sm:text-[13px]">{linkLossAction}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] text-[#475569] font-medium">Low Battery Rule:</span>
                  <span className="font-bold text-amber-700 text-xs sm:text-[13px]">{lowBatteryAction}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step7FlightParams
