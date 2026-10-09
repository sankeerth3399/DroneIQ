import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Crosshair,
  ExternalLink,
  Layers,
  MapPin,
  Plane,
  Radio,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Signal,
  X,
} from "lucide-react"
import MapLoad from "@/components/Map/mapContainer.jsx"
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useMission } from "@/hooks/useMission.js"
import { useAuth } from "@/hooks/useAuth.js"
import { apiClient } from "@/services/api/apiClient.js"
import { videoService } from "@/services/videoService.js"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"
import { INITIAL_DEMO_PROJECTS } from "@/services/projectService.js"
import { ConnectionState, TELEMETRY_STALE_THRESHOLD_MS, isValidGpsCoordinate } from "@/services/telemetry/telemetryTypes.js"
import { calculateMissionDistance, formatDistance, formatDuration } from "@/utils/distance.js"
import { calculatePolygonArea, calculatePolygonPerimeter, formatArea } from "@/utils/geofence.js"
import { validateGeofencePolygon } from "@/utils/geofenceValidation.js"

const unwrapData = (response) => response?.data ?? response

const unwrapArray = (response, keys = []) => {
  const data = unwrapData(response)
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return null
}

const getProjectWaypoints = (project) => project?.mission?.waypoints || project?.mission?.items || []

const projectFingerprint = (project) => JSON.stringify({
  name: project?.name,
  projectName: project?.projectName,
  userName: project?.userName,
  location: project?.location,
  useCase: project?.useCase,
  description: project?.description,
  missionDescription: project?.missionDescription,
  contactInfo: project?.contactInfo,
  createdAt: project?.createdAt,
  updatedAt: project?.updatedAt,
  missionName: project?.mission?.missionName,
  missionStatus: project?.mission?.status,
  missionOperator: project?.mission?.operator,
  missionDrone: project?.mission?.droneId,
  missionProgress: project?.mission?.completedWaypoints,
  missionDuration: project?.mission?.durationSeconds,
  missionUpdatedAt: project?.mission?.updatedAt,
  missionSettings: project?.mission?.settings,
  waypoints: getProjectWaypoints(project).map((point) => [point.id, point.lat, point.lng, point.alt]),
  geofenceName: project?.geofence?.name,
  geofenceEnabled: project?.geofence?.enabled,
  geofenceType: project?.geofence?.type,
  geofenceUpdatedAt: project?.geofence?.updatedAt,
  geofence: (project?.geofence?.vertices || project?.geofence?.polygon || project?.geofence?.coordinates || [])
    .map((point) => [point.id, point.lat ?? point.latitude, point.lng ?? point.longitude]),
})

const isUnmodifiedSeedProject = (project) => {
  const seed = INITIAL_DEMO_PROJECTS.find((item) => item.id === project.id)
  return Boolean(seed && projectFingerprint(seed) === projectFingerprint(project))
}

const getDroneId = (drone) => drone?.droneId || drone?.drone_id || drone?.id || drone?.identifier || null

const getDroneStatus = (drone) => {
  const status = drone?.status ?? drone?.connectionStatus ?? drone?.connection_state
  return typeof status === "string" && status.trim() ? status.trim() : null
}

const getDroneFlags = (drone, record, fresh) => {
  const status = String(getDroneStatus(drone) || record?.status || "").toUpperCase().replace(/[ -]/g, "_")
  const live = fresh || ["ONLINE", "CONNECTED", "IN_FLIGHT", "INFLIGHT", "FLYING", "ARMED", "ACTIVE"].includes(status)
  const inFlight = ["IN_FLIGHT", "INFLIGHT", "FLYING"].includes(status)
  const armedValue = firstValue(drone, ["isArmed", "armed", "motorsArmed"])
  const armed = typeof armedValue === "boolean" ? armedValue : ["ARMED", "IN_FLIGHT", "INFLIGHT", "FLYING"].includes(status) ? true : null
  return { live, inFlight, armed }
}

const getStreamDroneId = (stream) => {
  const directId = stream?.droneId || stream?.drone_id || stream?.aircraftId
  if (directId) return String(directId)
  const streamId = stream?.streamId || stream?.id || stream?.name
  if (typeof streamId !== "string") return null
  const match = streamId.match(/^(.*?)-(camera|fpv)$/i)
  if (!match) return null
  return match[1].toUpperCase()
}

const getStreamCameraType = (stream) => {
  const streamId = String(stream?.streamId || stream?.id || stream?.name || "").toLowerCase()
  return streamId.endsWith("-fpv") || stream?.cameraType === "fpv" ? "fpv" : "main"
}

const getStreamOnlineState = (stream) => {
  if (typeof stream?.isLive === "boolean") return stream.isLive
  if (typeof stream?.isOnline === "boolean") return stream.isOnline
  if (typeof stream?.online === "boolean") return stream.online
  const status = String(stream?.status || stream?.state || "").toUpperCase()
  if (["LIVE", "ONLINE", "CONNECTED", "PLAYING", "STREAMING"].includes(status)) return true
  if (["OFFLINE", "DISCONNECTED", "INACTIVE", "FAILED"].includes(status)) return false
  return null
}

const getEventFields = (payload) => {
  if (payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return { ...payload, ...payload.data }
  }
  return payload && typeof payload === "object" ? payload : {}
}

const getEventTitle = (payload) => {
  const fields = getEventFields(payload)
  return fields.title || fields.name || fields.event || fields.eventType || fields.type || "Backend event"
}

const getEventMessage = (payload) => {
  const fields = getEventFields(payload)
  if (typeof fields.message === "string") return fields.message
  if (typeof fields.description === "string") return fields.description
  if (typeof fields.details === "string") return fields.details
  return typeof payload === "string" ? payload : JSON.stringify(payload)
}

const getEventTimestamp = (event) => {
  const fields = getEventFields(event.payload)
  const timestamp = fields.timestamp || fields.time || fields.createdAt || fields.datetime
  return timestamp ? String(timestamp) : new Date(event.receivedAt).toLocaleTimeString()
}

const DashboardCameraFeed = ({ streamId, droneId, cameraType, onStatusChange }) => {
  const handleStatusChange = useCallback((status) => onStatusChange(streamId, status), [onStatusChange, streamId])
  return <LiveDroneFeed droneId={droneId} cameraType={cameraType} onStatusChange={handleStatusChange} />
}

const isActiveAlertEvent = (event) => {
  const fields = getEventFields(event.payload)
  const type = String(fields.type || fields.eventType || fields.event || "")
  const severity = String(fields.severity || fields.level || "").toLowerCase()
  const status = String(fields.status || "").toLowerCase()
  const explicitlyAlert = fields.isAlert === true || fields.isIncident === true || fields.alert === true
  const alertType = /alert|incident/i.test(type)
  const alertSeverity = ["critical", "high", "medium", "warning", "error"].includes(severity)
  return (explicitlyAlert || alertType || alertSeverity) && !["resolved", "closed", "dismissed", "inactive"].includes(status)
}

const firstValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return null
}

const formatValue = (value, suffix = "") => {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}${suffix}`
  if (typeof value === "string" && value.trim()) return `${value}${suffix}`
  return "N/A"
}

const isFreshRealTelemetry = (record, now) => Boolean(
  record?._isRealTelemetry &&
  Number.isFinite(record?._telemetryReceivedAt) &&
  now - record._telemetryReceivedAt <= TELEMETRY_STALE_THRESHOLD_MS
)

const MetricCard = ({ icon: Icon, label, value, detail, tone = "blue" }) => {
  const tones = {
    blue: "bg-[linear-gradient(135deg,#153E7D_0%,#1F54A3_100%)] text-white shadow-[0_2px_8px_rgba(21,62,125,0.25)]",
    sky: "bg-[linear-gradient(135deg,#0284C7_0%,#0EA5E9_100%)] text-white shadow-[0_2px_8px_rgba(2,132,199,0.25)]",
    green: "bg-[linear-gradient(135deg,#059669_0%,#10B981_100%)] text-white shadow-[0_2px_8px_rgba(5,150,105,0.25)]",
    purple: "bg-[linear-gradient(135deg,#6366F1_0%,#4F46E5_100%)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.25)]",
    red: "bg-[linear-gradient(135deg,#DC2626_0%,#EF4444_100%)] text-white shadow-[0_2px_8px_rgba(220,38,38,0.25)]",
    slate: "bg-[linear-gradient(135deg,#475569_0%,#64748B_100%)] text-white shadow-[0_2px_8px_rgba(71,85,105,0.25)]",
  }

  return (
    <article className="command-panel flex min-w-0 items-center gap-3.5 p-4 sm:p-4.5 rounded-xl border border-[#D0DCEB] shadow-[0_2px_8px_rgba(16,42,80,0.05)] hover:shadow-[0_4px_16px_rgba(16,42,80,0.08)] transition-all">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/20 ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#5A6E85]">{label}</p>
        <p className="mt-0.5 truncate text-2xl sm:text-[28px] font-extrabold text-[#0E2646] font-mono leading-tight tracking-tight">{value}</p>
        <p className="mt-1 truncate text-xs text-[#6B7F96] font-medium leading-normal">{detail}</p>
      </div>
    </article>
  )
}

const PanelHeader = ({ icon: Icon, title, action, onAction }) => (
  <div className="flex min-h-[50px] items-center justify-between gap-3 border-b border-[#E1EAF2] bg-[#FAFBFD] px-4 sm:px-5 py-3">
    <div className="flex min-w-0 items-center gap-2.5">
      {Icon && <Icon className="h-5 w-5 shrink-0 text-[#1E64D4]" />}
      <h2 className="truncate text-sm sm:text-[15px] font-bold text-[#0E2646] tracking-tight">{title}</h2>
    </div>
    {action && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#1E64D4] hover:text-[#1249A0] transition-colors cursor-pointer"
      >
        {action}<ArrowRight className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
)

const StatusPill = ({ children, tone = "slate" }) => {
  const tones = {
    green: "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]",
    amber: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    red: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
    blue: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
    slate: "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]",
  }
  return (
    <span className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-bold tracking-tight shadow-xs ${tones[tone]}`}>
      {children}
    </span>
  )
}

const DataRow = ({ label, value, tone }) => (
  <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#E8EFF6] py-2.5 px-1 last:border-0">
    <span className="shrink-0 text-xs sm:text-[13px] font-medium text-[#50667E]">{label}</span>
    {tone ? (
      <StatusPill tone={tone}>{value}</StatusPill>
    ) : (
      <span className="min-w-0 truncate text-right text-xs sm:text-[13px] font-bold text-[#0E2646] font-mono">
        {value}
      </span>
    )}
  </div>
)

