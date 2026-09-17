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

// Planner HUD components
import MissionPlanningToolbar from "@/features/mession/components/planner/MissionPlanningToolbar.jsx";
import WaypointPlacementBanner from "@/features/mession/components/planner/WaypointPlacementBanner.jsx";
import WaypointDetailsPanel from "@/features/mession/components/planner/WaypointDetailsPanel.jsx";
import MissionItemListHUD from "@/features/mession/components/planner/MissionItemListHUD.jsx";
import MissionSummaryHUD from "@/features/mession/components/planner/MissionSummaryHUD.jsx";

import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

// Planner Modals
import MissionSettingsModal from "@/features/mession/components/planner/MissionSettingsModal.jsx";
import MissionPreviewModal from "@/features/mession/components/planner/MissionPreviewModal.jsx";
import MissionStorageModal from "@/features/mession/components/planner/MissionStorageModal.jsx";
import MissionUploadModal from "@/features/mession/components/planner/MissionUploadModal.jsx";
import ClearMissionModal from "@/features/mession/components/planner/ClearMissionModal.jsx";

import { AlertTriangle, CheckCircle2, ShieldAlert, FolderKanban, ArrowRight } from "lucide-react";

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
];

/**
 * WaypointPlanningPage - Professional QGroundControl-Style Mission Planning View
 * with Strict Geofence Enforcement, Boundary Rejection, Segment Collision Detection,
 * and Active Project Management.
 */
