import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Crosshair,
  Compass,
  Check,
  Shield,
  Layers,
  Share2,
  BarChart3,
  Users,
} from "lucide-react"
import { useMission } from "@/hooks/useMission.js"
import {
  getAirspaceZones,
  getAirspacePermissions,
  getAirspaceAdvisories,
  getFenceEvents30Days,
  getAirspaceMetrics,
} from "@/services/airspaceService.js"

import AirspaceKpiBar from "../components/airspace/AirspaceKpiBar.jsx"
import AirspaceMapCard from "../components/airspace/AirspaceMapCard.jsx"
import PermissionsCard from "../components/airspace/PermissionsCard.jsx"
import AdvisoriesCard from "../components/airspace/AdvisoriesCard.jsx"
import ZoneRegisterCard from "../components/airspace/ZoneRegisterCard.jsx"
import FenceEventsChartCard from "../components/airspace/FenceEventsChartCard.jsx"
import AddZoneModal from "../components/airspace/AddZoneModal.jsx"
import ImportZoneModal from "../components/airspace/ImportZoneModal.jsx"

export const GeofencingAirspacePage = () => {
  const { projects = [], currentProject, selectProject } = useMission()

  // Dynamic Airspace Data from Service
  const [zones, setZones] = useState(() => getAirspaceZones())
  const [permissions, setPermissions] = useState(() => getAirspacePermissions())
  const [advisories, setAdvisories] = useState(() => getAirspaceAdvisories())
  const [fenceEvents, setFenceEvents] = useState(() => getFenceEvents30Days())
  const [metrics, setMetrics] = useState(() => getAirspaceMetrics())

  // Modals state
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Synchronize on airspace data updates
  const refreshData = useCallback(() => {
    setZones(getAirspaceZones())
    setPermissions(getAirspacePermissions())
    setAdvisories(getAirspaceAdvisories())
    setFenceEvents(getFenceEvents30Days())
    setMetrics(getAirspaceMetrics())
  }, [])

  useEffect(() => {
    window.addEventListener("aeronexus_airspace_updated", refreshData)
    return () => window.removeEventListener("aeronexus_airspace_updated", refreshData)
  }, [refreshData])

  // Active site name derived from selected project or default
  const activeSiteName = useMemo(() => {
    return currentProject?.projectName || currentProject?.name || "Refinery"
  }, [currentProject])

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans overflow-y-auto">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#0B192C] text-white border border-[#35E0FF] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-7 max-w-[1720px] w-full mx-auto space-y-5">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="space-y-1">
          <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
            Geofencing & Airspace
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#334155] font-medium leading-relaxed">
            Where drones may fly, where they may not, and the permissions behind every mission.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP 5 KPI CARDS                                                        */}
        {/* ========================================================================= */}
        <AirspaceKpiBar metrics={metrics} />

        {/* ========================================================================= */}
        {/* 3. UPPER SECTION: AIRSPACE MAP + PERMISSIONS & ADVISORIES                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column (8 cols / ~66%): Airspace Map */}
          <div className="lg:col-span-8 flex flex-col">
            <AirspaceMapCard
              currentProject={currentProject}
              projects={projects}
              onSelectProject={selectProject}
              activeSiteName={activeSiteName}
              zones={zones}
            />
          </div>

          {/* Right Column (4 cols / ~34%): Permissions & Advisories */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <PermissionsCard permissions={permissions} />
            <AdvisoriesCard advisories={advisories} />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. LOWER SECTION: ZONE REGISTER + FENCE EVENTS CHART                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column (6 cols): Zone Register */}
          <div className="lg:col-span-6 flex flex-col">
            <ZoneRegisterCard
              zones={zones}
              onOpenAddZone={() => setIsAddZoneOpen(true)}
              onOpenImport={() => setIsImportOpen(true)}
            />
          </div>

          {/* Right Column (6 cols): Fence Events Chart */}
          <div className="lg:col-span-6 flex flex-col">
            <FenceEventsChartCard eventsData={fenceEvents} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM AERONEXUS BRANDING TRUST STRIP                                  */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-[#CBD5E1] bg-white px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#334155]">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#1B68D2] shrink-0" />
              <div>
                <span className="font-bold text-[#0F284E] block">Plan with Confidence</span>
                <span className="text-[11px] text-[#64748B]">Accurate, efficient and safe missions.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#1B68D2] shrink-0" />
              <div>
                <span className="font-bold text-[#0F284E] block">Multi-Drone, Multi-Use</span>
                <span className="text-[11px] text-[#64748B]">Any industry. Any environment.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1B68D2] shrink-0" />
              <div>
                <span className="font-bold text-[#0F284E] block">From Data to Decisions</span>
                <span className="text-[11px] text-[#64748B]">Turn aerial data into real value.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1B68D2] shrink-0" />
              <div>
                <span className="font-bold text-[#0F284E] block">Safer Operations</span>
                <span className="text-[11px] text-[#64748B]">People. Assets. Communities.</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono font-bold tracking-wider text-[#1B68D2] uppercase">
            ONE FLEET. ANY MISSION. ALWAYS READY.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddZoneModal
        isOpen={isAddZoneOpen}
        onClose={() => setIsAddZoneOpen(false)}
        activeSite={activeSiteName}
        onZoneAdded={(newZone) => {
          refreshData()
          showToast(`Zone "${newZone.name}" successfully registered.`)
        }}
      />

      <ImportZoneModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onZonesImported={(imported) => {
          refreshData()
          showToast(`Successfully imported ${imported.length} airspace zone(s).`)
        }}
      />
    </div>
  )
}

export default GeofencingAirspacePage