const CommandCenterOperational = () => {
  const navigate = useNavigate()
  const {
    telemetry,
    fleetTelemetry,
    selectedDroneId,
    selectDrone,
    connectionState,
    isLive,
    isStale,
    isArmed,
    flightMode,
  } = useTelemetry()
  const { currentProjectId, projects, selectProject } = useMission()
  const { user, role } = useAuth()

  const [apiState, setApiState] = useState({ drones: null, overview: null, streams: null })
  const [cameraPlayback, setCameraPlayback] = useState({})
  const [backendEvents, setBackendEvents] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "normal"
    } catch {
      return "normal"
    }
  })
  const [lastSync, setLastSync] = useState(null)
  const [now, setNow] = useState(0)
  const eventIdRef = useRef(0)

  const handleCameraStatusChange = useCallback((streamId, status) => {
    setCameraPlayback((current) => {
      const previous = current[streamId]
      if (previous?.isPlaying === status.isPlaying && previous?.isLoading === status.isLoading && previous?.error === status.error && previous?.connectionState === status.connectionState) {
        return current
      }
      return { ...current, [streamId]: status }
    })
  }, [])

  useEffect(() => {
    let active = true

    const loadOperationalData = async () => {
      const [dronesResult, overviewResult, streamsResult] = await Promise.allSettled([
        apiClient("/api/drones", { method: "GET", suppressForbiddenToast: true, silent: true }),
        apiClient("/api/analytics/overview", { method: "GET", suppressForbiddenToast: true, silent: true }),
        videoService.getVideoStreams(),
      ])
      if (!active) return

      const drones = dronesResult.status === "fulfilled"
        ? unwrapArray(dronesResult.value, ["drones", "items", "content"])
        : null
      const overview = overviewResult.status === "fulfilled" ? unwrapData(overviewResult.value) : null
      const streams = streamsResult.status === "fulfilled"
        ? unwrapArray(streamsResult.value, ["streams", "items", "content"])
        : null

      setApiState({ drones, overview, streams })
      setLastSync(Date.now())
    }

    loadOperationalData()
    const refreshId = setInterval(loadOperationalData, 30000)
    const clockId = setInterval(() => setNow(Date.now()), 15000)
    const initialClockId = setTimeout(() => setNow(Date.now()), 0)

    return () => {
      active = false
      clearInterval(refreshId)
      clearInterval(clockId)
      clearTimeout(initialClockId)
    }
  }, [])

  useEffect(() => {
    return telemetryClient.onBackendEvent((payload, receivedAt) => {
      eventIdRef.current += 1
      setBackendEvents((current) => [
        ...current,
        { id: eventIdRef.current, payload, receivedAt: receivedAt || Date.now() },
      ].slice(-100))
    })
  }, [])

  const savedProjects = projects
  const currentProject = projects.find((project) => project.id === currentProjectId) || projects[0] || null
  const missionItems = getProjectWaypoints(currentProject)
  const geofencePoints = currentProject?.geofence?.vertices || currentProject?.geofence?.polygon || currentProject?.geofence?.coordinates || []
  const geofenceValidation = geofencePoints.length >= 3 ? validateGeofencePolygon(geofencePoints) : null
  const routeDistance = missionItems.length >= 2 ? calculateMissionDistance(missionItems) : null
  const missionCompleted = firstValue(currentProject?.mission, ["completedWaypoints", "waypointsCompleted"])
  const missionProgress = typeof missionCompleted === "number" && missionItems.length > 0
    ? Math.max(0, Math.min(100, Math.round((missionCompleted / missionItems.length) * 100)))
    : null

  const [selectedWaypointId, setSelectedWaypointId] = useState(null)
  const [selectedGeofenceInfo, setSelectedGeofenceInfo] = useState(false)

  // Reset selection when active project changes
  useEffect(() => {
    setSelectedWaypointId(null)
    setSelectedGeofenceInfo(false)
  }, [currentProjectId])

  const selectedWaypoint = missionItems.find((wp) => wp.id === selectedWaypointId) || null
  const selectedWaypointIndex = selectedWaypoint
    ? missionItems.findIndex((wp) => wp.id === selectedWaypointId) + 1
    : null

  const handleWaypointSelect = useCallback((wpId) => {
    setSelectedWaypointId(wpId)
    setSelectedGeofenceInfo(false)
  }, [])

  const handleGeofenceClick = useCallback(() => {
    setSelectedGeofenceInfo(true)
    setSelectedWaypointId(null)
  }, [])

  const handleGeofenceVertexSelect = useCallback((vId, idx) => {
    setSelectedGeofenceInfo(true)
    setSelectedWaypointId(null)
  }, [])

  const handleMapClick = useCallback(() => {
    setSelectedWaypointId(null)
    setSelectedGeofenceInfo(false)
  }, [])

  const freshFleet = Object.entries(fleetTelemetry || {})
    .filter(([, record]) => connectionState === ConnectionState.AUTHENTICATED && isFreshRealTelemetry(record, now))
    .map(([droneId, record]) => ({ droneId, record }))
  const registeredDrones = apiState.drones || []
  const fleetById = new Map(registeredDrones.map((drone) => [getDroneId(drone), drone]).filter(([id]) => id))
  freshFleet.forEach(({ droneId }) => {
    if (!fleetById.has(droneId)) fleetById.set(droneId, { id: droneId })
  })

  const fleetRows = [...fleetById.entries()].map(([droneId, drone]) => {
    const record = fleetTelemetry?.[droneId] || null
    const fresh = record && connectionState === ConnectionState.AUTHENTICATED && isFreshRealTelemetry(record, now)
    const status = (fresh && record.status) || getDroneStatus(drone) || (fresh ? "Telemetry live" : "Status unavailable")
    return { droneId, drone, record, fresh, status, flags: getDroneFlags(drone, record, fresh) }
  })
  const filteredFleet = fleetRows.filter(({ droneId, drone }) =>
    `${droneId} ${drone.name || ""} ${drone.model || ""}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )
  const filteredProjects = savedProjects.filter((project) =>
    `${project.id} ${project.name || ""} ${project.location || ""} ${project.userName || ""}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  const connectionOnline = connectionState === ConnectionState.AUTHENTICATED
  const overviewKpis = apiState.overview?.kpis || apiState.overview?.metrics || apiState.overview || null
  const backendOnlineCount = overviewKpis && firstValue(overviewKpis, ["activeDrones", "dronesActive", "onlineDrones"])
  const reportedActiveDrones = fleetRows.filter((row) => row.flags.live).length
  const activeDronesValue = backendOnlineCount !== null
    ? formatValue(backendOnlineCount)
    : apiState.drones !== null || connectionOnline
    ? String(reportedActiveDrones)
    : "N/A"
  const onlineDrones = apiState.drones === null && !connectionOnline ? null : reportedActiveDrones
  const inFlightDrones = apiState.drones === null && !connectionOnline ? null : fleetRows.filter((row) => row.flags.inFlight).length
  const knownArmedDrones = fleetRows.filter((row) => row.flags.armed !== null)
  const armedDrones = knownArmedDrones.length ? fleetRows.filter((row) => row.flags.armed).length : null
  const cameraCount = apiState.streams === null
    ? "N/A"
    : String(apiState.streams.filter((stream) => {
      const streamId = stream.streamId || stream.id || stream.name
      const playback = cameraPlayback[streamId]
      return playback ? playback.isPlaying : getStreamOnlineState(stream) === true
    }).length)

  const activeMissionsValue = formatValue(firstValue(overviewKpis, ["activeMissions", "missionsActive", "activeMissionCount"]))
  const activeAlerts = backendEvents.filter(isActiveAlertEvent)
  const alertValue = activeAlerts.length > 0 ? String(activeAlerts.length) : "N/A"
  const selectedFleetEntry = freshFleet.find((entry) => entry.droneId === selectedDroneId)
  const selectedTelemetry = selectedFleetEntry?.record || null
  const selectedTelemetryLive = Boolean(selectedTelemetry)
  const selectedBattery = firstValue(selectedTelemetry, ["batteryPercentage", "batteryPercent", "battery"])
  const selectedAltitude = firstValue(selectedTelemetry, ["altitude", "relativeAltitude"])
  const selectedSpeed = firstValue(selectedTelemetry, ["groundSpeed", "speed"])
  const selectedHeading = firstValue(selectedTelemetry, ["heading", "yaw"])
  const selectedSatellites = firstValue(selectedTelemetry, ["gpsSatellites", "satellites", "satelliteCount"])
  const displayedStreams = (apiState.streams || [])
    .map((stream) => ({ stream, streamId: stream.streamId || stream.id || stream.name, droneId: getStreamDroneId(stream), cameraType: getStreamCameraType(stream) }))
    .filter((item) => item.droneId)
    .filter(({ droneId, stream }) => `${droneId} ${stream.name || ""} ${stream.streamId || ""}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .slice(0, 3)
  const alertsFeedReady = connectionOnline
  const backendActivity = backendEvents.length > 0
    ? backendEvents.slice(-6).reverse()
    : Array.isArray(apiState.overview?.recentEvents)
    ? apiState.overview.recentEvents.slice(-6).reverse().map((payload, index) => ({ id: `overview-${index}`, payload, receivedAt: lastSync || 0 }))
    : []
  const activityTrend = apiState.overview?.activityTrend || apiState.overview?.flightActivity || []
  const lastSyncText = lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Sync pending"
  const dateTimeText = new Date(now).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  const updateMapStyle = (style) => {
    setMapStyle(style)
    try {
      localStorage.setItem("aeronexus_map_style", style)
    } catch {
      // Ignore storage errors
    }
  }

  const selectDroneAndOpenFly = (droneId) => {
    selectDrone(droneId)
    navigate("/fly")
  }

  const openProject = (project) => {
    selectProject(project.id)
    navigate("/missions/details")
  }

  const mapWaypoints = currentProject ? missionItems : []
  const mapGeofence = currentProject ? currentProject.geofence : null
  const displayedActivityTrend = Array.isArray(activityTrend) ? activityTrend.filter((point) => {
    const date = point.date || point.timestamp || ""
    const value = firstValue(point, ["flights", "missions", "count", "value"])
    return date && typeof value === "number"
  }).slice(-7) : []
  const maxTrendValue = Math.max(1, ...displayedActivityTrend.map((point) => firstValue(point, ["flights", "missions", "count", "value"])))
  const currentUserName = user?.name || user?.username || "Authenticated operator"

  return (
    <div className="command-page h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#F0F4F9]">
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-4 p-3.5 sm:gap-5 sm:p-5 xl:p-6 2xl:p-7">
        {/* COMMAND CENTER OPERATIONS HEADER */}
        <header className="flex flex-col gap-3.5 border-b border-[#D4E0ED] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-extrabold leading-tight text-[#0D233A] sm:text-[30px] tracking-tight">
                Command Center
              </h1>
              <StatusPill tone={isLive ? "green" : isStale ? "amber" : "slate"}>
                <span className={`mr-1.5 h-2 w-2 rounded-full ${isLive ? "bg-[#10B981] animate-pulse" : isStale ? "bg-[#F59E0B]" : "bg-[#64748B]"}`} />
                {isLive ? "Live Operations" : isStale ? "Telemetry Stale" : connectionOnline ? "Connected" : "Offline"}
              </StatusPill>
            </div>
            <p className="mt-1.5 text-xs sm:text-[13px] text-[#4F657F] font-medium">
              {currentProject?.name || "Fleet overview"} <span className="px-1.5 text-[#94A7BC]">/</span> <span className="font-semibold text-[#18314C]">{selectedDroneId || "No aircraft selected"}</span>
            </p>
          </div>

          <div className="grid min-w-0 gap-2.5 sm:grid-cols-[minmax(210px,1fr)_minmax(180px,240px)_auto] lg:min-w-[700px]">
            {/* Search Input */}
            <label className="flex h-10 sm:h-11 min-w-0 items-center gap-2.5 rounded-lg border border-[#CAD8E6] bg-white px-3 text-[#5A718B] shadow-xs focus-within:border-[#1E64D4] focus-within:ring-2 focus-within:ring-[#1E64D4]/20 transition-all">
              <Search className="h-4 w-4 shrink-0 text-[#607792]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search drones, missions, cameras..."
                className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-[#0E2646] outline-none placeholder:text-[#8E9FA4]"
                aria-label="Search drones, missions, and cameras"
              />
            </label>

            {/* Project Selector */}
            <label className="flex h-10 sm:h-11 min-w-0 items-center gap-2 rounded-lg border border-[#CAD8E6] bg-white px-3 text-xs text-[#5A718B] shadow-xs">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[11px] text-[#48607A]">Project</span>
              <select
                value={currentProject?.id || ""}
                onChange={(event) => event.target.value && selectProject(event.target.value)}
                disabled={savedProjects.length === 0}
                className="min-w-0 flex-1 truncate bg-transparent text-xs sm:text-sm font-bold text-[#0E2646] outline-none disabled:text-[#92A0AF] cursor-pointer"
                aria-label="Select saved project"
              >
                <option value="">{savedProjects.length ? "Select project" : "No saved project"}</option>
                {savedProjects.map((project) => <option key={project.id} value={project.id}>{project.name || project.id}</option>)}
              </select>
            </label>

            {/* Header Telemetry Time, Operator & Refresh */}
            <div className="flex items-center justify-between gap-3 text-xs text-[#4F657F] sm:justify-end">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
                <Clock3 className="h-4 w-4 text-[#607792]" />
                {dateTimeText}
              </span>
              <span className="hidden xl:inline font-semibold text-[#18314C]">
                {currentUserName} · <span className="font-mono text-[#1E64D4] font-bold">{role}</span>
              </span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#CAD8E6] bg-white text-[#2B547E] shadow-xs transition-all hover:bg-[#F2F7FC] hover:border-[#1E64D4] cursor-pointer"
                title={`Refresh backend data · last sync ${lastSyncText}`}
                aria-label="Refresh Command Center data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/missions/waypoints")}
            className="inline-flex min-h-10 sm:min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1E64D4] px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1553B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E64D4] cursor-pointer"
          >
            <Route className="h-4 w-4" />Plan a Mission
          </button>
        </header>

        {/* KPI CARDS OVERVIEW (SIX CARDS) */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Command Center KPI overview">
          <MetricCard icon={Plane} label="Drones Active" value={activeDronesValue} detail={onlineDrones === null ? "Live fleet state unavailable" : `${onlineDrones} online · ${inFlightDrones} in flight`} tone="blue" />
          <MetricCard icon={Camera} label="Cameras Online" value={cameraCount} detail={apiState.streams === null ? "Camera inventory unavailable" : `${apiState.streams.length} backend streams`} tone="sky" />
          <MetricCard icon={Route} label="Active Missions" value={activeMissionsValue} detail={savedProjects.length ? `${savedProjects.length} saved mission plans` : "No saved mission plans"} tone="purple" />
          <MetricCard icon={MapPin} label="Sites Monitored" value={formatValue(firstValue(overviewKpis, ["sitesMonitored", "monitoredSites", "totalSites"]))} detail={apiState.overview ? "Backend analytics overview" : "No backend site summary"} tone="green" />
          <MetricCard icon={AlertTriangle} label="Active Alerts" value={alertValue} detail={alertsFeedReady ? "Backend events received this session" : "Alert event feed unavailable"} tone="red" />
          <MetricCard icon={ShieldCheck} label="Mission Success" value={formatValue(firstValue(overviewKpis, ["missionSuccessRate", "successRate"]), typeof firstValue(overviewKpis, ["missionSuccessRate", "successRate"]) === "number" ? "%" : "")} detail={apiState.overview ? "Backend analytics overview" : "No backend success metric"} tone="green" />
        </section>

        {/* PRIMARY MAP & ACTIVE ALERTS SECTION */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* LIVE OPERATIONS MAP CARD */}
          <article className="command-panel flex min-h-[420px] sm:min-h-[460px] xl:min-h-[500px] flex-col overflow-hidden">
            <PanelHeader
              icon={MapPin}
              title={`Operational Mission Map${currentProject?.name ? ` · ${currentProject.name}` : currentProject?.location ? ` · ${currentProject.location}` : ""}`}
              action="Open Waypoint Planning"
              onAction={() => navigate("/missions/waypoints")}
            />
            <div className="relative min-h-[360px] sm:min-h-[400px] xl:min-h-[440px] flex-1 bg-[#E4EBF0]">
              <MapLoad
                mapStyle={mapStyle}
                telemetry={telemetry}
                pageType="dashboard"
                waypoints={mapWaypoints}
                selectedWaypointId={selectedWaypointId}
                onWaypointSelect={handleWaypointSelect}
                onGeofenceVertexSelect={handleGeofenceVertexSelect}
                onGeofenceClick={handleGeofenceClick}
                onMapClick={handleMapClick}
                showMissionRoute={true}
                geofence={mapGeofence}
                onDroneSelect={selectDroneAndOpenFly}
              />

              {/* Floating Map Layers Legend */}
              <div className="absolute left-3 sm:left-4 top-3 sm:top-4 z-10 rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-3 sm:p-3.5 shadow-md max-w-[230px] pointer-events-auto">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0E2646]">Operational Layers</p>
                  <span className="text-[10px] font-mono text-[#627D98]">{currentProject?.id || "N/A"}</span>
                </div>
                <div className="space-y-1.5 text-xs font-medium text-[#3E556E]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${freshFleet.length > 0 ? "bg-[#10B981] animate-pulse" : "bg-[#0284C7]"}`} />
                      Drone
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#18314C]">
                      {freshFleet.length > 0 ? "Live GPS" : "Fallback"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="h-[3px] w-3.5 rounded-full bg-[#0284C7]" />
                      Route
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#18314C]">
                      {missionItems.length >= 2 ? formatDistance(routeDistance || 0) : missionItems.length === 1 ? "1 WP" : "No Route"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[3px] border border-[#059669] bg-[#059669]/20" />
                      Geofence
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#18314C]">
                      {geofencePoints.length >= 3 ? `${geofencePoints.length} Vtx (${formatArea(calculatePolygonArea(geofencePoints))})` : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Waypoint Inspector HUD Modal */}
              {selectedWaypoint && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-3.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0284C7] text-[11px] font-mono font-bold text-white shadow-xs">
                        {selectedWaypointIndex}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#0E2646] uppercase tracking-wide">
                          Waypoint WP{selectedWaypointIndex}
                        </h4>
                        <p className="text-[10px] font-mono text-[#627D98]">
                          {selectedWaypoint.action || selectedWaypoint.type || "WAYPOINT"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWaypointId(null)}
                      className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer"
                      title="Close waypoint inspector"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2.5 text-[11px]">
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Latitude</span>
                      <span className="font-mono font-bold text-[#0F172A]">{Number(selectedWaypoint.lat).toFixed(6)}°</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Longitude</span>
                      <span className="font-mono font-bold text-[#0F172A]">{Number(selectedWaypoint.lng).toFixed(6)}°</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Altitude</span>
                      <span className="font-mono font-bold text-[#0284C7]">{selectedWaypoint.alt ?? 50} m AGL</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Speed</span>
                      <span className="font-mono font-bold text-[#0284C7]">{selectedWaypoint.speed ?? 12} m/s</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => navigate("/missions/waypoints")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E64D4] px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1553B8] transition cursor-pointer"
                    >
                      <Route className="h-3.5 w-3.5" />
                      Open Waypoint Planning
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/missions/details")}
                      className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition cursor-pointer"
                      title="Open Mission Details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Geofence Inspector HUD Modal */}
              {selectedGeofenceInfo && geofencePoints.length >= 3 && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-3.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#059669] text-white shadow-xs">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#0E2646] uppercase tracking-wide">
                          {currentProject?.geofence?.name || "Operational Geofence"}
                        </h4>
                        <p className="text-[10px] font-mono text-[#059669] font-bold">
                          {geofenceValidation?.valid ? "ACTIVE & ENFORCED" : "BOUNDARY CONFIGURED"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGeofenceInfo(false)}
                      className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer"
                      title="Close geofence inspector"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2.5 text-[11px]">
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Vertices</span>
                      <span className="font-mono font-bold text-[#0F172A]">{geofencePoints.length} vertices</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Enclosed Area</span>
                      <span className="font-mono font-bold text-[#059669]">{formatArea(calculatePolygonArea(geofencePoints))}</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Perimeter</span>
                      <span className="font-mono font-bold text-[#0F172A]">{formatDistance(calculatePolygonPerimeter(geofencePoints))}</span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2">
                      <span className="block text-[10px] font-medium text-[#64748B] uppercase">Status</span>
                      <span className="font-mono font-bold text-[#059669]">
                        {currentProject?.geofence?.enabled ? "Enforced" : "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => navigate("/missions/geofence")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Open Geofence Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/missions/waypoints")}
                      className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition cursor-pointer"
                      title="Open Waypoint Planning"
                    >
                      <Route className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State Prompt when no geometry exists */}
              {!selectedWaypoint && !selectedGeofenceInfo && geofencePoints.length === 0 && missionItems.length === 0 && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 max-w-[270px] rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-3 shadow-md pointer-events-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    <p className="text-xs font-bold text-[#0E2646]">No Geometry Configured</p>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed mb-2.5">
                    No geofence or waypoints defined for this project yet.
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate("/missions/geofence")}
                      className="flex-1 rounded-lg bg-[#059669] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
                    >
                      Draw Geofence
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/missions/waypoints")}
                      className="flex-1 rounded-lg bg-[#1E64D4] px-2 py-1.5 text-center text-[11px] font-bold text-white shadow-xs hover:bg-[#1553B8] transition cursor-pointer"
                    >
                      Plan Route
                    </button>
                  </div>
                </div>
              )}

              {/* Map Style Controls */}
              <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-10 flex gap-1.5 rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-1.5 shadow-md pointer-events-auto">
                {[["normal", "Normal"], ["satellite", "Satellite"]].map(([style, label]) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateMapStyle(style)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${mapStyle === style ? "bg-[#1E64D4] text-white shadow-xs" : "text-[#425970] hover:bg-[#EFF5FA]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Operational Quick Actions Toolbar */}
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#D0DDEB] bg-white/95 backdrop-blur-md p-1.5 shadow-md pointer-events-auto">
                <button
                  type="button"
                  onClick={() => navigate("/missions/waypoints")}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1E64D4] px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1553B8] transition cursor-pointer"
                  title="Open Waypoint Planning page"
                >
                  <Route className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Waypoint Planning</span>
                  <span className="sm:hidden">Waypoints</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/missions/geofence")}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1E293B] hover:bg-[#F1F5F9] transition cursor-pointer"
                  title="Open Geofence Editor page"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
                  <span className="hidden sm:inline">Geofence</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/missions/details")}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1E293B] hover:bg-[#F1F5F9] transition cursor-pointer"
                  title="Open Mission Details page"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" />
                  <span className="hidden sm:inline">Mission</span>
                </button>
              </div>
            </div>
          </article>

          {/* ACTIVE ALERTS CARD */}
          <section className="command-panel flex min-h-[420px] sm:min-h-[460px] xl:min-h-[500px] flex-col overflow-hidden">
            <PanelHeader
              icon={AlertTriangle}
              title={`Active Alerts (${activeAlerts.length || "—"})`}
              action="View Logs"
              onAction={() => navigate("/logs")}
            />
            <div className="flex-1 divide-y divide-[#E9EEF4] overflow-y-auto px-4">
              {activeAlerts.length ? activeAlerts.slice(-5).reverse().map((event) => {
                const fields = getEventFields(event.payload)
                const severity = fields.severity || fields.level || "Alert"
                const severityKey = String(severity).toLowerCase()
                const tone = severityKey === "critical" || severityKey === "error" ? "red" : severityKey === "warning" || severityKey === "high" ? "amber" : "blue"
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate("/logs")}
                    className="flex w-full items-start gap-3 py-3.5 text-left hover:bg-[#F8FAFC] transition-colors rounded-lg my-0.5 cursor-pointer"
                  >
                    <span className={`mt-0.5 h-10 w-10 shrink-0 rounded-lg ${tone === "red" ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]" : tone === "amber" ? "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]" : "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]"} flex items-center justify-center`}>
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-[#0E2646]">{getEventTitle(event.payload)}</span>
                        <StatusPill tone={tone}>{String(severity)}</StatusPill>
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-[#4A627B]">{getEventMessage(event.payload)}</span>
                      <span className="mt-1.5 block truncate text-[11px] font-medium text-[#71859B]">
                        {fields.droneId || "Drone unspecified"}{fields.missionId || fields.projectName ? ` · ${fields.missionId || fields.projectName}` : ""} · {getEventTimestamp(event)}
                      </span>
                    </span>
                  </button>
                )
              }) : (
                <div className="flex h-full min-h-[250px] flex-col items-center justify-center px-5 text-center">
                  <CheckCircle2 className="mb-2.5 h-8 w-8 text-[#10B981]" />
                  <p className="text-sm font-bold text-[#065F46]">No alert events received</p>
                  <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[#4B6B56]">Only backend alert or incident events received during this session are shown here.</p>
                </div>
              )}
            </div>
            <div className="border-t border-[#E1EAF2] px-4 py-2.5 text-xs font-medium text-[#62778D] bg-[#FAFBFD]">
              {alertsFeedReady ? "Live backend event stream active" : "Waiting for authenticated backend event stream"}
            </div>
          </section>
        </section>

        {/* MISSION OVERVIEW, DRONE FLEET & FLIGHT STATUS SECTION */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(310px,1fr)_minmax(270px,0.85fr)]">
          {/* MISSION OVERVIEW TABLE CARD */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Route} title="Mission Overview" action="View All" onAction={() => navigate("/missions/details")} />
            {filteredProjects.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-[#F1F6FB] border-b border-[#D8E4F0] text-xs font-bold uppercase tracking-wider text-[#4A627C]">
                    <tr>
                      <th className="px-3.5 py-3">Mission / Project</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Drone</th>
                      <th className="px-3 py-3">Operator</th>
                      <th className="px-3 py-3">Waypoints</th>
                      <th className="px-3 py-3">Progress</th>
                      <th className="px-3 py-3">Distance</th>
                      <th className="px-3.5 py-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9EEF4]">
                    {filteredProjects.slice(0, 5).map((project) => {
                      const items = getProjectWaypoints(project)
                      const status = project.mission?.status || project.status || "Saved plan"
                      const droneId = project.mission?.droneId || project.droneId || "N/A"
                      const operator = project.mission?.operator || project.userName || "N/A"
                      const completed = firstValue(project.mission, ["completedWaypoints", "waypointsCompleted"])
                      const progress = typeof completed === "number" && items.length > 0 ? `${Math.round((completed / items.length) * 100)}%` : "N/A"
                      const distance = items.length > 1 ? formatDistance(calculateMissionDistance(items)) : "N/A"
                      const durationSeconds = firstValue(project.mission, ["durationSeconds", "estimatedDurationSeconds"])
                      const duration = firstValue(project.mission, ["duration", "durationFormatted"]) || (typeof durationSeconds === "number" && durationSeconds > 0 ? formatDuration(durationSeconds) : "N/A")
                      return (
                        <tr
                          key={project.id}
                          className="cursor-pointer hover:bg-[#F8FBFE] transition-colors"
                          onClick={() => openProject(project)}
                        >
                          <td className="max-w-[240px] px-3.5 py-3.5">
                            <span className="block truncate text-sm font-bold text-[#0E2646] hover:text-[#1E64D4] transition-colors">
                              {project.mission?.missionName || project.name || project.projectName}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#657B92]">
                              {project.name || project.projectName} · {project.id} · {project.location || "Location not specified"}
                            </span>
                          </td>
                          <td className="px-3 py-3.5"><StatusPill tone={statusTone(status)}>{status}</StatusPill></td>
                          <td className="px-3 py-3.5 text-xs sm:text-[13px] font-semibold text-[#2D455F]">{droneId}</td>
                          <td className="px-3 py-3.5 text-xs sm:text-[13px] font-semibold text-[#2D455F]">{operator}</td>
                          <td className="px-3 py-3.5 text-xs sm:text-[13px] font-semibold text-[#2D455F]">{items.length}</td>
                          <td className="px-3 py-3.5 text-xs sm:text-[13px] font-bold text-[#0E2646]">{progress}</td>
                          <td className="px-3 py-3.5 text-xs sm:text-[13px] font-semibold text-[#2D455F] font-mono">{distance}</td>
                          <td className="px-3.5 py-3.5 text-right text-xs sm:text-[13px] font-semibold text-[#2D455F] font-mono">{duration}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No saved mission plans" detail="Plans from the mission workspace will appear here. Seeded sample projects are omitted." action="Open Mission Planning" onAction={() => navigate("/missions/waypoints")} />
            )}
          </section>

          {/* DRONE FLEET CARD */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Radio} title="Drone Fleet" action="Open Fly" onAction={() => navigate("/fly")} />
            <div className="flex items-center gap-3 border-b border-[#E1EAF2] bg-[#FAFBFD] px-4 py-2.5 text-xs text-[#50667E]">
              <span>Total <strong className="ml-1 text-[#0E2646]">{apiState.drones === null ? "N/A" : registeredDrones.length}</strong></span>
              <span className="text-[#CFD8E2]">|</span>
              <span>Online <strong className="ml-1 text-[#059669]">{onlineDrones ?? "N/A"}</strong></span>
              <span className="text-[#CFD8E2]">|</span>
              <span>In flight <strong className="ml-1 text-[#1E64D4]">{inFlightDrones ?? "N/A"}</strong></span>
              <span className="text-[#CFD8E2]">|</span>
              <span>Armed <strong className="ml-1 text-[#D97706]">{armedDrones ?? "N/A"}</strong></span>
            </div>
            <div className="max-h-[300px] divide-y divide-[#E9EEF4] overflow-y-auto px-4">
              {filteredFleet.length ? filteredFleet.slice(0, 8).map(({ droneId, drone, record, fresh, status, flags }) => (
                <button
                  key={droneId}
                  type="button"
                  onClick={() => selectDroneAndOpenFly(droneId)}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#F8FAFC] transition-colors rounded-lg cursor-pointer"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${fresh ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]" : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"}`}>
                    <Plane className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-[#0E2646]">{drone.name || drone.callsign || droneId}</span>
                      <StatusPill tone={fresh ? "green" : statusTone(status)}>{fresh ? "Live" : status}</StatusPill>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#637990]">
                      {droneId}{drone.model ? ` · ${drone.model}` : ""}{fresh && typeof record.batteryPercentage === "number" ? ` · ${Math.round(record.batteryPercentage)}%` : ""}{flags.armed === null ? " · Armed N/A" : flags.armed ? " · Armed" : " · Unarmed"}
                    </span>
                  </span>
                </button>
              )) : (
                <EmptyState title={apiState.drones === null && !freshFleet.length ? "Fleet data unavailable" : "No drones reported"} detail="The fleet registry and live telemetry are used; no sample drones are added." />
              )}
            </div>
          </section>

          {/* FLIGHT STATUS CARD */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Signal} title="Flight Status" action="Detailed controls" onAction={() => navigate("/fly")} />
            <div className="px-4 py-2 space-y-0.5">
              <DataRow label="Selected aircraft" value={selectedDroneId || "N/A"} />
              <DataRow label="Telemetry link" value={connectionState || "N/A"} tone={isLive ? "green" : isStale ? "amber" : "slate"} />
              <DataRow label="Control state" value={isArmed ? "Armed" : "Unarmed"} tone={isArmed ? "amber" : "green"} />
              <DataRow label="Flight mode" value={flightMode || "N/A"} />
              <DataRow label="Position / GPS" value={selectedTelemetryLive && isValidGpsCoordinate(selectedTelemetry.latitude, selectedTelemetry.longitude) ? "Valid live fix" : "N/A"} tone={selectedTelemetryLive && isValidGpsCoordinate(selectedTelemetry.latitude, selectedTelemetry.longitude) ? "green" : "slate"} />
              <DataRow label="Battery" value={selectedTelemetryLive ? formatValue(selectedBattery, typeof selectedBattery === "number" ? "%" : "") : "N/A"} />
            </div>
          </section>
        </section>

        {/* LIVE CAMERA FEEDS, TELEMETRY & ROUTE, ACTIVE GEOFENCE SECTION */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.3fr)_minmax(290px,0.85fr)_minmax(300px,0.95fr)]">
          {/* LIVE CAMERA FEEDS */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Camera} title="Live Camera Feeds" action="Open Fly" onAction={() => navigate("/fly")} />
            {displayedStreams.length ? (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {displayedStreams.map(({ stream, streamId, droneId, cameraType }) => {
                  const streamName = stream.name || stream.label || `${droneId} ${cameraType === "fpv" ? "FPV" : "Camera"}`
                  const playback = cameraPlayback[streamId]
                  const online = playback?.isPlaying === true
                  const isConnecting = playback?.isLoading || playback?.connectionState === "connecting" || playback?.connectionState === "reconnecting"
                  const cameraState = online ? "Live" : isConnecting ? "Connecting" : playback?.error || getStreamOnlineState(stream) === false ? "Offline" : "Checking"
                  return (
                    <article key={stream.streamId || stream.id || `${droneId}-${cameraType}`} className="overflow-hidden rounded-lg border border-[#D5E1ED] bg-[#F8FAFC] shadow-xs">
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                        <span className="truncate text-xs font-bold text-[#102A48]">{streamName}</span>
                        <StatusPill tone={online ? "green" : isConnecting ? "amber" : cameraState === "Offline" ? "red" : "slate"}>{cameraState}</StatusPill>
                      </div>
                      <div className="h-[150px] sm:h-[160px]">
                        <DashboardCameraFeed streamId={streamId} droneId={droneId} cameraType={cameraType} onStatusChange={handleCameraStatusChange} />
                      </div>
                      <button
                        type="button"
                        onClick={() => selectDroneAndOpenFly(droneId)}
                        className="flex w-full items-center justify-between border-t border-[#E2EAF2] px-3.5 py-2.5 text-xs font-bold text-[#1E64D4] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                      >
                        {droneId} · Open camera controls <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState title={apiState.streams === null ? "Camera inventory unavailable" : "No camera streams reported"} detail="Only streams returned by the video service are shown. The telemetry WebSocket is not used for video." />
            )}
          </section>

          {/* TELEMETRY & ROUTE STATS */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Crosshair} title="Telemetry & Route" action="Open Planner" onAction={() => navigate("/missions/waypoints")} />
            <div className="px-4 py-2 space-y-0.5">
              <DataRow label="Latitude" value={selectedTelemetryLive && isValidGpsCoordinate(selectedTelemetry.latitude, selectedTelemetry.longitude) ? Number(selectedTelemetry.latitude).toFixed(6) : "N/A"} />
              <DataRow label="Longitude" value={selectedTelemetryLive && isValidGpsCoordinate(selectedTelemetry.latitude, selectedTelemetry.longitude) ? Number(selectedTelemetry.longitude).toFixed(6) : "N/A"} />
              <DataRow label="Altitude" value={selectedTelemetryLive ? formatValue(selectedAltitude, " m") : "N/A"} />
              <DataRow label="Ground speed" value={selectedTelemetryLive ? formatValue(selectedSpeed, " m/s") : "N/A"} />
              <DataRow label="Heading" value={selectedTelemetryLive ? formatValue(selectedHeading, "°") : "N/A"} />
              <DataRow label="GPS satellites" value={selectedTelemetryLive ? formatValue(selectedSatellites) : "N/A"} />
              <DataRow label="Route distance" value={routeDistance === null ? "N/A" : formatDistance(routeDistance)} />
              <DataRow label="Current waypoint" value={firstValue(currentProject?.mission, ["currentWaypoint", "currentWaypointIndex"]) ?? "N/A"} />
              <DataRow label="Mission progress" value={missionProgress === null ? "N/A" : `${missionProgress}%`} />
            </div>
          </section>

          {/* ACTIVE GEOFENCE STATS */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={MapPin} title="Active Geofence" action="Manage" onAction={() => navigate("/missions/geofence")} />
            <div className="px-4 py-2 space-y-0.5">
              <DataRow label="Project" value={currentProject?.name || "N/A"} />
              <DataRow label="Geofence" value={geofencePoints.length >= 3 ? currentProject?.geofence?.name || "Configured" : "N/A"} />
              <DataRow label="Status" value={geofencePoints.length >= 3 ? currentProject.geofence?.enabled === false ? "Disabled" : "Enabled" : "No saved geofence"} tone={geofencePoints.length >= 3 && geofenceValidation?.valid ? "green" : "slate"} />
              <DataRow label="Vertices" value={geofencePoints.length >= 3 ? geofencePoints.length : "N/A"} />
              <DataRow label="Validation" value={geofenceValidation ? geofenceValidation.valid ? "Valid" : "Invalid" : "N/A"} tone={geofenceValidation?.valid ? "green" : geofenceValidation ? "red" : "slate"} />
              <DataRow label="Associated mission" value={currentProject?.mission?.missionName || currentProject?.name || "N/A"} />
            </div>
          </section>
        </section>

        {/* ANALYTICS SUMMARY & RECENT BACKEND ACTIVITY */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
          {/* ANALYTICS SUMMARY */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Activity} title="Analytics Summary" action="View All" onAction={() => navigate("/analytics")} />
            <div className="grid grid-cols-2 gap-3 border-b border-[#E1EAF2] p-4 sm:grid-cols-4">
              <MiniStat label="Fleet utilization" value={formatValue(firstValue(overviewKpis, ["fleetUtilization", "utilizationRate"]))} />
              <MiniStat label="Telemetry health" value={formatValue(firstValue(overviewKpis, ["telemetryHealth", "telemetryAvailability"]))} />
              <MiniStat label="Battery overview" value={formatValue(firstValue(overviewKpis, ["averageBattery", "avgBattery", "batteryHealth"]))} />
              <MiniStat label="Safety events" value={formatValue(firstValue(overviewKpis, ["activeIncidents", "totalIncidents", "incidents"]))} />
            </div>
            {displayedActivityTrend.length ? (
              <div className="flex h-[130px] items-end gap-3 px-5 py-4">
                {displayedActivityTrend.map((point, index) => {
                  const value = firstValue(point, ["flights", "missions", "count", "value"])
                  const label = point.date || point.timestamp
                  return (
                    <div key={`${label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="text-xs font-bold text-[#3E5570] font-mono">{value}</span>
                      <span
                        className="w-full max-w-9 rounded-t-md bg-[#1E64D4] shadow-xs"
                        style={{ height: `${Math.max(10, (value / maxTrendValue) * 72)}px` }}
                      />
                      <span className="max-w-full truncate text-[10px] font-medium text-[#657B92]">{label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="px-5 py-5 text-xs text-[#7A8B9E] font-medium">No backend analytics trend data available.</p>
            )}
          </section>

          {/* RECENT BACKEND ACTIVITY */}
          <section className="command-panel min-w-0 overflow-hidden">
            <PanelHeader icon={Activity} title="Recent Backend Activity" action="View Logs" onAction={() => navigate("/logs")} />
            <div className="max-h-[250px] divide-y divide-[#E9EEF4] overflow-y-auto px-4">
              {backendActivity.length ? backendActivity.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate("/logs")}
                  className="flex w-full items-start gap-2.5 py-3 text-left hover:bg-[#F8FAFC] transition-colors rounded-lg cursor-pointer"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1E64D4] shadow-[0_0_6px_#1E64D4]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-[#102A48]">{getEventTitle(event.payload)}</span>
                      <span className="shrink-0 text-xs font-medium text-[#73879D]">{getEventTimestamp(event)}</span>
                    </span>
                    <span className="mt-0.5 block line-clamp-2 break-all text-xs leading-relaxed text-[#556C84]">{getEventMessage(event.payload)}</span>
                  </span>
                </button>
              )) : (
                <p className="px-2 py-6 text-center text-xs text-[#7A8B9E] font-medium">No backend activity events received in this session.</p>
              )}
            </div>
          </section>
        </section>

        {/* QUICK ACTIONS BAR */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D0DCEB] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#50667E]">
            <span className="font-bold text-[#0E2646] uppercase tracking-wider text-[11px] mr-1">Quick actions</span>
            <QuickAction label="Fly" onClick={() => navigate("/fly")} />
            <QuickAction label="Mission details" onClick={() => navigate("/missions/details")} />
            <QuickAction label="Geofence" onClick={() => navigate("/missions/geofence")} />
            <QuickAction label="Waypoint planning" onClick={() => navigate("/missions/waypoints")} />
            <QuickAction label="Analytics" onClick={() => navigate("/analytics")} />
            <QuickAction label="Logs" onClick={() => navigate("/logs")} />
          </div>
          <span className="text-xs text-[#657B92] font-medium">
            Backend data refreshed {lastSyncText} · <strong className="text-[#0E2646]">{currentUserName}</strong>
          </span>
        </section>
      </div>
    </div>
  )
}

const statusTone = (status) => {
  const normalized = String(status || "").toLowerCase()
  if (/active|progress|online|armed|complete|live|valid/.test(normalized)) return "green"
  if (/warn|stale|pending|saved|configured/.test(normalized)) return "amber"
  if (/error|fail|invalid|offline|critical/.test(normalized)) return "red"
  return "slate"
}

const EmptyState = ({ title, detail, action, onAction }) => (
  <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 px-5 py-6 text-center">
    <p className="text-sm font-bold text-[#1E3650]">{title}</p>
    <p className="max-w-[320px] text-xs leading-relaxed text-[#60758C]">{detail}</p>
    {action && (
      <button
        type="button"
        onClick={onAction}
        className="mt-1 text-xs font-bold text-[#1E64D4] hover:text-[#1249A0] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        {action} <ArrowRight className="inline h-3.5 w-3.5" />
      </button>
    )}
  </div>
)

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-[#D5E1ED] bg-[#F8FAFC] p-3 shadow-xs">
    <p className="truncate text-xs font-bold uppercase tracking-wider text-[#5A6E85]">{label}</p>
    <p className="mt-1.5 truncate text-base sm:text-lg font-extrabold text-[#0E2646] font-mono">{value}</p>
  </div>
)

const QuickAction = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-lg border border-[#CAD8E6] bg-white px-3 py-1.5 text-xs font-semibold text-[#2C4560] transition-all hover:border-[#1E64D4] hover:bg-[#EFF6FF] hover:text-[#1E64D4] shadow-xs cursor-pointer"
  >
    {label}
  </button>
)

export default CommandCenterOperational
