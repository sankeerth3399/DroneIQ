import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  normalizeCoord,
} from "../utils/geofence.js";

export const STORAGE_KEY_PROJECTS = "aeronexus_projects";
export const STORAGE_KEY_ACTIVE_PROJECT_ID = "aeronexus_active_project_id";

// Legacy keys checked during initial migration
const LEGACY_KEYS = [
  "aeronexus_projects_data_v1",
  "aeronexus_mission_projects_v1",
];

export const INITIAL_DEMO_PROJECTS = [
  {
    id: "AERO-MSN-0001",
    name: "Survey Site A",
    projectName: "Survey Site A",
    userName: "Sai Sankeer",
    location: "Hyderabad",
    useCase: "Aerial Survey",
    description: "High-resolution topographical perimeter survey and multispectral orthomosaic mapping.",
    missionDescription: "Grid scan at 50m AGL with 75% front-overlap.",
    contactInfo: "saisankeer@aeronexus.com",
    createdAt: "2026-09-12T08:30:00.000Z",
    updatedAt: "2026-09-15T09:45:00.000Z",
    geofence: {
      id: "geo-001",
      name: "Hyderabad Core Sector Geofence",
      type: "polygon",
      enabled: true,
      vertices: [
        { id: "vertex-1", lat: 17.389200, lng: 78.486000, latitude: 17.389200, longitude: 78.486000 },
        { id: "vertex-2", lat: 17.388200, lng: 78.490500, latitude: 17.388200, longitude: 78.490500 },
        { id: "vertex-3", lat: 17.385000, lng: 78.492000, latitude: 17.385000, longitude: 78.492000 },
        { id: "vertex-4", lat: 17.382000, lng: 78.490000, latitude: 17.382000, longitude: 78.490000 },
        { id: "vertex-5", lat: 17.381000, lng: 78.485500, latitude: 17.381000, longitude: 78.485500 },
        { id: "vertex-6", lat: 17.382800, lng: 78.482000, latitude: 17.382800, longitude: 78.482000 },
        { id: "vertex-7", lat: 17.386000, lng: 78.481800, latitude: 17.386000, longitude: 78.481800 },
        { id: "vertex-8", lat: 17.388800, lng: 78.483200, latitude: 17.388800, longitude: 78.483200 },
      ],
      polygon: [
        { id: "vertex-1", lat: 17.389200, lng: 78.486000, latitude: 17.389200, longitude: 78.486000 },
        { id: "vertex-2", lat: 17.388200, lng: 78.490500, latitude: 17.388200, longitude: 78.490500 },
        { id: "vertex-3", lat: 17.385000, lng: 78.492000, latitude: 17.385000, longitude: 78.492000 },
        { id: "vertex-4", lat: 17.382000, lng: 78.490000, latitude: 17.382000, longitude: 78.490000 },
        { id: "vertex-5", lat: 17.381000, lng: 78.485500, latitude: 17.381000, longitude: 78.485500 },
        { id: "vertex-6", lat: 17.382800, lng: 78.482000, latitude: 17.382800, longitude: 78.482000 },
        { id: "vertex-7", lat: 17.386000, lng: 78.481800, latitude: 17.386000, longitude: 78.481800 },
        { id: "vertex-8", lat: 17.388800, lng: 78.483200, latitude: 17.388800, longitude: 78.483200 },
      ],
      coordinates: [
        { id: "vertex-1", lat: 17.389200, lng: 78.486000, latitude: 17.389200, longitude: 78.486000 },
        { id: "vertex-2", lat: 17.388200, lng: 78.490500, latitude: 17.388200, longitude: 78.490500 },
        { id: "vertex-3", lat: 17.385000, lng: 78.492000, latitude: 17.385000, longitude: 78.492000 },
        { id: "vertex-4", lat: 17.382000, lng: 78.490000, latitude: 17.382000, longitude: 78.490000 },
        { id: "vertex-5", lat: 17.381000, lng: 78.485500, latitude: 17.381000, longitude: 78.485500 },
        { id: "vertex-6", lat: 17.382800, lng: 78.482000, latitude: 17.382800, longitude: 78.482000 },
        { id: "vertex-7", lat: 17.386000, lng: 78.481800, latitude: 17.386000, longitude: 78.481800 },
        { id: "vertex-8", lat: 17.388800, lng: 78.483200, latitude: 17.388800, longitude: 78.483200 },
      ],
      areaM2: 685000,
      perimeterM: 3350,
      createdAt: "2026-09-12T08:35:00.000Z",
      updatedAt: "2026-09-15T09:45:00.000Z",
    },
    mission: {
      waypoints: [
        {
          id: "wp-demo-1",
          seq: 1,
          type: "WAYPOINT",
          lat: 17.387600,
          lng: 78.484500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP1",
        },
        {
          id: "wp-demo-2",
          seq: 2,
          type: "WAYPOINT",
          lat: 17.388200,
          lng: 78.486200,
          alt: 50,
          speed: 8.5,
          holdTime: 2,
          heading: "Auto",
          label: "WP2",
        },
        {
          id: "wp-demo-3",
          seq: 3,
          type: "WAYPOINT",
          lat: 17.387200,
          lng: 78.489500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP3",
        },
        {
          id: "wp-demo-4",
          seq: 4,
          type: "WAYPOINT",
          lat: 17.384200,
          lng: 78.490500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP4",
        },
        {
          id: "wp-demo-5",
          seq: 5,
          type: "WAYPOINT",
          lat: 17.382500,
          lng: 78.488500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP5",
        },
        {
          id: "wp-demo-6",
          seq: 6,
          type: "WAYPOINT",
          lat: 17.382000,
          lng: 78.485000,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP6",
        },
        {
          id: "wp-demo-7",
          seq: 7,
          type: "WAYPOINT",
          lat: 17.384000,
          lng: 78.483200,
          alt: 50,
          speed: 8.5,
          holdTime: 2,
          heading: "Auto",
          label: "WP7",
        },
        {
          id: "wp-demo-8",
          seq: 8,
          type: "WAYPOINT",
          lat: 17.386800,
          lng: 78.483200,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP8",
        },
      ],
      items: [
        {
          id: "wp-demo-1",
          seq: 1,
          type: "WAYPOINT",
          lat: 17.387600,
          lng: 78.484500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP1",
        },
        {
          id: "wp-demo-2",
          seq: 2,
          type: "WAYPOINT",
          lat: 17.388200,
          lng: 78.486200,
          alt: 50,
          speed: 8.5,
          holdTime: 2,
          heading: "Auto",
          label: "WP2",
        },
        {
          id: "wp-demo-3",
          seq: 3,
          type: "WAYPOINT",
          lat: 17.387200,
          lng: 78.489500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP3",
        },
        {
          id: "wp-demo-4",
          seq: 4,
          type: "WAYPOINT",
          lat: 17.384200,
          lng: 78.490500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP4",
        },
        {
          id: "wp-demo-5",
          seq: 5,
          type: "WAYPOINT",
          lat: 17.382500,
          lng: 78.488500,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP5",
        },
        {
          id: "wp-demo-6",
          seq: 6,
          type: "WAYPOINT",
          lat: 17.382000,
          lng: 78.485000,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP6",
        },
        {
          id: "wp-demo-7",
          seq: 7,
          type: "WAYPOINT",
          lat: 17.384000,
          lng: 78.483200,
          alt: 50,
          speed: 8.5,
          holdTime: 2,
          heading: "Auto",
          label: "WP7",
        },
        {
          id: "wp-demo-8",
          seq: 8,
          type: "WAYPOINT",
          lat: 17.386800,
          lng: 78.483200,
          alt: 50,
          speed: 8.5,
          holdTime: 0,
          heading: "Auto",
          label: "WP8",
        },
      ],
      settings: {
        defaultAlt: 50,
        defaultSpeed: 8.5,
        defaultHoldTime: 0,
        defaultHeading: "Auto",
        onComplete: "RTL",
      },
      missionName: "Survey Site A Flight Plan",
      updatedAt: "2026-09-15T09:45:00.000Z",
    },
  },
  {
    id: "AERO-MSN-0002",
    name: "Inspection Project B",
    projectName: "Inspection Project B",
    userName: "Ops Lead Alpha",
    location: "Secunderabad",
    useCase: "Infrastructure Inspection",
    description: "Automated structural integrity inspection of communication towers and solar field array.",
    missionDescription: "Radial orbit and vertical elevation scan.",
    contactInfo: "ops@aeronexus.com",
    createdAt: "2026-09-10T11:15:00.000Z",
    updatedAt: "2026-09-13T14:20:00.000Z",
    geofence: null,
    mission: {
      waypoints: [],
      items: [],
      settings: {
        defaultAlt: 40,
        defaultSpeed: 6.0,
        defaultHoldTime: 5,
        defaultHeading: "Auto",
        onComplete: "LAND",
      },
      missionName: "Inspection Plan B",
      updatedAt: "2026-09-13T14:20:00.000Z",
    },
  },
];

