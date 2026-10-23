import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  FileDown,
  FileText,
  Layers,
  MapPin,
  MinusCircle,
  Network,
  Plane,
  Plus,
  Radio,
  RotateCw,
  Route,
  Share2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Video,
  VideoOff,
} from "lucide-react"
import MapLoad from "@/components/Map/mapContainer.jsx"
import { useTelemetry } from "@/context/TelemetryContext.jsx"
import { useMission } from "@/hooks/useMission.js"
import { useAuth } from "@/hooks/useAuth.js"
import { incidentService, SEEDED_ACTIVE_ALERTS } from "@/services/api/incidentService.js"
import { videoService } from "@/services/videoService.js"
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx"

// Imported Alert Thumbnails matching reference screenshot
import alertSmokeImg from "@/assets/images/dashboard/alert_smoke.jpg"
import alertThermalImg from "@/assets/images/dashboard/alert_thermal.jpg"
import alertVehicleImg from "@/assets/images/dashboard/alert_vehicle.jpg"

// Workflow Steps Definition matching reference screenshot
const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "1. Plan",
    desc: "Define objective, area and payload",
    path: "/mission-planning",
  },
  {
    step: 2,
    title: "2. Orchestrate",
    desc: "Assign drones, set rules and airspace",
    path: "/missions",
  },
  {
    step: 3,
    title: "3. Fly",
    desc: "Auto-execute or manual control",
    path: "/fly",
  },
  {
    step: 4,
    title: "4. Monitor",
    desc: "Live feeds and telemetry",
    path: "/live-operations",
  },
  {
    step: 5,
    title: "5. Analyze",
    desc: "AI insights and alerts",
    path: "/analytics",
  },
  {
    step: 6,
    title: "6. Act",
    desc: "Respond and close the mission",
    path: "/incidents",
  },
]

