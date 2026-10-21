import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useMission } from "@/hooks/useMission.js";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useAuth } from "@/hooks/useAuth.js";
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  formatArea,
  formatDistance,
} from "@/utils/geofence.js";
import sampleImg from "@/assets/images/sampleImg.png";
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg";
import {
  Grid,
  RotateCw,
  Sliders,
  Camera,
  Clock,
  ArrowRight,
  Check,
  Play,
  Pause,
  RotateCcw,
  Save,
  Download,
  Upload,
  Maximize2,
  FileText,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  Edit,
  Activity,
  Plane,
  Share2,
  RefreshCw,
  MapPin,
  Shield,
  Layers,
  Compass,
  Zap,
  Info,
  Maximize,
  Minimize2,
  FolderKanban,
  X,
  Radio,
  SlidersHorizontal,
  Crosshair,
  Volume2,
  Battery,
  Wind,
  Sun,
  Users,
  Settings,
} from "lucide-react";

/**
 * Pre-defined geographic boundary presets for one-click import & testing
 */
const SAMPLE_BOUNDARY_PRESETS = [
  {
    id: "preset-dam",
    name: "North Ridge Dam Crest & Spillway",
    areaKm2: 2.4,
    useCase: "Infrastructure Inspection",
    vertices: [
      { id: "v-1", lat: 17.3892, lng: 78.486, latitude: 17.3892, longitude: 78.486 },
      { id: "v-2", lat: 17.3882, lng: 78.4905, latitude: 17.3882, longitude: 78.4905 },
      { id: "v-3", lat: 17.385, lng: 78.492, latitude: 17.385, longitude: 78.492 },
      { id: "v-4", lat: 17.382, lng: 78.49, latitude: 17.382, longitude: 78.49 },
      { id: "v-5", lat: 17.381, lng: 78.4855, latitude: 17.381, longitude: 78.4855 },
      { id: "v-6", lat: 17.3828, lng: 78.482, latitude: 17.3828, longitude: 78.482 },
      { id: "v-7", lat: 17.386, lng: 78.4818, latitude: 17.386, longitude: 78.4818 },
      { id: "v-8", lat: 17.3888, lng: 78.4832, latitude: 17.3888, longitude: 78.4832 },
    ],
  },
  {
    id: "preset-solar",
    name: "Industrial Solar Farm Sector B",
    areaKm2: 1.8,
    useCase: "Solar / Wind Farm",
    vertices: [
      { id: "v-s1", lat: 17.391, lng: 78.484, latitude: 17.391, longitude: 78.484 },
      { id: "v-s2", lat: 17.3915, lng: 78.4895, latitude: 17.3915, longitude: 78.4895 },
      { id: "v-s3", lat: 17.3865, lng: 78.491, latitude: 17.3865, longitude: 78.491 },
      { id: "v-s4", lat: 17.386, lng: 78.4842, latitude: 17.386, longitude: 78.4842 },
    ],
  },
  {
    id: "preset-corridor",
    name: "High-Voltage Powerline Corridor",
    areaKm2: 1.2,
    useCase: "Topographical Survey",
    vertices: [
      { id: "v-c1", lat: 17.394, lng: 78.481, latitude: 17.394, longitude: 78.481 },
      { id: "v-c2", lat: 17.3945, lng: 78.4835, latitude: 17.3945, longitude: 78.4835 },
      { id: "v-c3", lat: 17.379, lng: 78.4955, latitude: 17.379, longitude: 78.4955 },
      { id: "v-c4", lat: 17.3785, lng: 78.493, latitude: 17.3785, longitude: 78.493 },
    ],
  },
];

/**
 * MissionPlanningPage
 * Comprehensive implementation of the AeroNexus DroneIQ Mission Planning workspace,
 * matching reference media_1791527802235.png in layout, cards, typography, controls, and workflows.
 */
const MissionPlanningPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { telemetry } = useDroneTelemetry();
  const {
    projects,
    currentProject,
    currentProjectId,
    selectProject,
    saveMission,
    saveGeofence,
    updateProject,
  } = useMission();

  // Primary navigation tabs
  const [activeTab, setActiveTab] = useState("plan"); // "plan" | "payload" | "safety" | "advanced"
  const [activeSubStep, setActiveSubStep] = useState("area_flight"); // "area_flight" | "swarm" | "scheduling" | "coverage"

  // Selected tool within Area Definition
  const [activeAreaTool, setActiveAreaTool] = useState("draw"); // "draw" | "import" | "select" | "corridor" | "poi"
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSelectAssetModal, setShowSelectAssetModal] = useState(false);
  const [showCoverageDetailModal, setShowCoverageDetailModal] = useState(false);

  // Flight pattern selection
  const [flightPattern, setFlightPattern] = useState("grid"); // "grid" | "orbit" | "corridor" | "custom"
  const [previewCoverage, setPreviewCoverage] = useState(true);
  const [orbitRadius, setOrbitRadius] = useState(60);
  const [corridorWidth, setCorridorWidth] = useState(80);

  // Bottom Mission Preview Mode: "2d" | "3d" | "coverage"
  const [previewMode, setPreviewMode] = useState("3d");

  // Map layer visibility toggles (from the Map Layers HUD box)
  const [mapLayers, setMapLayers] = useState({
    coverageArea: true,
    flightPath: true,
    waypoints: true,
    noFlyZones: true,
    obstacles: false,
    weather: false,
    commsCoverage: false,
    drones: true,
  });

  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem("aeronexus_map_style") || "satellite";
    } catch {
      return "satellite";
    }
  });

  // Simulation preview state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const simTimerRef = useRef(null);

  // Feedback notifications
  const [saveToast, setSaveToast] = useState(null);

  // Mission form configuration state (initialized from active canonical project)
  const [formData, setFormData] = useState({
    siteName: currentProject?.projectName || currentProject?.name || "North Ridge Dam",
    missionType: currentProject?.useCase || "Inspection",
    useCase: "Infrastructure Inspection",
    location: currentProject?.location || "North Ridge Dam, Karnataka",
    droneCount: 3,
    payload: "RGB + LiDAR + Multispectral",
    objective:
      currentProject?.description ||
      "Map the dam face, crest and spillway, and find seepage, cracks and vegetation on the downstream slope.",
    frontOverlap: 75,
    sideOverlap: 65,
    flightAltitude: 120,
    speed: 8.0,
    captureInterval: 2.0,
    actionOnCompletion: "Return to Home",
    // Payload specific configs
    sensorModel: "Sony RX1R II 42MP",
    gimbalPitch: -90,
    triggerMode: "Distance Interval (15m)",
    isoSetting: "Auto (100-400)",
    // Safety specific configs
    rthAltitude: 150,
    geofenceBreachAction: "Hover & Alert",
    lowBatteryRthPercent: 25,
    failsafeTimeoutSec: 10,
    obstacleStandoffM: 5,
    maxWindLimitMs: 12,
    // Swarm specific configs
    swarmFormation: "Sector Partitioning",
    droneSpacingM: 15,
    // Scheduling configs
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: "09:30",
    visualObserver: "Karan Kamal (Lead Pilot)",
  });

  // Keep form in sync when project changes
  useEffect(() => {
    if (currentProject) {
      setFormData((prev) => ({
        ...prev,
        siteName: currentProject.projectName || currentProject.name || "North Ridge Dam",
        location: currentProject.location || "North Ridge Dam, Karnataka",
        objective:
          currentProject.description ||
          "Map the dam face, crest and spillway, and find seepage, cracks and vegetation on the downstream slope.",
      }));
    }
  }, [currentProject]);

  // Derive Mission Code from ID
  const missionCode = useMemo(() => {
    if (!currentProject?.id) return "M-2026-043";
    const id = currentProject.id;
    if (id.startsWith("M-")) return id;
    if (id.startsWith("AERO-MSN-")) return id.replace("AERO-MSN-", "M-2026-");
    return `M-2026-${id.slice(-3).padStart(3, "0")}`;
  }, [currentProject?.id]);

  // Canonical geofence polygon and metrics
  const geofenceCoords = useMemo(() => {
    const g = currentProject?.geofence;
    if (!g) return [];
    if (Array.isArray(g.vertices) && g.vertices.length > 0) return g.vertices;
    if (Array.isArray(g.polygon) && g.polygon.length > 0) return g.polygon;
    if (Array.isArray(g.coordinates) && g.coordinates.length > 0) return g.coordinates;
    if (Array.isArray(g) && g.length > 0) return g;
    return [];
  }, [currentProject?.geofence]);

  // Geometric area & perimeter calculated from real polygon
  const areaMetrics = useMemo(() => {
    if (geofenceCoords.length < 3) {
      return {
        areaKm2: 2.4,
        areaFormatted: "2.4 km²",
        perimeterKm: 6.8,
        perimeterFormatted: "6.8 km",
      };
    }
    const area = calculatePolygonArea(geofenceCoords);
    const perim = calculatePolygonPerimeter(geofenceCoords);
    const sqKm = area.sqKm > 0 ? area.sqKm : area.hectares / 100;
    return {
      areaKm2: Number(sqKm.toFixed(1)) || 2.4,
      areaFormatted: `${Number(sqKm.toFixed(1)) || 2.4} km²`,
      perimeterKm: Number((perim / 1000).toFixed(1)) || 6.8,
      perimeterFormatted: `${Number((perim / 1000).toFixed(1)) || 6.8} km`,
    };
  }, [geofenceCoords]);

  // Active waypoints from canonical project
  const rawWaypoints = useMemo(() => {
    const wps = currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    if (wps.length > 0) return wps;
    // Default reference waypoints if project mission has no waypoints yet
    return [
      { id: "wp-1", seq: 1, lat: 17.3876, lng: 78.4845, alt: 120, action: "Capture" },
      { id: "wp-2", seq: 2, lat: 17.3882, lng: 78.4862, alt: 120, action: "Capture" },
      { id: "wp-3", seq: 3, lat: 17.3872, lng: 78.4895, alt: 120, action: "Capture" },
      { id: "wp-4", seq: 4, lat: 17.3845, lng: 78.4912, alt: 120, action: "Capture" },
      { id: "wp-5", seq: 5, lat: 17.3822, lng: 78.488, alt: 120, action: "Capture" },
      { id: "wp-6", seq: 6, lat: 17.3828, lng: 78.4835, alt: 120, action: "Capture" },
      { id: "wp-7", seq: 7, lat: 17.3855, lng: 78.482, alt: 120, action: "Capture" },
      { id: "wp-8", seq: 8, lat: 17.3876, lng: 78.4845, alt: 120, action: "Capture" },
    ];
  }, [currentProject?.mission?.waypoints, currentProject?.mission?.items]);

  // Local editable waypoint list
  const [localWaypoints, setLocalWaypoints] = useState(rawWaypoints);

  useEffect(() => {
    setLocalWaypoints(rawWaypoints);
  }, [rawWaypoints]);

  // Ground Sampling Distance (GSD) computed from altitude
  const computedGsd = useMemo(() => {
    const gsd = (formData.flightAltitude * 0.021).toFixed(1);
    return `${gsd} cm/px, from altitude`;
  }, [formData.flightAltitude]);

  // Estimated Flight Time in minutes computed from waypoints and speed
  const estimatedFlightTimeMin = useMemo(() => {
    const count = localWaypoints.length;
    if (count === 0) return 0;
    const estDistanceM = count * 350;
    const timeSec = estDistanceM / (formData.speed || 8);
    return Math.max(12, Math.round(timeSec / 60) + 4);
  }, [localWaypoints.length, formData.speed]);

  // Show a momentary feedback banner
  const triggerToast = (msg, type = "success") => {
    setSaveToast({ msg, type });
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Auto-generate coverage pattern waypoints based on flight pattern
  const handleGenerateFlightPattern = useCallback(
    (patternType = flightPattern) => {
      let baseCoords = geofenceCoords;
      if (baseCoords.length < 3) {
        baseCoords = SAMPLE_BOUNDARY_PRESETS[0].vertices;
      }

      const lats = baseCoords.map((c) => c.lat ?? c.latitude);
      const lngs = baseCoords.map((c) => c.lng ?? c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      let generated = [];

      if (patternType === "orbit") {
        // Generate circular orbit around center
        const points = 12;
        const radLat = 0.0018;
        const radLng = 0.0018;
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const lat = centerLat + Math.cos(angle) * radLat;
          const lng = centerLng + Math.sin(angle) * radLng;
          generated.push({
            id: `orbit-wp-${i + 1}`,
            seq: i + 1,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            alt: formData.flightAltitude,
            action: "Orbit 360",
          });
        }
      } else if (patternType === "corridor") {
        // Generate linear corridor back and forth
        const points = 8;
        const spanLat = maxLat - minLat;
        const spanLng = maxLng - minLng;
        for (let i = 0; i < points; i++) {
          const t = i / (points - 1);
          const lat = minLat + spanLat * t;
          const offsetLng = (i % 2 === 0 ? 0.0008 : -0.0008);
          generated.push({
            id: `corridor-wp-${i + 1}`,
            seq: i + 1,
            lat: Number(lat.toFixed(6)),
            lng: Number((centerLng + offsetLng).toFixed(6)),
            alt: formData.flightAltitude,
            action: "Capture",
          });
        }
      } else {
        // Standard Survey Grid scan lines
        const steps = 6;
        let seq = 1;
        for (let i = 0; i < steps; i++) {
          const lat = minLat + ((maxLat - minLat) * (i + 0.5)) / steps;
          const lng1 = minLng + (maxLng - minLng) * 0.15;
          const lng2 = maxLng - (maxLng - minLng) * 0.15;

          if (i % 2 === 0) {
            generated.push({
              id: `grid-wp-${seq}`,
              seq: seq++,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng1.toFixed(6)),
              alt: formData.flightAltitude,
              action: "Capture",
            });
            generated.push({
              id: `grid-wp-${seq}`,
              seq: seq++,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng2.toFixed(6)),
              alt: formData.flightAltitude,
              action: "Capture",
            });
          } else {
            generated.push({
              id: `grid-wp-${seq}`,
              seq: seq++,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng2.toFixed(6)),
              alt: formData.flightAltitude,
              action: "Capture",
            });
            generated.push({
              id: `grid-wp-${seq}`,
              seq: seq++,
              lat: Number(lat.toFixed(6)),
              lng: Number(lng1.toFixed(6)),
              alt: formData.flightAltitude,
              action: "Capture",
            });
          }
        }
      }

      setLocalWaypoints(generated);
      if (currentProjectId) {
        saveMission({
          waypoints: generated,
          items: generated,
          settings: {
            flightAltitude: formData.flightAltitude,
            speed: formData.speed,
            frontOverlap: formData.frontOverlap,
            sideOverlap: formData.sideOverlap,
            captureInterval: formData.captureInterval,
            actionOnCompletion: formData.actionOnCompletion,
            pattern: patternType,
          },
        });
      }
      triggerToast(`Generated ${generated.length} ${patternType.toUpperCase()} waypoints successfully.`);
    },
    [
      flightPattern,
      geofenceCoords,
      formData.flightAltitude,
      formData.speed,
      formData.frontOverlap,
      formData.sideOverlap,
      formData.captureInterval,
      formData.actionOnCompletion,
      currentProjectId,
      saveMission,
    ]
  );

  // Save mission parameters to platform
  const handleSaveMission = () => {
    if (!currentProjectId) {
      triggerToast("Please select a project before saving mission.", "error");
      return;
    }

    saveMission({
      name: formData.siteName,
      waypoints: localWaypoints,
      items: localWaypoints,
      settings: {
        flightAltitude: formData.flightAltitude,
        speed: formData.speed,
        frontOverlap: formData.frontOverlap,
        sideOverlap: formData.sideOverlap,
        captureInterval: formData.captureInterval,
        actionOnCompletion: formData.actionOnCompletion,
        droneCount: formData.droneCount,
        payload: formData.payload,
        sensorModel: formData.sensorModel,
        gimbalPitch: formData.gimbalPitch,
        rthAltitude: formData.rthAltitude,
        geofenceBreachAction: formData.geofenceBreachAction,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
      },
    });

    updateProject(currentProjectId, {
      name: formData.siteName,
      projectName: formData.siteName,
      location: formData.location,
      useCase: formData.useCase,
      description: formData.objective,
    });

    triggerToast("Mission configuration saved to platform.");
  };

  // Run mission simulation timer
  const handleStartSimulation = () => {
    if (isSimulating) {
      // Pause
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    if (simProgress >= 100) {
      setSimProgress(0);
      setSimStepIndex(0);
    }

    simTimerRef.current = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          clearInterval(simTimerRef.current);
          setIsSimulating(false);
          return 100;
        }
        const next = prev + 5;
        const totalWps = Math.max(1, localWaypoints.length);
        setSimStepIndex(Math.min(totalWps - 1, Math.floor((next / 100) * totalWps)));
        return next;
      });
    }, 450);
  };

  const handleResetSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsSimulating(false);
    setSimProgress(0);
    setSimStepIndex(0);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // Update a single waypoint in the table
  const handleUpdateWaypoint = (idx, field, value) => {
    setLocalWaypoints((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Delete a waypoint from table
  const handleDeleteWaypoint = (idx) => {
    setLocalWaypoints((prev) => {
      const updated = prev.filter((_, i) => i !== idx).map((wp, i) => ({ ...wp, seq: i + 1 }));
      return updated;
    });
    triggerToast("Waypoint removed.");
  };

  // Add a new waypoint at end
  const handleAddWaypoint = () => {
    const lastWp = localWaypoints[localWaypoints.length - 1];
    const newSeq = localWaypoints.length + 1;
    const newWp = {
      id: `wp-${Date.now()}`,
      seq: newSeq,
      lat: lastWp ? Number((lastWp.lat + 0.0006).toFixed(6)) : 17.3876,
      lng: lastWp ? Number((lastWp.lng + 0.0006).toFixed(6)) : 78.4845,
      alt: formData.flightAltitude,
      action: "Capture",
    };
    setLocalWaypoints((prev) => [...prev, newWp]);
    triggerToast(`Waypoint #${newSeq} added.`);
  };

  // Select Boundary Preset
  const handleApplyPreset = (preset) => {
    if (!currentProjectId) return;
    saveGeofence({
      id: `geo-${preset.id}`,
      name: preset.name,
      type: "polygon",
      enabled: true,
      vertices: preset.vertices,
      polygon: preset.vertices,
      coordinates: preset.vertices,
    });
    setFormData((prev) => ({
      ...prev,
      siteName: preset.name,
      useCase: preset.useCase,
    }));
    setShowImportModal(false);
    triggerToast(`Imported boundary: ${preset.name}`);
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER SECTION                                                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#0B1F3D] tracking-tight">
                Mission Planning
              </h1>
              {saveToast && (
                <span
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border animate-in fade-in ${
                    saveToast.type === "error"
                      ? "text-[#DC2626] bg-[#FEE2E2] border-[#FCA5A5]"
                      : "text-[#16A34A] bg-[#DCFCE7] border-[#86EFAC]"
                  }`}
                >
                  <Check className="w-3 h-3" /> {saveToast.msg}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Plan a single drone or a swarm mission. Define area, capture plan and automated flight parameters.
            </p>
          </div>

          {/* Right Header Cards */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Project Selector Card */}
            <div className="flex flex-col justify-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 min-w-[190px]">
              <span className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">
                Project
              </span>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <select
                  value={currentProjectId || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#0F172A] outline-none cursor-pointer truncate max-w-[160px]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.id} · {p.useCase || "Survey"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] pointer-events-none shrink-0" />
              </div>
            </div>

            {/* Mission Identifier & Status Card */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3.5 py-1.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#0F172A] font-mono">
                    Mission: {missionCode}
                  </span>
                  <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-1.5 py-0.2 rounded-full uppercase">
                    Draft
                  </span>
                </div>
                <div className="text-[11px] text-[#475569] truncate max-w-[180px]">
                  Site Inspection – {formData.siteName}
                </div>
              </div>
              <div className="border-l border-[#E2E8F0] pl-3 text-right">
                <span className="text-[9.5px] text-[#94A3B8] block">Last saved</span>
                <span className="text-[10.5px] font-semibold text-[#334155]">Today, 08:40 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP WORKFLOW TABS (Plan / Payload / Safety / Advanced) + STEP PILLS       */}
        {/* ========================================================================= */}
        <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Main Tabs Capsule */}
          <div className="inline-flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] self-start">
            {[
              { id: "plan", label: "Plan" },
              { id: "payload", label: "Payload" },
              { id: "safety", label: "Safety" },
              { id: "advanced", label: "Advanced" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-step Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: "area_flight", num: "1", label: "Area & Flight" },
              { id: "swarm", num: "2", label: "Swarm Configuration" },
              { id: "scheduling", num: "3", label: "Scheduling" },
              { id: "coverage", num: "4", label: "Coverage & Capture" },
            ].map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveTab("plan");
                  setActiveSubStep(step.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition shrink-0 cursor-pointer ${
                  activeTab === "plan" && activeSubStep === step.id
                    ? "bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8] font-semibold shadow-xs"
                    : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    activeTab === "plan" && activeSubStep === step.id
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {step.num}
                </span>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DEDICATED TAB VIEWS (Payload, Safety, Advanced) OR MAIN 3-COL PLANNER   */}
      {/* ========================================================================= */}
      {activeTab === "payload" ? (
        /* ----------------------------------------------------------------------- */
        /* PAYLOAD CONFIGURATION VIEW                                              */
        /* ----------------------------------------------------------------------- */
        <div className="p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#2563EB]" /> Camera & Sensor Payload Configuration
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Configure mounted sensor specifications, gimbal orientations, shutter trigger modes and sensor presets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                &larr; Back to Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sensor Selection */}
              <div className="space-y-3 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Primary Sensor Model
                </h3>
                <div className="space-y-2">
                  {[
                    { model: "Sony RX1R II 42MP", type: "RGB High-Res", lens: "35mm Zeiss", fov: "63°" },
                    { model: "PhaseOne iXM 100MP", type: "Medium Format RGB", lens: "80mm Rodenstock", fov: "53°" },
                    { model: "FLIR Vue Pro R 640", type: "Radiometric Thermal", lens: "19mm Uncooled", fov: "32°" },
                    { model: "MicaSense RedEdge-P", type: "Multispectral 5-Band", lens: "Calibrated NIR", fov: "49°" },
                  ].map((s) => (
                    <label
                      key={s.model}
                      className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                        formData.sensorModel === s.model
                          ? "bg-white border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]"
                          : "bg-white/60 border-[#E2E8F0] hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sensor"
                        checked={formData.sensorModel === s.model}
                        onChange={() => {
                          setFormData({ ...formData, sensorModel: s.model, payload: `${s.model} (${s.type})` });
                          triggerToast(`Selected ${s.model}`);
                        }}
                        className="mt-0.5 text-[#2563EB]"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-[#0F172A]">{s.model}</div>
                        <div className="text-[#64748B] text-[11px]">{s.type} · {s.lens}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Gimbal & Shutter Configuration */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Gimbal & Trigger Controls
                </h3>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#475569]">Gimbal Pitch</span>
                    <span className="font-mono font-bold text-[#2563EB]">{formData.gimbalPitch}° (Nadir)</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="0"
                    step="5"
                    value={formData.gimbalPitch}
                    onChange={(e) => setFormData({ ...formData, gimbalPitch: Number(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-0.5">
                    <span>-90° (Full Nadir)</span>
                    <span>-45° (Oblique)</span>
                    <span>0° (Horizontal)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Shutter Trigger Mode
                  </label>
                  <select
                    value={formData.triggerMode}
                    onChange={(e) => setFormData({ ...formData, triggerMode: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="Distance Interval (15m)">Distance Interval (Every 15m)</option>
                    <option value="Time Interval (2.0s)">Time Interval (Every 2.0s)</option>
                    <option value="Waypoint Trigger Only">Waypoint Trigger Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Exposure / ISO Profile
                  </label>
                  <select
                    value={formData.isoSetting}
                    onChange={(e) => setFormData({ ...formData, isoSetting: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="Auto (100-400)">Auto (ISO 100-400, Shutter 1/1000s)</option>
                    <option value="Sunny Outdoor (ISO 100)">Sunny Outdoor (ISO 100, 1/1600s)</option>
                    <option value="Overcast / Cloud (ISO 200)">Overcast (ISO 200, 1/800s)</option>
                    <option value="Low Light / Dawn (ISO 800)">Low Light / Dawn (ISO 800, 1/500s)</option>
                  </select>
                </div>
              </div>

              {/* Sensor Metrics & Preview */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    Estimated Capture Metrics
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Ground Sampling Distance</span>
                      <span className="font-mono font-bold text-[#2563EB]">{computedGsd}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Photo Swath Width</span>
                      <span className="font-mono font-bold text-[#0F172A]">185 m</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Est. Photos per Flight</span>
                      <span className="font-mono font-bold text-[#0F172A]">~410 images</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Storage Required</span>
                      <span className="font-mono font-bold text-[#0F172A]">~14.2 GB RAW</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sensor Validated
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveMission();
                      setActiveTab("plan");
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                  >
                    Apply & Return to Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "safety" ? (
        /* ----------------------------------------------------------------------- */
        /* SAFETY & FAILSAFES VIEW                                                 */
        /* ----------------------------------------------------------------------- */
        <div className="p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#2563EB]" /> Safety Protocols & Autonomous Failsafes
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Set mandatory return-to-home altitudes, geofence boundary penalties, low-battery thresholds and obstacle envelopes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                &larr; Back to Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Return to Home & Altitudes */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-[#2563EB]" /> RTH & Boundary Thresholds
                </h3>
                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Return to Home (RTH) Altitude
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.rthAltitude}
                      onChange={(e) => setFormData({ ...formData, rthAltitude: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-1.5 text-xs font-bold font-mono"
                    />
                    <span className="text-xs font-semibold text-[#64748B]">m AGL</span>
                  </div>
                  <span className="text-[10.5px] text-[#94A3B8] block mt-1">
                    Must clear highest obstacle (dam crest = 320m MSL).
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Geofence Breach Policy
                  </label>
                  <select
                    value={formData.geofenceBreachAction}
                    onChange={(e) => setFormData({ ...formData, geofenceBreachAction: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="Hover & Alert">Hover & Alert Ground Station</option>
                    <option value="Immediate RTH">Immediate Return to Home</option>
                    <option value="Soft Wall (Disallow Exit)">Soft Wall (Bounce back / prevent exit)</option>
                    <option value="Controlled Descent">Controlled Descent to Safe LZ</option>
                  </select>
                </div>
              </div>

              {/* Power & Failsafe Timers */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-[#16A34A]" /> Battery & Link Failsafes
                </h3>
                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Low Battery RTH Trigger
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="15"
                      max="40"
                      value={formData.lowBatteryRthPercent}
                      onChange={(e) => setFormData({ ...formData, lowBatteryRthPercent: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-1.5 text-xs font-bold font-mono"
                    />
                    <span className="text-xs font-semibold text-[#64748B]">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Telemetry Loss Timeout
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="3"
                      max="60"
                      value={formData.failsafeTimeoutSec}
                      onChange={(e) => setFormData({ ...formData, failsafeTimeoutSec: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-1.5 text-xs font-bold font-mono"
                    />
                    <span className="text-xs font-semibold text-[#64748B]">sec</span>
                  </div>
                  <span className="text-[10.5px] text-[#94A3B8] block mt-1">
                    Drone executes RTH after loss of C2 link.
                  </span>
                </div>
              </div>

              {/* Environmental Limits */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col justify-between">
                <div className="space-y-3.5">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-[#0284C7]" /> Environmental Limits
                  </h3>
                  <div>
                    <label className="text-xs font-semibold text-[#475569] block mb-1">
                      Max Permitted Wind Speed
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.maxWindLimitMs}
                        onChange={(e) => setFormData({ ...formData, maxWindLimitMs: Number(e.target.value) })}
                        className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-1.5 text-xs font-bold font-mono"
                      />
                      <span className="text-xs font-semibold text-[#64748B]">m/s</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#475569] block mb-1">
                      Obstacle Standoff Distance
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.obstacleStandoffM}
                        onChange={(e) => setFormData({ ...formData, obstacleStandoffM: Number(e.target.value) })}
                        className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-1.5 text-xs font-bold font-mono"
                      />
                      <span className="text-xs font-semibold text-[#64748B]">meters</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs text-[#16A34A] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Failsafes Active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveMission();
                      setActiveTab("plan");
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                  >
                    Save & Return to Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "advanced" ? (
        /* ----------------------------------------------------------------------- */
        /* ADVANCED PLANNING VIEW                                                  */
        /* ----------------------------------------------------------------------- */
        <div className="p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#2563EB]" /> Advanced Geodetics, RTK & Exports
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Coordinate reference systems, NTRIP base stations, export formats and ground station integration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                &larr; Back to Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Geodetics & RTK */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Positioning & RTK
                </h3>
                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    Datum & Coordinate System
                  </label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded px-2.5 py-1.5 text-xs font-medium">
                    <option>WGS 84 (EPSG:4326) - Standard GPS</option>
                    <option>UTM Zone 43N (WGS 84 / UTM 43N)</option>
                    <option>India Kalianpur 1975</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#475569] block mb-1">
                    NTRIP RTK Base Station
                  </label>
                  <input
                    type="text"
                    defaultValue="ntrip.aeronexus.in:2101/HYD_BASE"
                    className="w-full bg-white border border-[#CBD5E1] rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                  <span className="text-[10px] text-[#16A34A] font-semibold mt-1 block">
                    Fixed RTK Solution: 0.8 cm accuracy
                  </span>
                </div>
              </div>

              {/* Mission Protocol Exports */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Export Flight Plan
                </h3>
                <p className="text-xs text-[#64748B]">
                  Download waypoint plans formatted for external ground control stations or photogrammetry software.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localWaypoints, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `mission_${missionCode}_waypoints.json`);
                      downloadAnchor.click();
                      triggerToast("Downloaded Waypoints JSON.");
                    }}
                    className="flex items-center justify-between p-2 rounded bg-white border border-[#CBD5E1] hover:border-[#2563EB] text-xs font-semibold"
                  >
                    <span>GeoJSON / JSON Waypoints</span>
                    <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csvHeader = "seq,lat,lng,alt,action\n";
                      const csvRows = localWaypoints.map((w) => `${w.seq},${w.lat},${w.lng},${w.alt},${w.action}`).join("\n");
                      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvHeader + csvRows);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `mission_${missionCode}_qgc.csv`);
                      downloadAnchor.click();
                      triggerToast("Downloaded CSV Waypoints.");
                    }}
                    className="flex items-center justify-between p-2 rounded bg-white border border-[#CBD5E1] hover:border-[#2563EB] text-xs font-semibold"
                  >
                    <span>QGroundControl / Pix4D CSV</span>
                    <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                  </button>
                </div>
              </div>

              {/* Telemetry Integration */}
              <div className="space-y-3.5 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    GCS Telemetry Sync
                  </h3>
                  <div className="p-3 bg-white rounded border border-[#E2E8F0] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">C2 Link Protocol</span>
                      <span className="font-bold text-[#0F172A]">MAVLink 2.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Encryption</span>
                      <span className="font-bold text-[#0F172A]">AES-256 GCM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Telemetry Feed</span>
                      <span className="font-bold text-[#16A34A]">Live (WebSocket)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("plan")}
                    className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                  >
                    Return to Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------------- */
        /* DEFAULT THREE-COLUMN MAIN WORKSPACE                                    */
        /* ----------------------------------------------------------------------- */
        <main className="flex-1 p-3 lg:p-4 max-w-[1720px] w-full mx-auto flex flex-col gap-3.5">
          {/* Conditional Sub-Step Banner for Step 2 (Swarm), Step 3 (Scheduling), Step 4 (Coverage) */}
          {activeSubStep !== "area_flight" && (
            <div className="bg-white rounded-xl border border-[#BFDBFE] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 bg-gradient-to-r from-[#EFF6FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {activeSubStep === "swarm" ? "2" : activeSubStep === "scheduling" ? "3" : "4"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    {activeSubStep === "swarm"
                      ? "Swarm Configuration & Fleet Allocation"
                      : activeSubStep === "scheduling"
                      ? "Mission Scheduling & Weather Window Clearance"
                      : "High-Density Coverage & Capture Optimization"}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {activeSubStep === "swarm"
                      ? `Managing multi-drone formation for ${formData.droneCount} drones. Real-time spatial separation active.`
                      : activeSubStep === "scheduling"
                      ? `Target departure: ${formData.departureDate} at ${formData.departureTime}. Weather: GO.`
                      : `Target GSD: ${computedGsd}. Front overlap: ${formData.frontOverlap}%, Side overlap: ${formData.sideOverlap}%.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubStep("area_flight")}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-white"
                >
                  Return to Area & Flight
                </button>
                {activeSubStep === "swarm" ? (
                  <button
                    type="button"
                    onClick={() => setActiveSubStep("scheduling")}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
                  >
                    Next: Scheduling &rarr;
                  </button>
                ) : activeSubStep === "scheduling" ? (
                  <button
                    type="button"
                    onClick={() => setActiveSubStep("coverage")}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
                  >
                    Next: Coverage & Capture &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/geofence")}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
                  >
                    Proceed to Geofence &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3 Columns Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* ------------------------------------------------------------------- */}
            {/* LEFT COLUMN: MISSION CONFIGURATION FORM (lg:col-span-3)            */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col gap-3.5">
              <div className="border-b border-[#F1F5F9] pb-2.5">
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Site Inspection – {formData.siteName}
                </h2>
              </div>

              {/* Form Grid */}
              <div className="space-y-2.5 text-xs">
                {/* Site / Mission Name */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Site Name</label>
                  <input
                    type="text"
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]"
                  />
                </div>

                {/* Mission Type */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Mission Type</label>
                  <select
                    value={formData.missionType}
                    onChange={(e) => setFormData({ ...formData, missionType: e.target.value })}
                    className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]"
                  >
                    <option value="Inspection">Inspection</option>
                    <option value="Mapping">Mapping</option>
                    <option value="Surveillance">Surveillance</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Search & Rescue">Search & Rescue</option>
                  </select>
                </div>

                {/* Use Case */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Use Case</label>
                  <select
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]"
                  >
                    <option value="Infrastructure Inspection">Infrastructure Inspection</option>
                    <option value="Topographical Survey">Topographical Survey</option>
                    <option value="Security Patrol">Security Patrol</option>
                    <option value="Solar / Wind Farm">Solar / Wind Farm</option>
                    <option value="Agriculture Health">Agriculture Health</option>
                  </select>
                </div>

                {/* Location */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                  />
                </div>

                {/* Area (km²) */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Area (km²)</label>
                  <div className="col-span-3 flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-mono font-bold text-[#0F172A]">
                    <span>{areaMetrics.areaKm2}</span>
                    <button
                      type="button"
                      onClick={() => setShowSelectAssetModal(true)}
                      className="text-[#2563EB] hover:underline text-[10px] font-sans font-normal"
                    >
                      select asset
                    </button>
                  </div>
                </div>

                {/* Drones */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Drones</label>
                  <div className="col-span-3 flex items-center justify-between text-xs font-semibold">
                    <select
                      value={formData.droneCount}
                      onChange={(e) => setFormData({ ...formData, droneCount: Number(e.target.value) })}
                      className="bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 text-xs font-bold"
                    >
                      <option value={1}>1 (Single)</option>
                      <option value={2}>2 (Pair)</option>
                      <option value={3}>3 (Swarm)</option>
                      <option value={4}>4 (Fleet)</option>
                      <option value={6}>6 (Cluster)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveSubStep("swarm")}
                      className="text-[#2563EB] hover:underline text-[11px] font-medium"
                    >
                      config swarm
                    </button>
                  </div>
                </div>

                {/* Camera Payload */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Camera Payload</label>
                  <div className="col-span-3 flex items-center justify-between text-xs font-semibold">
                    <span className="truncate pr-1 text-[11px]">{formData.payload}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("payload")}
                      className="text-[#2563EB] hover:underline text-[11px] font-medium shrink-0"
                    >
                      edit
                    </button>
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Estimated Time</label>
                  <div className="col-span-3 text-xs font-mono font-bold text-[#0F172A]">
                    {estimatedFlightTimeMin} min <span className="text-[10px] text-[#64748B] font-normal font-sans">computed</span>
                  </div>
                </div>

                {/* Created By */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Created By</label>
                  <input
                    type="text"
                    value={currentProject?.userName || user?.username || "Sai Sankeer"}
                    readOnly
                    className="col-span-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-0.5 text-xs text-[#0F172A] outline-none"
                  />
                </div>

                {/* Last Saved */}
                <div className="grid grid-cols-5 items-center gap-2">
                  <label className="col-span-2 text-[#64748B] font-medium">Last Saved</label>
                  <div className="col-span-3 text-xs text-[#475569]">Today, 08:40 AM</div>
                </div>
              </div>

              {/* Objective Textarea */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                <label className="block text-[11px] font-bold text-[#334155] uppercase tracking-wider mb-1">
                  Objective
                </label>
                <textarea
                  rows={3}
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Enter high-level mission objective..."
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#334155] leading-relaxed resize-none outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#94A3B8] flex items-center justify-between">
                <span>AeroNexus Ops Engine</span>
                <span>v2.8.4</span>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* CENTER COLUMN: INTERACTIVE PLANNING MAP (lg:col-span-6)             */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-[#CBD5E1] shadow-sm bg-[#0B131F] min-h-[500px] h-[540px] lg:h-[620px]">
              {/* Map Container */}
              <div className="absolute inset-0">
                <MapLoad
                  mapStyle={mapStyle}
                  telemetry={telemetry}
                  pageType="planning"
                  showDrones={mapLayers.drones}
                  waypoints={mapLayers.waypoints ? localWaypoints : []}
                  showMissionRoute={mapLayers.flightPath}
                  geofence={mapLayers.coverageArea ? currentProject?.geofence : null}
                />
              </div>

              {/* Floating Top-Left "Map Layers" HUD Box */}
              <div className="absolute top-3 left-3 z-20 bg-[#0B131FF2] border border-[#1E293B] rounded-lg p-2.5 shadow-xl backdrop-blur-md text-[11px] text-[#E2E8F0] w-[150px]">
                <span className="font-bold text-[10px] text-[#94A3B8] uppercase tracking-wider block mb-1.5 border-b border-[#1E293B] pb-1">
                  Map Layers
                </span>
                <div className="space-y-1">
                  {[
                    { key: "coverageArea", label: "Coverage Area", color: "bg-[#38BDF8]" },
                    { key: "flightPath", label: "Flight Path", color: "bg-[#3B82F6]" },
                    { key: "waypoints", label: "Waypoints", color: "bg-[#38BDF8]" },
                    { key: "obstacles", label: "Obstacles", color: "bg-[#EF4444]" },
                    { key: "weather", label: "Weather", color: "bg-[#A855F7]" },
                    { key: "commsCoverage", label: "Comms Coverage", color: "bg-[#10B981]" },
                    { key: "drones", label: "Drones", color: "bg-[#38BDF8]" },
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={mapLayers[layer.key]}
                        onChange={(e) => setMapLayers({ ...mapLayers, [layer.key]: e.target.checked })}
                        className="rounded border-[#334155] bg-[#1E293B] text-[#2563EB] focus:ring-0 w-3 h-3 cursor-pointer"
                      />
                      <span className={`w-1.5 h-1.5 rounded-full ${layer.color}`} />
                      <span className="truncate">{layer.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scale Bar */}
              <div className="absolute bottom-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <div className="bg-[#0B131FCC] text-white text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1E293B]">
                  <div className="w-12 h-1 border-b-2 border-white mb-0.5" />
                  1.0 km
                </div>
              </div>

              {/* Satellite view toggle */}
              <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = mapStyle === "normal" ? "satellite" : "normal";
                    setMapStyle(next);
                    try {
                      localStorage.setItem("aeronexus_map_style", next);
                    } catch {}
                  }}
                  className="bg-[#0B131FCC] hover:bg-[#0B131F] text-[#38BDF8] text-[9.5px] font-mono font-bold px-2 py-1 rounded border border-[#38BDF8]/40 shadow transition cursor-pointer"
                >
                  {mapStyle === "normal" ? "SATELLITE VIEW" : "NORMAL MAP"}
                </button>
                <div className="bg-[#0B131FCC] text-[#64748B] text-[9px] font-mono px-2 py-1 rounded border border-[#1E293B]">
                  Schematic - Live
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: PLANNING CONTROLS (lg:col-span-3)                    */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              {/* Widget 1: Area Definition */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 space-y-2.5">
                <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">Area Definition</h3>

                {/* 5 Tool Buttons Grid */}
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { id: "draw", label: "Draw Area", icon: Grid },
                    { id: "import", label: "Import", icon: Upload },
                    { id: "select", label: "Select Asset", icon: MapPin },
                    { id: "corridor", label: "Corridor", icon: Activity },
                    { id: "poi", label: "Point of Interest", icon: Compass },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeAreaTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setActiveAreaTool(tool.id);
                          if (tool.id === "draw") {
                            navigate("/geofence");
                          } else if (tool.id === "import") {
                            setShowImportModal(true);
                          } else if (tool.id === "select") {
                            setShowSelectAssetModal(true);
                          } else if (tool.id === "corridor") {
                            setFlightPattern("corridor");
                            handleGenerateFlightPattern("corridor");
                          } else if (tool.id === "poi") {
                            setFlightPattern("orbit");
                            handleGenerateFlightPattern("orbit");
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[9.5px] transition cursor-pointer ${
                          isActive
                            ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm font-semibold"
                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 mb-1" />
                        <span className="leading-tight text-center line-clamp-2">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Area & Perimeter Measurement Row */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F1F5F9] text-xs">
                  <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1">
                    <span className="text-[#64748B]">Area</span>
                    <span className="font-bold text-[#0F172A] font-mono">{areaMetrics.areaFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1">
                    <span className="text-[#64748B]">Perimeter</span>
                    <span className="font-bold text-[#0F172A] font-mono">{areaMetrics.perimeterFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Widget 2: Flight Pattern */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">Flight Pattern</h3>
                  <button
                    type="button"
                    onClick={() => handleGenerateFlightPattern(flightPattern)}
                    className="text-[10px] text-[#2563EB] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Recompute
                  </button>
                </div>

                {/* Pattern Buttons Grid */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "grid", label: "Grid", icon: Grid },
                    { id: "orbit", label: "Orbits", icon: RotateCw },
                    { id: "corridor", label: "Corridor", icon: Activity },
                    { id: "custom", label: "Custom", icon: Sliders },
                  ].map((pat) => {
                    const Icon = pat.icon;
                    const isActive = flightPattern === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          setFlightPattern(pat.id);
                          handleGenerateFlightPattern(pat.id);
                        }}
                        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-[10px] transition cursor-pointer ${
                          isActive
                            ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm font-semibold"
                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 mb-1" />
                        <span>{pat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Pattern Configuration Inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">Overlap (Front)</label>
                    <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-mono font-bold">
                      <input
                        type="number"
                        min="40"
                        max="90"
                        value={formData.frontOverlap}
                        onChange={(e) => setFormData({ ...formData, frontOverlap: Number(e.target.value) })}
                        className="w-10 bg-transparent outline-none"
                      />
                      <span className="text-[#94A3B8] font-normal">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">Overlap (Side)</label>
                    <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-mono font-bold">
                      <input
                        type="number"
                        min="30"
                        max="85"
                        value={formData.sideOverlap}
                        onChange={(e) => setFormData({ ...formData, sideOverlap: Number(e.target.value) })}
                        className="w-10 bg-transparent outline-none"
                      />
                      <span className="text-[#94A3B8] font-normal">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">Flight Altitude</label>
                    <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-mono font-bold">
                      <input
                        type="number"
                        min="20"
                        max="400"
                        value={formData.flightAltitude}
                        onChange={(e) => setFormData({ ...formData, flightAltitude: Number(e.target.value) })}
                        className="w-10 bg-transparent outline-none"
                      />
                      <span className="text-[#94A3B8] font-normal">m</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">GSD Resolution</label>
                    <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 font-mono font-bold text-[10.5px] truncate">
                      {computedGsd.split(",")[0]}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch: Preview Coverage */}
                <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                  <span className="text-xs text-[#475569] font-medium">Preview Coverage</span>
                  <button
                    type="button"
                    onClick={() => setPreviewCoverage((prev) => !prev)}
                    className={`w-9 h-5 rounded-full transition relative p-0.5 cursor-pointer ${
                      previewCoverage ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        previewCoverage ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Widget 3: Mission Settings & Actions */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 space-y-2.5">
                <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">Mission Settings</h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">Speed</label>
                    <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-mono font-bold">
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max="20"
                        value={formData.speed}
                        onChange={(e) => setFormData({ ...formData, speed: Number(e.target.value) })}
                        className="w-10 bg-transparent outline-none"
                      />
                      <span className="text-[#94A3B8] font-normal">m/s</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-[#64748B] block mb-0.5">Capture Interval</label>
                    <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] rounded px-1.5 py-0.5 font-mono font-bold">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="10"
                        value={formData.captureInterval}
                        onChange={(e) => setFormData({ ...formData, captureInterval: Number(e.target.value) })}
                        className="w-10 bg-transparent outline-none"
                      />
                      <span className="text-[#94A3B8] font-normal">sec</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] text-[#64748B] block mb-0.5">Action on Completion</label>
                  <select
                    value={formData.actionOnCompletion}
                    onChange={(e) => setFormData({ ...formData, actionOnCompletion: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs font-semibold text-[#0F172A] outline-none"
                  >
                    <option value="Return to Home">Return to Home</option>
                    <option value="Hover in Place">Hover in Place</option>
                    <option value="Land at Last Point">Land at Last Point</option>
                    <option value="Continue Circuit">Continue Circuit</option>
                  </select>
                </div>

                {/* Action Buttons: Simulate & Save Mission */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#2563EB] text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-xs font-bold transition cursor-pointer"
                  >
                    {isSimulating ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause ({simProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{simProgress > 0 && simProgress < 100 ? `Resume (${simProgress}%)` : "Simulate"}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMission}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Mission</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* 3. BOTTOM PLANNING WIDGETS (3 Cards)                                   */}
          {/* ======================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Mission Preview */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">Mission Preview</h3>
                  {/* Interactive 2D / 3D / Coverage Toggle */}
                  <div className="inline-flex items-center bg-[#F1F5F9] p-0.5 rounded text-[10px]">
                    {["2d", "3d", "coverage"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPreviewMode(m)}
                        className={`px-2 py-0.5 font-semibold rounded uppercase transition cursor-pointer ${
                          previewMode === m
                            ? "bg-[#2563EB] text-white"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {m === "2d" ? "2D Map" : m === "3d" ? "3D View" : "Coverage"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flight Simulation Preview Image Container */}
                <div className="relative h-40 rounded-lg overflow-hidden border border-[#CBD5E1] bg-[#0B131F] group">
                  <img
                    src={sampleImg || droneLandscapeImg}
                    alt="3D Coverage Preview"
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Overlaid simulated grid pattern lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 120">
                    <polygon
                      points="30,80 70,30 160,25 180,75 120,105 50,100"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="3,2"
                    />
                    <line x1="50" y1="75" x2="165" y2="45" stroke="#38BDF8" strokeWidth="1" />
                    <line x1="60" y1="85" x2="155" y2="60" stroke="#38BDF8" strokeWidth="1" />
                    <line x1="75" y1="95" x2="145" y2="75" stroke="#38BDF8" strokeWidth="1" />

                    {/* Animated Simulated Drone dot */}
                    {isSimulating && (
                      <circle
                        cx={30 + (simProgress / 100) * 140}
                        cy={80 - (simProgress / 100) * 20}
                        r="4.5"
                        fill="#F59E0B"
                        stroke="#FFF"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>

                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-[9px] font-mono text-[#38BDF8] px-1.5 py-0.5 rounded border border-[#38BDF8]/40">
                    {previewMode.toUpperCase()} PERSPECTIVE
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                    <button
                      type="button"
                      onClick={handleStartSimulation}
                      className="hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-[#38BDF8]" />
                      <span>{isSimulating ? `Running (${simProgress}%)` : "Open simulation"}</span>
                    </button>
                    <span className="font-mono text-[#CBD5E1]">
                      {Math.floor((simProgress / 100) * estimatedFlightTimeMin)}:00 / {estimatedFlightTimeMin}:00
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-[#64748B] flex items-center justify-between">
                <span>Sensor: {formData.sensorModel.split(" ")[0]}</span>
                <span>Ground Speed: {formData.speed} m/s</span>
              </div>
            </div>

            {/* Card 2: Waypoints Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">
                    Waypoints ({localWaypoints.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddWaypoint}
                      className="text-[11px] font-bold text-[#0F172A] hover:text-[#2563EB] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateFlightPattern(flightPattern)}
                      className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Generate automated survey waypoints within boundary"
                    >
                      <Sparkles className="w-3 h-3" /> Auto Generate
                    </button>
                  </div>
                </div>

                {/* Waypoint Table */}
                <div className="h-40 overflow-y-auto border border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-[#F8FAFC] text-[#64748B] sticky top-0 border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-1 px-1.5 font-semibold">#</th>
                        <th className="py-1 px-1.5 font-semibold">Latitude</th>
                        <th className="py-1 px-1.5 font-semibold">Longitude</th>
                        <th className="py-1 px-1.5 font-semibold">Alt (m)</th>
                        <th className="py-1 px-1.5 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {localWaypoints.map((wp, idx) => (
                        <tr
                          key={wp.id || idx}
                          className={`hover:bg-[#F8FAFC] transition ${
                            isSimulating && simStepIndex === idx ? "bg-[#EFF6FF] font-bold" : ""
                          }`}
                        >
                          <td className="py-1 px-1.5 font-bold text-[#2563EB]">{wp.seq ?? idx + 1}</td>
                          <td className="py-1 px-1.5 text-[#334155]">{Number(wp.lat).toFixed(4)}</td>
                          <td className="py-1 px-1.5 text-[#334155]">{Number(wp.lng).toFixed(4)}</td>
                          <td className="py-1 px-1.5 text-[#334155]">
                            <input
                              type="number"
                              value={wp.alt || formData.flightAltitude}
                              onChange={(e) => handleUpdateWaypoint(idx, "alt", Number(e.target.value))}
                              className="w-12 bg-transparent border-b border-dashed border-[#CBD5E1] text-[10.5px] outline-none"
                            />
                          </td>
                          <td className="py-1 px-1.5 text-right flex items-center justify-end gap-1">
                            <select
                              value={wp.action || "Capture"}
                              onChange={(e) => handleUpdateWaypoint(idx, "action", e.target.value)}
                              className="bg-transparent text-[10px] text-[#2563EB] font-bold outline-none cursor-pointer"
                            >
                              <option value="Capture">Capture</option>
                              <option value="Hold 5s">Hold 5s</option>
                              <option value="Orbit 360">Orbit 360</option>
                              <option value="Land">Land</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleDeleteWaypoint(idx)}
                              className="text-[#94A3B8] hover:text-[#EF4444] p-0.5"
                              title="Delete point"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-2 text-[10.5px] text-[#64748B] flex items-center justify-between">
                <span>Route Distance: ~{(localWaypoints.length * 0.35).toFixed(1)} km</span>
                <button
                  type="button"
                  onClick={() => navigate("/waypoint-planning")}
                  className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
                >
                  Full Waypoint Studio &rarr;
                </button>
              </div>
            </div>

            {/* Card 3: Coverage & Elevation */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">Coverage & Elevation</h3>
                  <button
                    type="button"
                    onClick={() => setShowCoverageDetailModal(true)}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Coverage plan &gt;
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-[#64748B] mb-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#10B981]" /> Terrain elevation (m)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 border-b border-dashed border-[#2563EB]" /> Flight altitude (m)
                  </span>
                </div>

                {/* SVG Elevation Profile Graph */}
                <div className="h-32 border border-[#E2E8F0] rounded-lg p-1.5 bg-[#F8FAFC] relative">
                  <svg className="w-full h-full" viewBox="0 0 280 80">
                    <line x1="25" y1="15" x2="275" y2="15" stroke="#E2E8F0" strokeWidth="0.8" />
                    <line x1="25" y1="35" x2="275" y2="35" stroke="#E2E8F0" strokeWidth="0.8" />
                    <line x1="25" y1="55" x2="275" y2="55" stroke="#E2E8F0" strokeWidth="0.8" />
                    <line x1="25" y1="75" x2="275" y2="75" stroke="#CBD5E1" strokeWidth="1" />

                    <text x="2" y="18" fill="#94A3B8" fontSize="7" fontFamily="monospace">480</text>
                    <text x="2" y="38" fill="#94A3B8" fontSize="7" fontFamily="monospace">397.5</text>
                    <text x="2" y="58" fill="#94A3B8" fontSize="7" fontFamily="monospace">315</text>
                    <text x="2" y="78" fill="#94A3B8" fontSize="7" fontFamily="monospace">232.5</text>

                    {/* Flight altitude curve */}
                    <path
                      d={`M 30,${Math.max(10, 45 - formData.flightAltitude * 0.2)} Q 80,${Math.max(
                        8,
                        40 - formData.flightAltitude * 0.2
                      )} 120,${Math.max(9, 42 - formData.flightAltitude * 0.2)} T 210,${Math.max(
                        10,
                        44 - formData.flightAltitude * 0.2
                      )} T 275,${Math.max(12, 45 - formData.flightAltitude * 0.2)}`}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="1.8"
                      strokeDasharray="3,2"
                    />

                    {/* Terrain elevation filled polygon */}
                    <path
                      d="M 30,62 Q 70,48 110,50 T 170,48 T 230,64 T 275,68 L 275,75 L 30,75 Z"
                      fill="rgba(16, 185, 129, 0.15)"
                    />
                    <path
                      d="M 30,62 Q 70,48 110,50 T 170,48 T 230,64 T 275,68"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-[#F1F5F9] text-center">
                <div>
                  <span className="text-[11px] font-bold text-[#0F172A] block font-mono">320 m</span>
                  <span className="text-[9px] text-[#64748B]">Max terrain</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#0F172A] block font-mono">210 m</span>
                  <span className="text-[9px] text-[#64748B]">Min terrain</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#2563EB] block font-mono">{formData.flightAltitude} m AGL</span>
                  <span className="text-[9px] text-[#64748B]">Flight altitude</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#10B981] block font-mono">
                    {Math.max(20, formData.flightAltitude - 70)} m
                  </span>
                  <span className="text-[9px] text-[#64748B]">Clearance (min)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* 4. BOTTOM PROGRESSION BAR & WORKFLOW ACTIONS                           */}
          {/* ======================================================================= */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#475569]">
              Step{" "}
              {activeSubStep === "area_flight"
                ? "1 of 4"
                : activeSubStep === "swarm"
                ? "2 of 4"
                : activeSubStep === "scheduling"
                ? "3 of 4"
                : "4 of 4"}{" "}
              &middot;{" "}
              <span className="text-[#0F172A] font-bold">
                {activeSubStep === "area_flight"
                  ? "Area & Flight Pattern"
                  : activeSubStep === "swarm"
                  ? "Swarm Configuration"
                  : activeSubStep === "scheduling"
                  ? "Scheduling & Weather"
                  : "Coverage & Capture Plan"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveMission}
                className="px-4 py-1.5 rounded-lg border border-[#BFDBFE] text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save Mission
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeSubStep === "area_flight") setActiveSubStep("swarm");
                  else if (activeSubStep === "swarm") setActiveSubStep("scheduling");
                  else if (activeSubStep === "scheduling") setActiveSubStep("coverage");
                  else navigate("/geofence");
                }}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>
                  {activeSubStep === "area_flight"
                    ? "Next: Swarm Configuration"
                    : activeSubStep === "swarm"
                    ? "Next: Scheduling"
                    : activeSubStep === "scheduling"
                    ? "Next: Coverage & Capture"
                    : "Next: Geofence Studio"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* 5. FOOTER VALUES / ASSURANCE STRIP                                     */}
          {/* ======================================================================= */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9]">
              <div className="flex items-center gap-2.5 px-2">
                <Compass className="w-5 h-5 text-[#2563EB] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#0F172A] block">Plan with Confidence</span>
                  <span className="text-[10px] text-[#64748B]">Accurate, efficient and safe missions.</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
                <Zap className="w-5 h-5 text-[#2563EB] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#0F172A] block">Multi-Drone, Multi-Use</span>
                  <span className="text-[10px] text-[#64748B]">Any industry. Any environment.</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
                <BarChart3 className="w-5 h-5 text-[#2563EB] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#0F172A] block">From Data to Decisions</span>
                  <span className="text-[10px] text-[#64748B]">Turn aerial data into real value.</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
                <Shield className="w-5 h-5 text-[#2563EB] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#0F172A] block">Safer Operations</span>
                  <span className="text-[10px] text-[#64748B]">People. Assets. Communities.</span>
                </div>
              </div>
              <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
                <span className="text-[10px] font-mono tracking-widest font-extrabold text-[#1E293B] uppercase">
                  One Fleet. Any Mission.
                </span>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                  Always Ready.
                </span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 6. MODALS: IMPORT BOUNDARY, SELECT ASSET, COVERAGE PLAN DETAIL           */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-[#CBD5E1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Import Survey Area Boundary</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Select a pre-calibrated geographic perimeter preset or upload a GeoJSON / KML boundary file.
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#334155] uppercase tracking-wider block">
                Available Boundary Presets
              </span>
              {SAMPLE_BOUNDARY_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-[#EFF6FF] transition"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{preset.name}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {preset.useCase} · {preset.areaKm2} km² · {preset.vertices.length} vertices
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSelectAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-[#CBD5E1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Select Project / Site Asset</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectAssetModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition ${
                    p.id === currentProjectId
                      ? "border-[#2563EB] bg-[#EFF6FF]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{p.name || p.id}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {p.location || "Active Site"} · {p.useCase || "Survey"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectProject(p.id);
                      setShowSelectAssetModal(false);
                      triggerToast(`Switched to ${p.name || p.id}`);
                    }}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      p.id === currentProjectId
                        ? "bg-[#16A34A] text-white"
                        : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                    }`}
                  >
                    {p.id === currentProjectId ? "Active" : "Select"}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex justify-end">
              <button
                type="button"
                onClick={() => setShowSelectAssetModal(false)}
                className="px-4 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverageDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 shadow-2xl border border-[#CBD5E1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Detailed Coverage & Photogrammetry Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverageDetailModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Flight Altitude AGL</span>
                  <span className="font-mono font-bold text-sm text-[#0F172A]">{formData.flightAltitude} m</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Ground Sampling Distance</span>
                  <span className="font-mono font-bold text-sm text-[#2563EB]">{computedGsd}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Front Overlap</span>
                  <span className="font-mono font-bold text-sm text-[#0F172A]">{formData.frontOverlap}%</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Side Overlap</span>
                  <span className="font-mono font-bold text-sm text-[#0F172A]">{formData.sideOverlap}%</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Survey Area</span>
                  <span className="font-mono font-bold text-[#0F172A]">{areaMetrics.areaFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Estimated Linear Flight Distance</span>
                  <span className="font-mono font-bold text-[#0F172A]">~{(localWaypoints.length * 0.35).toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Photos to Capture</span>
                  <span className="font-mono font-bold text-[#0F172A]">~410 exposures</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Battery Packs Required</span>
                  <span className="font-mono font-bold text-[#16A34A]">1 set (28 min endurance)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setShowCoverageDetailModal(false);
                  navigate("/analytics");
                }}
                className="text-xs font-bold text-[#2563EB] hover:underline"
              >
                Open Analytics Intelligence &rarr;
              </button>
              <button
                type="button"
                onClick={() => setShowCoverageDetailModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionPlanningPage;