/**
 * Normalizes a list of polygon vertices to standard { lat, lng, latitude, longitude }
 */
export function normalizeVertexList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((pt, idx) => {
      const norm = normalizeCoord(pt);
      if (!norm) return null;
      return {
        id: pt.id || `vertex-${idx + 1}`,
        lat: Number(norm.lat.toFixed(6)),
        lng: Number(norm.lng.toFixed(6)),
        latitude: Number(norm.lat.toFixed(6)),
        longitude: Number(norm.lng.toFixed(6)),
      };
    })
    .filter(Boolean);
}

/**
 * Normalizes a geofence object ensuring both polygon and coordinates are populated
 */
export function normalizeGeofence(geofence) {
  if (!geofence) return null;

  const rawList = Array.isArray(geofence.vertices)
    ? geofence.vertices
    : Array.isArray(geofence.polygon)
    ? geofence.polygon
    : Array.isArray(geofence.coordinates)
    ? geofence.coordinates
    : Array.isArray(geofence)
    ? geofence
    : [];

  const cleanCoords = normalizeVertexList(rawList);
  if (cleanCoords.length < 3) {
    return null;
  }

  const areaM2 =
    typeof geofence.areaM2 === "number"
      ? geofence.areaM2
      : calculatePolygonArea(cleanCoords).sqMeters;

  const perimeterM =
    typeof geofence.perimeterM === "number"
      ? geofence.perimeterM
      : calculatePolygonPerimeter(cleanCoords);

  return {
    id: geofence.id || `geo-${Date.now()}`,
    name: geofence.name || "Configured Geofence",
    type: "polygon",
    enabled: true,
    vertices: cleanCoords, // Canonical source of truth (Requirement 3 & 23)
    polygon: cleanCoords,
    coordinates: cleanCoords,
    areaM2,
    perimeterM,
    createdAt: geofence.createdAt || new Date().toISOString(),
    updatedAt: geofence.updatedAt || new Date().toISOString(),
  };
}

