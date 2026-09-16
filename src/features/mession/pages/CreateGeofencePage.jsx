import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useMission } from "@/hooks/useMission.js";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  formatArea,
  formatDistance,
  validateMissionAgainstGeofence,
} from "@/utils/geofence.js";
import {
  Shield,
  Edit3,
  Plus,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Save,
  ArrowRight,
  Info,
  FolderKanban,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
];

const CreateGeofencePage = () => {
  const navigate = useNavigate();
  const { telemetry } = useDroneTelemetry();
  const {
    currentProject,
    currentProjectId,
    projects,
    selectProject,
    saveGeofence,
    clearGeofence,
  } = useMission();

  const { hasPermission, role } = useAuth();
  const canEditGeofence = hasPermission(Permissions.CREATE_MISSIONS) || hasPermission(Permissions.EDIT_MISSIONS);
  const isViewer = role === Roles.VIEWER || !canEditGeofence;

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
  const [lastLoadedProjectId, setLastLoadedProjectId] = useState(currentProjectId);

  const initialCoords =
    currentProject?.geofence?.polygon || currentProject?.geofence?.coordinates || [];
  const [vertices, setVertices] = useState(() => initialCoords);
  const [isClosed, setIsClosed] = useState(() => initialCoords.length >= 3);
  const [isDrawing, setIsDrawing] = useState(() => !isViewer && initialCoords.length < 3);
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState([]);
  const [notification, setNotification] = useState(null);

  // Synchronize vertices when active project changes during render
  if (lastLoadedProjectId !== currentProjectId) {
    setLastLoadedProjectId(currentProjectId);
    const coords =
      currentProject?.geofence?.polygon || currentProject?.geofence?.coordinates || [];
    setVertices(coords);
    setIsClosed(coords.length >= 3);
    setIsDrawing(coords.length < 3);
    setIsEditing(false);
    setHistory([]);
  }

  // Push to undo history when vertices change significantly
  const pushHistory = (newVertices) => {
    setHistory((prev) => [...prev.slice(-15), vertices]);
    setVertices(newVertices);
  };

  // Handle map click when in drawing mode
  const handleMapClick = (coords) => {
    if (isViewer || !isDrawing) return;

    // Check if clicking close to the first vertex to auto-close
    if (vertices.length >= 3) {
      const first = vertices[0];
      const distLat = Math.abs(coords.lat - first.lat);
      const distLng = Math.abs(coords.lng - first.lng);
      if (distLat < 0.00015 && distLng < 0.00015) {
        setIsClosed(true);
        setIsDrawing(false);
        showToast("Geofence perimeter closed successfully!", "success");
        return;
      }
    }

    pushHistory([...vertices, coords]);
  };

  // Vertex dragging during edit mode
  const handleVertexDrag = (index, newCoords) => {
    if (isViewer) return;
    setVertices((prev) => {
      const next = [...prev];
      next[index] = newCoords;
      return next;
    });
  };

  const handleVertexDragEnd = (index, newCoords) => {
    if (isViewer) return;
    pushHistory(
      vertices.map((v, i) => (i === index ? newCoords : v))
    );
  };

  // Actions
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setVertices(prev);
    if (prev.length < 3) {
      setIsClosed(false);
    }
  };

  const handleClosePolygon = () => {
    if (isViewer) return;
    if (vertices.length < 3) {
      showToast("At least 3 vertices are required to close a geofence.", "warning");
      return;
    }
    setIsClosed(true);
    setIsDrawing(false);
    setIsEditing(false);
    showToast("Geofence polygon closed.", "success");
  };

  const handleStartDraw = () => {
    if (isViewer) return;
    setIsDrawing(true);
    setIsEditing(false);
    setIsClosed(false);
  };

  const handleToggleEdit = () => {
    if (isViewer) return;
    if (vertices.length < 3) {
      showToast("Create a geofence with at least 3 vertices first.", "warning");
      return;
    }
    setIsEditing((prev) => !prev);
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (isViewer) return;
    if (vertices.length === 0) return;
    pushHistory([]);
    setVertices([]);
    setIsClosed(false);
    setIsDrawing(true);
    setIsEditing(false);
    if (currentProjectId) {
      clearGeofence(currentProjectId);
    }
    showToast("Geofence cleared.", "info");
  };

  const handleSave = () => {
    if (isViewer) return;
    if (vertices.length < 3) {
      showToast("Cannot save: Polygon must have at least 3 vertices.", "error");
      return;
    }
    if (!currentProjectId) {
      showToast("No active project selected. Please select a project first.", "error");
      return;
    }

    const cleanCoords = vertices.map((v) => ({
      lat: Number(Number(v.lat).toFixed(6)),
      lng: Number(Number(v.lng).toFixed(6)),
      latitude: Number(Number(v.lat).toFixed(6)),
      longitude: Number(Number(v.lng).toFixed(6)),
    }));

    const areaRes = calculatePolygonArea(cleanCoords);
    const areaM2 = typeof areaRes === "object" ? areaRes.sqMeters : Number(areaRes) || 0;
    const perimeterM = calculatePolygonPerimeter(cleanCoords);

    saveGeofence(currentProjectId, {
      coordinates: cleanCoords,
      polygon: cleanCoords,
      areaM2,
      perimeterM,
      enabled: true,
      updatedAt: new Date().toISOString(),
    });

    setIsDrawing(false);
    setIsEditing(false);
    setIsClosed(true);

    // Revalidate existing mission waypoints if any exist (Requirement 9)
    const existingWaypoints =
      currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    if (existingWaypoints.length > 0) {
      const validation = validateMissionAgainstGeofence(existingWaypoints, cleanCoords);
      if (!validation.isValid) {
        showToast(
          `Geofence saved successfully. Warning: ${validation.violations.length} waypoint violation(s) detected. Adjust in Waypoint Planning.`,
          "warning"
        );
        return;
      }
    }

    showToast("Geofence saved successfully.", "success");
  };

  const showToast = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3800);
  };

  // Metrics
  const areaM2 = useMemo(() => calculatePolygonArea(vertices), [vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(vertices), [vertices]);
  const formattedArea = useMemo(() => formatArea(areaM2), [areaM2]);
  const formattedPerimeter = useMemo(() => formatDistance(perimeterM), [perimeterM]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* 100% Full-bleed Map View */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MapLoad
          mapStyle={mapStyle}
          telemetry={telemetry}
          geofence={vertices}
          isDrawingGeofence={isDrawing}
          isEditingGeofence={isEditing}
          onGeofenceVertexDrag={handleVertexDrag}
          onGeofenceVertexDragEnd={handleVertexDragEnd}
          onMapClick={handleMapClick}
          showMissionRoute={false}
        />
      </div>

      {/* ==================== TOP NAVIGATION & CONTROLS HUD ==================== */}

      {/* 1. Project Selector & Status Pill (Top-Left) */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl px-3.5 py-2 shadow-xl">
          <FolderKanban className="w-4 h-4 text-[#35E0FF]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">Active Project</span>
            {projects.length > 1 ? (
              <select
                value={currentProjectId || ""}
                onChange={(e) => selectProject(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-[#E2E8F0] focus:outline-none cursor-pointer pr-2"
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
        </div>

        {/* State Badge */}
        <div className="flex items-center gap-2 bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg px-2.5 py-1 w-fit shadow">
          <span
            className={`h-2 w-2 rounded-full ${
              isDrawing
                ? "bg-[#F59E0B] animate-pulse"
                : isEditing
                ? "bg-[#3B82F6] animate-pulse"
                : vertices.length >= 3 && isClosed
                ? "bg-[#2FE089]"
                : "bg-[#64748B]"
            }`}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            {isDrawing
              ? "Drawing Mode (Click map to add points)"
              : isEditing
              ? "Editing Mode (Drag numbered handles)"
              : vertices.length >= 3 && isClosed
              ? "GEOFENCE: ACTIVE"
              : "No Geofence Set"}
          </span>
        </div>
      </div>

      {/* 2. Floating Action Toolbar (Top-Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-24px)] sm:max-w-none pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl p-1.5 shadow-2xl">
          {/* Draw Polygon Button */}
          <button
            type="button"
            disabled={isViewer}
            onClick={handleStartDraw}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              isViewer
                ? "text-[#475569] cursor-not-allowed opacity-50"
                : isDrawing
                ? "bg-[#35E0FF2B] text-[#35E0FF] border border-[#1EB8D8]"
                : "text-[#94A3B8] hover:text-white hover:bg-[#111A24]"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : "Click on the map to place vertices sequentially"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Draw Polygon</span>
          </button>

          {/* Close Polygon Button */}
          <button
            type="button"
            onClick={handleClosePolygon}
            disabled={vertices.length < 3 || isClosed || isViewer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              !isViewer && vertices.length >= 3 && !isClosed
                ? "bg-[#2FE08924] text-[#2FE089] border border-[#2FE08955] hover:bg-[#2FE08938]"
                : "text-[#475569] cursor-not-allowed opacity-50"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : "Connect the last point to the first to complete the perimeter"}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Close Boundary</span>
          </button>

          {/* Edit Vertices Button */}
          <button
            type="button"
            onClick={handleToggleEdit}
            disabled={vertices.length < 3 || isViewer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              isViewer
                ? "text-[#475569] cursor-not-allowed opacity-50"
                : isEditing
                ? "bg-[#3B82F633] text-[#60A5FA] border border-[#3B82F6]"
                : vertices.length >= 3
                ? "text-[#94A3B8] hover:text-white hover:bg-[#111A24]"
                : "text-[#475569] cursor-not-allowed opacity-50"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : "Drag vertices interactively on the map"}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Vertices</span>
          </button>

          <div className="h-5 w-[1px] bg-[#1E293B]" />

          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0 || isViewer}
            className={`p-1.5 rounded-lg text-xs transition ${
              !isViewer && history.length > 0
                ? "text-[#94A3B8] hover:text-white hover:bg-[#111A24]"
                : "text-[#475569] cursor-not-allowed opacity-40"
            }`}
            title="Undo last point"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={vertices.length === 0 || isViewer}
            className={`p-1.5 rounded-lg text-xs transition ${
              !isViewer && vertices.length > 0
                ? "text-[#EF4444] hover:bg-[#EF444422]"
                : "text-[#475569] cursor-not-allowed opacity-40"
            }`}
            title="Clear geofence"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-[#1E293B]" />

          {/* Save Geofence Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={vertices.length < 3 || isViewer}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              !isViewer && vertices.length >= 3
                ? "bg-gradient-to-r from-[#06B6D4] to-[#0284C7] text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110"
                : "bg-[#1E293B] text-[#64748B] cursor-not-allowed"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : "Save Geofence to Project"}
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE GEOFENCE</span>
          </button>
        </div>
      </div>

      {/* Auditor Mode Banner for Viewer */}
      {isViewer && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-25 pointer-events-auto px-3.5 py-1.5 rounded-md bg-[#0B1017F2] border border-[#5E2222] shadow-lg backdrop-blur-md flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-[#FF8585] animate-in fade-in">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF4141] shrink-0" />
          <span className="font-semibold tracking-wide">
            AUDITOR MODE: Geofence viewing only (Geometry modification restricted).
          </span>
        </div>
      )}

      {/* 3. Map Style Selector (Top-Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg p-1 shadow-lg gap-1 pointer-events-auto">
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

      {/* ==================== DRAWING GUIDE BANNER ==================== */}
      {isDrawing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#0B131ECC] border border-[#1EB8D855] backdrop-blur-md rounded-lg px-4 py-2 text-xs font-mono text-[#35E0FF] shadow-lg animate-pulse">
            <Info className="w-4 h-4 text-[#35E0FF]" />
            <span>
              {vertices.length === 0
                ? "Click anywhere on the map to place the 1st vertex"
                : vertices.length < 3
                ? `Click to place vertex ${vertices.length + 1} (Need ${3 - vertices.length} more to close)`
                : `Vertex ${vertices.length} placed. Click map to add more, or click "Close Boundary"`}
            </span>
          </div>
        </div>
      )}

      {/* ==================== BOTTOM HUD PANELS ==================== */}

      {/* 4. Geofence Metrics HUD (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
        <div className="bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl p-3.5 shadow-2xl w-[280px] sm:w-[320px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#35E0FF]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Boundary Metrics
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#35E0FF] bg-[#35E0FF1A] px-2 py-0.5 rounded border border-[#35E0FF33]">
              {vertices.length} VERTICES
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex flex-col bg-[#0C121D] p-2.5 rounded-lg border border-[#1A2633]">
              <span className="text-[10px] font-mono text-[#64748B]">ENCLOSED AREA</span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#E2E8F0] mt-0.5">
                {formattedArea}
              </span>
              <span className="text-[9px] font-mono text-[#475569]">
                {areaM2 > 0 ? `${(areaM2 / 1000000).toFixed(4)} km²` : "0.0000 km²"}
              </span>
            </div>

            <div className="flex flex-col bg-[#0C121D] p-2.5 rounded-lg border border-[#1A2633]">
              <span className="text-[10px] font-mono text-[#64748B]">PERIMETER</span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#E2E8F0] mt-0.5">
                {formattedPerimeter}
              </span>
              <span className="text-[9px] font-mono text-[#475569]">
                {perimeterM > 0 ? `${(perimeterM / 1000).toFixed(3)} km` : "0.000 km"}
              </span>
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono text-[#94A3B8] leading-tight bg-[#0B131E] p-2 rounded border border-[#16202C]">
            <span className="text-[#35E0FF] font-semibold">Rule:</span> Waypoints placed in Waypoint Planning cannot cross or lie outside this boundary.
          </div>
        </div>
      </div>

      {/* 5. Direct Transition Link to Waypoint Planning (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => navigate("/missions/waypoints")}
          className="flex items-center gap-2 bg-[#080C14E6] hover:bg-[#0E1724] border border-[#1EB8D855] hover:border-[#35E0FF] backdrop-blur-md rounded-xl px-4 py-3 text-xs font-mono font-bold text-[#35E0FF] shadow-2xl transition group"
        >
          <span>PROCEED TO WAYPOINT PLANNING</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* ==================== TOAST NOTIFICATION ==================== */}
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
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateGeofencePage;
