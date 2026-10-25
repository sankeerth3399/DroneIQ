import React, { useState, useMemo } from "react"
import MapContainer from "@/components/Map/mapContainer.jsx"
import { useTelemetry } from "@/hooks/useTelemetry.js"

export const AirspaceMapCard = ({
  currentProject,
  projects = [],
  onSelectProject,
  activeSiteName = "Refinery",
  zones = [],
}) => {
  const { isLive, isDroneConnected } = useTelemetry()

  // Map layer toggle states
  const [layers, setLayers] = useState({
    noFlyAndRestricted: true,
    safeCorridors: false,
    emergencyLandingZones: false,
    obstacles: false,
    missionAreas: true,
    plannedRoutes: false,
  })

  const [mapStyle, setMapStyle] = useState("normal")
  const [airspaceStatus, setAirspaceStatus] = useState(null)

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  // Derive genuine waypoints and geofence from active project
  const waypoints = useMemo(() => {
    if (!layers.plannedRoutes) return []
    return currentProject?.mission?.waypoints || currentProject?.mission?.items || []
  }, [layers.plannedRoutes, currentProject])

  const geofence = useMemo(() => {
    if (!layers.missionAreas) return null
    return currentProject?.geofence || null
  }, [layers.missionAreas, currentProject])

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden flex flex-col h-[520px] lg:h-[560px]">
      {/* Card Header Bar */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#0F284E] tracking-tight">
            Airspace map · <span className="text-[#1B68D2]">{activeSiteName}</span>
          </h3>
          {airspaceStatus?.status === "ACTIVE" && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              DGCA Airspace Online
            </span>
          )}
        </div>

        {/* Project Selector / Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">Switch project:</span>
          <select
            value={currentProject?.id || ""}
            onChange={(e) => onSelectProject?.(e.target.value)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#0F284E] outline-none cursor-pointer hover:border-[#94A3B8] transition"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName || p.name || p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Map Viewport with Genuine Overlays Only */}
      <div className="relative flex-1 w-full min-h-0 bg-[#0B1522] overflow-hidden select-none">
        {/* Real Mappls Vector Map */}
        <div className="w-full h-full relative z-0">
          <MapContainer
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
            showAirspace={layers.noFlyAndRestricted}
            onAirspaceStatusChange={setAirspaceStatus}
            waypoints={waypoints}
            geofence={geofence}
            showMissionRoute={layers.plannedRoutes}
            showControls={true}
            controlsPosition="top-right"
            pageType="airspace"
          />
        </div>

        {/* ========================================================================= */}
        {/* FLOATING MAP LAYERS PANEL                                                 */}
        {/* ========================================================================= */}
        <div className="absolute top-4 left-4 z-20 bg-[#0A1628]/92 backdrop-blur-md border border-[#1E2E44] text-white rounded-xl p-3 shadow-xl max-w-[210px] w-full text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 pb-1.5 border-b border-slate-700/60 mb-2">
            Map Layers
          </div>

          <div className="space-y-1.5 font-medium">
            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.noFlyAndRestricted}
                onChange={() => toggleLayer("noFlyAndRestricted")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">No-fly and restricted</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.safeCorridors}
                onChange={() => toggleLayer("safeCorridors")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">Safe corridors</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.emergencyLandingZones}
                onChange={() => toggleLayer("emergencyLandingZones")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">Emergency landing zones</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.obstacles}
                onChange={() => toggleLayer("obstacles")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">Obstacles</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.missionAreas}
                onChange={() => toggleLayer("missionAreas")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">Mission areas</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[#38BDF8] transition">
              <input
                type="checkbox"
                checked={layers.plannedRoutes}
                onChange={() => toggleLayer("plannedRoutes")}
                className="w-3.5 h-3.5 rounded accent-[#1B68D2] cursor-pointer"
              />
              <span className="text-[11.5px]">Planned routes</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AirspaceMapCard