/**
 * Normalizes a mission object ensuring both waypoints and items are in sync
 */
export function normalizeMission(mission) {
  if (!mission) {
    return {
      waypoints: [],
      items: [],
      settings: {
        defaultAlt: 50,
        defaultSpeed: 8.5,
        defaultHoldTime: 0,
        defaultHeading: "Auto",
        onComplete: "RTL",
      },
      missionName: "Mission Flight Plan",
      updatedAt: new Date().toISOString(),
    };
  }

  const rawItems = Array.isArray(mission.waypoints)
    ? mission.waypoints
    : Array.isArray(mission.items)
    ? mission.items
    : [];

  const cleanItems = rawItems.map((wp, idx) => ({
    id: wp.id || `wp-${idx + 1}-${Date.now()}`,
    seq: wp.seq || wp.sequence || idx + 1,
    sequence: wp.sequence || wp.seq || idx + 1,
    type: wp.type || "WAYPOINT",
    lat: Number(Number(wp.lat || wp.latitude || 0).toFixed(6)),
    lng: Number(Number(wp.lng || wp.longitude || 0).toFixed(6)),
    alt: typeof wp.alt === "number" ? wp.alt : typeof wp.altitude === "number" ? wp.altitude : 50,
    altitude: typeof wp.altitude === "number" ? wp.altitude : typeof wp.alt === "number" ? wp.alt : 50,
    speed: typeof wp.speed === "number" ? wp.speed : 8.5,
    holdTime: typeof wp.holdTime === "number" ? wp.holdTime : 0,
    heading: wp.heading || "Auto",
    customHeading: wp.customHeading || 0,
  }));

  return {
    waypoints: cleanItems,
    items: cleanItems,
    settings: mission.settings || {
      defaultAlt: 50,
      defaultSpeed: 8.5,
      defaultHoldTime: 0,
      defaultHeading: "Auto",
      onComplete: "RTL",
    },
    missionName: mission.missionName || mission.name || "Mission Flight Plan",
    updatedAt: mission.updatedAt || new Date().toISOString(),
  };
}

/**
 * Normalizes a complete project object according to the authoritative schema
 */
export function normalizeProject(proj) {
  if (!proj) return null;
  const projectName = proj.projectName || proj.name || "Untitled Project";

  return {
    id: proj.id || `AERO-MSN-${Date.now()}`,
    name: projectName,
    projectName: projectName,
    userName: proj.userName || "Operator",
    location: proj.location || "Local Site",
    useCase: proj.useCase || "",
    description: proj.description || "",
    missionDescription: proj.missionDescription || "",
    contactInfo: proj.contactInfo || "",
    createdAt: proj.createdAt || new Date().toISOString(),
    updatedAt: proj.updatedAt || new Date().toISOString(),
    geofence: normalizeGeofence(proj.geofence),
    mission: normalizeMission(proj.mission),
  };
}

