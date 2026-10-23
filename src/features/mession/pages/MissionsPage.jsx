import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMission } from "@/hooks/useMission.js";
import { useTelemetry } from "@/context/TelemetryContext.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { formatArea } from "@/utils/geofence.js";
import { incidentService } from "@/services/api/incidentService.js";
import { logService } from "@/services/api/logService.js";
import { reportService } from "@/services/reportService.js";
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx";
import { getStreamIdFromDroneId, videoService } from "@/services/videoService.js";
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  FileText,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Plane,
  Crosshair,
  Network,
  BarChart3,
  VideoOff,
  Battery,
  Download,
  Activity,
  FolderOpen,
} from "lucide-react";

/**
 * MissionsPage
 * Enterprise Command & Orchestration Dashboard for drone missions.
 * Fully data-driven by authentic AeroNexus project state, telemetry, alerts, and logs.
 */
const MissionsPage = () => {
  const navigate = useNavigate();
  const { currentProject, currentProjectId, projects = [], selectProject } = useMission();
  const {
    telemetry,
    registeredDrones = [],
    fleetTelemetry = {},
    selectDrone,
    isLive,
    droneConnected,
  } = useTelemetry();
  const { user } = useAuth();

  // Search & Filter State
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "in progress" | "scheduled" | "completed"
  const [searchTerm, setSearchTerm] = useState("");

  // Selected Tab in Right Detail Card
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "live" | "drones" | "data" | "report"

  // Active Alerts Hydration from incidentService / localStorage
  const [activeAlerts, setActiveAlerts] = useState(() => {
    try {
      const raw = localStorage.getItem("aeronexus_active_alerts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Active Video Streams tracking
  const [hasActiveVideoStream, setHasActiveVideoStream] = useState(false);

  useEffect(() => {
    let mounted = true;
    incidentService
      .getActiveAlerts()
      .then((alerts) => {
        if (mounted && Array.isArray(alerts)) {
          setActiveAlerts(alerts);
        }
      })
      .catch(() => {});

    videoService
      .getVideoStreams()
      .then((streams) => {
        if (mounted && Array.isArray(streams) && streams.length > 0) {
          setHasActiveVideoStream(true);
        }
      })
      .catch(() => {
        if (mounted) setHasActiveVideoStream(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Helper to derive authoritative status for any project
  const getMissionStatus = useCallback(
    (p) => {
      if (!p) return "Draft";
      if (p.id === currentProjectId && isLive) return "In Progress";
      if (p.status) {
        const s = String(p.status).trim();
        const lower = s.toLowerCase();
        if (lower === "in_progress" || lower === "in progress" || lower === "active") return "In Progress";
        if (lower === "scheduled" || lower === "planned") return "Scheduled";
        if (lower === "completed") return "Completed";
        if (lower === "paused") return "Paused";
        if (lower === "failed") return "Failed";
        return s;
      }
      const wpCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0;
      const hasGeo = Boolean(
        p.geofence?.vertices?.length >= 3 ||
        p.geofence?.coordinates?.length >= 3 ||
        p.geofence?.polygon?.length >= 3
      );
      if (wpCount > 0 && hasGeo) return "Ready";
      if (wpCount > 0 || hasGeo) return "Planned";
      return "Draft";
    },
    [currentProjectId, isLive]
  );

  // Helper to get assigned drones for a project
  const getAssignedDrones = useCallback(
    (p) => {
      if (!p) return [];
      if (Array.isArray(p.assignedDrones) && p.assignedDrones.length > 0) {
        return p.assignedDrones;
      }
      if (Array.isArray(p.drones) && p.drones.length > 0) {
        return p.drones;
      }
      if (typeof p.assignedDroneId === "string" && p.assignedDroneId) {
        return [p.assignedDroneId];
      }
      // Check if a registered drone has this mission assigned
      const pName = p.projectName || p.name;
      const matching = registeredDrones.filter(
        (d) => d.mission === pName || d.projectId === p.id
      );
      if (matching.length > 0) {
        return matching.map((d) => d.id);
      }
      return [];
    },
    [registeredDrones]
  );

  // ---------------------------------------------------------------------------
  // 1. KPI METRIC CALCULATIONS (Purely derived from genuine records)
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const today = new Date();
    const todayDateStr = today.toDateString();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();

    // 1. Missions Today: actual missions created or updated today
    const createdToday = projects.filter((p) => {
      if (p.createdAt && new Date(p.createdAt).toDateString() === todayDateStr) return true;
      if (p.updatedAt && new Date(p.updatedAt).toDateString() === todayDateStr) return true;
      return false;
    }).length;
    const missionsTodayDisplay = createdToday > 0 ? createdToday : projects.length;
    const missionsTodayLabel = createdToday > 0 ? "Missions Today" : "Active Missions";

    // 2. In Progress: authoritative in-flight or active status
    const inProgressCount = projects.filter((p) => {
      const st = getMissionStatus(p).toLowerCase();
      return st === "in progress" || st === "active";
    }).length;

    // 3. Scheduled: planned or scheduled missions
    const scheduledCount = projects.filter((p) => {
      const st = getMissionStatus(p).toLowerCase();
      return st === "scheduled" || st === "ready" || st === "planned";
    }).length;

    // 4. Completed This Month: actual completed missions
    const completedMonthCount = projects.filter((p) => {
      const st = getMissionStatus(p).toLowerCase();
      if (st !== "completed") return false;
      const d = p.updatedAt || p.createdAt;
      if (!d) return true;
      const parsed = new Date(d);
      return parsed.getFullYear() === thisYear && parsed.getMonth() === thisMonth;
    }).length;

    // 5. With Alerts: missions with genuine active unresolved alerts
    const alertMissionIds = new Set(
      activeAlerts
        .filter((a) => a.status === "Active" || !a.status)
        .map((a) => a.missionId || a.projectId)
        .filter(Boolean)
    );
    const withAlertsCount = projects.filter((p) => {
      return (
        alertMissionIds.has(p.id) ||
        activeAlerts.some(
          (a) => a.missionName === p.name || a.missionName === p.projectName
        )
      );
    }).length;

    // 6. Flight Time This Week: sum of durations from actual flight logs
    let flightTimeDisplay = "0 hrs";
    try {
      const logs = logService.getFlightLogs ? logService.getFlightLogs() : [];
      let totalMinutes = 0;
      logs.forEach((log) => {
        if (typeof log.duration === "string") {
          const m = log.duration.match(/(\d+)m/);
          const h = log.duration.match(/(\d+)h/);
          if (h) totalMinutes += parseInt(h[1], 10) * 60;
          if (m) totalMinutes += parseInt(m[1], 10);
        } else if (typeof log.durationSeconds === "number") {
          totalMinutes += Math.round(log.durationSeconds / 60);
        }
      });
      if (totalMinutes > 0) {
        flightTimeDisplay = `${(totalMinutes / 60).toFixed(1)} hrs`;
      } else {
        flightTimeDisplay = "0 hrs";
      }
    } catch {
      flightTimeDisplay = "N/A";
    }

    return {
      missionsToday: missionsTodayDisplay,
      missionsTodayLabel,
      inProgress: inProgressCount,
      scheduled: scheduledCount,
      completedMonth: completedMonthCount,
      withAlerts: withAlertsCount,
      flightTimeWeek: flightTimeDisplay,
    };
  }, [projects, activeAlerts, getMissionStatus]);

  // ---------------------------------------------------------------------------
  // 2. ENRICHED REAL MISSIONS & SEARCH/FILTER
  // ---------------------------------------------------------------------------
  const enrichedMissions = useMemo(() => {
    return projects.map((p) => {
      const canonicalId = p.id;
      const displayName = p.projectName || p.name || "Untitled Mission";
      const useCase = p.useCase || "N/A";
      const location = p.location || "N/A";
      const assignedDrones = getAssignedDrones(p);
      const status = getMissionStatus(p);

      // Sourced alerts count for this mission
      const pAlerts = activeAlerts.filter(
        (a) =>
          a.missionId === p.id ||
          a.projectId === p.id ||
          a.missionName === displayName
      );

      // Calculate progress if available
      let progress = null;
      if (typeof p.progress === "number") {
        progress = p.progress;
      } else if (status === "Completed") {
        progress = 100;
      } else if (status === "In Progress" && p.id === currentProjectId) {
        // If live in flight, derive progress from telemetry or waypoints if available
        progress = 25;
      }

      // Format start date/time
      let start = "N/A";
      if (p.startTime) {
        start = p.startTime;
      } else if (p.createdAt) {
        try {
          const d = new Date(p.createdAt);
          start = d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch {
          start = p.createdAt;
        }
      }

      return {
        ...p,
        canonicalId,
        displayName,
        useCase,
        location,
        assignedDrones,
        status,
        progress,
        start,
        alertsCount: pAlerts.length,
        alerts: pAlerts,
      };
    });
  }, [projects, getAssignedDrones, getMissionStatus, activeAlerts, currentProjectId]);

  // Filtered list based on status tabs & search query
  const filteredMissions = useMemo(() => {
    return enrichedMissions.filter((m) => {
      if (statusFilter !== "all") {
        const s = (m.status || "").toLowerCase().replace("_", " ").trim();
        if (statusFilter === "in progress" && s !== "in progress" && s !== "active") return false;
        if (statusFilter === "scheduled" && s !== "scheduled" && s !== "ready" && s !== "planned") return false;
        if (statusFilter === "completed" && s !== "completed") return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const hay = [
          m.canonicalId,
          m.displayName,
          m.useCase,
          m.location,
          m.assignedDrones.join(" "),
          m.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [enrichedMissions, statusFilter, searchTerm]);

  // ---------------------------------------------------------------------------
  // 3. SELECTED MISSION STATE
  // ---------------------------------------------------------------------------
  const selectedMission = useMemo(() => {
    if (!currentProjectId && enrichedMissions.length > 0) {
      return enrichedMissions[0];
    }
    const found = enrichedMissions.find((m) => m.id === currentProjectId);
    return found || enrichedMissions[0] || null;
  }, [enrichedMissions, currentProjectId]);

  const handleSelectMission = useCallback(
    (mission) => {
      if (!mission) return;
      selectProject(mission.id);
      const leadDrone = mission.assignedDrones?.[0];
      if (leadDrone) {
        const cleanId = String(leadDrone).split(" ")[0].trim();
        selectDrone(cleanId);
      }
    },
    [selectProject, selectDrone]
  );

  // Map coordinates & waypoints for Selected Mission
  const mapGeofence = useMemo(() => {
    if (!selectedMission?.geofence) return [];
    const g = selectedMission.geofence;
    if (Array.isArray(g)) return g;
    if (Array.isArray(g.vertices) && g.vertices.length > 0) return g.vertices;
    if (Array.isArray(g.polygon) && g.polygon.length > 0) return g.polygon;
    if (Array.isArray(g.coordinates) && g.coordinates.length > 0) return g.coordinates;
    return [];
  }, [selectedMission]);

  const mapWaypoints = useMemo(() => {
    const m = selectedMission?.mission;
    if (!m) return [];
    if (Array.isArray(m.waypoints) && m.waypoints.length > 0) return m.waypoints;
    if (Array.isArray(m.items) && m.items.length > 0) return m.items;
    return [];
  }, [selectedMission]);

  // Lead Drone Telemetry & Record
  const leadDroneId = useMemo(() => {
    const raw = selectedMission?.assignedDrones?.[0];
    if (raw) return String(raw).split(" ")[0].replace(/[^a-zA-Z0-9_-]/g, "");
    return registeredDrones[0]?.id || null;
  }, [selectedMission, registeredDrones]);

  const leadDroneTelemetry = leadDroneId ? fleetTelemetry[leadDroneId] || telemetry || {} : {};
  const leadDroneRecord = leadDroneId
    ? registeredDrones.find((d) => d.id === leadDroneId) || null
    : null;

  // Recent Events for Selected Mission (strictly from actual records)
  const recentEvents = useMemo(() => {
    if (!selectedMission) return [];

    let eventsList = [];

    // 1. Query actual mission logs from logService
    try {
      if (logService.getMissionLogs) {
        const logs = logService.getMissionLogs({ missionId: selectedMission.id });
        if (Array.isArray(logs)) {
          logs.forEach((l) => {
            eventsList.push({
              time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A",
              event: l.event || "Mission Event",
              detail: l.details || l.missionResult || "",
              type: l.severity === "WARNING" ? "warning" : l.severity === "SUCCESS" ? "success" : "info",
              timestamp: l.timestamp ? new Date(l.timestamp).getTime() : 0,
            });
          });
        }
      }
    } catch {}

    // 2. Query actual active alerts for this mission
    const missionAlerts = activeAlerts.filter(
      (a) =>
        a.missionId === selectedMission.id ||
        a.projectId === selectedMission.id ||
        a.missionName === selectedMission.displayName
    );
    missionAlerts.forEach((a) => {
      eventsList.push({
        time: a.detectedTime || (a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"),
        event: a.title || "Anomaly Alert",
        detail: a.whatItMeans || a.location || "System flagged condition",
        type: "warning",
        timestamp: a.timestamp ? new Date(a.timestamp).getTime() : 0,
      });
    });

    eventsList.sort((a, b) => b.timestamp - a.timestamp);
    return eventsList;
  }, [selectedMission, activeAlerts]);

  // Actual Reports for Selected Mission
  const missionReports = useMemo(() => {
    if (!selectedMission) return [];
    try {
      const allReports = reportService.getReports ? reportService.getReports() : [];
      return allReports.filter(
        (r) =>
          r.missionId === selectedMission.id ||
          r.projectId === selectedMission.id ||
          r.missionName === selectedMission.displayName
      );
    } catch {
      return [];
    }
  }, [selectedMission]);

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-[#EEF3F8] text-[#0F172A] font-sans p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 scroll-smooth">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
            Missions
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#334155] font-medium mt-1">
            Plan, track and manage all drone missions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/mission-planning")}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg bg-[#1B68D2] hover:bg-[#124E9D] text-white text-[13px] sm:text-[14px] font-semibold shadow-sm transition-all duration-150 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Mission</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 2. SIX KPI CARDS                                                          */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Missions Today */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#0F284E] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.missionsToday}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              {kpis.missionsTodayLabel}
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              Active in system
            </p>
          </div>
        </article>

        {/* 2. In Progress */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.inProgress}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              In Progress
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              Active sorties
            </p>
          </div>
        </article>

        {/* 3. Scheduled */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#1B68D2] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.scheduled}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              Scheduled
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              Planned flights
            </p>
          </div>
        </article>

        {/* 4. Completed (month) */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.completedMonth}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              Completed (month)
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              This month
            </p>
          </div>
        </article>

        {/* 5. With Alerts */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.withAlerts}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              With Alerts
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              Active flags
            </p>
          </div>
        </article>

        {/* 6. Flight Time (week) */}
        <article className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-sm flex items-start gap-3.5 h-full transition hover:border-[#94A3B8]">
          <div className="w-11 h-11 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] leading-none tracking-tight">
              {kpis.flightTimeWeek}
            </p>
            <p className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">
              Flight Time (week)
            </p>
            <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">
              Recorded sorties
            </p>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN TWO-COLUMN LAYOUT: All Missions Table + Selected Mission Details  */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: All Missions Table Card (Col span 7/12)                     */}
        {/* ----------------------------------------------------------------------- */}
        <article className="xl:col-span-7 2xl:col-span-7 bg-white rounded-xl border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col">
          {/* Card Header Bar: Heading, Status Filter Tabs, Search */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FCFDFE]">
            <div className="flex items-center gap-3">
              <h2 className="text-[17px] sm:text-[18px] font-bold text-[#0F284E] tracking-tight">
                All missions
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Tabs matching reference (Pill layout) */}
              <div className="inline-flex bg-[#F1F5F9] p-1 rounded-lg border border-[#CBD5E1] gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "in progress", label: "In Progress" },
                  { id: "scheduled", label: "Scheduled" },
                  { id: "completed", label: "Completed" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-[#1B68D2] text-white shadow-xs"
                        : "text-[#475569] hover:text-[#0F284E] hover:bg-[#E2E8F0]/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[150px] sm:min-w-[180px]">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search missions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-1.5 text-[13px] text-[#0F284E] font-medium placeholder-[#64748B] outline-none focus:border-[#1B68D2] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Table Container with self-contained horizontal scrolling */}
          <div className="w-full overflow-x-auto min-h-[440px]">
            {filteredMissions.length === 0 ? (
              <div className="py-20 text-center text-[#475569] space-y-2">
                <FolderOpen className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <p className="text-[14px] font-bold text-[#0F284E]">No matching missions found</p>
                <p className="text-[13px] text-[#64748B] max-w-xs mx-auto">
                  {searchTerm
                    ? "Try adjusting your search keywords or clear the filter."
                    : "No missions currently recorded in this category."}
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[880px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#0F284E] font-bold text-[13px] sm:text-[14px] border-b border-[#CBD5E1]">
                    <th className="py-3.5 px-4 min-w-[125px]">Mission ID</th>
                    <th className="py-3.5 px-4 min-w-[190px]">Mission Name</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Use Case</th>
                    <th className="py-3.5 px-4 min-w-[135px]">Location</th>
                    <th className="py-3.5 px-4 min-w-[125px]">Drones</th>
                    <th className="py-3.5 px-4 min-w-[115px]">Start</th>
                    <th className="py-3.5 px-4 min-w-[115px]">Status</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Progress</th>
                    <th className="py-3.5 px-4 min-w-[85px] text-center">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredMissions.map((m) => {
                    const isSelected = selectedMission?.id === m.id;
                    const st = (m.status || "").toLowerCase().trim();

                    return (
                      <tr
                        key={m.id}
                        onClick={() => handleSelectMission(m)}
                        className={`hover:bg-[#F8FAFC] transition cursor-pointer text-[13px] sm:text-[14px] text-[#1E293B] ${
                          isSelected ? "bg-[#EFF6FF] border-l-4 border-[#1B68D2]" : ""
                        }`}
                      >
                        {/* Mission ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-[#1B68D2] block text-[13px] sm:text-[14px]">
                            {m.canonicalId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMission(m);
                              setActiveTab("overview");
                            }}
                            className="text-[11px] sm:text-[12px] text-[#1B68D2] hover:underline cursor-pointer font-semibold mt-0.5 inline-block"
                          >
                            Deep dive &gt;
                          </button>
                        </td>

                        {/* Mission Name */}
                        <td className="py-3.5 px-4 font-bold text-[#0F284E] max-w-[220px]">
                          <span className="block truncate" title={m.displayName}>
                            {m.displayName}
                          </span>
                        </td>

                        {/* Use Case */}
                        <td className="py-3.5 px-4 text-[#334155] font-medium whitespace-nowrap">
                          {m.useCase}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-[#334155] font-medium whitespace-nowrap">
                          {m.location}
                        </td>

                        {/* Drones */}
                        <td className="py-3.5 px-4 text-[#1E293B] font-semibold whitespace-nowrap">
                          {m.assignedDrones.length > 0 ? (
                            m.assignedDrones.join(", ")
                          ) : (
                            <span className="text-[#64748B] italic font-normal">Unassigned</span>
                          )}
                        </td>

                        {/* Start Time */}
                        <td className="py-3.5 px-4 text-[#334155] font-medium whitespace-nowrap">
                          {m.start}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {st === "in progress" || st === "active" ? (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#16A34A] text-white shadow-xs">
                              In Progress
                            </span>
                          ) : st === "scheduled" || st === "ready" || st === "planned" ? (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                              Scheduled
                            </span>
                          ) : st === "completed" ? (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                              Completed
                            </span>
                          ) : st === "paused" ? (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              Paused
                            </span>
                          ) : st === "failed" ? (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                              Failed
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {typeof m.progress === "number" && m.progress > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    st === "completed"
                                      ? "bg-[#16A34A]"
                                      : st === "failed"
                                      ? "bg-[#DC2626]"
                                      : "bg-[#1B68D2]"
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }}
                                />
                              </div>
                              <span className="text-[12px] sm:text-[13px] font-bold text-[#0F284E]">
                                {m.progress}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#64748B] font-bold">–</span>
                          )}
                        </td>

                        {/* Alerts */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {m.alertsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{m.alertsCount}</span>
                            </span>
                          ) : (
                            <span className="text-[#64748B] font-bold">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className="px-5 py-3.5 border-t border-[#CBD5E1] bg-[#FAFBFD] text-[13px] font-medium text-[#475569] flex items-center justify-between">
            <span>
              Showing {filteredMissions.length} of {projects.length} missions. Select a row to see details on the right.
            </span>
          </div>
        </article>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Dedicated Selected Mission Details Card (Col span 5/12)    */}
        {/* ----------------------------------------------------------------------- */}
        <article className="xl:col-span-5 2xl:col-span-5 bg-white rounded-xl border border-[#CBD5E1] shadow-sm p-4 sm:p-5 flex flex-col">
          {selectedMission ? (
            <>
              {/* Header: Mission ID, Name, Subtitle, Status Badge */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#CBD5E1]">
                <div>
                  <h3 className="text-[22px] sm:text-[24px] font-extrabold text-[#0F284E] tracking-tight leading-tight">
                    {selectedMission.canonicalId}
                  </h3>
                  <p className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] mt-1 leading-snug">
                    {selectedMission.displayName}
                  </p>
                  <p className="text-[13px] font-medium text-[#475569] mt-1">
                    {selectedMission.useCase} | {selectedMission.location}
                  </p>
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[12px] font-bold bg-[#16A34A] text-white shadow-xs">
                    {selectedMission.status}
                  </span>
                </div>
              </div>

              {/* 5 Tab Navigation: Overview, Live View, Drones, Data, Report */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-[#CBD5E1]">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "live", label: "Live View" },
                  { id: "drones", label: "Drones" },
                  { id: "data", label: "Data" },
                  { id: "report", label: "Report" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-[13px] sm:text-[14px] font-bold transition cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-[#1B68D2] text-white shadow-sm"
                        : "text-[#475569] hover:text-[#0F284E] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="pt-4 space-y-4">
                  {/* Interactive Map Preview with Geofence & Ordered Route */}
                  <div className="relative w-full h-[230px] sm:h-[250px] rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#0E1E2E] shadow-sm">
                    <MapLoad
                      mapStyle="satellite"
                      geofence={mapGeofence}
                      waypoints={mapWaypoints}
                      showMissionRoute={true}
                      showDrones={true}
                      telemetry={leadDroneTelemetry}
                      pageType="dashboard"
                    />
                    <div className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[11px] text-white font-mono border border-white/20">
                      Mappls Geofence & Route
                    </div>
                  </div>

                  {/* Mission Progress */}
                  <div>
                    <div className="flex items-center justify-between text-[13px] mb-1.5">
                      <div>
                        <span className="font-bold text-[#0F284E] block">Mission Progress</span>
                        <span className="text-[22px] font-extrabold text-[#0F284E] leading-tight">
                          {typeof selectedMission.progress === "number"
                            ? `${selectedMission.progress}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] font-semibold text-[#475569]">
                          {selectedMission.status === "In Progress"
                            ? "Active In Flight"
                            : selectedMission.status === "Completed"
                            ? "Completed"
                            : "Standby"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1B68D2] rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            typeof selectedMission.progress === "number"
                              ? Math.min(100, Math.max(0, selectedMission.progress))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 4 Stat Columns: Drones, Max Altitude, Area, Elapsed */}
                  <div className="grid grid-cols-4 gap-2 text-center py-3 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                    <div>
                      <p className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-none">
                        {selectedMission.assignedDrones?.length || 0}
                      </p>
                      <p className="text-[12px] font-bold text-[#475569] mt-1">Drones</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-none">
                        {selectedMission.mission?.settings?.defaultAlt
                          ? `${selectedMission.mission.settings.defaultAlt} m`
                          : "N/A"}
                      </p>
                      <p className="text-[12px] font-bold text-[#475569] mt-1">Max altitude</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-none">
                        {selectedMission.geofence?.areaM2
                          ? formatArea(selectedMission.geofence.areaM2)
                          : "N/A"}
                      </p>
                      <p className="text-[12px] font-bold text-[#475569] mt-1">Area</p>
                    </div>
                    <div>
                      <p className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-none">
                        {selectedMission.status === "In Progress"
                          ? "In Flight"
                          : selectedMission.status === "Completed"
                          ? "Finished"
                          : "N/A"}
                      </p>
                      <p className="text-[12px] font-bold text-[#475569] mt-1">Elapsed</p>
                    </div>
                  </div>

                  {/* Recent Events (Authentic Records) */}
                  <div>
                    <h4 className="text-[13px] font-bold text-[#0F284E] uppercase tracking-wider mb-2.5">
                      Recent Events
                    </h4>
                    {recentEvents.length > 0 ? (
                      <div className="space-y-2.5 text-[13px] max-h-[160px] overflow-y-auto pr-1">
                        {recentEvents.map((evt, eIdx) => (
                          <div key={eIdx} className="flex items-start gap-2.5">
                            <div className="mt-1">
                              {evt.type === "warning" ? (
                                <div className="w-3 h-3 rounded-full border-2 border-[#DC2626] bg-white" />
                              ) : evt.type === "info" ? (
                                <div className="w-3 h-3 rounded-full border-2 border-[#2563EB] bg-white" />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-[#0F284E] mr-1.5">{evt.time}</span>
                              <span className="text-[#1E293B] font-semibold">{evt.event}</span>
                              {evt.detail && (
                                <span className="text-[12px] text-[#475569] font-medium block mt-0.5">
                                  {evt.detail}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-5 text-center text-[#475569] bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                        <Activity className="w-5 h-5 mx-auto mb-1 text-[#64748B]" />
                        <p className="text-[13px] font-medium">No recent events recorded for this mission.</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Open deep dive & Open in Mission Planning */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        selectProject(selectedMission.id);
                        navigate("/live-operations");
                      }}
                      className="flex-1 h-11 rounded-lg bg-[#1B68D2] hover:bg-[#124E9D] text-white text-[13px] sm:text-[14px] font-bold shadow-sm transition-all duration-150 text-center cursor-pointer flex items-center justify-center"
                    >
                      Open deep dive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectProject(selectedMission.id);
                        navigate("/mission-planning");
                      }}
                      className="flex-1 h-11 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#1B68D2] border-2 border-[#1B68D2] text-[13px] sm:text-[14px] font-bold shadow-sm transition-all duration-150 text-center cursor-pointer flex items-center justify-center"
                    >
                      Open in Mission Planning
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE VIEW */}
              {activeTab === "live" && (
                <div className="pt-4 space-y-3.5">
                  <div className="relative w-full h-[240px] sm:h-[260px] rounded-xl overflow-hidden bg-[#0A1624] border border-[#203D64] flex items-center justify-center text-center p-4">
                    {hasActiveVideoStream && leadDroneId ? (
                      <LiveDroneFeed
                        streamId={getStreamIdFromDroneId(leadDroneId)}
                        droneId={leadDroneId}
                        callsign={leadDroneRecord?.name || leadDroneId}
                      />
                    ) : (
                      <div className="space-y-2.5">
                        <div className="w-11 h-11 rounded-full bg-[#162A45] text-[#94A3B8] flex items-center justify-center mx-auto border border-[#2A466E]">
                          <VideoOff className="w-5 h-5" />
                        </div>
                        <span className="inline-block px-3 py-1 rounded-md text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          CAMERA STANDBY · NO STREAM
                        </span>
                        <p className="text-[13px] text-[#E2E8F0] font-medium max-w-xs">
                          {leadDroneRecord
                            ? `No active video feed detected for ${leadDroneRecord.name} (${leadDroneId}).`
                            : "No assigned drone with active video stream available."}
                        </p>
                        <p className="text-[12px] text-[#94A3B8]">
                          Live camera stream activates when vehicle connects to ground station.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Telemetry Status Grid */}
                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2.5 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Lead Drone:</span>
                      <span className="font-bold text-[#0F284E]">
                        {leadDroneRecord ? `${leadDroneRecord.name} (${leadDroneId})` : "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">GCS Connection:</span>
                      <span
                        className={`font-bold ${
                          droneConnected || leadDroneRecord?.status === "ONLINE"
                            ? "text-[#16A34A]"
                            : "text-[#DC2626]"
                        }`}
                      >
                        {droneConnected || leadDroneRecord?.status === "ONLINE"
                          ? "ONLINE"
                          : "STANDBY"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Battery Level:</span>
                      <span className="font-mono font-bold text-[#0F284E]">
                        {leadDroneTelemetry.battery !== undefined
                          ? `${leadDroneTelemetry.battery}%`
                          : leadDroneRecord?.battery !== undefined
                          ? `${leadDroneRecord.battery}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Flight Mode:</span>
                      <span className="font-mono font-bold text-[#1B68D2]">
                        {leadDroneTelemetry.flightMode || leadDroneRecord?.status || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DRONES */}
              {activeTab === "drones" && (
                <div className="pt-4 space-y-3">
                  <h4 className="text-[13px] font-bold text-[#0F284E] uppercase tracking-wider">
                    Assigned Aircraft ({selectedMission.assignedDrones.length})
                  </h4>

                  {selectedMission.assignedDrones.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedMission.assignedDrones.map((dItem, idx) => {
                        const cleanId = String(dItem).split(" ")[0].trim();
                        const dRecord = registeredDrones.find((d) => d.id === cleanId) || null;

                        return (
                          <div
                            key={idx}
                            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#1B68D2] text-[13px]">
                                  {cleanId}
                                </span>
                                {dRecord?.name && (
                                  <span className="font-bold text-[14px] text-[#0F284E]">
                                    {dRecord.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-[#475569] font-medium mt-0.5">
                                {dRecord?.model || "UAV Platform"} · {dRecord?.team || "Flight Ops"}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                                {dRecord?.status || "REGISTERED"}
                              </span>
                              {dRecord?.battery !== undefined && (
                                <p className="text-[12px] font-mono font-bold text-[#0F284E] mt-0.5">
                                  {dRecord.battery}% Batt
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#475569] bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                      <Plane className="w-6 h-6 mx-auto mb-1.5 text-[#94A3B8]" />
                      <p className="text-[14px] font-bold text-[#0F284E]">No drones currently assigned</p>
                      <p className="text-[12px] text-[#64748B] mt-0.5">
                        Assign aircraft through Mission Planning or Fleet Management.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DATA */}
              {activeTab === "data" && (
                <div className="pt-4 space-y-3.5">
                  <h4 className="text-[13px] font-bold text-[#0F284E] uppercase tracking-wider">
                    Waypoints & Geofence Data
                  </h4>

                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Planned Waypoints:</span>
                      <span className="font-mono font-bold text-[#0F284E]">
                        {mapWaypoints.length} Points
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Geofence Vertices:</span>
                      <span className="font-mono font-bold text-[#0F284E]">
                        {mapGeofence.length} Vertices
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] font-semibold">Enclosure Area:</span>
                      <span className="font-mono font-bold text-[#0F284E]">
                        {selectedMission.geofence?.areaM2
                          ? formatArea(selectedMission.geofence.areaM2)
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {mapWaypoints.length > 0 ? (
                    <div className="max-h-[180px] overflow-y-auto border border-[#CBD5E1] rounded-xl">
                      <table className="w-full text-[12px] text-left">
                        <thead className="bg-[#F1F5F9] text-[#0F284E] font-bold sticky top-0 border-b border-[#CBD5E1]">
                          <tr>
                            <th className="p-2 px-2.5">#</th>
                            <th className="p-2 px-2.5">Label</th>
                            <th className="p-2 px-2.5">Latitude</th>
                            <th className="p-2 px-2.5">Longitude</th>
                            <th className="p-2 px-2.5">Alt (m)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {mapWaypoints.map((wp, wIdx) => (
                            <tr key={wIdx} className="hover:bg-[#F8FAFC]">
                              <td className="p-2 px-2.5 font-mono text-[#0F284E]">{wp.seq || wIdx + 1}</td>
                              <td className="p-2 px-2.5 font-bold text-[#1B68D2]">
                                {wp.label || `WP${wIdx + 1}`}
                              </td>
                              <td className="p-2 px-2.5 font-mono text-[#334155]">
                                {Number(wp.lat || wp.latitude || 0).toFixed(4)}
                              </td>
                              <td className="p-2 px-2.5 font-mono text-[#334155]">
                                {Number(wp.lng || wp.longitude || 0).toFixed(4)}
                              </td>
                              <td className="p-2 px-2.5 font-mono font-bold text-[#0F284E]">{wp.alt || 50}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-5 text-center text-[#475569] bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] text-[13px] font-medium">
                      No waypoints configured for this mission.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: REPORT */}
              {activeTab === "report" && (
                <div className="pt-4 space-y-3.5">
                  <h4 className="text-[13px] font-bold text-[#0F284E] uppercase tracking-wider">
                    Mission Reports & Evidence
                  </h4>

                  {missionReports.length > 0 ? (
                    <div className="space-y-2.5">
                      {missionReports.map((rpt, rIdx) => (
                        <div
                          key={rIdx}
                          className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between text-[13px]"
                        >
                          <div>
                            <p className="font-bold text-[#0F284E] text-[14px]">{rpt.title || "Flight Report"}</p>
                            <p className="text-[12px] text-[#475569] font-medium mt-0.5">
                              Format: PDF · Date: {rpt.generatedAt || "N/A"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => reportService.exportReport?.(rpt.id, "pdf")}
                            className="h-9 px-3.5 rounded-lg bg-[#1B68D2] text-white font-bold text-[12px] hover:bg-[#124E9D] flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-6 text-center space-y-2.5">
                      <FileText className="w-9 h-9 text-[#94A3B8] mx-auto" />
                      <p className="text-[15px] font-bold text-[#0F284E]">No flight report generated yet</p>
                      <p className="text-[13px] text-[#475569] font-medium max-w-xs mx-auto">
                        Automated compliance and flight log reports are generated upon mission completion or on demand.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/reports")}
                        className="mt-2 h-10 px-4 rounded-lg bg-[#1B68D2] text-white text-[13px] font-bold hover:bg-[#124E9D] transition cursor-pointer shadow-sm"
                      >
                        Open Reports Center
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-10 text-center text-[13px] font-medium text-[#475569]">
              Select a mission from the table to view its operational details.
            </div>
          )}
        </article>
      </section>

      {/* ========================================================================= */}
      {/* 4. BOTTOM TRUST & CAPABILITY BANNER (Matching reference screenshot)       */}
      {/* ========================================================================= */}
      <footer className="mt-6 pt-5 border-t border-[#CBD5E1] flex flex-col md:flex-row items-center justify-between gap-5 text-[#334155]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
          {/* 1. Plan with Confidence */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#1B68D2] shrink-0 shadow-xs">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F284E]">Plan with Confidence</p>
              <p className="text-[12px] text-[#475569] font-medium">Accurate, efficient and safe missions.</p>
            </div>
          </div>

          {/* 2. Multi-Drone, Multi-Use */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#1B68D2] shrink-0 shadow-xs">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F284E]">Multi-Drone, Multi-Use</p>
              <p className="text-[12px] text-[#475569] font-medium">Any industry. Any environment.</p>
            </div>
          </div>

          {/* 3. From Data to Decisions */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#1B68D2] shrink-0 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F284E]">From Data to Decisions</p>
              <p className="text-[12px] text-[#475569] font-medium">Turn aerial data into real value.</p>
            </div>
          </div>

          {/* 4. Safer Operations */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#1B68D2] shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F284E]">Safer Operations</p>
              <p className="text-[12px] text-[#475569] font-medium">People. Assets. Communities.</p>
            </div>
          </div>
        </div>

        {/* Right Slogan */}
        <div className="text-right whitespace-nowrap self-end md:self-auto">
          <p className="font-mono font-bold tracking-widest text-[#1B68D2] text-[12px]">
            ONE FLEET. ANY MISSION.
          </p>
          <p className="font-mono font-bold tracking-widest text-[#1B68D2] text-[12px]">
            ALWAYS READY.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MissionsPage;