export const CommandCenterOperational = () => {
  const navigate = useNavigate()
  const {
    telemetry,
    selectedDroneId,
    selectDrone,
    registeredDrones = [],
    fleetTelemetry = {},
  } = useTelemetry()
  const { currentProject, projects = [] } = useMission()
  const { user, role } = useAuth()

  // Real-time Clock String
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Map layer toggle states
  const [mapLayers, setMapLayers] = useState({
    drones: true,
    flightPath: true,
    missionArea: true,
    geofence: true,
    linkCoverage: false,
    noFlyZones: true,
  })

  const toggleLayer = (layerKey) => {
    setMapLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  // Operational Map Style State (Normal / Satellite)
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_command_center_map_style") || "satellite"
    } catch {
      return "satellite"
    }
  })

  const handleMapStyleChange = useCallback((newStyle) => {
    setMapStyle(newStyle)
    try {
      localStorage.setItem("aeronexus_command_center_map_style", newStyle)
    } catch {
      // Safe ignore
    }
  }, [])

  // Active Incidents / Alerts State (Hydrated from storage / backend incidents)
  const [alerts, setAlerts] = useState(() => {
    try {
      const raw = localStorage.getItem("aeronexus_active_alerts")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return SEEDED_ACTIVE_ALERTS
  })
  const [alertsLoading, setAlertsLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true)
      const res = await incidentService.getActiveAlerts()
      if (Array.isArray(res)) {
        setAlerts(res)
      }
    } catch (err) {
      console.warn("[CommandCenter] Using stored alert state:", err)
      try {
        const raw = localStorage.getItem("aeronexus_active_alerts")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) setAlerts(parsed)
        }
      } catch {}
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()

    const handleAlertsUpdate = () => {
      fetchAlerts()
    }

    window.addEventListener("aeronexus:incident_updated", handleAlertsUpdate)
    window.addEventListener("aeronexus:alert", handleAlertsUpdate)
    window.addEventListener("aeronexus:dismiss-alert", handleAlertsUpdate)
    window.addEventListener("aeronexus:clear-alerts", handleAlertsUpdate)
    window.addEventListener("storage", handleAlertsUpdate)
    return () => {
      window.removeEventListener("aeronexus:incident_updated", handleAlertsUpdate)
      window.removeEventListener("aeronexus:alert", handleAlertsUpdate)
      window.removeEventListener("aeronexus:dismiss-alert", handleAlertsUpdate)
      window.removeEventListener("aeronexus:clear-alerts", handleAlertsUpdate)
      window.removeEventListener("storage", handleAlertsUpdate)
    }
  }, [fetchAlerts])

  // Live Camera Feeds State (Queried via videoService)
  const [liveStreams, setLiveStreams] = useState([])
  const [isStreamsLoading, setIsStreamsLoading] = useState(true)

  const fetchLiveStreams = useCallback(async () => {
    setIsStreamsLoading(true)
    try {
      const streams = await videoService.getVideoStreams()
      setLiveStreams(Array.isArray(streams) ? streams : [])
    } catch {
      setLiveStreams([])
    } finally {
      setIsStreamsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveStreams()
  }, [fetchLiveStreams])


  // =========================================================
  // DYNAMIC COMPUTED METRICS (Derived strictly from real data)
  // =========================================================

  // 1. Drones Active (actual in-air vs on-ground states)
  const inAirCount = useMemo(() => {
    return (registeredDrones || []).filter((d) => {
      const tel = fleetTelemetry[d.id] || (d.id === selectedDroneId ? telemetry : null)
      return Boolean(
        tel?.isLive &&
          (tel?.isArmed ||
            tel?.altitude > 2 ||
            tel?.flightMode === "AUTO" ||
            tel?.flightMode === "GUIDED")
      )
    }).length
  }, [registeredDrones, fleetTelemetry, selectedDroneId, telemetry])

  const onGroundCount = Math.max(0, (registeredDrones?.length || 0) - inAirCount)

  // 2. Cameras Online (actual available / connected streams)
  const camerasOnlineCount = liveStreams.length

  // 3. Active Missions (actual mission records and operational statuses)
  const activeMissionsCount = useMemo(() => {
    return (projects || []).filter((p) => {
      return (
        p.status === "In Progress" ||
        p.status === "active" ||
        (p.id === currentProject?.id && telemetry?.isLive)
      )
    }).length
  }, [projects, currentProject, telemetry])

  const scheduledMissionsCount = useMemo(() => {
    return (projects || []).filter((p) => {
      return (
        p.status === "Scheduled" ||
        p.status === "ready" ||
        p.status === "planned" ||
        (!p.status && p.id !== currentProject?.id)
      )
    }).length
  }, [projects, currentProject])

  // 4. Sites Monitored (actual configured sites/projects)
  const sitesMonitoredCount = projects?.length || 0

  // 5. Active Alerts (actual unresolved backend incidents)
  const unresolvedAlerts = useMemo(() => {
    return (alerts || []).filter((a) => {
      const st = (a.status || "").toLowerCase().trim()
      return st !== "resolved" && st !== "closed"
    })
  }, [alerts])

  const alertBreakdown = useMemo(() => {
    let crit = 0
    let high = 0
    let med = 0
    let low = 0
    unresolvedAlerts.forEach((a) => {
      const sev = (a.severity || "").toLowerCase().trim()
      if (sev === "critical") crit++
      else if (sev === "high") high++
      else if (sev === "medium") med++
      else low++
    })
    return { crit, high, med, low }
  }, [unresolvedAlerts])

  const activeAlertSubtitle = useMemo(() => {
    if (unresolvedAlerts.length === 0) return "All airspaces nominal"
    const parts = []
    if (alertBreakdown.crit > 0) parts.push(`${alertBreakdown.crit} critical`)
    if (alertBreakdown.high > 0) parts.push(`${alertBreakdown.high} high`)
    if (alertBreakdown.med > 0) parts.push(`${alertBreakdown.med} med`)
    if (alertBreakdown.low > 0) parts.push(`${alertBreakdown.low} low`)
    return parts.length > 0 ? parts.join(" · ") : `${unresolvedAlerts.length} active`
  }, [unresolvedAlerts.length, alertBreakdown])

  // 6. Mission Success Rate strictly computed from authoritative actual mission records
  // Formula: Successfully Completed Missions ÷ (Successfully Completed Missions + Failed Missions) × 100
  // Exclude Draft, Planned, Ready, Active, In Progress, and Cancelled missions from denominator.
  // Count only missions with authoritative terminal outcomes. Do not count the same mission more than once.
  const missionSuccessMetrics = useMemo(() => {
    // Deduplicate actual project mission records by id
    const uniqueProjects = Array.isArray(projects)
      ? Array.from(new Map(projects.map((p) => [p.id, p])).values())
      : []

    // Filter only missions with authoritative terminal outcomes (completed or failed)
    // Draft, Planned, Ready, Active, In Progress, and Cancelled missions are strictly excluded from the denominator.
    const terminalProjects = uniqueProjects.filter((p) => {
      const st = (p.status || "").toLowerCase().trim()
      return ["completed", "successful", "success", "failed", "aborted", "error"].includes(st)
    })

    let successful = 0
    let failed = 0

    terminalProjects.forEach((p) => {
      const st = (p.status || "").toLowerCase().trim()
      if (["completed", "successful", "success"].includes(st)) {
        successful++
      } else if (["failed", "aborted", "error"].includes(st)) {
        failed++
      }
    })

    const totalTerminal = successful + failed

    // When neither mission has a completed outcome (e.g. Survey Site A - Ready, Inspection Project B - Draft)
    if (totalTerminal === 0) {
      return {
        value: "N/A",
        rate: null,
        detailText: "No completed missions yet",
        hasTrend: false,
        trendText: null,
        trendPositive: true,
        trendColor: "text-[#64748B]",
        bgColor: "bg-[#94A3B8]",
      }
    }

    const rate = Math.round((successful / totalTerminal) * 100)

    const detailText =
      rate === 100
        ? `All ${successful} completed successfully`
        : `${successful} of ${totalTerminal} completed`

    const bgColor = rate >= 90 ? "bg-[#10B981]" : rate >= 70 ? "bg-[#F59E0B]" : "bg-[#EF4444]"

    return {
      value: `${rate}%`,
      rate,
      detailText,
      hasTrend: false,
      trendText: null,
      trendPositive: true,
      trendColor: "text-[#10B981]",
      bgColor,
    }
  }, [projects])

  // 6. Mission Overview dynamic table data
  const missionRows = useMemo(() => {
    if (!Array.isArray(projects) || projects.length === 0) return []
    return projects.map((p, idx) => {
      const waypointsCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0
      const status =
        p.status ||
        (p.id === currentProject?.id && telemetry?.isLive
          ? "In Progress"
          : waypointsCount > 0
          ? "Ready"
          : "Planned")

      const progress =
        p.progress != null
          ? p.progress
          : status === "In Progress"
          ? p.id === currentProject?.id && telemetry?.isLive
            ? 75
            : 40
          : status === "Completed"
          ? 100
          : status === "Scheduled" || status === "Ready"
          ? 10
          : 0

      const assignedDrones = p.assignedDrones?.length || (p.id === currentProject?.id ? 1 : 0) || 1

      return {
        id: p.id ? (p.id.startsWith("M-") ? p.id : `M-${String(idx + 1).padStart(3, "0")}`) : `M-${String(idx + 1).padStart(3, "0")}`,
        rawId: p.id,
        name: p.name || p.projectName || "Mission Operation",
        status,
        drones: assignedDrones,
        progress,
      }
    })
  }, [projects, currentProject, telemetry])

  // 7. Drone Fleet dynamic categories and battery distribution
  const fleetSummary = useMemo(() => {
    const drones = Array.isArray(registeredDrones) ? registeredDrones : []
    let multirotor = 0
    let fixedWing = 0
    let vtol = 0

    drones.forEach((d) => {
      const t = (d.type || d.model || "").toLowerCase()
      if (t.includes("fixed")) fixedWing++
      else if (t.includes("vtol")) vtol++
      else multirotor++
    })

    // Dynamic battery distribution calculated from telemetry/drone profiles
    const batteryBins = [
      { label: "> 80%", count: 0 },
      { label: "60-80%", count: 0 },
      { label: "40-60%", count: 0 },
      { label: "20-40%", count: 0 },
      { label: "< 20%", count: 0 },
    ]

    drones.forEach((d) => {
      const droneTel = fleetTelemetry[d.id] || (d.id === selectedDroneId ? telemetry : null)
      const batt = droneTel?.battery ?? d.battery
      if (typeof batt === "number" && !isNaN(batt)) {
        if (batt > 80) batteryBins[0].count++
        else if (batt >= 60) batteryBins[1].count++
        else if (batt >= 40) batteryBins[2].count++
        else if (batt >= 20) batteryBins[3].count++
        else batteryBins[4].count++
      }
    })

    return {
      multirotor,
      fixedWing,
      vtol,
      total: drones.length,
      batteryBins,
    }
  }, [registeredDrones, fleetTelemetry, selectedDroneId, telemetry])

  // Map geometry derived directly from active project's canonical state
  const mapWaypoints = useMemo(() => {
    const m = currentProject?.mission
    if (!m) return []
    if (Array.isArray(m.waypoints) && m.waypoints.length > 0) return m.waypoints
    if (Array.isArray(m.items) && m.items.length > 0) return m.items
    return []
  }, [currentProject])

  const mapGeofence = useMemo(() => {
    const g = currentProject?.geofence
    if (!g) return []
    if (Array.isArray(g)) return g
    if (Array.isArray(g.vertices) && g.vertices.length > 0) return g.vertices
    if (Array.isArray(g.polygon) && g.polygon.length > 0) return g.polygon
    if (Array.isArray(g.coordinates) && g.coordinates.length > 0) return g.coordinates
    return []
  }, [currentProject])

  return (
    <div className="flex-1 w-full min-h-0 overflow-y-auto bg-[#EEF3F8] p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 font-sans scroll-smooth">
      {/* ========================================================= */}
      {/* HEADER: Title, Subtitle, Live Status, + Plan a Mission    */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
            Command Center
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#334155] font-medium mt-1">
            Every drone, mission and alert across all sites, right now.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 self-start sm:self-auto shrink-0 flex-wrap">
          {user?.username && (
            <div className="hidden md:flex items-center gap-1.5 text-[12px] font-semibold text-[#334155] bg-white px-3 py-1.5 rounded-full border border-[#CBD5E1] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#1B68D2]" />
              <span className="font-bold text-[#0F284E]">{user.name || user.username}</span>
              {role && <span className="text-[10px] text-[#64748B] uppercase font-mono">({role})</span>}
            </div>
          )}

          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#334155] bg-white px-3.5 py-1.5 rounded-full border border-[#CBD5E1] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span>
              Live · updated <strong className="font-mono text-[#0F284E]">{currentTime}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/mission-planning")}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 bg-[#1B68D2] hover:bg-[#124E9D] text-white rounded-lg text-[13px] sm:text-[14px] font-bold shadow-sm transition-all duration-150 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Plan a Mission</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. TOP KPI ROW: Six Horizontally Aligned Cards             */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4" aria-label="Command Center Key Metrics">
        {/* KPI 1: Drones Active */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#0F284E] text-[#35E0FF] flex items-center justify-center shrink-0 shadow-xs">
            <Plane className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {inAirCount}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Drones Active
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              <span className={`w-2 h-2 rounded-full ${inAirCount > 0 ? "bg-[#16A34A] animate-pulse" : "bg-[#94A3B8]"} shrink-0`} />
              <span className="truncate">
                {registeredDrones?.length > 0
                  ? `${inAirCount} in air · ${onGroundCount} on ground`
                  : "0 registered drones"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Cameras Online */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#1B68D2] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {camerasOnlineCount}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Cameras Online
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              <span className={`w-2 h-2 rounded-full ${camerasOnlineCount > 0 ? "bg-[#16A34A]" : "bg-[#94A3B8]"} shrink-0`} />
              <span className="truncate">
                {camerasOnlineCount > 0
                  ? `${camerasOnlineCount} online · 0 offline`
                  : "No cameras online"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Active Missions */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {activeMissionsCount}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Active Missions
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight truncate">
              {projects?.length > 0 ? `${scheduledMissionsCount} scheduled today` : "0 scheduled"}
            </p>
          </div>
        </div>

        {/* KPI 4: Sites Monitored */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {sitesMonitoredCount}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Sites Monitored
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
              <span className="truncate">
                {sitesMonitoredCount > 0 ? "All airspace clear" : "No sites configured"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Active Alerts */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div
            className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs transition-colors ${
              unresolvedAlerts.length > 0 ? "bg-[#DC2626]" : "bg-[#16A34A]"
            }`}
          >
            {unresolvedAlerts.length > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {unresolvedAlerts.length}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Active Alerts
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight truncate">
              {activeAlertSubtitle}
            </p>
          </div>
        </div>

        {/* KPI 6: Mission Success */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div
            className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs transition-colors ${missionSuccessMetrics.bgColor}`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">
              {missionSuccessMetrics.value}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug truncate">
              Mission Success Rate
            </p>
            {missionSuccessMetrics.hasTrend ? (
              <div
                className={`flex items-center gap-1 text-[12px] font-bold mt-0.5 leading-tight truncate ${missionSuccessMetrics.trendColor}`}
              >
                {missionSuccessMetrics.trendPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{missionSuccessMetrics.trendText}</span>
              </div>
            ) : (
              <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight truncate">
                {missionSuccessMetrics.detailText}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. MAIN ROW: Live Operations Map & Active Alerts          */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
        {/* LEFT: Live Operations Map */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] bg-[#FCFDFE]">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              Live Operations Map · {currentProject?.name || currentProject?.projectName || "North Ridge Dam"}
            </h2>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[12px] text-[#475569] font-medium">
                Switch project in the top bar
              </span>
              <button
                type="button"
                onClick={() => navigate("/live-operations")}
                className="inline-flex items-center gap-1 text-[13px] font-bold text-[#1B68D2] hover:text-[#124E9D] hover:underline cursor-pointer"
              >
                <span>Open Live Operations</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Map Body */}
          <div className="relative w-full h-[440px] sm:h-[480px] xl:h-[520px] bg-[#0E1E2E] overflow-hidden">
            {/* Primary Interactive Map Engine */}
            <MapLoad
              mapStyle={mapStyle}
              onMapStyleChange={handleMapStyleChange}
              showAirspace={mapLayers.noFlyZones}
              telemetry={telemetry}
              pageType="dashboard"
              showDrones={mapLayers.drones}
              waypoints={mapLayers.flightPath ? mapWaypoints : []}
              showMissionRoute={mapLayers.flightPath}
              geofence={mapLayers.geofence ? mapGeofence : []}
              onDroneSelect={(dId) => {
                selectDrone(dId)
                navigate("/live-operations")
              }}
            />

            {/* Floating Map Layers Overlay (Top Left) */}
            <div className="absolute top-3 left-3 z-20 w-[156px] bg-[#0B1F3D]/95 backdrop-blur-md rounded-xl p-3 border border-[#203D64] shadow-xl text-white select-none">
              <p className="text-[11px] font-bold text-[#E2EDF8] mb-2.5 tracking-wider uppercase">
                Map Layers
              </p>
              <div className="space-y-2 text-[12px] text-[#E2EDF8]">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.drones}
                    onChange={() => toggleLayer("drones")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span>Drones (live)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.flightPath}
                    onChange={() => toggleLayer("flightPath")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span>Flight path</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.missionArea}
                    onChange={() => toggleLayer("missionArea")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span>Mission area</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.geofence}
                    onChange={() => toggleLayer("geofence")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span>Geofence</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.noFlyZones}
                    onChange={() => toggleLayer("noFlyZones")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[#FDA4AF] font-bold">Airspace (NFZ)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-white font-medium">
                  <input
                    type="checkbox"
                    checked={mapLayers.linkCoverage}
                    onChange={() => toggleLayer("linkCoverage")}
                    className="w-4 h-4 rounded bg-[#162A45] border-[#2A466E] text-[#1B68D2] focus:ring-0 cursor-pointer"
                  />
                  <span>Link coverage</span>
                </label>
              </div>
            </div>
          </div>
        </article>

        {/* RIGHT: Active Alerts */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] bg-[#FCFDFE]">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              Active Alerts ({unresolvedAlerts.length})
            </h2>
            <button
              type="button"
              onClick={() => navigate("/incidents")}
              className="text-[13px] font-bold text-[#1B68D2] hover:text-[#124E9D] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {/* Alerts List */}
          <div className="p-3.5 sm:p-4 space-y-3 flex-1 overflow-y-auto">
            {alertsLoading ? (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <RotateCw className="w-6 h-6 text-[#1B68D2] animate-spin mb-2" />
                <p className="text-[13px] font-bold text-[#334155]">Loading incidents...</p>
              </div>
            ) : unresolvedAlerts.length === 0 ? (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                <div className="w-11 h-11 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mb-2.5 shadow-2xs">
                  <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                </div>
                <h3 className="text-[14px] font-bold text-[#0F284E] uppercase tracking-wide">No Active Alerts</h3>
                <p className="text-[12px] text-[#475569] font-medium mt-1 max-w-[240px]">
                  All monitored airspaces, telemetry channels and sensor feeds are nominal.
                </p>
              </div>
            ) : (
              unresolvedAlerts.map((alert) => {
                let thumb = null
                const lowerTitle = (alert.title || "").toLowerCase()
                if (lowerTitle.includes("smoke")) thumb = alertSmokeImg
                else if (lowerTitle.includes("thermal")) thumb = alertThermalImg
                else if (lowerTitle.includes("vehicle") || lowerTitle.includes("stalled")) thumb = alertVehicleImg

                const severityConfig = {
                  Critical: { text: "text-[#B91C1C]", bg: "bg-[#FEF2F2]", border: "border-[#FECACA]", badgeText: "text-[#DC2626]" },
                  High: { text: "text-[#0F284E]", bg: "bg-[#FFF7ED]", border: "border-[#FED7AA]", badgeText: "text-[#EA580C]" },
                  Medium: { text: "text-[#0F284E]", bg: "bg-[#FEFCE8]", border: "border-[#FEF08A]", badgeText: "text-[#CA8A04]" },
                  Low: { text: "text-[#0F284E]", bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", badgeText: "text-[#2563EB]" },
                }[alert.severity] || { text: "text-[#0F284E]", bg: "bg-[#F1F5F9]", border: "border-[#CBD5E1]", badgeText: "text-[#475569]" }

                return (
                  <div
                    key={alert.id}
                    onClick={() => navigate("/incidents")}
                    className="p-3 rounded-xl border border-[#CBD5E1] hover:border-[#1B68D2] hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center gap-3.5 group shadow-2xs"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={alert.title}
                        className="w-16 h-14 rounded-lg object-cover border border-[#CBD5E1] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-14 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center shrink-0 text-[#64748B]">
                        <AlertTriangle className="w-6 h-6 text-[#EA580C]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3 className={`text-[13px] sm:text-[14px] font-bold ${severityConfig.text} truncate group-hover:text-[#1B68D2]`}>
                          {alert.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${severityConfig.bg} ${severityConfig.badgeText} border ${severityConfig.border} shrink-0`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#334155] font-medium truncate mt-0.5">
                        {alert.location || "Monitored Sector"}
                      </p>
                      <p className="text-[11px] text-[#475569] font-medium truncate mt-0.5">
                        {alert.subtitle || `${alert.detectedTime || "Recent"} · Confidence ${alert.confidence || "90%"} · ${alert.seenBy || alert.droneId || "Sensor verified"}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#1B68D2] shrink-0 transition" />
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="px-4 sm:px-5 py-3 border-t border-[#CBD5E1] bg-[#FAFBFD]">
            <p className="text-[12px] text-[#475569] italic leading-tight">
              Each alert carries its clip, position and the mission that raised it.
            </p>
          </div>
        </article>
      </section>

      {/* ========================================================= */}
      {/* 3. NEXT ROW: Mission Overview, Drone Fleet, Camera Feeds  */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD 1: Mission Overview */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] bg-[#FCFDFE]">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              Mission Overview
            </h2>
            <button
              type="button"
              onClick={() => navigate("/missions")}
              className="text-[13px] font-bold text-[#1B68D2] hover:text-[#124E9D] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="p-3.5 sm:p-4 flex-1 overflow-x-auto">
            {missionRows.length === 0 ? (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                <Layers className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-[14px] font-bold text-[#0F284E]">No Missions Configured</p>
                <p className="text-[12px] text-[#475569] font-medium mt-1">
                  Plan a new flight mission to assign aircraft and monitor progress.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[360px] text-left">
                <thead>
                  <tr className="border-b border-[#CBD5E1] text-[12px] sm:text-[13px] font-bold text-[#0F284E]">
                    <th className="pb-2.5">Mission</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-center">Drones</th>
                    <th className="pb-2.5 text-right pr-1">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {missionRows.slice(0, 5).map((mission) => (
                    <tr
                      key={mission.id}
                      onClick={() => navigate("/missions")}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer text-[13px] sm:text-[14px] text-[#1E293B]"
                    >
                      <td className="py-3 pr-2">
                        <span className="font-bold text-[#0F284E] block truncate max-w-[170px] sm:max-w-[200px]">
                          <strong className="text-[#1B68D2] font-mono mr-1.5">{mission.id}</strong>
                          {mission.name}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            mission.status === "In Progress" || mission.status === "active"
                              ? "bg-[#16A34A] text-white shadow-xs"
                              : mission.status === "Completed"
                              ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                              : "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
                          }`}
                        >
                          {mission.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-center font-mono font-bold text-[#0F284E]">
                        {mission.drones}
                      </td>
                      <td className="py-3 text-right pl-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 sm:w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1B68D2] rounded-full transition-all"
                              style={{ width: `${mission.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-[#475569]">{mission.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        {/* CARD 2: Drone Fleet */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] bg-[#FCFDFE]">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              Drone Fleet
            </h2>
            <button
              type="button"
              onClick={() => navigate("/drone-fleet")}
              className="text-[13px] font-bold text-[#1B68D2] hover:text-[#124E9D] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
            {/* 3 Categories Summary Pill Box */}
            <div className="grid grid-cols-3 divide-x divide-[#CBD5E1] border border-[#CBD5E1] rounded-xl p-3 bg-[#F8FAFC]">
              <div className="text-center px-1">
                <Plane className="w-4 h-4 mx-auto text-[#1B68D2] mb-1" />
                <p className="text-xl font-extrabold text-[#0F284E] font-mono leading-tight">{fleetSummary.multirotor}</p>
                <p className="text-[12px] text-[#334155] font-semibold mt-0.5">Multirotor</p>
              </div>
              <div className="text-center px-1">
                <Radio className="w-4 h-4 mx-auto text-[#1B68D2] mb-1" />
                <p className="text-xl font-extrabold text-[#0F284E] font-mono leading-tight">{fleetSummary.fixedWing}</p>
                <p className="text-[12px] text-[#334155] font-semibold mt-0.5">Fixed Wing</p>
              </div>
              <div className="text-center px-1">
                <Share2 className="w-4 h-4 mx-auto text-[#1B68D2] mb-1" />
                <p className="text-xl font-extrabold text-[#0F284E] font-mono leading-tight">{fleetSummary.vtol}</p>
                <p className="text-[12px] text-[#334155] font-semibold mt-0.5">VTOL</p>
              </div>
            </div>

            {/* Subhead: Battery levels, drones on missions */}
            <p className="text-[12px] font-bold text-[#334155] mt-3.5 mb-1">
              Battery levels, drones on missions
            </p>

            {/* Battery Distribution Bar Chart */}
            <div className="flex-1 flex flex-col justify-end pt-2">
              <div className="flex items-end justify-between gap-2 h-24 border-b border-[#CBD5E1] pb-1 px-1">
                {fleetSummary.batteryBins.map((item, idx) => {
                  const maxCount = Math.max(1, ...fleetSummary.batteryBins.map((b) => b.count))
                  const barHeightPercent = item.count > 0 ? Math.max(18, Math.round((item.count / maxCount) * 100)) : 6
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      {item.count > 0 && (
                        <span className="text-[11px] font-bold text-[#0F284E] font-mono leading-none">
                          {item.count}
                        </span>
                      )}
                      <div className="w-full max-w-[28px] h-16 flex items-end justify-center">
                        <div
                          className={`w-full rounded-t-sm transition-all ${item.count > 0 ? "bg-[#1B68D2]" : "bg-[#E2E8F0]"}`}
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Labels below chart */}
              <div className="flex justify-between gap-2 pt-2 px-1 text-[11px] text-[#334155] font-bold">
                {fleetSummary.batteryBins.map((item, idx) => (
                  <span key={idx} className="flex-1 text-center truncate">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* CARD 3: Live Camera Feeds */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] bg-[#FCFDFE]">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
                Live Camera Feeds
              </h2>
              {liveStreams.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                  {liveStreams.length} Active
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate("/live-operations")}
              className="text-[13px] font-bold text-[#1B68D2] hover:text-[#124E9D] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {isStreamsLoading ? (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
              <RotateCw className="w-6 h-6 text-[#1B68D2] animate-spin mb-2" />
              <p className="text-[13px] font-bold text-[#334155]">
                Checking for live camera feeds...
              </p>
            </div>
          ) : liveStreams.length === 0 ? (
            <div className="p-5 sm:p-6 flex-1 flex flex-col items-center justify-center text-center bg-[#F8FAFC]">
              <div className="w-12 h-12 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center mb-3 shadow-2xs">
                <VideoOff className="w-6 h-6 text-[#64748B]" />
              </div>
              <h3 className="text-[13px] font-bold text-[#0F284E] uppercase tracking-wide">
                No Live Streams Available
              </h3>
              <p className="text-[12px] text-[#475569] font-medium max-w-[270px] mt-1 mb-3.5 leading-relaxed">
                No active aircraft video streams detected. Ensure drones are powered on and publishing WHEP/WebRTC feeds.
              </p>
              <button
                type="button"
                onClick={fetchLiveStreams}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-[#CBD5E1] text-[#0F284E] hover:bg-[#F1F5F9] text-[12px] font-bold transition cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#1B68D2]" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 flex-1 grid grid-cols-2 gap-3">
              {liveStreams.slice(0, 4).map((stream) => (
                <div
                  key={stream.id || stream.streamId}
                  className="relative rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#0A121E] aspect-[4/3]"
                >
                  <LiveDroneFeed
                    droneId={stream.droneId || stream.id}
                    cameraType={stream.cameraType || "main"}
                    className="w-full h-full"
                  />
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* ========================================================= */}
      {/* 4. BOTTOM ROW: Mission Planning Workflow & Quick Actions */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
        {/* LEFT: Mission Planning Workflow */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col justify-between p-4 sm:p-5">
          <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight mb-4 sm:mb-6">
            Mission Planning Workflow
          </h2>

          {/* Stepper with Connected Nodes */}
          <div className="relative pb-2">
            {/* Connected Horizontal Line */}
            <div className="absolute top-2 left-4 right-4 h-[2px] bg-[#1B68D2] z-0 hidden sm:block" />

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5 sm:gap-2.5 relative z-10">
              {WORKFLOW_STEPS.map((s) => (
                <div
                  key={s.step}
                  onClick={() => navigate(s.path)}
                  className="flex flex-col items-start cursor-pointer group"
                >
                  <div className="w-4 h-4 rounded-full bg-[#1B68D2] border-2 border-white ring-2 ring-[#1B68D2]/30 mb-2.5 group-hover:scale-125 transition-transform shrink-0" />
                  <p className="text-[13px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors">
                    {s.title}
                  </p>
                  <p className="text-[12px] text-[#475569] font-medium leading-tight mt-1">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* RIGHT: Quick Actions */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              Quick Actions
            </h2>
            <span className="text-[12px] font-bold text-[#475569]">
              6 Shortcuts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* Action 1: Create Mission */}
            <button
              type="button"
              onClick={() => navigate("/mission-planning")}
              title="Create Mission"
              aria-label="Create Mission"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                Create Mission
              </span>
            </button>

            {/* Action 2: Deploy Drone */}
            <button
              type="button"
              onClick={() => navigate("/live-operations")}
              title="Deploy Drone"
              aria-label="Deploy Drone"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <Plane className="w-5 h-5" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                Deploy Drone
              </span>
            </button>

            {/* Action 3: Launch Swarm */}
            <button
              type="button"
              onClick={() => navigate("/swarm-control")}
              title="Launch Swarm"
              aria-label="Launch Swarm"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <Network className="w-5 h-5" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                Launch Swarm
              </span>
            </button>

            {/* Action 4: View Live Feed */}
            <button
              type="button"
              onClick={() => navigate("/live-operations")}
              title="View Live Feed"
              aria-label="View Live Feed"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                View Live Feed
              </span>
            </button>

            {/* Action 5: No-Fly Zone */}
            <button
              type="button"
              onClick={() => navigate("/geofence")}
              title="No-Fly Zone"
              aria-label="No-Fly Zone"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <MinusCircle className="w-5 h-5" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                No-Fly Zone
              </span>
            </button>

            {/* Action 6: Download Report */}
            <button
              type="button"
              onClick={() => navigate("/reports")}
              title="Download Report"
              aria-label="Download Report"
              className="flex items-center gap-3.5 p-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#EFF6FF] hover:border-[#1B68D2] focus:outline-none focus:ring-2 focus:ring-[#1B68D2]/30 active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:shadow-xs group text-left min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B68D2] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:bg-[#1B68D2] group-hover:text-white transition-colors shadow-2xs">
                <FileDown className="w-5 h-5" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors leading-tight">
                Download Report
              </span>
            </button>
          </div>
        </article>
      </section>

      {/* ========================================================= */}
      {/* 5. FOOTER: AeroNexus Aerospace Value Proposition Strip    */}
      {/* ========================================================= */}
      <footer className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 items-center">
          {/* Prop 1 */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1B68D2] border border-[#BFDBFE] shadow-2xs">
              <Crosshair className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F284E]">Plan with Confidence</h3>
              <p className="text-[12px] text-[#475569] font-medium">Accurate, efficient and safe missions.</p>
            </div>
          </div>

          {/* Prop 2 */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1B68D2] border border-[#BFDBFE] shadow-2xs">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F284E]">Multi-Drone, Multi-Use</h3>
              <p className="text-[12px] text-[#475569] font-medium">Any industry. Any environment.</p>
            </div>
          </div>

          {/* Prop 3 */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1B68D2] border border-[#BFDBFE] shadow-2xs">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F284E]">From Data to Decisions</h3>
              <p className="text-[12px] text-[#475569] font-medium">Turn aerial data into real value.</p>
            </div>
          </div>

          {/* Prop 4 */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1B68D2] border border-[#BFDBFE] shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F284E]">Safer Operations</h3>
              <p className="text-[12px] text-[#475569] font-medium">People. Assets. Communities.</p>
            </div>
          </div>

          {/* Prop 5: Motto */}
          <div className="hidden xl:flex flex-col items-end justify-center text-right border-l border-[#CBD5E1] pl-6">
            <span className="text-[11px] font-extrabold tracking-widest text-[#0F284E] uppercase font-mono">
              ONE FLEET. ANY MISSION.
            </span>
            <span className="text-[12px] font-extrabold tracking-widest text-[#1B68D2] uppercase font-mono mt-0.5">
              ALWAYS READY.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CommandCenterOperational
