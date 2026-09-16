import { useState, useCallback, useMemo } from "react";
import { MissionContext } from "./missionContextCore.js";
import {
  isPointInsideGeofence,
  validateMissionAgainstGeofence,
} from "@/utils/geofence.js";
import {
  getProjects,
  getActiveProjectId,
  setActiveProjectId,
  createProject as serviceCreateProject,
  updateProject as serviceUpdateProject,
  deleteProject as serviceDeleteProject,
  saveProjectGeofence as serviceSaveProjectGeofence,
  clearProjectGeofence as serviceClearProjectGeofence,
  saveProjectMission as serviceSaveProjectMission,
} from "@/services/projectService.js";

export const MissionProvider = ({ children }) => {
  // 1. Authoritative central projects collection initialized from storage
  const [projects, setProjects] = useState(() => getProjects());

  // 2. Active project ID initialized from storage
  const [currentProjectId, setCurrentProjectId] = useState(() => getActiveProjectId());

  // 3. Derived current active project object (always up to date)
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === currentProjectId) || projects[0] || null;
  }, [projects, currentProjectId]);

  /**
   * Create a new project and set it as active
   * @param {Object} projectData - { name, userName, location, useCase, description, contactInfo }
   * @returns {Object} Created project
   */
  const createProject = useCallback((projectData) => {
    const { newProject, updatedProjects } = serviceCreateProject(projectData);
    setProjects(updatedProjects);
    setCurrentProjectId(newProject.id);
    return newProject;
  }, []);

  /**
   * Switch active project
   */
  const selectProject = useCallback((projectId) => {
    if (!projectId) return;
    setActiveProjectId(projectId);
    setCurrentProjectId(projectId);
  }, []);

  /**
   * Update project metadata and persist immediately
   */
  const updateProject = useCallback((projectId, updates) => {
    const { updatedProjects, updatedProject } = serviceUpdateProject(projectId, updates);
    setProjects(updatedProjects);
    return updatedProject;
  }, []);

  /**
   * Delete a project with safe fallback if active project was deleted
   */
  const deleteProject = useCallback((projectId) => {
    const { updatedProjects, nextActiveId } = serviceDeleteProject(projectId);
    setProjects(updatedProjects);
    setCurrentProjectId(nextActiveId);
  }, []);

  /**
   * Save geofence polygon to target or current project
   * Supports both saveGeofence(projectId, geofenceData) and saveGeofence(geofenceData)
   */
  const saveGeofence = useCallback(
    (targetIdOrData, maybeData) => {
      const targetId = typeof targetIdOrData === "string" ? targetIdOrData : currentProjectId;
      const geofenceData = typeof targetIdOrData === "string" ? maybeData : targetIdOrData;

      if (!targetId || !geofenceData) return null;

      const { updatedProject, updatedProjects } = serviceSaveProjectGeofence(targetId, geofenceData);
      setProjects(updatedProjects);
      return updatedProject;
    },
    [currentProjectId]
  );

  /**
   * Clear active geofence from target or current project
   */
  const clearGeofence = useCallback(
    (maybeProjectId) => {
      const targetId = typeof maybeProjectId === "string" ? maybeProjectId : currentProjectId;
      if (!targetId) return null;

      const { updatedProject, updatedProjects } = serviceClearProjectGeofence(targetId);
      setProjects(updatedProjects);
      return updatedProject;
    },
    [currentProjectId]
  );

  /**
   * Save mission items & settings to target or current project
   * Supports both saveMission(projectId, missionData) and saveMission(missionData)
   */
  const saveMission = useCallback(
    (targetIdOrData, maybeData) => {
      const targetId = typeof targetIdOrData === "string" ? targetIdOrData : currentProjectId;
      const missionData = typeof targetIdOrData === "string" ? maybeData : targetIdOrData;

      if (!targetId || !missionData) return null;

      const { updatedProject, updatedProjects } = serviceSaveProjectMission(targetId, missionData);
      setProjects(updatedProjects);
      return updatedProject;
    },
    [currentProjectId]
  );

  /**
   * Check if coordinate placement is valid with respect to current project's geofence
   */
  const validateWaypointPlacement = useCallback(
    (coord) => {
      const activeCoords =
        currentProject?.geofence?.polygon || currentProject?.geofence?.coordinates;
      if (!activeCoords || activeCoords.length < 3) {
        return { valid: true };
      }

      const inside = isPointInsideGeofence(coord, activeCoords);
      if (!inside) {
        return {
          valid: false,
          message: "Waypoint cannot be placed outside the active geofence.",
        };
      }
      return { valid: true };
    },
    [currentProject]
  );

  /**
   * Comprehensive pre-flight mission validation
   */
  const validateMission = useCallback(() => {
    if (!currentProject) {
      return { valid: false, errors: ["No active project selected."] };
    }

    const items =
      currentProject.mission?.waypoints || currentProject.mission?.items || [];
    if (items.length === 0) {
      return { valid: false, errors: ["Mission contains zero waypoints."] };
    }

    const geofenceResult = validateMissionAgainstGeofence(
      items,
      currentProject.geofence
    );

    const errors = [];
    if (!geofenceResult.valid) {
      geofenceResult.violations.forEach((v) => errors.push(v.message));
    }

    return {
      valid: errors.length === 0,
      errors,
      geofenceViolations: geofenceResult.violations,
      invalidWaypointIds: geofenceResult.invalidWaypointIds,
      invalidSegmentIndices: geofenceResult.invalidSegmentIndices,
    };
  }, [currentProject]);

  const hasActiveGeofence = Boolean(
    currentProject?.geofence?.polygon?.length >= 3 ||
      currentProject?.geofence?.coordinates?.length >= 3
  );

  const value = {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    saveGeofence,
    clearGeofence,
    saveMission,
    validateWaypointPlacement,
    validateMission,
    activeGeofence: currentProject?.geofence || null,
    hasActiveGeofence,
  };

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
};

export default MissionProvider;
