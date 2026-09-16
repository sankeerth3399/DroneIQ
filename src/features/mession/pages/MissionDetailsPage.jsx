import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMission } from "@/hooks/useMission.js";
import { formatArea } from "@/utils/geofence.js";
import {
  FolderPlus,
  ArrowRight,
  Folder,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  Info,
  Save,
} from "lucide-react";

export const MissionDetailsPage = () => {
  const navigate = useNavigate();
  const {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
  } = useMission();

  // Local form state initialized from current active project
  const [formData, setFormData] = useState(() => {
    const pName = currentProject?.projectName || currentProject?.name || "";
    return {
      name: pName,
      projectName: pName,
      userName: currentProject?.userName || "",
      location: currentProject?.location || "",
      useCase: currentProject?.useCase || "",
      description: currentProject?.description || "",
      missionDescription: currentProject?.missionDescription || "",
      contactInfo: currentProject?.contactInfo || "",
    };
  });

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [saveToast, setSaveToast] = useState(false);
  const [lastLoadedProjectId, setLastLoadedProjectId] = useState(currentProjectId);

  // Synchronize form whenever currentProject changes during render
  if (!isCreatingNew && lastLoadedProjectId !== currentProjectId) {
    setLastLoadedProjectId(currentProjectId);
    if (currentProject) {
      const pName = currentProject.projectName || currentProject.name || "";
      setFormData({
        name: pName,
        projectName: pName,
        userName: currentProject.userName || "",
        location: currentProject.location || "",
        useCase: currentProject.useCase || "",
        description: currentProject.description || "",
        missionDescription: currentProject.missionDescription || "",
        contactInfo: currentProject.contactInfo || "",
      });
    }
  }

  // Validation checks
  const errors = useMemo(() => {
    const errs = {};
    if (!formData.userName.trim()) errs.userName = "User Name is required.";
    if (!formData.name.trim()) errs.name = "Project Name is required.";
    if (!formData.location.trim()) errs.location = "Location is required.";
    if (!formData.useCase.trim()) errs.useCase = "Use Case is required.";
    return errs;
  }, [formData]);

  const isValid = Object.keys(errors).length === 0;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" || name === "projectName") {
      setFormData((prev) => ({ ...prev, name: value, projectName: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Start creating a brand new project
  const handleStartNewProject = () => {
    setIsCreatingNew(true);
    setFormData({
      name: "",
      projectName: "",
      userName: currentProject?.userName || "",
      location: "",
      useCase: "",
      description: "",
      missionDescription: "",
      contactInfo: currentProject?.contactInfo || "",
    });
  };

  const hasConfiguredGeofence = Boolean(
    currentProject?.geofence?.coordinates?.length >= 3 ||
    currentProject?.geofence?.polygon?.length >= 3
  );

  // Save/Create project details and keep on page
  const handleSaveProjectOnly = (e) => {
    e?.preventDefault?.();
    if (!isValid) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      projectName: formData.name.trim(),
    };

    if (isCreatingNew) {
      const created = createProject(payload);
      setIsCreatingNew(false);
      selectProject(created.id);
      setSaveToast("Project created and saved successfully.");
    } else if (currentProject) {
      updateProject(currentProject.id, payload);
      setSaveToast("Project details saved successfully.");
    }

    setTimeout(() => {
      setSaveToast(false);
    }, 3200);
  };

  // Save details and proceed to Geofence setup
  const handleProceedToGeofence = (e) => {
    e?.preventDefault?.();
    if (!isValid) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      projectName: formData.name.trim(),
    };

    if (isCreatingNew) {
      const created = createProject(payload);
      setIsCreatingNew(false);
      selectProject(created.id);
    } else if (currentProject) {
      updateProject(currentProject.id, payload);
    }

    navigate("/missions/geofence");
  };

  // Save details and proceed to Waypoint Planning (strictly blocked without geofence)
  const handleEnterMission = (e) => {
    e.preventDefault();
    if (!isValid) return;

    if (!hasConfiguredGeofence) {
      handleProceedToGeofence(e);
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      projectName: formData.name.trim(),
    };

    if (isCreatingNew) {
      const created = createProject(payload);
      setIsCreatingNew(false);
      selectProject(created.id);
    } else if (currentProject) {
      updateProject(currentProject.id, payload);
    }

    setSaveToast("Project saved. Launching Waypoint Planning...");
    setTimeout(() => {
      navigate("/missions/waypoints");
    }, 280);
  };

  // Open an existing project from catalog
  const handleOpenProject = (projId) => {
    setIsCreatingNew(false);
    selectProject(projId);
  };

  // Filtered past projects list
  const filteredProjects = useMemo(() => {
    if (!searchFilter.trim()) return projects;
    const q = searchFilter.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.useCase?.toLowerCase().includes(q)
    );
  }, [projects, searchFilter]);

  const activeId = isCreatingNew ? "NEW DRAFT" : currentProject?.id || "AERO-MSN-0001";
  const createdDate = currentProject?.createdAt
    ? new Date(currentProject.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Just now";
  const modifiedDate = currentProject?.updatedAt
    ? new Date(currentProject.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Just now";

  return (
    <div className="relative h-full min-h-0 w-full overflow-y-auto bg-[#06090E] p-3 sm:p-5 lg:p-6 select-none font-sans">
      {/* Toast Confirmation */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#07241F] border border-[#10B981] text-[#10B981] text-xs font-mono shadow-2xl animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {typeof saveToast === "string"
              ? saveToast
              : "Project saved. Launching Waypoint Planning..."}
          </span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0C121B] border border-[#223344] p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              Confirm Project Deletion
            </h3>
            <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
              Are you sure you want to delete project{" "}
              <strong className="text-white font-mono">
                {projects.find((p) => p.id === deleteConfirmId)?.name || deleteConfirmId}
              </strong>
              ? Its associated waypoints, mission route, and geofence will also be permanently deleted.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-xs font-mono text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-mono bg-[#EF44441F] border border-[#EF444480] text-[#EF4444] hover:bg-[#EF444433] transition"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#1A2633] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-[#35E0FF]" />
              <span>Mission Details & Project Management</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF]">
              {activeId}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure project metadata, assign geofence parameters, and access previous mission sites.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewProject}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
            isCreatingNew
              ? "bg-[#35E0FF22] text-[#35E0FF] border-[#35E0FF]"
              : "bg-[#0A1019] text-[#E2E8F0] border-[#1E293B] hover:border-[#35E0FF66] hover:bg-[#0E1724]"
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#35E0FF]" />
          <span>+ NEW PROJECT</span>
        </button>
      </div>

      {/* Dual Column Layout: Active Project Form & Past Projects Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================== LEFT COLUMN: ACTIVE PROJECT FORM ==================== */}
        <div className="lg:col-span-7 bg-[#0A0E15CC] border border-[#1A2633] rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between border-b border-[#16222E] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#35E0FF]" />
              <h2 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase font-mono">
                {isCreatingNew ? "CREATE NEW MISSION PROJECT" : "MISSION SPECIFICATIONS"}
              </h2>
            </div>
            {!isCreatingNew && currentProject && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
                <span>Created: {createdDate}</span>
                <span>•</span>
                <span>Updated: {modifiedDate}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleEnterMission} className="space-y-3.5">
            {/* Row 1: Project Name & User Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                  PROJECT NAME <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Survey Site A"
                  className={`w-full px-3 py-2 rounded-lg bg-[#070B10] border text-xs text-white font-mono placeholder-[#475569] focus:outline-none transition ${
                    errors.name ? "border-[#EF4444] ring-1 ring-[#EF444433]" : "border-[#1E293B] focus:border-[#35E0FF]"
                  }`}
                />
                {errors.name && <span className="text-[10px] text-[#EF4444] mt-1 block font-mono">{errors.name}</span>}
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                  USER / OPERATOR NAME <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    placeholder="e.g. Sai Sankeer"
                    className={`w-full px-3 py-2 pl-8 rounded-lg bg-[#070B10] border text-xs text-white font-mono placeholder-[#475569] focus:outline-none transition ${
                      errors.userName ? "border-[#EF4444] ring-1 ring-[#EF444433]" : "border-[#1E293B] focus:border-[#35E0FF]"
                    }`}
                  />
                  <User className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                </div>
                {errors.userName && (
                  <span className="text-[10px] text-[#EF4444] mt-1 block font-mono">{errors.userName}</span>
                )}
              </div>
            </div>

            {/* Row 2: Location & Use Case */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                  LOCATION <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Hyderabad, Telangana"
                    className={`w-full px-3 py-2 pl-8 rounded-lg bg-[#070B10] border text-xs text-white font-mono placeholder-[#475569] focus:outline-none transition ${
                      errors.location ? "border-[#EF4444] ring-1 ring-[#EF444433]" : "border-[#1E293B] focus:border-[#35E0FF]"
                    }`}
                  />
                  <MapPin className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                </div>
                {errors.location && (
                  <span className="text-[10px] text-[#EF4444] mt-1 block font-mono">{errors.location}</span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                  USE CASE <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="useCase"
                    value={formData.useCase}
                    onChange={handleChange}
                    placeholder="e.g. Aerial Survey & Infrastructure Inspection"
                    className={`w-full px-3 py-2 pl-8 rounded-lg bg-[#070B10] border text-xs text-white font-mono placeholder-[#475569] focus:outline-none transition ${
                      errors.useCase ? "border-[#EF4444] ring-1 ring-[#EF444433]" : "border-[#1E293B] focus:border-[#35E0FF]"
                    }`}
                  />
                  <Briefcase className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                </div>
                {errors.useCase && (
                  <span className="text-[10px] text-[#EF4444] mt-1 block font-mono">{errors.useCase}</span>
                )}
              </div>
            </div>

            {/* Row 3: Contact Info */}
            <div>
              <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                CONTACT INFORMATION (OPTIONAL)
              </label>
              <input
                type="text"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleChange}
                placeholder="e.g. operator@aeronexus.com / +91-9876543210"
                className="w-full px-3 py-2 rounded-lg bg-[#070B10] border border-[#1E293B] text-xs text-white font-mono placeholder-[#475569] focus:border-[#35E0FF] focus:outline-none transition"
              />
            </div>

            {/* Row 4: Project Description */}
            <div>
              <label className="block text-[11px] font-mono font-medium text-[#94A3B8] mb-1">
                PROJECT / MISSION DESCRIPTION
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide mission scope, flight objectives, sensor payload details, or regulatory notes..."
                className="w-full px-3 py-2 rounded-lg bg-[#070B10] border border-[#1E293B] text-xs text-white font-sans placeholder-[#475569] focus:border-[#35E0FF] focus:outline-none transition resize-none"
              />
            </div>

            {/* Geofence Status Ribbon */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              hasConfiguredGeofence
                ? "bg-[#06241944] border-[#2FE08955]"
                : "bg-[#271E0644] border-[#F59E0B55]"
            }`}>
              <div className="flex items-center gap-2.5">
                {hasConfiguredGeofence ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-[#2FE089] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#2FE089]">
                          GEOFENCE: CONFIGURED
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2FE0891A] text-[#2FE089] border border-[#2FE08933]">
                          {(currentProject.geofence?.coordinates?.length || currentProject.geofence?.polygon?.length || 0)} VERTICES
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] block font-mono mt-0.5">
                        Area: {formatArea(currentProject.geofence.areaM2 || 0)} • Perimeter: {currentProject.geofence.perimeterM || 0}m
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0" />
                    <div>
                      <span className="text-xs font-mono font-bold text-[#F59E0B] block">
                        GEOFENCE: REQUIRED (NOT CONFIGURED)
                      </span>
                      <span className="text-[10px] text-[#FCA5A5] block font-mono mt-0.5">
                        A geofence boundary is mandatory before planning waypoints.
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleProceedToGeofence}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
                  hasConfiguredGeofence
                    ? "bg-[#0E1724] hover:bg-[#1A2636] border border-[#1E293B] text-[#35E0FF]"
                    : "bg-[#F59E0B] hover:bg-[#D97706] text-[#030712] shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                }`}
              >
                {hasConfiguredGeofence ? "Edit Geofence" : "Setup Geofence"}
              </button>
            </div>

            {/* Validation Notice & Submit Button */}
            <div className="pt-2">
              {!isValid && (
                <div className="flex items-center gap-1.5 mb-3 text-[11px] text-[#F59E0B] font-mono bg-[#F59E0B11] border border-[#F59E0B33] p-2 rounded">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Please fill all required fields (User Name, Project Name, Location, Use Case).</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveProjectOnly}
                  disabled={!isValid}
                  className={`w-full sm:w-auto px-4 py-3 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 border ${
                    isValid
                      ? "bg-[#0A1624] border-[#35E0FF66] text-[#35E0FF] hover:bg-[#35E0FF1A] hover:border-[#35E0FF] cursor-pointer shadow-md"
                      : "bg-[#162330] text-[#556778] border border-[#1F3040] cursor-not-allowed"
                  }`}
                  title="Save project to Past Projects catalog"
                >
                  <Save className="w-4 h-4" />
                  <span>{isCreatingNew ? "SAVE PROJECT" : "SAVE DETAILS"}</span>
                </button>

                {hasConfiguredGeofence ? (
                  <button
                    type="submit"
                    disabled={!isValid}
                    className={`flex-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-wider uppercase transition shadow-lg ${
                      isValid
                        ? "bg-[#35E0FF] hover:bg-[#20CAE8] text-[#050B14] shadow-[0_0_20px_rgba(53,224,255,0.4)] cursor-pointer"
                        : "bg-[#162330] text-[#556778] border border-[#1F3040] cursor-not-allowed"
                    }`}
                  >
                    <span>PROCEED TO WAYPOINT PLANNING</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToGeofence}
                    disabled={!isValid}
                    className={`flex-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-wider uppercase transition shadow-lg ${
                      isValid
                        ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#030712] hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                        : "bg-[#162330] text-[#556778] border border-[#1F3040] cursor-not-allowed"
                    }`}
                  >
                    <span>CONFIGURE GEOFENCE FIRST (MANDATORY)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* ==================== RIGHT COLUMN: PAST PROJECTS CATALOG ==================== */}
        <div className="lg:col-span-5 bg-[#0A0E15CC] border border-[#1A2633] rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-[#16222E] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#35E0FF]" />
              <h2 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase font-mono">
                PAST PROJECTS ({projects.length})
              </h2>
            </div>
          </div>

          {/* Search Filter */}
          <div className="mb-3">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name, location, or use case..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#070B10] border border-[#1E293B] text-xs text-white font-mono placeholder-[#475569] focus:border-[#35E0FF] focus:outline-none transition"
            />
          </div>

          {/* Projects Scrollable List */}
          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[540px] pr-1">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-[#64748B] text-xs font-mono border border-dashed border-[#1E293B] rounded-lg">
                No matching projects found.
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isCurrent = proj.id === currentProjectId && !isCreatingNew;
                const waypointsCount = proj.mission?.items?.length || 0;
                const hasGeofence = Boolean(
                  proj.geofence?.coordinates?.length >= 3 ||
                  proj.geofence?.polygon?.length >= 3
                );
                const projUpdated = proj.updatedAt
                  ? new Date(proj.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "N/A";

                return (
                  <div
                    key={proj.id}
                    className={`p-3 rounded-xl border transition flex flex-col gap-2 ${
                      isCurrent
                        ? "bg-[#0E1A26] border-[#35E0FF80] shadow-[0_0_15px_rgba(53,224,255,0.12)] ring-1 ring-[#35E0FF33]"
                        : "bg-[#080D14] border-[#182330] hover:border-[#223344] hover:bg-[#0B111A]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-semibold text-white font-mono truncate">{proj.projectName || proj.name}</h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#16222E] text-[#8E9EAA]">
                            {proj.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#64748B] font-mono mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {proj.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {projUpdated}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProject(proj.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition ${
                            isCurrent
                              ? "bg-[#35E0FF] text-[#050B14]"
                              : "bg-[#0E1A26] hover:bg-[#35E0FF22] text-[#35E0FF] border border-[#1A3344]"
                          }`}
                        >
                          {isCurrent ? "Active" : "Open"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(proj.id)}
                          className="p-1 rounded text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF44441F] transition"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Chips */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#141E28] text-[9.5px] font-mono text-[#8E9EAA]">
                      <span className="px-1.5 py-0.5 rounded bg-[#101722] border border-[#1A2636]">
                        {proj.useCase}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-[#35E0FF]" />
                        {waypointsCount} waypoints
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          hasGeofence ? "text-[#22D3EE]" : "text-[#64748B]"
                        }`}
                      >
                        {hasGeofence ? "Geofence Active" : "No Geofence"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionDetailsPage;
