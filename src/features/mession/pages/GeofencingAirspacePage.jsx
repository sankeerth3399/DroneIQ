import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Crosshair,
  Compass,
  Check,
  Shield,
  Layers,
  Share2,
  BarChart3,
  Users,
  RotateCw,
  Wifi,
  AlertCircle,
  Clock,
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

// Freshness window: 5 minutes before data is considered stale
const STALE_THRESHOLD_MS = 5 * 60 * 1000

export const GeofencingAirspacePage = () => {
  const { projects = [], currentProject, selectProject } = useMission()

  // Dynamic Airspace Data from Service
  const [zones, setZones] = useState(() => getAirspaceZones())
  const [permissions, setPermissions] = useState(() => getAirspacePermissions())
  const [advisories, setAdvisories] = useState(() => getAirspaceAdvisories())
  const [fenceEvents, setFenceEvents] = useState(() => getFenceEvents30Days())
  const [metrics, setMetrics] = useState(() => getAirspaceMetrics())

  // Real-Time Sync & Freshness Status
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date())
  const [isStale, setIsStale] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [mapplsStatus, setMapplsStatus] = useState(null)

  // Modals state
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Active site name derived from selected project or default
  const activeSiteName = useMemo(() => {
    return currentProject?.projectName || currentProject?.name || "Refinery"
  }, [currentProject])

  // Synchronize on authoritative data updates
  const refreshData = useCallback(async () => {
    try {
      setSyncError(null)
      const currentSite = currentProject?.projectName || currentProject?.name || null

      const fetchedZones = getAirspaceZones()
      const fetchedPerms = getAirspacePermissions()
      const fetchedAdvs = getAirspaceAdvisories()
      const fetchedEvents = getFenceEvents30Days(currentSite)
      const calculatedMetrics = getAirspaceMetrics({
        currentProject,
        mapplsStatus,
      })

      setZones(fetchedZones)
      setPermissions(fetchedPerms)
      setAdvisories(fetchedAdvs)
      setFenceEvents(fetchedEvents)
      setMetrics(calculatedMetrics)

      setLastSyncTime(new Date())
      setIsStale(false)
    } catch (err) {
      console.error("[GeofencingAirspacePage] Refresh failed:", err)
      setSyncError("Failed to synchronize latest airspace records.")
    }
  }, [currentProject, mapplsStatus])

  // Manual Refresh Handler with visual spin
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await refreshData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Handle Mappls Airspace Plugin status changes
  const handleMapplsStatusChange = useCallback((statusInfo) => {
    setMapplsStatus(statusInfo)
    setMetrics(getAirspaceMetrics({ currentProject, mapplsStatus: statusInfo }))
  }, [currentProject])

  // Initial and Project change listener
  useEffect(() => {
    refreshData()
  }, [currentProject, refreshData])

  // Real-time Event Listeners and 30-Second Freshness Check Interval
  useEffect(() => {
    const handleUpdate = () => refreshData()
    const handleStorage = (e) => {
      if (e.key && e.key.startsWith("aeronexus_airspace_")) {
        refreshData()
      }
    }

    window.addEventListener("aeronexus_airspace_updated", handleUpdate)
    window.addEventListener("aeronexus_projects_updated", handleUpdate)
    window.addEventListener("storage", handleStorage)

    // Periodic interval to evaluate expiring advisories/permissions and stale status
    const intervalId = setInterval(() => {
      // Re-evaluate metrics without complete wipe
      setMetrics(getAirspaceMetrics({ currentProject, mapplsStatus }))
      if (Date.now() - new Date(lastSyncTime).getTime() > STALE_THRESHOLD_MS) {
        setIsStale(true)
      }
    }, 30000)

    return () => {
      window.removeEventListener("aeronexus_airspace_updated", handleUpdate)
      window.removeEventListener("aeronexus_projects_updated", handleUpdate)
      window.removeEventListener("storage", handleStorage)
      clearInterval(intervalId)
    }
  }, [refreshData, currentProject, mapplsStatus, lastSyncTime])

  // Format the last updated time string
  const formattedLastSync = useMemo(() => {
    try {
      return lastSyncTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return "Just now"
    }
  }, [lastSyncTime])

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
        {/* 1. PAGE HEADER WITH LIVE OPERATIONAL SYNC CONTROLS                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="space-y-1">
            <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
              Geofencing & Airspace
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#334155] font-medium leading-relaxed">
              Where drones may fly, where they may not, and the permissions behind every mission.
            </p>
          </div>

          {/* Real-Time Live Status Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sync State Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs text-xs font-medium text-[#334155]">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isStale ? "bg-amber-400" : syncError ? "bg-red-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isStale ? "bg-amber-500" : syncError ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span className="font-semibold text-[#0F284E]">
                {isStale ? "Data Stale" : syncError ? "Sync Error" : "Live Sync Active"}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-[11px] text-slate-500 font-mono">
                Updated {formattedLastSync}
              </span>
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] active:border-[#1B68D2] shadow-2xs text-xs font-bold text-[#1B68D2] transition cursor-pointer disabled:opacity-50"
              title="Refresh airspace data from authoritative sources"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Sync Error Banner with Retry */}
        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TOP 5 KPI CARDS                                                        */}
        {/* ========================================================================= */}
        <AirspaceKpiBar metrics={metrics} loading={loading} isStale={isStale} />

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
              onAirspaceStatusChange={handleMapplsStatusChange}
            />
          </div>

          {/* Right Column (4 cols / ~34%): Permissions & Advisories */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <PermissionsCard permissions={permissions} loading={loading} />
            <AdvisoriesCard
              advisories={advisories}
              loading={loading}
              lastChecked={lastSyncTime}
            />
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
              fenceEvents={fenceEvents}
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

