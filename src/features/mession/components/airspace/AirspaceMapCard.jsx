import React, { useState, useMemo } from "react"
import { Layers, ChevronDown, Plus, Minus, RotateCcw, AlertTriangle, ShieldAlert, Crosshair } from "lucide-react"
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

  // Map layer toggle states matching the reference screenshot
  const [layers, setLayers] = useState({
    noFlyAndRestricted: true,
    safeCorridors: true,
    emergencyLandingZones: true,
    obstacles: true,
    missionAreas: true,
    plannedRoutes: false,
  })

  const [mapStyle, setMapStyle] = useState("normal")
  const [airspaceStatus, setAirspaceStatus] = useState(null)
  const [viewMode, setViewMode] = useState("mappls") // 'mappls' or 'schematic'

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  // Derive waypoints and geofence from active project
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

      {/* Main Map Viewport with Overlays */}
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
        {/* FLOATING MAP LAYERS PANEL (Matches reference screenshot exactly)          */}
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

        {/* ========================================================================= */}
        {/* TACTICAL INDUSTRIAL AIRSPACE OVERLAY (Refinery / Site Schematic Details)   */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* 1. Tank Farm (Restricted Area) */}
          {layers.noFlyAndRestricted && (
            <div
              className="absolute pointer-events-auto transition-opacity duration-200"
              style={{ top: "12%", left: "18%", width: "22%", height: "34%" }}
            >
              <div className="w-full h-full border-2 border-dashed border-[#F59E0B] bg-[#F59E0B]/10 rounded-xl relative p-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <span className="absolute -top-5 left-1 text-[10px] font-bold text-[#FBBF24] whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded">
                  Restricted - tank farm, no overflight below 40 m
                </span>
                <span className="text-[11px] font-bold text-slate-300 block">Tank Farm</span>
                {/* 6 Tanks Grid */}
                <div className="grid grid-cols-3 gap-2 mt-1.5 h-[70%] items-center justify-items-center">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#E2E8F0]/30 border border-[#E2E8F0]/50 shadow-inner flex items-center justify-center"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Process Unit 3 - CDU (Mission Area) */}
          {layers.missionAreas && (
            <div
              className="absolute pointer-events-auto transition-opacity duration-200"
              style={{ top: "12%", left: "43%", width: "32%", height: "54%" }}
            >
              <div className="w-full h-full border-2 border-[#38BDF8] bg-[#0284C7]/15 rounded-xl relative p-2 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <span className="text-[11px] font-bold text-[#38BDF8] block">Process Unit 3 - CDU</span>
                <div className="w-full h-[1px] bg-[#F59E0B]/70 absolute top-[44%] left-0" />
                <span className="absolute top-[41%] right-2 text-[9px] font-mono text-slate-400 bg-black/60 px-1 rounded">
                  Pipe rack - 14 m
                </span>
                <span className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400">Utilities</span>
              </div>
            </div>
          )}

          {/* 3. Obstacle: Column C-301 - 62 m */}
          {layers.obstacles && (
            <div
              className="absolute pointer-events-auto"
              style={{ top: "32%", left: "55%" }}
            >
              <div className="flex items-center gap-1.5 bg-[#0F172A]/90 border border-[#F97316] text-[#F97316] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                <AlertTriangle className="w-3 h-3 text-[#F97316]" />
                <span>Column C-301 - 62 m</span>
              </div>
            </div>
          )}

          {/* 4. No-Fly Zone: Flare - 95 m */}
          {layers.noFlyAndRestricted && (
            <div
              className="absolute pointer-events-auto"
              style={{ top: "12%", left: "78%", width: "16%", height: "28%" }}
            >
              <div className="w-full h-full border-2 border-[#EF4444] bg-[#EF4444]/15 rounded-xl relative p-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#EF4444] bg-black/70 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                  <span>Flare - 95 m</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Process Unit 1 Box */}
          {layers.missionAreas && (
            <div
              className="absolute pointer-events-auto"
              style={{ top: "52%", left: "20%", width: "18%", height: "22%" }}
            >
              <div className="w-full h-full border border-slate-700 bg-slate-800/40 rounded-lg p-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Process Unit 1</span>
              </div>
            </div>
          )}

          {/* 6. Emergency Landing Zone: ELZ-1 - dock & pad */}
          {layers.emergencyLandingZones && (
            <div
              className="absolute pointer-events-auto"
              style={{ top: "67%", left: "16%" }}
            >
              <div className="flex items-center gap-1.5 bg-[#0A1628]/90 border border-[#22C55E] text-[#22C55E] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping" />
                <span>ELZ-1 - dock & pad</span>
              </div>
            </div>
          )}

          {/* 7. Safe Corridors (Green Glowing Polyline) */}
          {layers.safeCorridors && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12 }}>
              <line
                x1="12%"
                y1="76%"
                x2="17%"
                y2="69%"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                opacity="0.9"
              />
              <line
                x1="17%"
                y1="69%"
                x2="44%"
                y2="54%"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                opacity="0.9"
              />
              <line
                x1="44%"
                y1="54%"
                x2="44%"
                y2="66%"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                opacity="0.9"
              />
            </svg>
          )}

          {/* Schematic Illustrative Watermark matching reference */}
          <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-0.5 rounded">
            Schematic · illustrative
          </div>
        </div>
      </div>
    </div>
  )
}

export default AirspaceMapCard
