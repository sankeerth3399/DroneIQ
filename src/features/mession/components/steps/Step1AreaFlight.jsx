import React, { useState, useMemo, useCallback } from "react"
import {
  Grid,
  RotateCw,
  Sliders,
  Camera,
  Clock,
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  Save,
  Download,
  Upload,
  Maximize2,
  FileText,
  AlertTriangle,
  Eye,
  Info,
  MapPin,
  Compass,
  Layers,
  ChevronDown,
} from "lucide-react"
import sampleImg from "@/assets/images/sampleImg.png"
import MapLoad from "@/components/Map/mapContainer.jsx"

export const Step1AreaFlight = ({
  formData,
  setFormData,
  currentProject,
  projects = [],
  selectProject,
  registeredDrones = [],
  localWaypoints = [],
  geofenceCoords = [],
  computedGsd,
  areaMetrics,
  onStepChange,
  triggerToast,
  telemetry,
}) => {
  const [activeAreaTool, setActiveAreaTool] = useState("draw")
  const [flightPattern, setFlightPattern] = useState("grid")
  const [previewCoverage, setPreviewCoverage] = useState(true)
  const [previewTab, setPreviewTab] = useState("2d")
  const [selectedWaypointId, setSelectedWaypointId] = useState(null)
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "normal"
    } catch {
      return "normal"
    }
  })

  const handleMapStyleChange = useCallback((newStyle) => {
    setMapStyle(newStyle)
    try {
      localStorage.setItem("aeronexus_map_style", newStyle)
    } catch {
      // Ignore
    }
  }, [])

  // Canonical mission waypoints matching Fly and Waypoint Planning
  const mapWaypoints = useMemo(() => {
    const raw = currentProject?.mission?.waypoints || localWaypoints || []
    if (!Array.isArray(raw)) return []
    return raw
      .filter((wp) => wp && (typeof wp.lat === "number" || typeof wp.latitude === "number"))
      .map((wp, index) => {
        const lat = typeof wp.lat === "number" ? wp.lat : Number(wp.latitude || 0)
        const lng = typeof wp.lng === "number" ? wp.lng : Number(wp.longitude || 0)
        const alt = typeof wp.alt === "number" ? wp.alt : Number(wp.altitude || formData.flightAltitude || 120)
        const seq = wp.seq || wp.sequence || index + 1
        return {
          ...wp,
          id: wp.id || `wp-${seq}`,
          seq,
          sequence: seq,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          alt: Math.round(alt),
          label: `WP${seq}`,
        }
      })
      .filter((wp) => !isNaN(wp.lat) && !isNaN(wp.lng) && (wp.lat !== 0 || wp.lng !== 0))
  }, [currentProject?.mission?.waypoints, localWaypoints, formData.flightAltitude])

  // Canonical mission geofence boundary matching Fly and Geofence Planning
  const geofencePolygon = useMemo(() => {
    if (geofenceCoords && geofenceCoords.length > 0) return geofenceCoords
    const g = currentProject?.geofence
    if (!g) return []
    if (Array.isArray(g)) return g
    if (Array.isArray(g.vertices)) return g.vertices
    if (Array.isArray(g.polygon)) return g.polygon
    if (Array.isArray(g.coordinates)) return g.coordinates
    return []
  }, [geofenceCoords, currentProject?.geofence])

  const [mapLayers, setMapLayers] = useState({
    coverageArea: true,
    flightPath: true,
    waypoints: true,
    noFlyZones: true,
    obstacles: false,
    weather: false,
    commsCoverage: false,
    drones: true,
  })

  const droneCount = registeredDrones.length > 0 ? registeredDrones.length : formData.droneCount || 3

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Main 3-Column Planner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN (3 cols): Mission Details Form                                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3.5">
          <h3 className="text-base font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2.5">
            Site Inspection – {formData.siteName || "North Ridge Dam"}
          </h3>

          <div className="space-y-3 text-xs sm:text-[13px]">
            <div>
              <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Mission Type</label>
              <select
                value={formData.missionType || "Inspection"}
                onChange={(e) => setFormData({ ...formData, missionType: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-[13px] sm:text-[14px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] focus:ring-1 focus:ring-[#1B68D2] outline-none cursor-pointer"
              >
                <option>Inspection</option>
                <option>Survey</option>
                <option>Surveillance</option>
                <option>Search & Rescue</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Use Case</label>
              <select
                value={formData.useCase || "Infrastructure Inspection"}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-[13px] sm:text-[14px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] focus:ring-1 focus:ring-[#1B68D2] outline-none cursor-pointer"
              >
                <option>Infrastructure Inspection</option>
                <option>Topographical Survey</option>
                <option>Perimeter Surveillance</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Location</label>
              <input
                type="text"
                value={formData.location || "North Ridge Dam, Karnataka"}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] sm:text-[14px] font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] focus:ring-1 focus:ring-[#1B68D2] outline-none"
              >
              </input>
            </div>

            <div>
              <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Area (km²)</label>
              <input
                type="text"
                readOnly
                value={areaMetrics.areaFormatted || "0.1 km²"}
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 font-mono font-bold text-[13px] text-[#334155] shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-[#E2E8F0]">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#334155]">Drones</span>
              <button
                type="button"
                onClick={() => onStepChange?.(3)}
                className="text-[13px] font-bold text-[#1B68D2] hover:underline"
              >
                {droneCount} (Swarm) - edit
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-[#E2E8F0]">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#334155]">Camera Payload</span>
              <button
                type="button"
                onClick={() => onStepChange?.(2)}
                className="text-[13px] font-bold text-[#1B68D2] hover:underline truncate max-w-[170px]"
              >
                {formData.payload || "RGB + LiDAR + Multispectral"} - edit
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-[#E2E8F0]">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#334155]">Estimated Time</span>
              <span className="font-mono font-bold text-[13px] text-[#0F284E]">5 min computed</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-[#E2E8F0]">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#334155]">Created By</span>
              <span className="font-bold text-[13px] text-[#0F284E]">Karan Kamal</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-[#E2E8F0]">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#334155]">Last Saved</span>
              <span className="text-amber-800 font-bold text-[12px] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Unsaved edits
              </span>
            </div>

            <div className="pt-1">
              <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Objective</label>
              <textarea
                rows={3}
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[13px] text-[#0F284E] font-medium leading-relaxed resize-none shadow-2xs focus:border-[#1B68D2] focus:ring-1 focus:ring-[#1B68D2] outline-none"
              />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => triggerToast?.("Reset form values to default baseline.")}
                className="text-[12px] font-bold text-[#1B68D2] hover:underline cursor-pointer"
              >
                Reset to defaults
              </button>
              <span className="text-[11px] font-semibold text-[#475569]">1 field changed</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN (6 cols): Shared Operational Map with Layers HUD            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-[#08182B] rounded-xl border border-[#CBD5E1] min-h-[480px] h-[520px] lg:h-[620px] relative overflow-hidden shadow-xs flex flex-col">
          <div className="relative flex-1 min-h-0 w-full h-full">
            <MapLoad
              mapStyle={mapStyle}
              onMapStyleChange={handleMapStyleChange}
              showAirspace={mapLayers.noFlyZones}
              telemetry={telemetry}
              waypoints={mapLayers.waypoints ? mapWaypoints : []}
              showMissionRoute={mapLayers.flightPath}
              geofence={mapLayers.coverageArea ? geofencePolygon : null}
              showDrones={mapLayers.drones}
              pageType="planning"
              selectedWaypointId={selectedWaypointId}
              onWaypointSelect={setSelectedWaypointId}
            />

            {/* Map Layers HUD Floating in Top Left */}
            <div className="absolute top-3 left-3 z-10 bg-[#08121DEB] backdrop-blur-md border border-[#1E2E42] rounded-xl p-3 text-xs text-slate-100 space-y-2 shadow-xl select-none">
              <div className="text-[11px] font-extrabold text-[#38BDF8] uppercase tracking-wider mb-1 flex items-center justify-between gap-2">
                <span>Map Layers</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              {Object.entries(mapLayers).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition font-medium text-xs">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setMapLayers({ ...mapLayers, [key]: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-800 text-[#1B68D2] text-xs cursor-pointer"
                  />
                  <span>
                    {key === "coverageArea"
                      ? "Coverage Area (Geofence)"
                      : key === "flightPath"
                      ? "Flight Path & Route"
                      : key === "waypoints"
                      ? "Waypoints"
                      : key === "noFlyZones"
                      ? "No-Fly Zones"
                      : key === "obstacles"
                      ? "Obstacles"
                      : key === "weather"
                      ? "Weather"
                      : key === "commsCoverage"
                      ? "Comms Coverage"
                      : "Drones (Live Position)"}
                  </span>
                </label>
              ))}
            </div>

            {/* Operational Planning Status Badge (Bottom Left) */}
            <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-2 select-none">
              <div className="text-xs font-mono font-bold text-slate-200 bg-[#08121DE6] border border-[#1E2E42] px-3 py-1.5 rounded-lg shadow-md backdrop-blur-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                <span>OPERATIONAL MAP · PLANNING MODE</span>
              </div>
            </div>

            {/* Waypoint & Geofence metrics badge (Bottom Right) */}
            <div className="absolute bottom-2.5 right-3 z-10 text-xs font-mono text-slate-200 bg-[#08121DE6] border border-[#1E2E42] px-3 py-1.5 rounded-lg shadow-md backdrop-blur-sm flex items-center gap-2 font-bold">
              <span className="text-[#38BDF8]">{mapWaypoints.length} WPs</span>
              <span className="text-slate-500">·</span>
              <span>{areaMetrics.areaFormatted || "0.1 km²"}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (3 cols): Area Definition, Flight Pattern, Settings           */}
        {/* ========================================================================= */}
        <div
          id="mission-planning-controls-panel"
          className="lg:col-span-3 space-y-3.5 flex flex-col"
        >
          {/* Area Definition */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">Area Definition</h4>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[
                { id: "draw", label: "Draw Area", icon: Grid },
                { id: "import", label: "Import", icon: Upload },
                { id: "select", label: "Select Asset", icon: MapPin },
                { id: "corridor", label: "Corridor", icon: Compass },
                { id: "poi", label: "POI", icon: Maximize2 },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveAreaTool(tool.id)}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-xs font-bold min-h-[52px] ${
                    activeAreaTool === tool.id
                      ? "border-[#1B68D2] bg-[#1B68D2] text-white shadow-2xs"
                      : "border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] hover:bg-white hover:border-[#94A3B8]"
                  }`}
                >
                  <tool.icon className="w-4 h-4 shrink-0" />
                  <span className="leading-tight text-[11px]">{tool.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-[13px] pt-2 border-t border-[#E2E8F0] font-mono">
              <span className="text-[#334155]">Area: <strong className="text-[#0F284E] font-bold">0.1 km²</strong></span>
              <span className="text-[#334155]">Perimeter: <strong className="text-[#0F284E] font-bold">1.4 km</strong></span>
            </div>
          </div>

          {/* Flight Pattern */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">Flight Pattern</h4>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { id: "grid", label: "Grid", icon: Grid },
                { id: "orbits", label: "Orbits", icon: RotateCw },
                { id: "corridor", label: "Corridor", icon: Compass },
                { id: "custom", label: "Custom", icon: Sliders },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFlightPattern(p.id)}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-xs font-bold min-h-[52px] ${
                    flightPattern === p.id
                      ? "border-[#1B68D2] bg-[#1B68D2] text-white shadow-2xs"
                      : "border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] hover:bg-white hover:border-[#94A3B8]"
                  }`}
                >
                  <p.icon className="w-4 h-4 shrink-0" />
                  <span className="leading-tight text-[11px]">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2.5 text-xs sm:text-[13px]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Overlap (Front)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={formData.frontOverlap || 75}
                      onChange={(e) => setFormData({ ...formData, frontOverlap: parseInt(e.target.value) || 75 })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-mono font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none"
                    />
                    <span className="text-xs font-bold text-[#475569]">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Overlap (Side)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={formData.sideOverlap || 65}
                      onChange={(e) => setFormData({ ...formData, sideOverlap: parseInt(e.target.value) || 65 })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-mono font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none"
                    />
                    <span className="text-xs font-bold text-[#475569]">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Flight Altitude</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={formData.flightAltitude || 120}
                      onChange={(e) => setFormData({ ...formData, flightAltitude: parseInt(e.target.value) || 120 })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-mono font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none"
                    />
                    <span className="text-xs font-bold text-[#475569]">m</span>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] text-[#0F284E] font-bold block mb-1">GSD</label>
                  <div className="font-mono text-sm font-extrabold text-[#1B68D2] pt-1">{computedGsd}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#0F284E]">Preview Coverage</span>
                <input
                  type="checkbox"
                  checked={previewCoverage}
                  onChange={(e) => setPreviewCoverage(e.target.checked)}
                  className="toggle-checkbox"
                />
              </div>
            </div>
          </div>

          {/* Mission Settings */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">Mission Settings</h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-[13px]">
              <div>
                <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Speed</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={formData.speed || 8}
                    onChange={(e) => setFormData({ ...formData, speed: parseFloat(e.target.value) || 8 })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-mono font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none"
                  />
                  <span className="text-xs font-bold text-[#475569]">m/s</span>
                </div>
              </div>

              <div>
                <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Capture Interval</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={formData.captureInterval || 2}
                    onChange={(e) => setFormData({ ...formData, captureInterval: parseFloat(e.target.value) || 2 })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-mono font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none"
                  />
                  <span className="text-xs font-bold text-[#475569]">sec</span>
                </div>
              </div>
            </div>

            <div className="text-xs sm:text-[13px]">
              <label className="text-[12px] text-[#0F284E] font-bold block mb-1">Action on Completion</label>
              <select
                value={formData.actionOnCompletion || "Return to Home"}
                onChange={(e) => setFormData({ ...formData, actionOnCompletion: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-semibold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
              >
                <option>Return to Home</option>
                <option>Hover at Final Waypoint</option>
                <option>Land at Final Waypoint</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => onStepChange?.(11)}
                className="flex-1 h-10 border border-[#1B68D2] text-[#1B68D2] hover:bg-[#EFF6FF] rounded-lg text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 fill-[#1B68D2]" />
                <span>Simulate</span>
              </button>
              <button
                type="button"
                onClick={() => triggerToast?.("Mission plan saved.")}
                className="flex-1 h-10 bg-[#1B68D2] hover:bg-[#1557B0] text-white rounded-lg text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Mission</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ROW (3 Equal Cards): Mission Preview, Waypoints, Coverage Elevation */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Mission Preview */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">Mission Preview</h4>
            <div className="inline-flex items-center text-xs font-bold bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewTab("2d")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  previewTab === "2d"
                    ? "bg-white text-[#1B68D2] shadow-2xs font-bold"
                    : "text-[#475569] hover:text-[#0F284E]"
                }`}
                aria-pressed={previewTab === "2d"}
              >
                2D Map
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("coverage")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  previewTab === "coverage"
                    ? "bg-white text-[#1B68D2] shadow-2xs font-bold"
                    : "text-[#475569] hover:text-[#0F284E]"
                }`}
                aria-pressed={previewTab === "coverage"}
              >
                Coverage
              </button>
            </div>
          </div>

          {previewTab === "2d" ? (
            <div className="h-36 rounded-lg bg-slate-900 overflow-hidden relative">
              <img src={sampleImg} alt="2D Mission Preview" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 font-semibold bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>2D Flight Path · {mapWaypoints.length || localWaypoints.length || 7} WPs</span>
              </div>
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                <span className="font-mono font-bold">00:00 / 05:00</span>
                <button
                  type="button"
                  onClick={() => onStepChange?.(11)}
                  className="font-bold text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Open full simulation</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-36 rounded-lg bg-slate-950 border border-[#1E2E42] p-3 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

              {/* Coverage Header Summary */}
              <div className="relative z-10 flex items-center justify-between text-xs border-b border-[#1E2E42]/80 pb-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SURVEY COVERAGE: 100%</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {areaMetrics.areaFormatted || "0.1 km²"}
                </span>
              </div>

              {/* Coverage Metrics Grid */}
              <div className="relative z-10 grid grid-cols-3 gap-2 text-center font-mono py-1">
                <div className="bg-[#0B1728] p-1.5 rounded border border-[#1E3A5F]">
                  <span className="text-[10px] text-slate-400 block font-sans font-medium">Ground GSD</span>
                  <span className="text-xs font-bold text-[#38BDF8]">{computedGsd || "2.4 cm/px"}</span>
                </div>
                <div className="bg-[#0B1728] p-1.5 rounded border border-[#1E3A5F]">
                  <span className="text-[10px] text-slate-400 block font-sans font-medium">Flight Alt</span>
                  <span className="text-xs font-bold text-slate-200">{formData.flightAltitude || 120} m</span>
                </div>
                <div className="bg-[#0B1728] p-1.5 rounded border border-[#1E3A5F]">
                  <span className="text-[10px] text-slate-400 block font-sans font-medium">Overlap</span>
                  <span className="text-xs font-bold text-emerald-400">75% / 60%</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="relative z-10 flex items-center justify-between text-xs pt-1 border-t border-[#1E2E42]/80">
                <span className="font-mono text-[11px] text-slate-400">Grid Pattern: Lawn-Mower</span>
                <button
                  type="button"
                  onClick={() => onStepChange?.(11)}
                  className="font-bold text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Open full simulation</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Waypoints Table */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">
                Waypoints ({localWaypoints.length || 5})
              </h4>
              <button
                type="button"
                onClick={() => triggerToast?.("Regenerated 7 optimal survey waypoints.")}
                className="text-xs font-bold text-[#1B68D2] hover:underline cursor-pointer"
              >
                Auto Generate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] text-[#0F284E] uppercase tracking-wider">
                    <th className="pb-2 font-bold">#</th>
                    <th className="pb-2 font-bold">Latitude</th>
                    <th className="pb-2 font-bold">Longitude</th>
                    <th className="pb-2 font-bold">Alt (m)</th>
                    <th className="pb-2 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {[
                    { id: 1, lat: "12.9712", lng: "77.5931", alt: 120, act: "Capture" },
                    { id: 2, lat: "12.9720", lng: "77.5944", alt: 120, act: "Capture" },
                    { id: 3, lat: "12.9724", lng: "77.5957", alt: 120, act: "Capture" },
                    { id: 4, lat: "12.9732", lng: "77.5970", alt: 120, act: "Capture" },
                    { id: 5, lat: "12.9738", lng: "77.5983", alt: 120, act: "Capture" },
                    { id: 6, lat: "12.9744", lng: "77.5996", alt: 120, act: "Capture" },
                    { id: 7, lat: "12.9748", lng: "77.6009", alt: 120, act: "Capture" },
                  ].map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-[#0F284E]">{w.id}</td>
                      <td className="py-2 text-[#334155] font-semibold">{w.lat}</td>
                      <td className="py-2 text-[#334155] font-semibold">{w.lng}</td>
                      <td className="py-2 text-[#0F284E] font-bold">{w.alt}</td>
                      <td className="py-2 text-right text-[#1B68D2] font-bold">{w.act}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 3: Coverage & Elevation */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">
                Coverage & Elevation
              </h4>
              <button
                type="button"
                onClick={() => onStepChange?.(8)}
                className="text-xs font-bold text-[#1B68D2] hover:underline cursor-pointer"
              >
                Coverage plan &gt;
              </button>
            </div>

            <div className="h-20 bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden flex items-center justify-center p-1">
              <svg className="w-full h-full" viewBox="0 0 300 70" preserveAspectRatio="none">
                <path d="M 0 55 Q 60 40 120 45 T 220 30 T 300 40 L 300 70 L 0 70 Z" fill="#E2E8F0" />
                <path d="M 0 55 Q 60 40 120 45 T 220 30 T 300 40" fill="none" stroke="#10B981" strokeWidth="1.5" />
                <line x1="0" y1="20" x2="300" y2="20" stroke="#1B68D2" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-2.5 text-xs text-center font-mono">
              <div>
                <span className="text-[#475569] font-semibold block text-[11px]">Max terrain</span>
                <strong className="text-[#0F284E] text-xs sm:text-[13px] font-bold">320 m</strong>
              </div>
              <div>
                <span className="text-[#475569] font-semibold block text-[11px]">Min terrain</span>
                <strong className="text-[#0F284E] text-xs sm:text-[13px] font-bold">210 m</strong>
              </div>
              <div>
                <span className="text-[#475569] font-semibold block text-[11px]">Flight alt</span>
                <strong className="text-[#1B68D2] text-xs sm:text-[13px] font-bold">120 m</strong>
              </div>
              <div>
                <span className="text-[#475569] font-semibold block text-[11px]">Clearance</span>
                <strong className="text-emerald-700 text-xs sm:text-[13px] font-bold">50 m</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step1AreaFlight
