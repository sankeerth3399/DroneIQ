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
  insertVertexOnNearestEdge,
  GeofenceValidationReasons,
} from "@/utils/geofenceValidation.js";
import {
  Shield,
  Edit3,
  Plus,
  PlusCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Save,
  ArrowRight,
  Info,
  FolderKanban,
  ShieldAlert,
  X,
  AlertCircle,
  AlertTriangle,
  Sliders,
  Layers,
  Check,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

const mapStyleOptions = [
  { id: "normal", label: "Normal" },
  { id: "satellite", label: "Satellite" },
];

const createGeofenceVertexId = () =>
  `vertex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

/**
 * Ensures all vertices have stable IDs and standardized coordinates
 * Supports both {lat, lng} / {latitude, longitude} objects and [lng, lat] / [lat, lng] tuples
 */
const ensureVertexIds = (coordsList) => {
  if (!Array.isArray(coordsList)) return [];
  return coordsList.map((pt, idx) => {
    let lat = 0;
    let lng = 0;
    if (Array.isArray(pt) && pt.length >= 2) {
      if (Math.abs(pt[0]) > Math.abs(pt[1])) {
        lng = Number(pt[0]);
        lat = Number(pt[1]);
      } else {
        lat = Number(pt[0]);
        lng = Number(pt[1]);
      }
    } else if (pt && typeof pt === "object") {
      lat = Number(pt.lat ?? pt.latitude ?? 0);
      lng = Number(pt.lng ?? pt.longitude ?? 0);
    }
    const id = pt?.id || `vertex-${idx + 1}`;
    return {
      ...(typeof pt === "object" && !Array.isArray(pt) ? pt : {}),
      id,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    };
  });
};

const CreateGeofencePage = ({
  embedded = false,
  localWaypoints: propLocalWaypoints = [],
  onNavigateToWaypoints,
  triggerToast: propTriggerToast,
}) => {
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

  // Derive dynamic project/mission name for the Map Card Header
  const selectedProjectName = useMemo(() => {
    return (
      currentProject?.projectName ||
      currentProject?.name ||
      currentProject?.title ||
      (currentProjectId ? `Project ${currentProjectId}` : "Active Project")
    );
  }, [currentProject, currentProjectId]);

  // Derive canonical waypoints for visualization on the map when available
  const projectWaypoints = useMemo(() => {
    if (Array.isArray(propLocalWaypoints) && propLocalWaypoints.length > 0) {
      return propLocalWaypoints;
    }
    const raw =
      currentProject?.mission?.waypoints ||
      currentProject?.mission?.items ||
      currentProject?.waypoints ||
      [];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((wp, idx) => ({
        id: wp.id || `wp-${idx + 1}`,
        seq: wp.seq || idx + 1,
        lat: Number(wp.lat ?? wp.latitude ?? 0),
        lng: Number(wp.lng ?? wp.longitude ?? 0),
        alt: wp.alt ?? wp.altitude ?? 50,
        speed: wp.speed,
        holdTime: wp.holdTime,
        heading: wp.heading,
        label: wp.label || `WP${wp.seq || idx + 1}`,
      }))
      .filter((wp) => !isNaN(wp.lat) && !isNaN(wp.lng) && (wp.lat !== 0 || wp.lng !== 0));
  }, [propLocalWaypoints, currentProject]);

  const mapViewportRef = useRef(null);

  // ResizeObserver on the map viewport to trigger map redraws upon card/viewport size change
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
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

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
  const [redoStack, setRedoStack] = useState([]);
  const [geofenceEditHover, setGeofenceEditHover] = useState(null);
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
      }, 5000);
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
    setRedoStack([]);
  }

  // Push to undo history when vertices change significantly
  const pushHistory = (newVertices) => {
    setHistory((prev) => [...prev.slice(-15), vertices]);
    setRedoStack([]);
    setVertices(newVertices);
  };

  // Handle map click when in drawing mode
  const handleMapClick = (coords) => {
    if (selectedVertexId) {
      setSelectedVertexId(null);
    }
    setInlineError(null);

    if (isViewer) return;

    if (isEditing) {
      const nearestEdge = findNearestPolygonEdge(vertices, coords);
      if (!nearestEdge) {
        setInlineErrorWithTimeout("A valid geofence boundary is required before adding a point.");
        return;
      }

      const newVertex = {
        id: createGeofenceVertexId(),
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
        latitude: Number(coords.lat.toFixed(6)),
        longitude: Number(coords.lng.toFixed(6)),
      };
      const insertion = insertVertexOnNearestEdge(vertices, newVertex);
      if (!insertion.valid) {
        const message =
          insertion.reason === GeofenceValidationReasons.DUPLICATE_VERTEX ||
          insertion.reason === GeofenceValidationReasons.VERTEX_TOO_CLOSE
            ? "Point is too close to an existing vertex."
            : "Point cannot be added here because it would create invalid geometry.";
        setInlineErrorWithTimeout(message);
        return;
      }

      pushHistory(insertion.vertices);
      return;
    }

    if (!isDrawing) return;

    // Check if clicking close to the first vertex to auto-close
    if (vertices.length >= 3) {
      const first = vertices[0];
      const distToFirst = calculateDistance(coords, first);
      const distLat = Math.abs(coords.lat - first.lat);
      const distLng = Math.abs(coords.lng - first.lng);
      if (distToFirst <= 15 || (distLat < 0.00015 && distLng < 0.00015)) {
        const closureValidation = validateGeofenceClosure(vertices);
        if (!closureValidation.valid) {
          setInlineErrorWithTimeout(`Cannot close geofence: ${closureValidation.message}`);
          return;
        }

        const polygonValidation = validateGeofencePolygon(vertices);
        if (!polygonValidation.valid) {
          setInlineErrorWithTimeout(`Cannot close geofence: ${polygonValidation.message}`);
          return;
        }

        setIsClosed(true);
        setIsDrawing(false);
        propTriggerToast?.("Geofence perimeter closed successfully!", "success");
        return;
      }
    }

    const validation = validateProposedVertex(vertices, coords);
    if (!validation.valid) {
      setInlineErrorWithTimeout(validation.message || "Point cannot be added here because it would create invalid geometry.");
      return;
    }

    const newVertex = {
      id: createGeofenceVertexId(),
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      latitude: Number(coords.lat.toFixed(6)),
      longitude: Number(coords.lng.toFixed(6)),
    };

    const nextVertices = [...vertices, newVertex];
    if (nextVertices.length >= 3) {
      const polygonValidation = validateGeofencePolygon(nextVertices);
      if (!polygonValidation.valid) {
        setInlineErrorWithTimeout(
          `Point cannot be added here because it would create invalid geometry: ${polygonValidation.message}`
        );
        return;
      }
    }
    pushHistory(nextVertices);
  };

  const handleMapHover = (coords) => {
    if (!isEditing || !coords) {
      setGeofenceEditHover(null);
      return;
    }
    const nearestEdge = findNearestPolygonEdge(vertices, coords);
    const nextHover = nearestEdge?.projectedPoint || null;
    setGeofenceEditHover((previous) =>
      previous?.lat === nextHover?.lat && previous?.lng === nextHover?.lng
        ? previous
        : nextHover
    );
  };

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
          lat: Number(newCoords.lat.toFixed(6)),
          lng: Number(newCoords.lng.toFixed(6)),
          latitude: Number(newCoords.lat.toFixed(6)),
          longitude: Number(newCoords.lng.toFixed(6)),
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
      setInlineErrorWithTimeout(validation.message || "Point cannot be moved because it would create invalid geometry.");
      return { valid: false, reason: validation.reason, message: validation.message };
    }

    const nextVertices = baseVertices.map((v, i) =>
      i === currentIndex
        ? {
            ...v,
            lat: Number(newCoords.lat.toFixed(6)),
            lng: Number(newCoords.lng.toFixed(6)),
            latitude: Number(newCoords.lat.toFixed(6)),
            longitude: Number(newCoords.lng.toFixed(6)),
          }
        : v
    );
    setHistory((historyItems) => [...historyItems.slice(-15), baseVertices]);
    setRedoStack([]);
    setVertices(nextVertices);
    dragStartVerticesRef.current = null;
    return { valid: true };
  };

  const handleDeleteVertex = (vertexIdToDelete) => {
    if (isViewer || !isEditing) return;
    const targetId = vertexIdToDelete || selectedVertexId;
    if (!targetId) return;

    if (vertices.length <= 3 && (isClosed || vertices.length === 3)) {
      setInlineErrorWithTimeout("Geofence requires at least 3 points.");
      return;
    }

    const targetIdx = vertices.findIndex(
      (v, idx) => (v.id || `vertex-${idx + 1}`) === targetId
    );
    if (targetIdx === -1) return;

    const nextVertices = vertices.filter(
      (v, idx) => (v.id || `vertex-${idx + 1}`) !== targetId
    );

    if (nextVertices.length >= 3 && isClosed) {
      const polygonValidation = validateGeofencePolygon(nextVertices);
      if (!polygonValidation.valid) {
        setInlineErrorWithTimeout(
          `Cannot delete vertex: ${polygonValidation.message || "Resulting boundary is invalid."}`
        );
        return;
      }
    }

    pushHistory(nextVertices);
    setSelectedVertexId(null);
    setInlineErrorWithTimeout(null);
  };

  const handleCancelEdit = () => {
    if (editSnapshotVerticesRef.current) {
      setVertices(editSnapshotVerticesRef.current.map((vertex) => ({ ...vertex })));
    } else {
      const raw =
        currentProject?.geofence?.vertices ||
        currentProject?.geofence?.polygon ||
        currentProject?.geofence?.coordinates || [];
      const coords = ensureVertexIds(raw);
      setVertices(coords);
    }
    dragStartVerticesRef.current = null;
    editSnapshotVerticesRef.current = null;
    setHistory([]);
    setRedoStack([]);
    setIsEditing(false);
    setIsDrawing(false);
    setIsClosed(vertices.length >= 3);
    setSelectedVertexId(null);
    setInlineError(null);
    propTriggerToast?.("In-progress changes cancelled.", "info");
  };

  const handleUndo = () => {
    if (history.length === 0 || isViewer) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r.slice(-15), vertices]);
    setHistory((h) => h.slice(0, -1));
    setVertices(prev);
    if (prev.length < 3) {
      setIsClosed(false);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isViewer) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h.slice(-15), vertices]);
    setRedoStack((r) => r.slice(0, -1));
    setVertices(next);
    if (next.length >= 3) {
      setIsClosed(true);
    }
  };

  const handleReloadSaved = () => {
    const raw =
      currentProject?.geofence?.vertices ||
      currentProject?.geofence?.polygon ||
      currentProject?.geofence?.coordinates || [];
    const coords = ensureVertexIds(raw);
    setVertices(coords);
    setIsClosed(coords.length >= 3);
    setIsDrawing(false);
    setIsEditing(false);
    setSelectedVertexId(null);
    setInlineError(null);
    setHistory([]);
    setRedoStack([]);
    propTriggerToast?.("Reloaded saved geofence configuration.", "info");
  };

  const handleClosePolygon = () => {
    if (isViewer) return;
    if (vertices.length < 3) {
      setInlineErrorWithTimeout("At least 3 vertices are required to close a geofence.");
      return;
    }

    const closureValidation = validateGeofenceClosure(vertices);
    if (!closureValidation.valid) {
      setInlineErrorWithTimeout(`Cannot close geofence: ${closureValidation.message}`);
      return;
    }

    const polygonValidation = validateGeofencePolygon(vertices);
    if (!polygonValidation.valid) {
      setInlineErrorWithTimeout(`Cannot close geofence: ${polygonValidation.message}`);
      return;
    }

    setIsClosed(true);
    setIsDrawing(false);
    setIsEditing(false);
    propTriggerToast?.("Geofence polygon closed successfully.", "success");
  };

  const handleStartDraw = () => {
    if (isViewer) return;

    if (hasExistingGeofence || (vertices.length > 0 && isClosed)) {
      setInlineErrorWithTimeout("Clear the current geofence before drawing a new one.");
      return;
    }

    setIsDrawing(true);
    setIsEditing(false);
    setIsClosed(false);
  };

  const handleToggleEdit = () => {
    if (isViewer) return;
    if (isEditing) {
      setIsEditing(false);
      dragStartVerticesRef.current = null;
      editSnapshotVerticesRef.current = null;
      return;
    }
    if (vertices.length < 3) {
      setInlineErrorWithTimeout("Create a geofence with at least 3 vertices first.");
      return;
    }
    editSnapshotVerticesRef.current = vertices.map((vertex) => ({ ...vertex }));
    dragStartVerticesRef.current = null;
    setHistory([]);
    setRedoStack([]);
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
    propTriggerToast?.("Geofence cleared.", "info");
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
      vertices: cleanCoords,
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
    setRedoStack([]);
    setSelectedVertexId(null);
    setInlineError(null);
    setIsDrawing(false);
    setIsEditing(false);
    setIsClosed(true);

    const existingWaypoints =
      currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    if (existingWaypoints.length > 0) {
      const missionValidation = validateMissionAgainstGeofence(existingWaypoints, cleanCoords);
      if (!missionValidation.isValid) {
        propTriggerToast?.(
          `Geofence saved. Warning: ${missionValidation.violations.length} waypoint violation(s) detected. Adjust in Waypoint Planning.`,
          "warning"
        );
        return;
      }
    }

    propTriggerToast?.("Geofence configuration saved successfully.", "success");
  };

  // Metrics
  const areaM2 = useMemo(() => calculatePolygonArea(vertices), [vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(vertices), [vertices]);
  const formattedArea = useMemo(() => formatArea(areaM2), [areaM2]);
  const formattedPerimeter = useMemo(() => formatDistance(perimeterM), [perimeterM]);

  // Validation Checks for Section D
  const duplicateCheck = useMemo(() => {
    if (vertices.length < 2) return { passed: true, message: "Zero duplicate vertices" };
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const d = calculateDistance(vertices[i], vertices[j]);
        if (d < 1) {
          return { passed: false, message: `V${i + 1} & V${j + 1} overlap (< 1m)` };
        }
      }
    }
    return { passed: true, message: "Zero duplicate vertices" };
  }, [vertices]);

  const selfIntersectionCheck = useMemo(() => {
    if (vertices.length < 4) return { passed: true, message: "Zero self-intersecting segments" };
    const res = validateGeofencePolygon(vertices);
    if (!res.valid) {
      return { passed: false, message: res.message || "Boundary edges cross each other" };
    }
    return { passed: true, message: "Zero self-intersecting segments" };
  }, [vertices]);

  const overlappingEdgesCheck = useMemo(() => {
    if (vertices.length < 3) return { passed: true, message: "No overlapping segments" };
    return {
      passed: selfIntersectionCheck.passed,
      message: selfIntersectionCheck.passed
        ? "Perimeter segments cleanly separated"
        : "Overlapping segments flagged",
    };
  }, [vertices, selfIntersectionCheck]);

  const geometryAreaCheck = useMemo(() => {
    if (vertices.length < 3) {
      return { passed: false, message: `Requires >= 3 vertices (${vertices.length} placed)` };
    }
    const areaObj = calculatePolygonArea(vertices);
    const sqM = typeof areaObj === "object" ? areaObj.sqMeters : Number(areaObj) || 0;
    if (sqM <= 5) {
      return { passed: false, message: "Degenerate polygon: Area is zero" };
    }
    return { passed: true, message: `Area verified: ${formattedArea}` };
  }, [vertices, formattedArea]);

  const saveReadinessCheck = useMemo(() => {
    if (vertices.length < 3) {
      return { ready: false, message: "Add at least 3 vertices" };
    }
    if (!isClosed && !isEditing) {
      return { ready: false, message: "Perimeter must be closed" };
    }
    if (!duplicateCheck.passed || !selfIntersectionCheck.passed || !geometryAreaCheck.passed) {
      return { ready: false, message: "Resolve geometry warnings" };
    }
    return { ready: true, message: "Ready to save & deploy" };
  }, [vertices, isClosed, isEditing, duplicateCheck, selfIntersectionCheck, geometryAreaCheck]);

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
            <span className="text-[#2563EB] font-bold">Geofencing & Safety</span>
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
      {/* RESPONSIVE TWO-COLUMN LAYOUT: FULL PAGE SCROLLING                         */}
      {/* Left Column: Controls Panel | Right Column: Sticky Bordered Map Card      */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 items-stretch md:items-start w-full">
        {/* ======================================================================= */}
        {/* 1. LEFT COLUMN — GEOFENCE CONFIGURATION PANEL                           */}
        {/* ======================================================================= */}
        <div className="w-full md:w-[350px] lg:w-[390px] xl:w-[420px] shrink-0 bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex flex-col overflow-hidden">
          <div
            id="geofence-controls-scroll-panel"
            tabIndex={0}
            className="flex-1 p-3 sm:p-3.5 space-y-3 focus:outline-none"
          >
            {/* =================================================================== */}
            {/* A. ACTIVE PROJECT & MISSION STRIP                                   */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F284E] flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-[#1B68D2]" />
                  <span>A. Active Project</span>
                </span>

                {/* Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                    isDrawing
                      ? "bg-amber-50 text-amber-900 border-amber-300 animate-pulse"
                      : isEditing
                      ? "bg-blue-50 text-blue-900 border-blue-300 animate-pulse"
                      : vertices.length >= 3 && isClosed
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDrawing
                        ? "bg-amber-500"
                        : isEditing
                        ? "bg-[#1B68D2]"
                        : vertices.length >= 3 && isClosed
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {isDrawing
                    ? "Drawing"
                    : isEditing
                    ? "Editing"
                    : vertices.length >= 3 && isClosed
                    ? "Active Boundary"
                    : "Empty Boundary"}
                </span>
              </div>

              {/* Full-Width Project & Mission Selector */}
              <div className="w-full">
                <select
                  value={currentProjectId || ""}
                  onChange={(e) => {
                    selectProject(e.target.value);
                    setInlineError(null);
                  }}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F284E] focus:border-[#1B68D2] focus:ring-1 focus:ring-[#1B68D2] outline-none cursor-pointer truncate shadow-2xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName || p.name || p.id} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* =================================================================== */}
            {/* B. BOUNDARY METRICS — 4-STAT HORIZONTAL STRIP                       */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F284E] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#1B68D2]" />
                  <span>B. Boundary Metrics</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#0F284E] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                  {isClosed ? "Closed Polygon" : vertices.length > 0 ? `Open (${vertices.length} pts)` : "Empty"}
                </span>
              </div>

              {/* 4-Stat Metric Strip */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-white p-2 rounded-lg border border-[#CBD5E1] shadow-2xs">
                  <span className="text-xs text-[#334155] block font-semibold mb-0.5">Vertices</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F284E]">{vertices.length}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#CBD5E1] shadow-2xs">
                  <span className="text-xs text-[#334155] block font-semibold mb-0.5">Area</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F284E] truncate block">
                    {vertices.length >= 3 ? formattedArea : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#CBD5E1] shadow-2xs">
                  <span className="text-xs text-[#334155] block font-semibold mb-0.5">Perimeter</span>
                  <span className="text-sm sm:text-base font-mono font-extrabold text-[#0F284E] truncate block">
                    {vertices.length >= 2 ? formattedPerimeter : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#CBD5E1] shadow-2xs">
                  <span className="text-xs text-[#334155] block font-semibold mb-0.5">Status</span>
                  <span
                    className={`text-xs font-mono font-bold block truncate ${
                      saveReadinessCheck.ready ? "text-emerald-700 font-extrabold" : "text-amber-700"
                    }`}
                  >
                    {saveReadinessCheck.ready ? "Valid" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* C. GEOFENCE ACTIONS                                                 */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>C. Geofence Actions</span>
                </span>
                {isEditing && (
                  <span className="text-xs font-mono font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Editing Mode
                  </span>
                )}
              </div>

              {/* Row 1: Draw & Edit Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleStartDraw}
                  disabled={isViewer || (hasExistingGeofence && vertices.length > 0 && isClosed)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition cursor-pointer border ${
                    isDrawing
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : isViewer || (hasExistingGeofence && vertices.length > 0 && isClosed)
                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                      : "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#EFF6FF] shadow-2xs"
                  }`}
                  title={
                    hasExistingGeofence && vertices.length > 0 && isClosed
                      ? "Clear current boundary to draw new"
                      : "Click on map to place boundary vertices"
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>{isDrawing ? "Drawing..." : "Draw Geofence"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleEdit}
                  disabled={isViewer || vertices.length < 3}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-[13px] font-bold transition cursor-pointer border ${
                    isEditing
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                      : isViewer || vertices.length < 3
                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                      : "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#EFF6FF] shadow-2xs"
                  }`}
                  title={vertices.length < 3 ? "Create boundary first" : "Drag vertices or click edge to add"}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditing ? "Finish Editing" : "Edit Geofence"}</span>
                </button>
              </div>

              {/* Close Boundary Button (if drawing and >= 3 pts) */}
              {isDrawing && vertices.length >= 3 && !isClosed && (
                <button
                  type="button"
                  onClick={handleClosePolygon}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Close Boundary ({vertices.length} vertices)</span>
                </button>
              )}

              {/* Row 2: Add Vertex & Delete Selected Vertex */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditing) handleToggleEdit();
                    setInlineErrorWithTimeout("Click along any boundary edge on the map to insert a vertex.");
                  }}
                  disabled={isViewer || vertices.length < 3}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition cursor-pointer border ${
                    isViewer || vertices.length < 3
                      ? "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                      : "bg-white text-[#1E293B] border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#2563EB] shadow-2xs"
                  }`}
                  title="Click edge on map to insert vertex"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Add Vertex</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteVertex(selectedVertexId)}
                  disabled={!isEditing || !selectedVertexId || isViewer || vertices.length <= 3}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold transition cursor-pointer border ${
                    isEditing && selectedVertexId && !isViewer && vertices.length > 3
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs"
                      : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title={
                    !selectedVertexId
                      ? "Select vertex on map to delete"
                      : vertices.length <= 3
                      ? "Requires at least 3 vertices"
                      : `Delete vertex ${selectedVertexIndex + 1}`
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{selectedVertexIndex !== -1 ? `Delete V${selectedVertexIndex + 1}` : "Delete Vertex"}</span>
                </button>
              </div>

              {/* Row 3: History & Reset Tools (Undo, Redo, Reload, Clear) */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={isViewer || history.length === 0}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && history.length > 0
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
                  onClick={handleRedo}
                  disabled={isViewer || redoStack.length === 0}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && redoStack.length > 0
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
                  onClick={handleReloadSaved}
                  className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#1E293B] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition cursor-pointer shadow-2xs"
                  title="Reload saved boundary from project"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isViewer || vertices.length === 0}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    !isViewer && vertices.length > 0
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-2xs"
                      : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title="Clear all vertices"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* D. VALIDATION AND SAFETY CHECKS (Compact Checklist)                 */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>D. Validation & Safety Checks</span>
                </span>
              </div>

              {/* Active Inline Error */}
              {inlineError && (
                <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 flex items-start justify-between gap-2 text-xs text-rose-900 animate-in fade-in">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-snug font-semibold">{inlineError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInlineError(null)}
                    className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* High-Contrast 1-line check rows */}
              <div className="space-y-1.5 text-xs sm:text-[13px]">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Duplicate Vertices:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${duplicateCheck.passed ? "text-emerald-700" : "text-rose-600"}`}>
                    {duplicateCheck.passed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{duplicateCheck.passed ? "Zero duplicates" : "Overlap detected"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Self-Intersection:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${selfIntersectionCheck.passed ? "text-emerald-700" : "text-rose-600"}`}>
                    {selfIntersectionCheck.passed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{selfIntersectionCheck.passed ? "Zero crossing edges" : "Intersecting edges"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Perimeter Edges:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${overlappingEdgesCheck.passed ? "text-emerald-700" : "text-rose-600"}`}>
                    {overlappingEdgesCheck.passed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{overlappingEdgesCheck.passed ? "Edges clear" : "Overlaps flagged"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#334155] font-medium">Enclosed Area:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${geometryAreaCheck.passed ? "text-emerald-700" : "text-amber-700"}`}>
                    {geometryAreaCheck.passed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{geometryAreaCheck.passed ? formattedArea : "Incomplete"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#E2E8F0]">
                  <span className="font-bold text-[#0F172A]">Save Readiness:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${saveReadinessCheck.ready ? "text-emerald-700" : "text-amber-800"}`}>
                    {saveReadinessCheck.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{saveReadinessCheck.message}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* E. SAVE, CANCEL AND COMMIT ACTIONS                                  */}
            {/* =================================================================== */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs sm:text-[13px] font-bold font-mono uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>E. Save & Actions</span>
                </span>
                <span className={`text-xs font-mono font-bold ${saveReadinessCheck.ready ? "text-emerald-700" : "text-amber-700"}`}>
                  {saveReadinessCheck.ready ? "Ready to Save" : "Validation Pending"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isViewer || !saveReadinessCheck.ready}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs ${
                    !isViewer && saveReadinessCheck.ready
                      ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                  }`}
                  title={saveReadinessCheck.message}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Geofence</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={!isEditing && !isDrawing && history.length === 0}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer border ${
                    isEditing || isDrawing || history.length > 0
                      ? "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A] shadow-2xs"
                      : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed"
                  }`}
                  title="Discard unsaved changes and restore previous boundary"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>

            {/* Generous bottom padding spacer so Save/Cancel actions are never clipped */}
            <div className="h-4 pb-2" />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. RIGHT COLUMN — GEOFENCE MAP BORDERED CARD                            */}
        {/* ======================================================================= */}
        <div className="flex-1 min-w-0 w-full bg-white border border-[#CBD5E1] rounded-xl shadow-xs flex flex-col min-h-[480px] sm:min-h-[540px] md:min-h-[620px] lg:min-h-[700px] h-[520px] sm:h-[580px] md:h-[660px] lg:h-[calc(100vh-210px)] md:sticky md:top-2 overflow-hidden">
          {/* Compact Card Header Strip */}
          <div className="shrink-0 bg-white border-b border-[#CBD5E1] px-4 py-2 sm:px-5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#1B68D2] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-[#0F284E] truncate tracking-tight">
                Geofence Map · <span className="font-semibold text-[#334155]">{selectedProjectName}</span>
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
                    className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      mapStyle === opt.id
                        ? "bg-[#1B68D2] text-white shadow-2xs"
                        : "text-[#475569] hover:text-[#0F284E] hover:bg-white"
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
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer select-none ${
                  showAirspace
                    ? "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs hover:bg-rose-100"
                    : "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1] hover:bg-white hover:text-[#0F284E]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showAirspace ? "bg-rose-500 animate-pulse" : "bg-slate-400"}`} />
                <span>Airspace (NFZ)</span>
              </button>

              {/* Status / Boundary Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                  vertices.length >= 3 && isClosed
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : vertices.length > 0
                    ? "bg-blue-50 text-blue-900 border-blue-300"
                    : "bg-slate-100 text-slate-800 border-slate-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    vertices.length >= 3 && isClosed
                      ? "bg-emerald-500"
                      : vertices.length > 0
                      ? "bg-[#1B68D2]"
                      : "bg-slate-400"
                  }`}
                />
                <span>
                  {vertices.length >= 3 && isClosed
                    ? "Enclosed Geofence"
                    : vertices.length > 0
                    ? `Open (${vertices.length} vertices)`
                    : "Zero Vertices"}
                </span>
              </span>
            </div>
          </div>

          {/* Map Viewport Area Inside White Card */}
          <div className="flex-1 min-h-0 relative w-full overflow-hidden p-2 sm:p-2.5 bg-white">
            <div
              ref={mapViewportRef}
              className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#06090E] relative shadow-2xs"
            >
              <MapLoad
                mapStyle={mapStyle}
                showAirspace={showAirspace}
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
                waypoints={projectWaypoints}
                showMissionRoute={projectWaypoints.length >= 2}
                pageType="geofence"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGeofencePage;
