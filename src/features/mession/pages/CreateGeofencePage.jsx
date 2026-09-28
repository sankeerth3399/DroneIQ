import { useState, useMemo, useRef, useEffect } from "react";
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
  validateProposedVertex,
  validateVertexDrag,
  validateGeofenceClosure,
  validateGeofencePolygon,
  calculateDistance,
  findNearestPolygonEdge,
  GeofenceValidationReasons,
  GEOFENCE_EDGE_INSERTION_TOLERANCE_METERS,
} from "@/utils/geofenceValidation.js";
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
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
];

const createGeofenceVertexId = () =>
  `vertex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

/**
 * Ensures all vertices have stable IDs and standardized coordinates
 */
const ensureVertexIds = (coordsList) => {
  if (!Array.isArray(coordsList)) return [];
  return coordsList.map((pt, idx) => {
    const lat = Number(pt.lat ?? pt.latitude ?? 0);
    const lng = Number(pt.lng ?? pt.longitude ?? 0);
    const id = pt.id || `vertex-${idx + 1}`;
    return {
      ...pt,
      id,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    };
  });
};

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

  const rawInitialCoords =
    currentProject?.geofence?.vertices ||
    currentProject?.geofence?.polygon ||
    currentProject?.geofence?.coordinates || [];
  const initialCoords = ensureVertexIds(rawInitialCoords);
  const [vertices, setVertices] = useState(() => initialCoords);
  const [isClosed, setIsClosed] = useState(() => initialCoords.length >= 3);
  const [isDrawing, setIsDrawing] = useState(() => !isViewer && initialCoords.length < 3);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVertexId, setSelectedVertexId] = useState(null);
  const [inlineError, setInlineError] = useState(null);
  const [history, setHistory] = useState([]);
  const [invalidClickPoint, setInvalidClickPoint] = useState(null);
  const [geofenceEditHover, setGeofenceEditHover] = useState(null);
  const [metricsCollapsed, setMetricsCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const dragStartVerticesRef = useRef(null);
  const editSnapshotVerticesRef = useRef(null);
  const errorTimerRef = useRef(null);

  useEffect(() => {
    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
  }, [currentProjectId]);

  const hasExistingGeofence = useMemo(() => {
    const raw =
      currentProject?.geofence?.vertices ||
      currentProject?.geofence?.polygon ||
      currentProject?.geofence?.coordinates || [];

    return Array.isArray(raw) && raw.length >= 3;
  }, [currentProject]);

  const setInlineErrorWithTimeout = (msg) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setInlineError(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => {
        setInlineError(null);
        errorTimerRef.current = null;
      }, 4000);
    }
  };

  const selectedVertexIndex = useMemo(() => {
    if (!selectedVertexId) return -1;
    return vertices.findIndex((v, idx) => (v.id || `vertex-${idx + 1}`) === selectedVertexId);
  }, [vertices, selectedVertexId]);

  // Synchronize vertices when active project changes during render
  if (lastLoadedProjectId !== currentProjectId) {
    setLastLoadedProjectId(currentProjectId);
    const raw =
      currentProject?.geofence?.vertices ||
      currentProject?.geofence?.polygon ||
      currentProject?.geofence?.coordinates || [];
    const coords = ensureVertexIds(raw);
    setVertices(coords);
    setIsClosed(coords.length >= 3);
    setIsDrawing(coords.length < 3);
    setIsEditing(false);
    setSelectedVertexId(null);
    setInlineError(null);
    setHistory([]);
  }

  // Push to undo history when vertices change significantly
  const pushHistory = (newVertices) => {
    setHistory((prev) => [...prev.slice(-15), vertices]);
    setVertices(newVertices);
  };

  // Handle map click when in drawing mode
  const handleMapClick = (coords) => {
    // Clicking empty map space deselects currently selected vertex
    if (selectedVertexId) {
      setSelectedVertexId(null);
    }
    setInlineError(null);

    if (isViewer) return;

    if (isEditing) {
      const nearestEdge = findNearestPolygonEdge(vertices, coords);
      if (!nearestEdge) {
        setInlineErrorWithTimeout(
          `Click within ${GEOFENCE_EDGE_INSERTION_TOLERANCE_METERS} m of the geofence boundary to add a point.`
        );
        return;
      }

      const newVertex = {
        id: createGeofenceVertexId(),
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
        latitude: Number(coords.lat.toFixed(6)),
        longitude: Number(coords.lng.toFixed(6)),
      };
      const nextVertices = [...vertices];
      nextVertices.splice(nearestEdge.insertionIndex, 0, newVertex);

      const validation = validateGeofencePolygon(nextVertices);
      if (!validation.valid) {
        const message =
          validation.reason === GeofenceValidationReasons.DUPLICATE_VERTEX ||
          validation.reason === GeofenceValidationReasons.VERTEX_TOO_CLOSE
            ? "Point is too close to an existing vertex."
            : "Point cannot be added here because it would create invalid geometry.";
        setInvalidClickPoint({ lat: newVertex.lat, lng: newVertex.lng });
        setTimeout(() => setInvalidClickPoint(null), 1800);
        setInlineErrorWithTimeout(message);
        if (import.meta.env?.DEV) {
          console.debug("[GEOFENCE EDIT]", {
            action: "ADD_POINT",
            targetEdge: `${vertices[nearestEdge.edgeIndex]?.id} -> ${vertices[(nearestEdge.edgeIndex + 1) % vertices.length]?.id}`,
            vertexCount: vertices.length,
            polygonLayerCount: 1,
            polylineLayerCount: 1,
            valid: false,
            reason: validation.reason,
          });
        }
        return;
      }

      pushHistory(nextVertices);
      if (import.meta.env?.DEV) {
        console.debug("[GEOFENCE EDIT]", {
          action: "ADD_POINT",
          targetEdge: `${vertices[nearestEdge.edgeIndex]?.id} -> ${vertices[(nearestEdge.edgeIndex + 1) % vertices.length]?.id}`,
          vertexCount: nextVertices.length,
          polygonLayerCount: 1,
          polylineLayerCount: 1,
          valid: true,
        });
      }
      return;
    }

    if (!isDrawing) return;

    // Check if clicking close to the first vertex to auto-close
    if (vertices.length >= 3) {
      const first = vertices[0];
      const distToFirst = calculateDistance(coords, first);
      // Auto-close threshold: within 15 meters or near-identical coordinates
      const distLat = Math.abs(coords.lat - first.lat);
      const distLng = Math.abs(coords.lng - first.lng);
      if (distToFirst <= 15 || (distLat < 0.00015 && distLng < 0.00015)) {
        const closureValidation = validateGeofenceClosure(vertices);
        if (!closureValidation.valid) {
          setInvalidClickPoint({ lat: coords.lat, lng: coords.lng });
          setTimeout(() => setInvalidClickPoint(null), 1800);
          showToast(`Cannot close geofence: ${closureValidation.message}`, "error", "Invalid Boundary");
          return;
        }

        const polygonValidation = validateGeofencePolygon(vertices);
        if (!polygonValidation.valid) {
          setInvalidClickPoint({ lat: coords.lat, lng: coords.lng });
          setTimeout(() => setInvalidClickPoint(null), 1800);
          showToast(`Cannot close geofence: ${polygonValidation.message}`, "error", "Invalid Boundary");
          return;
        }

        setIsClosed(true);
        setIsDrawing(false);
        showToast("Geofence perimeter closed successfully!", "success", "Geofence Closed");
        return;
      }
    }

    // Validate proposed new vertex before modifying geometry
    const validation = validateProposedVertex(vertices, coords);
    if (!validation.valid) {
      setInvalidClickPoint({ lat: coords.lat, lng: coords.lng });
      setTimeout(() => setInvalidClickPoint(null), 1800);
      const isBoundary = validation.reason === "SELF_INTERSECTING" || validation.reason === "BOUNDARY_CROSSING";
      showToast(validation.message, isBoundary ? "error" : "warning", isBoundary ? "Invalid Boundary" : "Vertex Rejected");
      return;
    }

    const newVertex = {
      id: createGeofenceVertexId(),
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      latitude: Number(coords.lat.toFixed(6)),
      longitude: Number(coords.lng.toFixed(6)),
    };

    pushHistory([...vertices, newVertex]);
  };

  const handleMapHover = (coords) => {
    if (!isEditing || !coords) {
      setGeofenceEditHover(null);
      return;
    }
    const nextHover = findNearestPolygonEdge(vertices, coords) ? coords : null;
    setGeofenceEditHover((previous) =>
      previous?.lat === nextHover?.lat && previous?.lng === nextHover?.lng
        ? previous
        : nextHover
    );
  };

  // Vertex dragging during edit mode
  const handleVertexDrag = (index, newCoords, vertexId) => {
    if (isViewer || !isEditing) return;
    const currentIndex = vertexId
      ? vertices.findIndex((vertex) => vertex.id === vertexId)
      : index;
    if (currentIndex < 0) return;
    if (!dragStartVerticesRef.current) {
      dragStartVerticesRef.current = vertices.map((vertex) => ({ ...vertex }));
    }
    const dragBase = dragStartVerticesRef.current;
    const check = validateVertexDrag(
      dragBase,
      currentIndex,
      newCoords,
      isClosed
    );
    if (check.valid) {
      setVertices((prev) => {
        const next = [...prev];
        const targetIndex = vertexId
          ? next.findIndex((vertex) => vertex.id === vertexId)
          : currentIndex;
        const existing = next[targetIndex];
        if (!existing) return prev;
        next[targetIndex] = {
          ...existing,
          lat: newCoords.lat,
          lng: newCoords.lng,
          latitude: newCoords.lat,
          longitude: newCoords.lng,
        };
        return next;
      });
    }
  };

  const handleVertexDragEnd = (index, newCoords, vertexId) => {
    if (isViewer || !isEditing) return;
    const baseVertices = dragStartVerticesRef.current || vertices.map((vertex) => ({ ...vertex }));
    const currentIndex = vertexId
      ? baseVertices.findIndex((vertex) => vertex.id === vertexId)
      : index;
    if (currentIndex < 0) {
      dragStartVerticesRef.current = null;
      return { valid: false };
    }
    const validation = validateVertexDrag(baseVertices, currentIndex, newCoords, isClosed);

    if (!validation.valid) {
      setVertices(baseVertices);
      dragStartVerticesRef.current = null;
      setInvalidClickPoint({ lat: newCoords.lat, lng: newCoords.lng });
      setTimeout(() => setInvalidClickPoint(null), 1800);
      const isBoundary = validation.reason === "SELF_INTERSECTING" || validation.reason === "BOUNDARY_CROSSING";
      showToast(validation.message, isBoundary ? "error" : "warning", isBoundary ? "Invalid Boundary" : "Vertex Rejected");
      return { valid: false, reason: validation.reason, message: validation.message };
    }

    const nextVertices = baseVertices.map((v, i) =>
      i === currentIndex
        ? {
            ...v,
            lat: newCoords.lat,
            lng: newCoords.lng,
            latitude: newCoords.lat,
            longitude: newCoords.lng,
          }
        : v
    );
    setHistory((historyItems) => [...historyItems.slice(-15), baseVertices]);
    setVertices(nextVertices);
    dragStartVerticesRef.current = null;
    if (import.meta.env?.DEV) {
      console.debug("[GEOFENCE EDIT]", {
        action: "MOVE_POINT",
        vertexId: vertexId || baseVertices[currentIndex]?.id,
        vertexCount: nextVertices.length,
        polygonLayerCount: 1,
        polylineLayerCount: 1,
        valid: true,
      });
    }
    return { valid: true };
  };

  /**
   * Delete an individual geofence vertex by stable ID (Requirements 1 - 13)
   */
  const handleDeleteVertex = (vertexIdToDelete) => {
    if (isViewer || !isEditing) return;
    const targetId = vertexIdToDelete || selectedVertexId;
    if (!targetId) return;

    // Minimum vertex rule (Requirements 3 & 28):
    // A valid polygon requires at least 3 vertices.
    // If the geofence currently has 3 vertices, do NOT allow deletion.
    if (vertices.length <= 3 && (isClosed || vertices.length === 3)) {
      setInlineErrorWithTimeout("Geofence requires at least 3 points.");
      return;
    }

    const targetIdx = vertices.findIndex(
      (v, idx) => (v.id || `vertex-${idx + 1}`) === targetId
    );
    if (targetIdx === -1) return;

    // Filter out the selected vertex while strictly retaining original order of remaining vertices
    const nextVertices = vertices.filter(
      (v, idx) => (v.id || `vertex-${idx + 1}`) !== targetId
    );

    // Validate resulting geometry after deletion (Requirement 13)
    if (nextVertices.length >= 3 && isClosed) {
      const polygonValidation = validateGeofencePolygon(nextVertices);
      if (!polygonValidation.valid) {
        setInlineErrorWithTimeout(
          `Cannot delete vertex: ${polygonValidation.message || "Resulting boundary is invalid."}`
        );
        return;
      }
    }

    // Save initial state for cancel/undo if not already saved
    pushHistory(nextVertices);
    if (import.meta.env?.DEV) {
      console.debug("[GEOFENCE EDIT]", {
        action: "DELETE_POINT",
        vertexId: targetId,
        vertexCount: nextVertices.length,
        polygonLayerCount: 1,
        polylineLayerCount: 1,
        valid: true,
      });
    }
    setSelectedVertexId(null);
    setInlineErrorWithTimeout(null);
  };

  // Revert modifications made during edit mode (Requirement 18 & 29)
  const handleCancelEdit = () => {
    if (editSnapshotVerticesRef.current) {
      setVertices(editSnapshotVerticesRef.current.map((vertex) => ({ ...vertex })));
    }
    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
    setHistory([]);
    setIsEditing(false);
    setIsClosed(true);
    setSelectedVertexId(null);
    setInlineError(null);
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
      showToast("At least 3 vertices are required to close a geofence.", "warning", "Geofence Incomplete");
      return;
    }

    const closureValidation = validateGeofenceClosure(vertices);
    if (!closureValidation.valid) {
      showToast(`Cannot close geofence: ${closureValidation.message}`, "error", "Invalid Boundary");
      return;
    }

    const polygonValidation = validateGeofencePolygon(vertices);
    if (!polygonValidation.valid) {
      showToast(`Cannot close geofence: ${polygonValidation.message}`, "error", "Invalid Boundary");
      return;
    }

    setIsClosed(true);
    setIsDrawing(false);
    setIsEditing(false);
    showToast("Geofence polygon closed.", "success", "Geofence Closed");
  };

  const handleStartDraw = () => {
    if (isViewer) return;

    if (hasExistingGeofence || vertices.length > 0) {
      setInlineErrorWithTimeout("Clear the current geofence before drawing a new one.");
      return;
    }

    setIsDrawing(true);
    setIsEditing(false);
    setIsClosed(false);
  };

  const handleToggleEdit = () => {
    if (isViewer || isEditing) return;
    if (vertices.length < 3) {
      showToast("Create a geofence with at least 3 vertices first.", "warning", "Geofence Incomplete");
      return;
    }
    editSnapshotVerticesRef.current = vertices.map((vertex) => ({ ...vertex }));
    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
    setHistory([]);
    setIsEditing(true);
    setIsDrawing(false);
    setSelectedVertexId(null);
    setInlineError(null);
  };

  const handleClear = () => {
    if (isViewer) return;
    if (vertices.length === 0) return;
    pushHistory([]);
    setVertices([]);
    setIsClosed(false);
    setIsDrawing(true);
    setIsEditing(false);
    setSelectedVertexId(null);
    setInlineError(null);
    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
    if (currentProjectId) {
      clearGeofence(currentProjectId);
    }
    showToast("Active geofence removed.", "info", "Geofence Deleted");
  };

  const handleSave = () => {
    if (isViewer) return;
    if (vertices.length < 3) {
      setInlineErrorWithTimeout("Cannot save: Polygon must have at least 3 vertices.");
      return;
    }
    if (!currentProjectId) {
      setInlineErrorWithTimeout("No active project selected. Please select a project first.");
      return;
    }

    const cleanCoords = vertices.map((v, idx) => ({
      id: v.id || `vertex-${idx + 1}`,
      lat: Number(Number(v.lat).toFixed(6)),
      lng: Number(Number(v.lng).toFixed(6)),
      latitude: Number(Number(v.lat).toFixed(6)),
      longitude: Number(Number(v.lng).toFixed(6)),
    }));

    // Mandatory Master Acceptance Validation before saving
    const validation = validateGeofencePolygon(cleanCoords);
    if (!validation.valid) {
      setInlineErrorWithTimeout(
        `Geofence cannot be saved because the boundary is invalid: ${validation.message}`
      );
      return;
    }

    const areaRes = calculatePolygonArea(cleanCoords);
    const areaM2 = typeof areaRes === "object" ? areaRes.sqMeters : Number(areaRes) || 0;
    const perimeterM = calculatePolygonPerimeter(cleanCoords);

    saveGeofence(currentProjectId, {
      vertices: cleanCoords, // Canonical source of truth (Requirement 3 & 23)
      coordinates: cleanCoords,
      polygon: cleanCoords,
      areaM2,
      perimeterM,
      enabled: true,
      name: currentProject?.geofence?.name || "Flight Geofence Boundary",
      updatedAt: new Date().toISOString(),
    });

    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
    setHistory([]);
    setSelectedVertexId(null);
    setInlineError(null);
    setIsDrawing(false);
    setIsEditing(false);
    setIsClosed(true);

    // Revalidate existing mission waypoints if any exist
    const existingWaypoints =
      currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    if (existingWaypoints.length > 0) {
      const missionValidation = validateMissionAgainstGeofence(existingWaypoints, cleanCoords);
      if (!missionValidation.isValid) {
        showToast(
          `Geofence saved successfully. Warning: ${missionValidation.violations.length} waypoint violation(s) detected. Adjust in Waypoint Planning.`,
          "warning",
          "Geofence Saved"
        );
        return;
      }
    }

    showToast("Active geofence saved successfully.", "success", "Geofence Saved");
  };

  // Geofence notifications removed per Section 15 and 25
  const showToast = () => {};

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
          geofenceEditHover={geofenceEditHover}
          isDrawingGeofence={isDrawing}
          isEditingGeofence={isEditing}
          isClosedGeofence={isClosed}
          selectedGeofenceVertexId={selectedVertexId}
          onGeofenceVertexSelect={(vId) => {
            setSelectedVertexId(vId);
            setInlineError(null);
          }}
          onGeofenceVertexDrag={handleVertexDrag}
          onGeofenceVertexDragEnd={handleVertexDragEnd}
          onMapClick={handleMapClick}
          onGeofenceEditHover={handleMapHover}
          showMissionRoute={false}
          invalidClickPoint={invalidClickPoint}
          pageType="geofence"
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
              ? "EDIT MODE - Click near boundary to add; drag or delete points"
              : vertices.length >= 3 && isClosed
              ? "GEOFENCE: ACTIVE"
              : "No Geofence Set"}
          </span>
        </div>
      </div>

      {/* 2. Floating Action Toolbar (Top-Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-24px)] pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl p-1.5 shadow-2xl overflow-x-auto scrollbar-none">
          {/* Draw Polygon Button */}
          <button
            type="button"
            disabled={isViewer}
            onClick={handleStartDraw}
            aria-disabled={hasExistingGeofence || vertices.length > 0}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
              isViewer
                ? "text-[#475569] cursor-not-allowed opacity-50"
                : hasExistingGeofence || vertices.length > 0
                ? "text-[#64748B] cursor-not-allowed opacity-60"
                : isDrawing
                ? "bg-[#35E0FF2B] text-[#35E0FF] border border-[#1EB8D8]"
                : "text-[#94A3B8] hover:text-white hover:bg-[#111A24]"
            }`}
            title={
              isViewer
                ? "Read-only in Viewer mode"
                : hasExistingGeofence || vertices.length > 0
                ? "Clear the active geofence before drawing a new one"
                : "Click on the map to place vertices sequentially"
            }
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Draw</span>
          </button>

          {/* Close Polygon Button */}
          <button
            type="button"
            onClick={handleClosePolygon}
            disabled={vertices.length < 3 || isClosed || isViewer}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
              !isViewer && vertices.length >= 3 && !isClosed
                ? "bg-[#2FE08924] text-[#2FE089] border border-[#2FE08955] hover:bg-[#2FE08938]"
                : "text-[#475569] cursor-not-allowed opacity-50"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : "Connect the last point to the first to complete the perimeter"}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Close</span>
          </button>

          {/* Edit Vertices Button */}
          <button
            type="button"
            onClick={handleToggleEdit}
            disabled={vertices.length < 3 || isViewer}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
              isViewer
                ? "text-[#475569] cursor-not-allowed opacity-50"
                : isEditing
                ? "bg-[#3B82F633] text-[#60A5FA] border border-[#3B82F6]"
                : vertices.length >= 3
                ? "text-[#94A3B8] hover:text-white hover:bg-[#111A24]"
                : "text-[#475569] cursor-not-allowed opacity-50"
            }`}
            title={isViewer ? "Read-only in Viewer mode" : isEditing ? "Click near an edge to add a point; drag or select vertices to edit" : "Edit the saved geofence"}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{isEditing ? "Editing" : "Edit"}</span>
          </button>

          {/* Cancel Edit Button (Requirement 18 & 29) */}
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition text-[#94A3B8] hover:text-[#FFA3A3] hover:bg-[#EF444422] border border-[#334155] shrink-0 cursor-pointer"
              title="Discard modifications and restore previous geofence"
            >
              <X className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Cancel</span>
            </button>
          )}

          {/* Selected Vertex Chip & Delete Point Control (Requirements 1, 2, 14, 15, 16) */}
          {selectedVertexIndex !== -1 && (
            <>
              <div className="h-5 w-[1px] bg-[#1E293B]" />
              <div className="flex items-center gap-1.5 bg-[#0F1B2B] border border-[#35E0FF55] px-2.5 py-1 rounded-lg shadow-[0_0_12px_rgba(53,224,255,0.25)] shrink-0 animate-in fade-in">
                <span className="text-[11px] font-mono font-bold text-[#35E0FF] whitespace-nowrap">
                  Vertex {selectedVertexIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteVertex(selectedVertexId)}
                  disabled={!isEditing || isViewer}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold transition whitespace-nowrap ${
                    isEditing && !isViewer
                      ? "bg-[#EF444422] hover:bg-[#EF444444] border-[#EF444466] text-[#FF6B6B] hover:text-[#FFA3A3] cursor-pointer"
                      : "bg-[#1E293B] border-[#334155] text-[#64748B] cursor-not-allowed"
                  }`}
                  title="Delete this vertex"
                >
                  <Trash2 className="w-3 h-3 text-[#FF4141]" />
                  <span>DELETE POINT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVertexId(null);
                    setInlineError(null);
                  }}
                  className="p-0.5 text-[#64748B] hover:text-[#94A3B8] transition cursor-pointer"
                  title="Deselect vertex"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

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

      {/* Inline Validation Banner (Requirements 3, 13, 28) */}
      {inlineError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-25 pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#140A0AE6] border border-[#EF444488] shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-mono text-[#FCA5A5] animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span>{inlineError}</span>
          <button
            type="button"
            onClick={() => setInlineError(null)}
            className="ml-2 text-[#94A3B8] hover:text-white cursor-pointer"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto max-w-[calc(100vw-24px)]">
        <div className="bg-[#080C14E6] border border-[#1A2633] backdrop-blur-md rounded-xl p-2.5 sm:p-3.5 shadow-2xl w-[260px] sm:w-[320px] max-w-full">
          <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-[#1E293B]">
            <button
              type="button"
              onClick={() => setMetricsCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 text-left hover:opacity-80 transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#35E0FF]" />
              <span className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Boundary Metrics
              </span>
              <span className="sm:hidden text-[#64748B]">
                {metricsCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>
            <span className="font-mono text-[9px] sm:text-[10px] text-[#35E0FF] bg-[#35E0FF1A] px-1.5 sm:px-2 py-0.5 rounded border border-[#35E0FF33]">
              {vertices.length} VERTICES
            </span>
          </div>

          {!metricsCollapsed && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                <div className="flex flex-col bg-[#0C121D] p-2 sm:p-2.5 rounded-lg border border-[#1A2633]">
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#64748B]">ENCLOSED AREA</span>
                  <span className="text-xs sm:text-base font-mono font-bold text-[#E2E8F0] mt-0.5">
                    {formattedArea}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-[#475569]">
                    {areaM2 > 0 ? `${(areaM2 / 1000000).toFixed(4)} km²` : "0.0000 km²"}
                  </span>
                </div>

                <div className="flex flex-col bg-[#0C121D] p-2 sm:p-2.5 rounded-lg border border-[#1A2633]">
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#64748B]">PERIMETER</span>
                  <span className="text-xs sm:text-base font-mono font-bold text-[#E2E8F0] mt-0.5">
                    {formattedPerimeter}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-[#475569]">
                    {perimeterM > 0 ? `${(perimeterM / 1000).toFixed(3)} km` : "0.000 km"}
                  </span>
                </div>
              </div>

              <div className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] font-mono text-[#94A3B8] leading-tight bg-[#0B131E] p-1.5 sm:p-2 rounded border border-[#16202C]">
                <span className="text-[#35E0FF] font-semibold">Rule:</span> Waypoints placed in Waypoint Planning cannot cross or lie outside this boundary.
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Direct Transition Link to Waypoint Planning (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => navigate("/missions/waypoints")}
          className="flex items-center gap-1.5 sm:gap-2 bg-[#080C14E6] hover:bg-[#0E1724] border border-[#1EB8D855] hover:border-[#35E0FF] backdrop-blur-md rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-mono font-bold text-[#35E0FF] shadow-2xl transition group min-h-[40px]"
        >
          <span className="hidden sm:inline">PROCEED TO WAYPOINT PLANNING</span>
          <span className="sm:hidden">TO PLANNING</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default CreateGeofencePage;
