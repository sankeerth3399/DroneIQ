import React, { useState } from "react"
import {
  Share2,
  Plus,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Grid,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react"

export const Step3SwarmConfig = ({
  formData,
  setFormData,
  registeredDrones = [],
  triggerToast,
}) => {
  const [formation, setFormation] = useState("area_split")
  const [horizontalSpacing, setHorizontalSpacing] = useState(50)
  const [altitudeSeparation, setAltitudeSeparation] = useState(10)
  const [minDistance, setMinDistance] = useState(15)

  const [dropoutPolicy, setDropoutPolicy] = useState("Re-split remaining task")
  const [takeoverPolicy, setTakeoverPolicy] = useState("Nearest drone with battery")
  const [minSwarmSize, setMinSwarmSize] = useState(2)
  const [leadDropPolicy, setLeadDropPolicy] = useState("Promote Drone 2")
  const [belowMinPolicy, setBelowMinPolicy] = useState("All return to home")

  // Real vs Swarm Drone Fleet:
  // If registeredDrones are available, use them, otherwise use realistic fleet definition
  const baseDrones = registeredDrones.length > 0
    ? registeredDrones.map((d, i) => ({
        id: d.id,
        name: `Drone ${i + 1} ${d.id}`,
        model: d.model || d.type || "Quadcopter",
        role: i === 0 ? "Lead - Mapping" : i === 1 ? "Thermal" : "Survey",
        sector: i === 0 ? "Sector A - north face" : i === 1 ? "Sector B - spillway and crest" : "Sector C - downstream toe",
        battery: d.battery || (98 - i * 5),
      }))
    : [
        {
          id: "DR-001",
          name: "Drone 1 DR-001",
          model: "DJI Matrice 350",
          role: "Lead - Mapping",
          sector: "Sector A - north face",
          battery: 98,
        },
        {
          id: "DR-003",
          name: "Drone 2 DR-003",
          model: "Autel EVO Max",
          role: "Thermal",
          sector: "Sector B - spillway and crest",
          battery: 91,
        },
        {
          id: "DR-007",
          name: "Drone 3 DR-007",
          model: "DJI Mavic 3T",
          role: "Survey",
          sector: "Sector C - downstream toe",
          battery: 88,
        },
      ]

  const [dronesList, setDronesList] = useState(baseDrones)

  const handleRemoveDrone = (id) => {
    if (dronesList.length <= 1) {
      triggerToast?.("At least 1 drone is required for flight planning.", "error")
      return
    }
    setDronesList(dronesList.filter((d) => d.id !== id))
    triggerToast?.(`Removed drone from swarm formation.`)
  }

  const handleAddDrone = () => {
    const nextIdx = dronesList.length + 1
    const newDrone = {
      id: `DR-00${nextIdx + 2}`,
      name: `Drone ${nextIdx} DR-00${nextIdx + 2}`,
      model: "DJI Matrice 350 RTK",
      role: "Relay",
      sector: `Sector ${String.fromCharCode(64 + nextIdx)} - auxiliary corridor`,
      battery: 95,
    }
    setDronesList([...dronesList, newDrone])
    triggerToast?.(`Added ${newDrone.name} to swarm formation.`)
  }

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Dynamic Drone Count Banner */}
      {registeredDrones.length === 1 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="leading-relaxed">
              <strong className="font-bold text-amber-950">Single Registered Drone Active:</strong> Currently 1 physical aircraft is connected. Multi-drone swarm execution is in <strong className="font-bold text-amber-950">Simulation / Planning Mode</strong> and will dispatch additional real airframes as they register.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/80 font-bold text-xs text-amber-900 shrink-0">PLANNING DEMO</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Drones and Roles, Task Allocation, Dropout Policies */}
        <div className="lg:col-span-7 space-y-4">
          {/* Drones and Roles Card */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-5 h-5 text-[#1B68D2]" />
                <h3 className="text-base font-bold text-[#0F284E]">
                  Drones and roles ({dronesList.length})
                </h3>
              </div>
              <span className="text-xs sm:text-[13px] text-[#1B68D2] font-bold">
                Mission time is now {Math.max(3, Math.round(15 / dronesList.length))} min with {dronesList.length} drones
              </span>
            </div>

            {/* Drones List */}
            <div className="space-y-3">
              {dronesList.map((d, index) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-[13px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center shrink-0 shadow-2xs">
                      <Zap className="w-4.5 h-4.5 text-[#1B68D2]" />
                    </div>
                    <div>
                      <div className="font-bold text-[#0F284E] truncate text-xs sm:text-[13px]">{d.name}</div>
                      <div className="text-xs text-[#475569] font-medium">{d.model}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Role Dropdown */}
                    <select
                      value={d.role}
                      onChange={(e) => {
                        const updated = [...dronesList]
                        updated[index].role = e.target.value
                        setDronesList(updated)
                      }}
                      className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                    >
                      <option>Lead - Mapping</option>
                      <option>Thermal</option>
                      <option>Survey</option>
                      <option>Relay</option>
                      <option>Observer</option>
                    </select>

                    {/* Sector Dropdown */}
                    <select
                      value={d.sector}
                      onChange={(e) => {
                        const updated = [...dronesList]
                        updated[index].sector = e.target.value
                        setDronesList(updated)
                      }}
                      className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#334155] font-semibold max-w-[160px] truncate shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                    >
                      <option>Sector A - north face</option>
                      <option>Sector B - spillway and crest</option>
                      <option>Sector C - downstream toe</option>
                      <option>Sector D - auxiliary corridor</option>
                    </select>

                    {/* Battery Indicator */}
                    <div className="flex items-center gap-2 min-w-[75px]">
                      <div className="w-12 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${d.battery}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#0F284E]">{d.battery}%</span>
                    </div>

                    {/* Remove Drone */}
                    <button
                      type="button"
                      onClick={() => handleRemoveDrone(d.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
                      title="Remove drone"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons & Guidance */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAddDrone}
                  className="px-3.5 py-2 rounded-lg border border-[#1B68D2] text-[#1B68D2] hover:bg-[#EFF6FF] text-xs sm:text-[13px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Drone</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast?.("Auto-assigned roles: Drone 1 (Lead), Drone 2 (Thermal), Drone 3 (Survey).")}
                  className="px-3.5 py-2 rounded-lg bg-[#1B68D2] hover:bg-[#1557B0] text-white text-xs sm:text-[13px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Auto Assign Roles</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[#475569] font-medium pt-1.5 border-t border-[#E2E8F0]">
              Roles available: Lead, Survey, Thermal, Mapping, Relay. The lead carries the mission clock; the others hold formation against it.
            </p>
          </div>

          {/* Bottom Row: Task Allocation & Dropout Policy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Task Allocation */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider mb-2.5">
                  Task allocation
                </h4>
                <table className="w-full text-left text-xs sm:text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] text-[#0F284E] uppercase tracking-wider">
                      <th className="pb-2 font-bold">Drone</th>
                      <th className="pb-2 font-bold">Task</th>
                      <th className="pb-2 font-bold text-center">Share</th>
                      <th className="pb-2 font-bold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {dronesList.map((d, i) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-[#0F284E]">Drone {i + 1}</td>
                        <td className="py-2 text-[#334155] font-semibold truncate max-w-[120px]">{d.sector}</td>
                        <td className="py-2 font-mono text-center font-bold text-[#0F284E]">{Math.round(100 / dronesList.length)}%</td>
                        <td className="py-2 font-mono text-right font-bold text-[#1B68D2]">{Math.max(1, 5 - i * 2)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#475569] font-medium pt-2 border-t border-[#E2E8F0]">
                Allocated by sector area, balanced so every drone lands with at least 25% battery.
              </p>
            </div>

            {/* If a Drone Drops Out */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">
                If a drone drops out
              </h4>

              <div className="space-y-2.5 text-xs sm:text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F284E]">Policy</span>
                  <select
                    value={dropoutPolicy}
                    onChange={(e) => setDropoutPolicy(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>Re-split remaining task</option>
                    <option>Continue assigned sub-routes</option>
                    <option>Abort mission immediately</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F284E]">Who takes over</span>
                  <select
                    value={takeoverPolicy}
                    onChange={(e) => setTakeoverPolicy(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>Nearest drone with battery</option>
                    <option>Lead drone exclusively</option>
                    <option>Designated backup drone</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F284E]">Minimum swarm size</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={minSwarmSize}
                      onChange={(e) => setMinSwarmSize(parseInt(e.target.value) || 2)}
                      className="w-14 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-mono text-center font-bold text-[#0F284E] shadow-2xs"
                    />
                    <span className="text-xs font-semibold text-[#475569]">drones</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F284E]">If the lead drops</span>
                  <select
                    value={leadDropPolicy}
                    onChange={(e) => setLeadDropPolicy(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>Promote Drone 2</option>
                    <option>Promote highest battery drone</option>
                    <option>Land all aircraft</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F284E]">If below minimum</span>
                  <select
                    value={belowMinPolicy}
                    onChange={(e) => setBelowMinPolicy(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>All return to home</option>
                    <option>Hold hover in place</option>
                    <option>Complete partial sector</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-2 text-xs text-[#1B68D2] font-semibold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>What that costs: Losing one drone adds about 2 minutes and keeps coverage at 95%.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Formation & Separation */}
        <div className="lg:col-span-5 space-y-4">
          {/* Formation Selection */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F284E]">Formation</h3>
              <span className="text-xs font-bold text-[#334155] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Swarm Alpha · {dronesList.length} drones
              </span>
            </div>

            {/* 4 Formation Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "area_split", label: "Area split", icon: Grid },
                { id: "v_formation", label: "V formation", icon: ChevronDown },
                { id: "line_abreast", label: "Line abreast", icon: Sliders },
                { id: "orbit", label: "Orbit", icon: Share2 },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormation(f.id)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[56px] ${
                    formation === f.id
                      ? "border-[#1B68D2] bg-[#1B68D2] text-white shadow-2xs font-bold"
                      : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:border-[#94A3B8]"
                  }`}
                >
                  <f.icon className="w-4 h-4" />
                  <span className="text-xs font-bold leading-tight">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Formation Graphic Diagram */}
            <div className="h-48 rounded-xl bg-gradient-to-b from-slate-50 to-blue-50/40 border border-slate-200 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full max-w-[280px]" viewBox="0 0 280 180">
                {/* Connecting dashed vector lines */}
                <line x1="140" y1="50" x2="80" y2="120" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="140" y1="50" x2="200" y2="120" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="80" y1="120" x2="200" y2="120" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Drone 1: Lead Node */}
                <circle cx="140" cy="50" r="16" fill="#1B68D2" className="animate-pulse" />
                <text x="140" y="54" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Lead</text>

                {/* Drone 2: Thermal Node */}
                <circle cx="80" cy="120" r="14" fill="#EA580C" />
                <text x="80" y="124" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Thermal</text>

                {/* Drone 3: Survey Node */}
                <circle cx="200" cy="120" r="14" fill="#7E22CE" />
                <text x="200" y="124" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Survey</text>

                {/* Direction indicator */}
                <path d="M 140 20 L 145 30 L 135 30 Z" fill="#1B68D2" />
                <text x="140" y="14" textAnchor="middle" fill="#0F284E" fontSize="8" fontWeight="bold">FLIGHT AXIS</text>
              </svg>

              <div className="absolute bottom-2 right-3 text-xs font-mono font-bold text-[#0F284E] bg-white/90 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                Spatial Mesh Active
              </div>
            </div>
          </div>

          {/* Spatial Separation Sliders */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#0F284E]">Separation</h3>

            {/* Horizontal Spacing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs sm:text-[13px]">
                <span className="font-bold text-[#0F284E]">Horizontal spacing</span>
                <span className="font-mono font-extrabold text-[#0F284E]">{horizontalSpacing} m</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                value={horizontalSpacing}
                onChange={(e) => setHorizontalSpacing(parseInt(e.target.value))}
                className="w-full accent-[#1B68D2] cursor-pointer"
              />
            </div>

            {/* Altitude Separation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs sm:text-[13px]">
                <span className="font-bold text-[#0F284E]">Altitude separation</span>
                <span className="font-mono font-extrabold text-[#0F284E]">{altitudeSeparation} m steps</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={altitudeSeparation}
                onChange={(e) => setAltitudeSeparation(parseInt(e.target.value))}
                className="w-full accent-[#1B68D2] cursor-pointer"
              />
            </div>

            {/* Minimum Distance (Hard limit) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs sm:text-[13px]">
                <span className="font-bold text-[#0F284E]">Minimum distance (hard limit)</span>
                <span className="font-mono font-extrabold text-red-600">{minDistance} m</span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                value={minDistance}
                onChange={(e) => setMinDistance(parseInt(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] text-xs text-[#475569] font-medium leading-relaxed">
              Altitudes: Drone 1 {formData.flightAltitude || 120} m · Drone 2 {(formData.flightAltitude || 120) + altitudeSeparation} m · Drone 3 {(formData.flightAltitude || 120) + altitudeSeparation * 2} m. Swarm width {(dronesList.length - 1) * horizontalSpacing} m.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step3SwarmConfig