const WaypointPlanningPage = () => {
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
  const { telemetry } = useDroneTelemetry();
  const { currentProject, currentProjectId, projects, selectProject, saveMission } = useMission();
  const planner = useMissionPlanner(currentProject?.mission);

  // RBAC permissions and role inspection
  const { hasPermission, role } = useAuth();
  const canCreate = hasPermission(Permissions.CREATE_MISSIONS);
  const canEdit = hasPermission(Permissions.EDIT_MISSIONS);
  const canDelete = hasPermission(Permissions.DELETE_MISSIONS);
  const isViewer = role === Roles.VIEWER || (!canCreate && !canEdit);

  // Modal dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [storageTab, setStorageTab] = useState("save");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  // Rejection & warning notifications
  const [notification, setNotification] = useState(null);
  const [invalidClickPoint, setInvalidClickPoint] = useState(null);

  // Cache previous waypoint positions for safe revert on boundary drag breach
  const previousPositionsRef = useRef(new Map());

  // Active geofence coordinates from current project
  const geofenceCoords = useMemo(() => {
    const g = currentProject?.geofence;
    if (!g) return [];
    if (Array.isArray(g.polygon) && g.polygon.length >= 3) return g.polygon;
    if (Array.isArray(g.coordinates) && g.coordinates.length >= 3) return g.coordinates;
    if (Array.isArray(g) && g.length >= 3) return g;
    return [];
  }, [currentProject?.geofence]);

  const hasActiveGeofence = geofenceCoords.length >= 3;

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

  const showToast = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Map Click Listener for Waypoint Placement with Strict Geofence Check
  const handleMapClick = (coords) => {
    if (isViewer || !canCreate) return;

    if (!hasActiveGeofence) {
      showToast("GEOFENCE REQUIRED — Create and save a geofence before planning waypoints.", "error");
      return;
    }

    if (!planner.isPlacingMode) return;

    const isInside = isPointInsideGeofence(coords, geofenceCoords);
    if (!isInside) {
      setInvalidClickPoint({ lat: coords.lat, lng: coords.lng, key: Date.now() });
      showToast("WAYPOINT OUTSIDE GEOFENCE — Select a point inside the configured flight area.", "error");
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
    // Allow visual feedback while dragging
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
      showToast("GEOFENCE REQUIRED — Create and save a geofence before planning waypoints.", "error");
      return;
    }

    const isInside = isPointInsideGeofence(newCoords, geofenceCoords);
    if (!isInside) {
      // Briefly highlight rejected location in red
      setInvalidClickPoint({ lat: newCoords.lat, lng: newCoords.lng, key: Date.now() });
      setTimeout(() => setInvalidClickPoint(null), 1800);

      // Revert to pre-drag position
      const prevPos = previousPositionsRef.current.get(id);
      if (prevPos) {
        planner.updateWaypointCoordinates(id, prevPos);
        planner.finishWaypointDrag(id, prevPos);
      }
      showToast("WAYPOINT OUTSIDE GEOFENCE — Position reverted.", "warning");
      return;
    }

    // Accept position
    previousPositionsRef.current.set(id, newCoords);
    planner.finishWaypointDrag(id, newCoords);
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
        planner.deleteWaypoint(planner.selectedWaypointId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [planner]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* 100% Full-bleed Map View */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MapLoad
          mapStyle={mapStyle}
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
        />
      </div>

      {/* ==================== BLOCKING GEOFENCE INTERLOCK OVERLAY ==================== */}
      {!hasActiveGeofence && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06090EEF] backdrop-blur-md p-6 select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#080C14] border border-[#EF444455] rounded-2xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EF444418] border border-[#EF44444D] flex items-center justify-center text-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.25)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold tracking-widest text-[#EF4444] uppercase">
                FLIGHT AREA INTERLOCK ● RESTRICTED
              </div>
              <h2 className="text-lg font-bold text-[#EEF4F8] font-sans">
                GEOFENCE REQUIRED
              </h2>
              <p className="text-xs font-mono text-[#8E9EAA] leading-relaxed">
                Create and save a geofence before planning waypoints. Waypoints cannot be defined without a configured boundary.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/missions/geofence")}
                className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold text-[#06090E] bg-[#35E0FF] hover:bg-[#20CAEC] transition flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(53,224,255,0.4)]"
              >
                <span>CREATE GEOFENCE NOW</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/missions/details")}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-mono text-[#8E9EAA] hover:text-white bg-[#0E1520] border border-[#1A2633] transition"
              >
                Return to Mission Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TOP HUD OVERLAY ==================== */}

      {/* 1. Project & Geofence Status Chips (Top-Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
        {/* Project Selector Chip */}
        <div className="flex items-center gap-2 bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg">
          <FolderKanban className="w-3.5 h-3.5 text-[#35E0FF]" />
          {projects.length > 1 ? (
            <select
              value={currentProjectId || ""}
              onChange={(e) => selectProject(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#E2E8F0] focus:outline-none cursor-pointer pr-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B131E] text-[#E2E8F0]">
                  {p.id}: {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-mono font-bold text-[#E2E8F0]">
              {currentProject ? `${currentProject.id}: ${currentProject.name}` : "Default Project"}
            </span>
          )}
        </div>

        {/* Geofence Status Chip */}
        <div className="flex items-center gap-2 bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-lg px-2.5 py-1 shadow">
          {hasActiveGeofence ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[#2FE089] animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-[#2FE089] uppercase tracking-wider">
                GEOFENCE: ACTIVE
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span className="font-mono text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">
                GEOFENCE ● NOT SET
              </span>
              <button
                type="button"
                onClick={() => navigate("/missions/geofence")}
                className="ml-1 text-[9px] font-mono text-[#35E0FF] hover:underline flex items-center gap-0.5"
              >
                <span>Draw</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Floating Mission Planning Toolbar (Top-Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-24px)] sm:max-w-none">
        <MissionPlanningToolbar
          planner={planner}
          isReadOnly={isViewer}
          canDelete={canDelete}
          canSave={!isViewer && (canCreate || canEdit) && hasActiveGeofence && geofenceValidation.isValid}
          canUpload={!isViewer && (canCreate || canEdit) && hasActiveGeofence && geofenceValidation.isValid}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onOpenSave={() => {
            setStorageTab("save");
            setIsStorageOpen(true);
          }}
          onOpenLoad={() => {
            setStorageTab("load");
            setIsStorageOpen(true);
          }}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenClear={() => setIsClearOpen(true)}
        />
      </div>

      {/* Viewer Auditor Mode Banner */}
      {isViewer && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-25 pointer-events-auto px-3.5 py-1.5 rounded-md bg-[#0B1017F2] border border-[#5E2222] shadow-lg backdrop-blur-md flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-[#FF8585] animate-in fade-in">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF4141] shrink-0" />
          <span className="font-semibold tracking-wide">
            AUDITOR MODE: Waypoint planning is read-only for your role.
          </span>
        </div>
      )}

      {/* 3. Floating Map Style Selector (Top-Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg p-1 shadow-lg gap-1 pointer-events-auto">
        {mapStyleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleMapStyleChange(opt.id)}
            className={`px-2.5 py-1 text-[10px] sm:text-xs font-mono font-semibold rounded-md transition ${
              mapStyle === opt.id
                ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.25)]"
                : "text-[#5D707C] hover:text-[#94A3B8]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 4. Active Waypoint Placement Banner (Below Toolbar) */}
      {hasActiveGeofence && planner.isPlacingMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <WaypointPlacementBanner
            placingType={planner.placingType}
            onCancel={planner.cancelPlacingMode}
          />
        </div>
      )}

      {/* 5. Geofence Route Violation Alert Banner */}
      {hasActiveGeofence && !geofenceValidation.isValid && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#260C10EE] border border-[#EF4444] backdrop-blur-md rounded-xl px-4 py-2 text-xs font-mono text-[#FCA5A5] shadow-2xl animate-bounce">
            <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span className="font-bold">
              {geofenceValidation.message || "MISSION ROUTE EXCEEDS GEOFENCE — Modify route to stay within boundary."}
            </span>
          </div>
        </div>
      )}

      {/* ==================== FLOATING PANELS ==================== */}

      {/* 6. Waypoint Details Editor Panel (Slide-up Bottom Sheet on Mobile, Floating on Desktop) */}
      {planner.selectedWaypoint && (
        <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:absolute sm:top-16 sm:right-3 z-35 flex justify-center sm:block pointer-events-auto">
          <WaypointDetailsPanel
            waypoint={planner.selectedWaypoint}
            validateCoordinates={(lat, lng) => isPointInsideGeofence({ lat, lng }, geofenceCoords)}
            onUpdate={planner.updateWaypoint}
            onDelete={planner.deleteWaypoint}
            onClose={() => planner.setSelectedWaypointId(null)}
          />
        </div>
      )}

      {/* ==================== BOTTOM HUD PANELS ==================== */}

      {/* 7. Mission Items List HUD (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-auto max-w-[calc(100vw-24px)] sm:max-w-xs">
        <MissionItemListHUD
          items={planner.items}
          selectedWaypointId={planner.selectedWaypointId}
          onSelectWaypoint={(id) => planner.setSelectedWaypointId(id)}
          onMoveOrder={planner.moveWaypointOrder}
          onDeleteWaypoint={planner.deleteWaypoint}
        />
      </div>

      {/* 8. Mission Metrics Summary HUD (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto max-w-[calc(100vw-24px)] sm:max-w-xs">
        <MissionSummaryHUD
          itemsCount={planner.items.length}
          formattedDistance={planner.formattedDistance}
          formattedDuration={planner.formattedDuration}
          maxAltitude={planner.maxAltitude}
          geofenceStatus={hasActiveGeofence ? "ACTIVE" : "NOT SET"}
          boundaryCheckPassed={hasActiveGeofence && geofenceValidation.isValid}
        />
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

      {/* Mission Upload Modal (Passed geofenceValidation to block invalid uploads) */}
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
        onConfirm={planner.clearMission}
        itemCount={planner.items.length}
      />

      {/* ==================== TOAST / REJECTION BANNER ==================== */}
      {notification && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-2xl font-mono text-xs font-semibold border ${
              notification.type === "success"
                ? "bg-[#062419DD] border-[#2FE089] text-[#2FE089]"
                : notification.type === "warning"
                ? "bg-[#271E06DD] border-[#F59E0B] text-[#FBBF24]"
                : notification.type === "error"
                ? "bg-[#2B0E12DD] border-[#EF4444] text-[#F87171]"
                : "bg-[#0B1A2ADD] border-[#35E0FF] text-[#35E0FF]"
            }`}
          >
            {notification.type === "error" || notification.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaypointPlanningPage;
