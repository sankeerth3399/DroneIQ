import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useMissionPlanner } from "@/hooks/useMissionPlanner.js";
import { useMission } from "@/hooks/useMission.js";
import {
  isPointInsideGeofence,
  validateMissionAgainstGeofence,
} from "@/utils/geofence.js";
import { validateGeofencePolygon } from "@/utils/geofenceValidation.js";

// Planner HUD components
import WaypointPlacementBanner from "@/features/mession/components/planner/WaypointPlacementBanner.jsx";

import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

// Planner Modals
import MissionSettingsModal from "@/features/mession/components/planner/MissionSettingsModal.jsx";
import MissionPreviewModal from "@/features/mession/components/planner/MissionPreviewModal.jsx";
import MissionStorageModal from "@/features/mession/components/planner/MissionStorageModal.jsx";
import MissionUploadModal from "@/features/mession/components/planner/MissionUploadModal.jsx";
import ClearMissionModal from "@/features/mession/components/planner/ClearMissionModal.jsx";

import {
  ShieldAlert,
  FolderKanban,
  ArrowRight,
  MapPin,
  Sliders,
  Settings,
  Navigation,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  Eye,
  Save,
  X,
  List,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
  UploadCloud,
} from "lucide-react";

const mapStyleOptions = [
  { id: "normal", label: "Normal" },
  { id: "satellite", label: "Satellite" },
];

/**
 * WaypointPlanningPage - Refactored to match Geofencing & Safety Layout
 * Two-Column Workspace:
 * - Left column: Waypoint configuration & editing controls (Sections A, B, C, D)
 * - Right column: Interactive waypoint-selection map inside a bordered card with compact header
 */