/**
 * Generate sequential, unique AERO-MSN-XXXX identifier
 */
export function generateProjectId(existingProjects = []) {
  let highestNum = 2;
  existingProjects.forEach((p) => {
    const match = p.id?.match(/AERO-MSN-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
  });
  const nextNum = highestNum + 1;
  return `AERO-MSN-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Reads all projects from localStorage with automatic schema normalization and migration
 * @returns {Array<Object>} List of projects
 */
export function getProjects() {
  if (typeof window === "undefined") return INITIAL_DEMO_PROJECTS;

  try {
    // 1. Primary key
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Upgrade legacy/demo mission to canonical 8-point reference mission if needed
        const siteA = parsed.find((p) => p.id === "AERO-MSN-0001");
        if (
          siteA &&
          (siteA.mission?.waypoints?.length === 4 ||
            (siteA.mission?.waypoints?.length === 8 &&
              siteA.mission.waypoints[0]?.id?.startsWith("wp-demo") &&
              siteA.mission.waypoints[0]?.lat !== 17.387600))
        ) {
          siteA.geofence = INITIAL_DEMO_PROJECTS[0].geofence;
          siteA.mission.waypoints = INITIAL_DEMO_PROJECTS[0].mission.waypoints;
          siteA.mission.items = INITIAL_DEMO_PROJECTS[0].mission.items;
          localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(parsed));
        }
        return parsed.map(normalizeProject).filter(Boolean);
      }
    }

    // 2. Legacy key migration check
    for (const legKey of LEGACY_KEYS) {
      const legRaw = localStorage.getItem(legKey);
      if (legRaw) {
        const legParsed = JSON.parse(legRaw);
        if (Array.isArray(legParsed) && legParsed.length > 0) {
          const migrated = legParsed.map(normalizeProject).filter(Boolean);
          // Persist immediately under primary key
          saveProjects(migrated);
          return migrated;
        }
      }
    }
  } catch (err) {
    console.error("[projectService] Failed reading projects from storage:", err);
  }

  // Fallback to initial demo projects
  const initial = INITIAL_DEMO_PROJECTS.map(normalizeProject);
  saveProjects(initial);
  return initial;
}

/**
 * Immediately persists the complete projects array to localStorage
 * @param {Array<Object>} projects - Projects list
 * @returns {Array<Object>} Normalized projects
 */
export function saveProjects(projects) {
  if (typeof window === "undefined") return projects;

  const normalized = (Array.isArray(projects) ? projects : [])
    .map(normalizeProject)
    .filter(Boolean);

  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(normalized));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aeronexus_projects_updated", { detail: normalized }));
    }
  } catch (err) {
    console.error("[projectService] Failed saving projects to storage:", err);
  }

  return normalized;
}

/**
 * Reads the active project ID from localStorage
 */
export function getActiveProjectId() {
  if (typeof window === "undefined") return "AERO-MSN-0001";
  try {
    const cached = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
    if (cached) return cached;
  } catch {
    // Ignore
  }
  return "AERO-MSN-0001";
}

/**
 * Persists the active project ID to localStorage
 */
export function setActiveProjectId(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aeronexus_projects_updated"));
    }
  } catch (err) {
    console.error("[projectService] Failed saving active project ID:", err);
  }
}

/**
 * Retrieves a single project by its ID
 */
export function getProjectById(id) {
  const all = getProjects();
  return all.find((p) => p.id === id) || null;
}

/**
 * Creates a new project and saves it immediately to localStorage
 */
export function createProject(projectData = {}) {
  const all = getProjects();
  const newId = generateProjectId(all);
  const now = new Date().toISOString();

  const newProject = normalizeProject({
    id: newId,
    name: projectData.name?.trim() || projectData.projectName?.trim() || "Untitled Project",
    projectName: projectData.projectName?.trim() || projectData.name?.trim() || "Untitled Project",
    userName: projectData.userName?.trim() || "Operator",
    location: projectData.location?.trim() || "Local Site",
    useCase: projectData.useCase?.trim() || "",
    description: projectData.description?.trim() || "",
    missionDescription: projectData.missionDescription?.trim() || "",
    contactInfo: projectData.contactInfo?.trim() || "",
    createdAt: now,
    updatedAt: now,
    geofence: null,
    mission: {
      waypoints: [],
      items: [],
      settings: {
        defaultAlt: 50,
        defaultSpeed: 8.5,
        defaultHoldTime: 0,
        defaultHeading: "Auto",
        onComplete: "RTL",
      },
      missionName: `${projectData.name || "New"} Flight Plan`,
      updatedAt: now,
    },
  });

  const updated = [newProject, ...all];
  saveProjects(updated);
  setActiveProjectId(newId);
  return { newProject, updatedProjects: updated };
}

/**
 * Updates an existing project and persists changes immediately
 */
export function updateProject(projectId, updates = {}) {
  const all = getProjects();
  let updatedProject = null;

  const updatedList = all.map((p) => {
    if (p.id !== projectId) return p;

    const newName =
      updates.name !== undefined
        ? updates.name
        : updates.projectName !== undefined
        ? updates.projectName
        : p.projectName || p.name || "Untitled Project";

    updatedProject = normalizeProject({
      ...p,
      ...updates,
      name: newName,
      projectName: newName,
      updatedAt: new Date().toISOString(),
    });
    return updatedProject;
  });

  saveProjects(updatedList);
  return { updatedProject, updatedProjects: updatedList };
}

/**
 * Deletes a project by ID and persists changes immediately
 */
export function deleteProject(projectId) {
  const all = getProjects();
  let filtered = all.filter((p) => p.id !== projectId);

  let nextActiveId = getActiveProjectId();

  if (filtered.length === 0) {
    const fallback = normalizeProject({
      id: "AERO-MSN-0001",
      name: "Survey Site A",
      userName: "Operator",
      location: "Local Site",
      useCase: "",
    });
    filtered = [fallback];
    nextActiveId = fallback.id;
  } else if (nextActiveId === projectId) {
    nextActiveId = filtered[0].id;
  }

  saveProjects(filtered);
  setActiveProjectId(nextActiveId);
  return { updatedProjects: filtered, nextActiveId };
}

/**
 * Saves or updates a geofence for a specific project
 * @param {string} projectId - Target project ID
 * @param {Object} geofenceData - { coordinates, polygon, areaM2, perimeterM, name }
 */
export function saveProjectGeofence(projectId, geofenceData) {
  if (!projectId || !geofenceData) return null;

  const rawList = Array.isArray(geofenceData.vertices)
    ? geofenceData.vertices
    : Array.isArray(geofenceData.coordinates)
    ? geofenceData.coordinates
    : Array.isArray(geofenceData.polygon)
    ? geofenceData.polygon
    : Array.isArray(geofenceData)
    ? geofenceData
    : [];

  const cleanCoords = normalizeVertexList(rawList);
  if (cleanCoords.length < 3) {
    throw new Error("Geofence polygon must have at least 3 vertices.");
  }

  const areaM2 =
    typeof geofenceData.areaM2 === "number"
      ? geofenceData.areaM2
      : calculatePolygonArea(cleanCoords).sqMeters;

  const perimeterM =
    typeof geofenceData.perimeterM === "number"
      ? geofenceData.perimeterM
      : calculatePolygonPerimeter(cleanCoords);

  const now = new Date().toISOString();
  const formattedGeofence = {
    id: geofenceData.id || `geo-${Date.now()}`,
    name: geofenceData.name || "Flight Geofence Boundary",
    type: "polygon",
    enabled: true,
    vertices: cleanCoords, // Canonical source of truth (Requirement 3 & 23)
    polygon: cleanCoords,
    coordinates: cleanCoords,
    areaM2,
    perimeterM,
    createdAt: geofenceData.createdAt || now,
    updatedAt: now,
  };

  return updateProject(projectId, { geofence: formattedGeofence });
}

/**
 * Clears the geofence from a specific project
 */
export function clearProjectGeofence(projectId) {
  if (!projectId) return null;
  return updateProject(projectId, { geofence: null });
}

/**
 * Saves mission waypoints and settings to a specific project
 */
export function saveProjectMission(projectId, missionData = {}) {
  if (!projectId) return null;

  const rawItems = Array.isArray(missionData.waypoints)
    ? missionData.waypoints
    : Array.isArray(missionData.items)
    ? missionData.items
    : [];

  const now = new Date().toISOString();
  const formattedMission = normalizeMission({
    waypoints: rawItems,
    items: rawItems,
    settings: missionData.settings,
    missionName: missionData.missionName || missionData.name,
    updatedAt: now,
  });

  return updateProject(projectId, { mission: formattedMission });
}

export const projectService = {
  getProjects,
  saveProjects,
  getActiveProjectId,
  setActiveProjectId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  saveProjectGeofence,
  clearProjectGeofence,
  saveProjectMission,
};

export default projectService;