const WaypointPlanningPage = ({ embedded = false, onNavigateToGeofence }) => {
  const navigate = useNavigate();
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "normal";
    } catch {
      return "normal";
    }
  });

  const handleMapStyleChange = (style) => {
    setMapStyle(style);
    try {
      localStorage.setItem("aeronexus_map_style", style);
    } catch {
      // Ignore
    }
  };

  const [showAirspace, setShowAirspace] = useState(() => {
    try {
      const saved = localStorage.getItem("aeronexus_show_airspace");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleAirspace = () => {
    setShowAirspace((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aeronexus_show_airspace", String(next));
      } catch {}
      return next;
    });
  };

  const { telemetry } = useDroneTelemetry();
  const { currentProject, currentProjectId, projects, selectProject, saveMission } = useMission();
  const planner = useMissionPlanner(currentProject?.mission);

  // RBAC permissions and role inspection
  const { hasPermission, role } = useAuth();
  const canCreate = hasPermission(Permissions.CREATE_MISSIONS);
  const canEdit = hasPermission(Permissions.EDIT_MISSIONS);
  const canDelete = hasPermission(Permissions.DELETE_MISSIONS);
  const isViewer = role === Roles.VIEWER || (!canCreate && !canEdit);

  // Derive dynamic project/mission name for the Map Card Header
  const selectedProjectName = useMemo(() => {
    return (
      currentProject?.projectName ||
      currentProject?.name ||
      currentProject?.title ||
      (currentProjectId ? `Project ${currentProjectId}` : "Active Project")
    );
  }, [currentProject, currentProjectId]);

  // Modal dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [storageTab, setStorageTab] = useState("save");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  // Save feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Rejection & warning state
  const [invalidClickPoint, setInvalidClickPoint] = useState(null);

  // Cache previous waypoint positions for safe revert on boundary drag breach
  const previousPositionsRef = useRef(new Map());

  // Map viewport ref for ResizeObserver to trigger Mappls redraw on column/window resize
  const mapViewportRef = useRef(null);

  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let timeoutId = null;
    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Active geofence coordinates from current project validated against geometry rules
  const geofenceStatus = useMemo(() => {
    const g = currentProject?.geofence;
    if (!g) {
      return {
        hasGeofence: false,
        isValid: false,
        coords: [],
        reason: "NO_GEOFENCE",
        message: "Create and save a geofence before planning waypoints. Waypoints cannot be defined without a configured boundary.",
      };
    }
    const raw =
      Array.isArray(g.vertices) && g.vertices.length > 0
        ? g.vertices
        : Array.isArray(g.polygon) && g.polygon.length > 0
        ? g.polygon
        : Array.isArray(g.coordinates) && g.coordinates.length > 0
        ? g.coordinates
        : Array.isArray(g) && g.length > 0
        ? g
        : [];

    if (raw.length === 0) {
      return {
        hasGeofence: false,
        isValid: false,
        coords: [],
        reason: "NO_GEOFENCE",
        message: "Create and save a geofence before planning waypoints. Waypoints cannot be defined without a configured boundary.",
      };
    }

    if (raw.length < 3) {
      return {
        hasGeofence: true,
        isValid: false,
        coords: [],
        reason: "INSUFFICIENT_VERTICES",
        message: "Saved geofence is invalid: at least 3 vertices are required.",
      };
    }

    const validation = validateGeofencePolygon(raw);
    if (!validation.valid) {
      return {
        hasGeofence: true,
        isValid: false,
        coords: [],
        reason: validation.reason,
        message: `Saved geofence is invalid and must be corrected before waypoint planning: ${validation.message}`,
      };
    }

    return {
      hasGeofence: true,
      isValid: true,
      coords: raw,
    };
  }, [currentProject?.geofence]);

  const geofenceCoords = useMemo(
    () => (geofenceStatus.isValid ? geofenceStatus.coords : []),
    [geofenceStatus]
  );
  const hasActiveGeofence = geofenceStatus.isValid;
  const isGeofenceInvalid = geofenceStatus.hasGeofence && !geofenceStatus.isValid;

  // Track waypoint positions in ref
  useEffect(() => {
    planner.items.forEach((wp) => {
      previousPositionsRef.current.set(wp.id, { lat: wp.lat, lng: wp.lng });
    });
  }, [planner.items]);

  // Synchronize planner with active project's mission across project switching
  const activeProjectIdRef = useRef(currentProjectId);
  const isSyncingProjectRef = useRef(false);

  useEffect(() => {
    if (activeProjectIdRef.current !== currentProjectId) {
      activeProjectIdRef.current = currentProjectId;
      isSyncingProjectRef.current = true;

      const projectMission = currentProject?.mission;
      const targetItems =
        projectMission?.waypoints || projectMission?.items || [];

      planner.loadMissionPlan({
        items: targetItems,
        settings: projectMission?.settings,
        missionName: projectMission?.missionName || currentProject?.name,
      });

      const timer = setTimeout(() => {
        isSyncingProjectRef.current = false;
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [currentProjectId, currentProject, planner]);

  // Initial load on mount
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const projectMission = currentProject?.mission;
      const targetItems =
        projectMission?.waypoints || projectMission?.items || [];
      if (targetItems.length > 0 || planner.items.length === 0) {
        planner.loadMissionPlan({
          items: targetItems,
          settings: projectMission?.settings,
          missionName: projectMission?.missionName || currentProject?.name,
        });
      }
    }
  }, [currentProject, planner]);

  // Validate all route segments against active geofence
  const geofenceValidation = useMemo(() => {
    if (!hasActiveGeofence) {
      return {
        isValid: false,
        message: "GEOFENCE REQUIRED — Create and save a geofence before planning waypoints.",
        violatingSegments: [],
      };
    }
    if (planner.items.length === 0) {
      return { isValid: true, violations: [], violatingSegments: [] };
    }
    return validateMissionAgainstGeofence(planner.items, geofenceCoords);
  }, [hasActiveGeofence, planner.items, geofenceCoords]);

  // Sync back to current project only when user actively modifies waypoints
  useEffect(() => {
    if (isSyncingProjectRef.current) return;
    if (!currentProjectId) return;

    const currentStored =
      currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    const isDifferent =
      planner.items.length !== currentStored.length ||
      planner.items.some((it, idx) => {
        const other = currentStored[idx];
        return (
          !other ||
          it.id !== other.id ||
          it.lat !== other.lat ||
          it.lng !== other.lng ||
          it.alt !== other.alt
        );
      });

    if (isDifferent) {
      saveMission(currentProjectId, {
        waypoints: planner.items,
        items: planner.items,
        settings: planner.missionSettings,
        missionName: planner.missionName,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [
    planner.items,
    planner.missionName,
    planner.missionSettings,
    currentProjectId,
    currentProject,
    saveMission,
  ]);

  // Map Click Listener for Waypoint Placement with Strict Geofence Check
  const handleMapClick = (coords) => {
    if (isViewer || !canCreate) return;

    if (!hasActiveGeofence) {
      return;
    }

    if (!planner.isPlacingMode) return;

    const isInside = isPointInsideGeofence(coords, geofenceCoords);
    if (!isInside) {
      setInvalidClickPoint({ lat: coords.lat, lng: coords.lng, key: Date.now() });
      setTimeout(() => {
        setInvalidClickPoint(null);
      }, 1800);
      return;
    }

    planner.addWaypointAtCoordinates(coords);
  };

  // Waypoint Drag Handling with Boundary Revert Check
  const handleWaypointDrag = (id, newCoords) => {
    if (isViewer || !canEdit) return;
    planner.updateWaypointCoordinates(id, newCoords);
  };

  const handleWaypointDragEnd = (id, newCoords) => {
    if (isViewer || !canEdit) return;
    if (!hasActiveGeofence) {
      const prevPos = previousPositionsRef.current.get(id);
      if (prevPos) {
        planner.updateWaypointCoordinates(id, prevPos);
        planner.finishWaypointDrag(id, prevPos);
      }
      return;
    }

    const isInside = isPointInsideGeofence(newCoords, geofenceCoords);
    if (!isInside) {
      setInvalidClickPoint({ lat: newCoords.lat, lng: newCoords.lng, key: Date.now() });
      setTimeout(() => setInvalidClickPoint(null), 1800);

      const prevPos = previousPositionsRef.current.get(id);
      if (prevPos) {
        planner.updateWaypointCoordinates(id, prevPos);
        planner.finishWaypointDrag(id, prevPos);
      }
      return;
    }

    previousPositionsRef.current.set(id, newCoords);
    planner.finishWaypointDrag(id, newCoords);
  };

  // Handle explicit mission save
  const handleSaveMission = () => {
    if (!currentProjectId || isViewer || !hasActiveGeofence || !geofenceValidation.isValid) return;
    saveMission(currentProjectId, {
      waypoints: planner.items,
      items: planner.items,
      settings: planner.missionSettings,
      missionName: planner.missionName,
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle discard changes
  const handleCancelChanges = () => {
    const projectMission = currentProject?.mission;
    const targetItems = projectMission?.waypoints || projectMission?.items || [];
    planner.loadMissionPlan({
      items: targetItems,
      settings: projectMission?.settings,
      missionName: projectMission?.missionName || currentProject?.name,
    });
    planner.setSelectedWaypointId(null);
  };

  // Global keyboard shortcuts (Undo, Redo, Cancel placement, Deselect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        planner.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        planner.redo();
      } else if (e.key === "Escape") {
        if (planner.isPlacingMode) {
          planner.cancelPlacingMode();
        } else if (planner.selectedWaypointId) {
          planner.setSelectedWaypointId(null);
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && planner.selectedWaypointId) {
        if (!isViewer && canDelete) {
          planner.deleteWaypoint(planner.selectedWaypointId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [planner, isViewer, canDelete]);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-[#F8FAFC] text-[#0F172A] select-none p-3 sm:p-4">
      {/* ========================================================================= */}
      {/* COMPACT WORKFLOW HIERARCHY HEADER                                         */}
      {/* ========================================================================= */}
      <div className="shrink-0 mb-2 pb-1.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-[#475569]">
            <span>Mission Planning</span>
            <span className="text-[#94A3B8]">&rarr;</span>
            <span>Safety</span>
            <span className="text-[#94A3B8]">&rarr;</span>
            <span className="text-[#2563EB] font-bold">Waypoint Planning Cockpit</span>
          </div>
        </div>

        {/* Auditor Notice if Viewer */}
        {isViewer && (
          <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Auditor: Read-only Mode</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RESPONSIVE TWO-COLUMN LAYOUT: MATCHING GEOFENCING & SAFETY               */}
      {/* Left Column: Waypoint Configuration | Right Column: Sticky Map Card       */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 items-stretch md:items-start w-full">
        {/* ======================================================================= */}
        {/* 1. LEFT COLUMN — WAYPOINT CONFIGURATION PANEL                           */}
        {/* ======================================================================= */}
        <div className="w-full md:w-[350px] lg:w-[390px] xl:w-[420px] shrink-0 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div
            id="waypoint-controls-scroll-panel"
            tabIndex={0}
            className="flex-1 p-3 sm:p-3.5 space-y-3 overflow-y-auto max-h-none md:max-h-[calc(100vh-210px)] focus:outline-none"
          >
            {/* =================================================================== */}
            {/* A. ACTIVE PROJECT & MISSION                                         */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>A. Active Project & Mission</span>
                </span>

                {/* Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                    planner.isPlacingMode
                      ? "bg-blue-50 text-blue-800 border-blue-300 animate-pulse"
                      : !hasActiveGeofence
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : !geofenceValidation.isValid
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : planner.items.length > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      planner.isPlacingMode
                        ? "bg-blue-500"
                        : !hasActiveGeofence
                        ? "bg-amber-500"
                        : !geofenceValidation.isValid
                        ? "bg-rose-500"
                        : planner.items.length > 0
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {planner.isPlacingMode
                    ? "Placing WP"
                    : !hasActiveGeofence
                    ? "Geofence Required"
                    : !geofenceValidation.isValid
                    ? "Route Breach"
                    : planner.items.length > 0
                    ? "Route Valid"
                    : "Empty Route"}
                </span>
              </div>

              {/* Full-Width Project & Mission Selector */}
              <div className="w-full">
                <label className="text-[11px] font-semibold text-[#475569] mb-1 block">
                  Project & Mission
                </label>
                <select
                  value={currentProjectId || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F172A] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer truncate shadow-2xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName || p.name || p.id} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drone & Mission Status Strip */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Assigned Drone</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#0F172A] truncate">
                    <Navigation className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                    <span className="truncate">{telemetry?.droneName || currentProject?.assignedDrone || "Hexacopter Alpha"}</span>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Waypoint Count</span>
                  <div className="flex items-center justify-between font-mono font-bold text-[#0F172A]">
                    <span>{planner.items.length} WP</span>
                    <span className="text-[11px] font-normal text-[#64748B]">
                      {hasActiveGeofence ? "Geofence OK" : "No Boundary"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* B. WAYPOINT SETTINGS                                                */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>B. Waypoint Settings</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
                  title="Open Advanced Mission Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Advanced</span>
                </button>
              </div>

              {/* Flight Parameters Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Default Altitude */}
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-1">
                  <label className="text-[11px] font-semibold text-[#475569] flex items-center justify-between">
                    <span>Default Altitude</span>
                    <span className="text-[#2563EB] font-mono font-bold">{planner.missionSettings.defaultAlt ?? 50}m</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="5"
                      value={planner.missionSettings.defaultAlt ?? 50}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          planner.setMissionSettings((prev) => ({ ...prev, defaultAlt: val }));
                        }
                      }}
                      disabled={isViewer}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-mono font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-xs text-[#64748B] font-mono">m</span>
                  </div>
                </div>

                {/* Cruise Speed */}
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-1">
                  <label className="text-[11px] font-semibold text-[#475569] flex items-center justify-between">
                    <span>Cruise Speed</span>
                    <span className="text-[#2563EB] font-mono font-bold">{planner.missionSettings.defaultSpeed ?? 8.5} m/s</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      value={planner.missionSettings.defaultSpeed ?? 8.5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          planner.setMissionSettings((prev) => ({ ...prev, defaultSpeed: val }));
                        }
                      }}
                      disabled={isViewer}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-mono font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-xs text-[#64748B] font-mono">m/s</span>
                  </div>
                </div>
              </div>

              {/* Waypoint Action & Capture Settings */}
              <div className="grid grid-cols-2 gap-2">
                {/* Default Action */}
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-1">
                  <label className="text-[11px] font-semibold text-[#475569] block">
                    Waypoint Action
                  </label>
                  <select
                    value={planner.placingType || "WAYPOINT"}
                    onChange={(e) => {
                      planner.setPlacingType(e.target.value);
                    }}
                    disabled={isViewer}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none cursor-pointer truncate"
                  >
                    <option value="WAYPOINT">Fly Through (WP)</option>
                    <option value="TAKEOFF">Takeoff Point</option>
                    <option value="LAND">Landing Point</option>
                    <option value="RTL">Return to Launch</option>
                  </select>
                </div>

                {/* Camera / Inspection Hold Time */}
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-1">
                  <label className="text-[11px] font-semibold text-[#475569] flex items-center justify-between">
                    <span>Capture / Hold</span>
                    <span className="text-[#2563EB] font-mono font-bold">{planner.missionSettings.defaultHoldTime ?? 0}s</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      step="1"
                      value={planner.missionSettings.defaultHoldTime ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          planner.setMissionSettings((prev) => ({ ...prev, defaultHoldTime: val }));
                        }
                      }}
                      disabled={isViewer}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-mono font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                    />
                    <span className="text-xs text-[#64748B] font-mono">sec</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* C. WAYPOINT MANAGEMENT                                              */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>C. Waypoint Management</span>
                </span>
                {planner.selectedWaypoint && (
                  <span className="text-xs font-mono font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    WP #{planner.selectedWaypoint.seq || 1} Selected
                  </span>
                )}
              </div>

              {/* Row 1: Add Waypoint & Edit Selected */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isViewer || !hasActiveGeofence) return;
                    if (planner.isPlacingMode) {
                      planner.cancelPlacingMode();
                    } else {
                      planner.startPlacingMode(planner.placingType || "WAYPOINT");
                    }
                  }}
                  disabled={isViewer || !hasActiveGeofence}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition cursor-pointer border ${
                    planner.isPlacingMode
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs animate-pulse"
                      : isViewer || !hasActiveGeofence
                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                      : "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#EFF6FF] shadow-2xs"
                  }`}
                  title={
                    !hasActiveGeofence
                      ? "Configure a geofence first"
                      : planner.isPlacingMode
                      ? "Click map to place waypoint"
                      : "Click to start placing waypoints"
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>{planner.isPlacingMode ? "Placing WP..." : "Add Waypoint"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!planner.selectedWaypointId && planner.items.length > 0) {
                      planner.setSelectedWaypointId(planner.items[0].id);
                    } else if (planner.selectedWaypointId) {
                      planner.setSelectedWaypointId(null);
                    }
                  }}
                  disabled={isViewer || planner.items.length === 0}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition cursor-pointer border ${
                    planner.selectedWaypointId
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : isViewer || planner.items.length === 0
                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                      : "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#EFF6FF] shadow-2xs"
                  }`}
                  title={planner.items.length === 0 ? "Add waypoints first" : "Toggle waypoint details editor"}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{planner.selectedWaypointId ? "Deselect WP" : "Edit Selected"}</span>
                </button>
              </div>

              {/* Row 2: Delete Selected & Reorder Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (planner.selectedWaypointId) {
                      planner.deleteWaypoint(planner.selectedWaypointId);
                    }
                  }}
                  disabled={isViewer || !canDelete || !planner.selectedWaypointId}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition cursor-pointer border ${
                    planner.selectedWaypointId && !isViewer && canDelete
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs"
                      : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title={!planner.selectedWaypointId ? "Select a waypoint to delete" : "Delete selected waypoint"}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    {planner.selectedWaypoint
                      ? `Delete WP #${planner.selectedWaypoint.seq || 1}`
                      : "Delete Selected"}
                  </span>
                </button>

                {/* Reorder Buttons (Up / Down) */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!planner.selectedWaypoint) return;
                      const idx = planner.items.findIndex((it) => it.id === planner.selectedWaypoint.id);
                      if (idx > 0) planner.moveWaypointOrder(idx, -1);
                    }}
                    disabled={
                      isViewer ||
                      !planner.selectedWaypoint ||
                      planner.items.findIndex((it) => it.id === planner.selectedWaypoint?.id) <= 0
                    }
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      planner.selectedWaypoint &&
                      planner.items.findIndex((it) => it.id === planner.selectedWaypoint?.id) > 0
                        ? "bg-white text-[#1E293B] border-[#CBD5E1] hover:bg-[#F1F5F9] shadow-2xs"
                        : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                    }`}
                    title="Move waypoint earlier in route"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Up</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!planner.selectedWaypoint) return;
                      const idx = planner.items.findIndex((it) => it.id === planner.selectedWaypoint.id);
                      if (idx >= 0 && idx < planner.items.length - 1) {
                        planner.moveWaypointOrder(idx, 1);
                      }
                    }}
                    disabled={
                      isViewer ||
                      !planner.selectedWaypoint ||
                      planner.items.findIndex((it) => it.id === planner.selectedWaypoint?.id) >= planner.items.length - 1
                    }
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      planner.selectedWaypoint &&
                      planner.items.findIndex((it) => it.id === planner.selectedWaypoint?.id) < planner.items.length - 1
                        ? "bg-white text-[#1E293B] border-[#CBD5E1] hover:bg-[#F1F5F9] shadow-2xs"
                        : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                    }`}
                    title="Move waypoint later in route"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Down</span>
                  </button>
                </div>
              </div>

              {/* Row 3: History & Clear Tools (Undo, Redo, Preview, Clear) */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={planner.undo}
                  disabled={isViewer || !planner.canUndo}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && planner.canUndo
                      ? "bg-white text-[#1E293B] border-[#CBD5E1] hover:bg-[#F1F5F9] shadow-2xs"
                      : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title="Undo last change"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  onClick={planner.redo}
                  disabled={isViewer || !planner.canRedo}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && planner.canRedo
                      ? "bg-white text-[#1E293B] border-[#CBD5E1] hover:bg-[#F1F5F9] shadow-2xs"
                      : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title="Redo undone change"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Redo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={planner.items.length === 0}
                  className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#1E293B] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition cursor-pointer shadow-2xs"
                  title="Preview mission details"
                >
                  <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsClearOpen(true)}
                  disabled={isViewer || planner.items.length === 0}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && planner.items.length > 0
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs"
                      : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title="Clear all waypoints"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Active Waypoint Inline Editor (when a waypoint is selected) */}
              {planner.selectedWaypoint && (
                <div className="bg-white border border-[#CBD5E1] rounded-lg p-2.5 space-y-2 shadow-2xs animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                    <span className="text-xs font-mono font-bold text-[#0F172A] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Edit WP #{planner.selectedWaypoint.seq || 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => planner.setSelectedWaypointId(null)}
                      className="text-[#64748B] hover:text-[#0F172A] p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={planner.selectedWaypoint.lat}
                        onChange={(e) => {
                          const lat = parseFloat(e.target.value);
                          if (!isNaN(lat)) {
                            planner.updateWaypointCoordinates(planner.selectedWaypoint.id, {
                              lat,
                              lng: planner.selectedWaypoint.lng,
                            });
                          }
                        }}
                        disabled={isViewer}
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-1 text-xs font-mono text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={planner.selectedWaypoint.lng}
                        onChange={(e) => {
                          const lng = parseFloat(e.target.value);
                          if (!isNaN(lng)) {
                            planner.updateWaypointCoordinates(planner.selectedWaypoint.id, {
                              lat: planner.selectedWaypoint.lat,
                              lng,
                            });
                          }
                        }}
                        disabled={isViewer}
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-1 text-xs font-mono text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block">Alt (m)</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        value={planner.selectedWaypoint.alt ?? 50}
                        onChange={(e) => {
                          const alt = parseFloat(e.target.value);
                          if (!isNaN(alt)) {
                            planner.updateWaypoint(planner.selectedWaypoint.id, { alt });
                          }
                        }}
                        disabled={isViewer}
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-1 text-xs font-mono text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block">Speed (m/s)</label>
                      <input
                        type="number"
                        min="0.5"
                        max="30"
                        step="0.5"
                        value={planner.selectedWaypoint.speed ?? 8.5}
                        onChange={(e) => {
                          const spd = parseFloat(e.target.value);
                          if (!isNaN(spd)) {
                            planner.updateWaypoint(planner.selectedWaypoint.id, { speed: spd });
                          }
                        }}
                        disabled={isViewer}
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-1 text-xs font-mono text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#475569] block">Hold (s)</label>
                      <input
                        type="number"
                        min="0"
                        max="300"
                        step="1"
                        value={planner.selectedWaypoint.holdTime ?? 0}
                        onChange={(e) => {
                          const hold = parseFloat(e.target.value);
                          if (!isNaN(hold)) {
                            planner.updateWaypoint(planner.selectedWaypoint.id, { holdTime: hold });
                          }
                        }}
                        disabled={isViewer}
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-1 text-xs font-mono text-[#0F172A] focus:bg-white focus:border-[#2563EB] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Ordered Waypoint Sequence List */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-[#475569] border-b border-[#E2E8F0] pb-1">
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#0F172A]">
                    <List className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Waypoint Sequence</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B]">{planner.items.length} items</span>
                </div>

                {planner.items.length === 0 ? (
                  <div className="text-center py-3 text-xs text-[#94A3B8] font-medium">
                    No waypoints configured yet.
                    <br />
                    Click <strong className="text-[#2563EB]">Add Waypoint</strong> or click the map.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-[#F1F5F9]">
                    {planner.items.map((it, idx) => {
                      const isSelected = it.id === planner.selectedWaypointId;
                      return (
                        <div
                          key={it.id}
                          onClick={() => planner.setSelectedWaypointId(it.id)}
                          className={`flex items-center justify-between p-1.5 rounded transition cursor-pointer text-xs ${
                            isSelected
                              ? "bg-blue-50 border border-blue-200 text-[#0F172A] font-bold"
                              : "hover:bg-[#F8FAFC] text-[#334155]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                                isSelected ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
                              }`}
                            >
                              {it.seq || idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold block truncate">
                                {it.type || "WAYPOINT"} · {it.alt ?? 50}m
                              </span>
                              <span className="text-[10px] text-[#64748B] font-mono block">
                                {it.lat.toFixed(5)}, {it.lng.toFixed(5)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx > 0) planner.moveWaypointOrder(idx, -1);
                              }}
                              disabled={isViewer || idx === 0}
                              className="p-1 hover:text-[#2563EB] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx < planner.items.length - 1) planner.moveWaypointOrder(idx, 1);
                              }}
                              disabled={isViewer || idx === planner.items.length - 1}
                              className="p-1 hover:text-[#2563EB] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                planner.deleteWaypoint(it.id);
                              }}
                              disabled={isViewer || !canDelete}
                              className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save & Cancel Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleSaveMission}
                  disabled={isViewer || !hasActiveGeofence || !geofenceValidation.isValid}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs ${
                    saveSuccess
                      ? "bg-emerald-600 text-white"
                      : !isViewer && hasActiveGeofence && geofenceValidation.isValid
                      ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                  }`}
                  title={
                    !hasActiveGeofence
                      ? "Geofence required"
                      : !geofenceValidation.isValid
                      ? "Resolve route breach before saving"
                      : "Save waypoints to mission"
                  }
                >
                  <Save className="w-4 h-4" />
                  <span>{saveSuccess ? "Saved!" : "Save Changes"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelChanges}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer border bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A] shadow-2xs"
                  title="Discard unsaved changes and reload mission"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>

              {/* Storage & Utilities Strip */}
              <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                <button
                  type="button"
                  onClick={() => {
                    setStorageTab("save");
                    setIsStorageOpen(true);
                  }}
                  className="hover:text-[#2563EB] flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Storage</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStorageTab("load");
                    setIsStorageOpen(true);
                  }}
                  className="hover:text-[#2563EB] flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Load</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="hover:text-[#2563EB] flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="hover:text-[#2563EB] flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* D. ROUTE SUMMARY & VALIDATION                                       */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>D. Route Summary & Validation</span>
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    hasActiveGeofence && geofenceValidation.isValid
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {hasActiveGeofence && geofenceValidation.isValid ? "Route Compliant" : "Safety Warning"}
                </span>
              </div>

              {/* 4-Stat Metric Strip */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Waypoints</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F172A]">
                    {planner.items.length}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Distance</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F172A] truncate block">
                    {planner.formattedDistance || "0.0 m"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Est. Time</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F172A] truncate block">
                    {planner.formattedDuration || "00:00"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <span className="text-[11px] text-[#475569] block font-semibold mb-0.5">Max Alt</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F172A] truncate block">
                    {planner.maxAltitude} m
                  </span>
                </div>
              </div>

              {/* Selected Waypoint Coordinates & Altitude Inspector Strip */}
              <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
                <span className="text-[11px] text-[#475569] font-semibold block mb-1">Selected Waypoint</span>
                {planner.selectedWaypoint ? (
                  <div className="flex flex-wrap items-center justify-between text-xs font-mono font-bold text-[#0F172A] gap-1">
                    <span className="text-[#2563EB]">WP #{planner.selectedWaypoint.seq || 1}</span>
                    <span>Lat: {planner.selectedWaypoint.lat.toFixed(5)}</span>
                    <span>Lng: {planner.selectedWaypoint.lng.toFixed(5)}</span>
                    <span>Alt: {planner.selectedWaypoint.alt}m</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] font-medium block">
                    Click any waypoint marker on map or sequence list to inspect.
                  </span>
                )}
              </div>

              {/* Active Validation Alert if Violation */}
              {!geofenceValidation.isValid && (
                <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 flex items-start gap-2 text-xs text-rose-900 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug font-semibold">
                    {geofenceValidation.message || "Route segments breach the saved geofence boundary. Adjust waypoints to stay within the boundary."}
                  </span>
                </div>
              )}

              {/* Compact Validation Checklist Rows */}
              <div className="space-y-1.5 text-xs sm:text-[13px]">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Geofence Enforced:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${hasActiveGeofence ? "text-emerald-700" : "text-amber-700"}`}>
                    {hasActiveGeofence ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{hasActiveGeofence ? "Active boundary linked" : "Geofence missing"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Route Integrity:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${geofenceValidation.isValid ? "text-emerald-700" : "text-rose-600"}`}>
                    {geofenceValidation.isValid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{geofenceValidation.isValid ? "All points within bounds" : "Boundary breach"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Altitude Envelope:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${planner.maxAltitude <= 120 ? "text-emerald-700" : "text-amber-700"}`}>
                    {planner.maxAltitude <= 120 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{planner.maxAltitude <= 120 ? "<= 120m AGL (Safe)" : "Exceeds 120m AGL"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#E2E8F0]">
                  <span className="font-bold text-[#0F172A]">Route Validation Status:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${hasActiveGeofence && geofenceValidation.isValid && planner.items.length >= 2 ? "text-emerald-700" : "text-amber-800"}`}>
                    {hasActiveGeofence && geofenceValidation.isValid && planner.items.length >= 2 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>
                      {!hasActiveGeofence
                        ? "Geofence required"
                        : !geofenceValidation.isValid
                        ? "Resolve boundary breach"
                        : planner.items.length < 2
                        ? "Add at least 2 waypoints"
                        : "Flight route approved"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="h-4 pb-2" />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. RIGHT COLUMN — WAYPOINT SELECTION MAP BORDERED CARD                  */}
        {/* ======================================================================= */}
        <div className="flex-1 min-w-0 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-2xs flex flex-col min-h-[480px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[700px] h-[520px] sm:h-[580px] md:h-[660px] lg:h-[calc(100vh-210px)] md:sticky md:top-2 overflow-hidden">
          {/* Compact Card Header Strip */}
          <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-4 py-2 sm:px-5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] truncate tracking-tight">
                Waypoint Planning Map · <span className="font-semibold text-[#334155]">{selectedProjectName}</span>
              </h2>
            </div>

            {/* Map Style Switcher & Status Pill Group */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {/* Normal / Satellite Map Toggle */}
              <div className="inline-flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#CBD5E1] shadow-2xs">
                {mapStyleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleMapStyleChange(opt.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      mapStyle === opt.id
                        ? "bg-[#2563EB] text-white shadow-2xs"
                        : "text-[#475569] hover:text-[#0F172A] hover:bg-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Airspace / No-Fly Zones Layer Toggle */}
              <button
                type="button"
                onClick={handleToggleAirspace}
                title={showAirspace ? "Hide Mappls Airspace / No-Fly Zones" : "Show Mappls Airspace / No-Fly Zones"}
                aria-label="Toggle Mappls Airspace / No-Fly Zones"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer select-none ${
                  showAirspace
                    ? "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs hover:bg-rose-100"
                    : "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1] hover:bg-white hover:text-[#0F172A]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showAirspace ? "bg-rose-500 animate-pulse" : "bg-slate-400"}`} />
                <span>Airspace (NFZ)</span>
              </button>

              {/* Geofence Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                  hasActiveGeofence
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasActiveGeofence ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>{hasActiveGeofence ? "Geofence Enforced" : "No Geofence"}</span>
              </span>

              {/* Waypoint Count / Route Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                  planner.items.length > 0
                    ? "bg-blue-50 text-blue-800 border-blue-300"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    planner.items.length > 0 ? "bg-blue-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span>
                  {planner.items.length > 0
                    ? `${planner.items.length} Waypoints (Route Active)`
                    : "0 Waypoints"}
                </span>
              </span>
            </div>
          </div>

          {/* Interactive Map Viewport */}
          <div
            ref={mapViewportRef}
            className="relative flex-1 w-full h-full min-h-0 bg-[#E2E8F0] overflow-hidden"
          >
            <MapLoad
              mapStyle={mapStyle}
              showAirspace={showAirspace}
              telemetry={telemetry}
              waypoints={planner.items}
              selectedWaypointId={planner.selectedWaypointId}
              onWaypointSelect={(id) => planner.setSelectedWaypointId(id)}
              onWaypointDrag={handleWaypointDrag}
              onWaypointDragEnd={handleWaypointDragEnd}
              onMapClick={handleMapClick}
              isPlacingWaypoint={hasActiveGeofence && planner.isPlacingMode}
              showMissionRoute={true}
              geofence={geofenceCoords}
              routeViolations={geofenceValidation.violatingSegments || []}
              invalidClickPoint={invalidClickPoint}
              pageType="waypoints"
            />

            {/* Waypoint Placement Active Banner Overlay */}
            {hasActiveGeofence && planner.isPlacingMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                <WaypointPlacementBanner
                  placingType={planner.placingType}
                  onCancel={planner.cancelPlacingMode}
                />
              </div>
            )}

            {/* Route Breach Warning Banner */}
            {hasActiveGeofence && !geofenceValidation.isValid && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[90%]">
                <div className="flex items-center gap-2 bg-rose-600 text-white rounded-lg px-4 py-2 text-xs font-mono font-bold shadow-lg animate-bounce">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{geofenceValidation.message || "Route breaches geofence boundary!"}</span>
                </div>
              </div>
            )}

            {/* Missing Geofence Callout Banner (when no active geofence exists) */}
            {!hasActiveGeofence && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                <div className="max-w-md w-full bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xl text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono font-bold tracking-widest text-amber-700 uppercase">
                      {isGeofenceInvalid ? "INVALID GEOFENCE BOUNDARY" : "GEOFENCE REQUIRED"}
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {isGeofenceInvalid ? "Saved Geofence Requires Correction" : "No Geofence Defined for This Project"}
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {isGeofenceInvalid
                        ? geofenceStatus.message
                        : "Create and save a geofence before planning waypoints. Waypoints cannot be defined without a configured boundary."}
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToGeofence) {
                          onNavigateToGeofence();
                        } else {
                          navigate("/missions/geofence");
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>{isGeofenceInvalid ? "Correct Geofence in Editor" : "Create Geofence Now"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <MissionSettingsModal
          settings={planner.missionSettings}
          onSaveSettings={(newSettings) =>
            planner.setMissionSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <MissionPreviewModal
          missionName={planner.missionName}
          items={planner.items}
          formattedDistance={planner.formattedDistance}
          maxAltitude={planner.maxAltitude}
          formattedDuration={planner.formattedDuration}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Save & Load Storage Modal */}
      <MissionStorageModal
        isOpen={isStorageOpen}
        initialTab={storageTab}
        onClose={() => setIsStorageOpen(false)}
        planner={planner}
        geofence={geofenceCoords}
      />

      {/* Mission Upload Modal */}
      <MissionUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        planner={planner}
        telemetry={telemetry}
        geofenceValidation={geofenceValidation}
      />

      {/* Clear Mission Confirmation Modal */}
      <ClearMissionModal
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={() => {
          planner.clearMission();
          setIsClearOpen(false);
        }}
        itemCount={planner.items.length}
      />
    </div>
  );
};

export default WaypointPlanningPage;
