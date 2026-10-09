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
  AlertCircle,
  Briefcase,
  User,
  Info,
  Save,
  Search,
  CheckCircle2,
  Mail,
  FileText,
  Clock,
  Compass,
  Check,
  ChevronRight,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";

export const MissionDetailsPage = () => {
  const navigate = useNavigate();
  const { hasPermission, role } = useAuth();
  const canCreateMissions = hasPermission(Permissions.CREATE_MISSIONS);
  const canEditMissions = hasPermission(Permissions.EDIT_MISSIONS);
  const canDeleteMissions = hasPermission(Permissions.DELETE_MISSIONS);
  const isViewer = role === Roles.VIEWER;

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
    if (!formData.name.trim()) errs.name = "Project Name is required.";
    if (!formData.userName.trim()) errs.userName = "Operator Name is required.";
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
    if (isViewer || (!canCreateMissions && !canEditMissions)) return;
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
  };

  // Save details and proceed to Geofence setup
  const handleProceedToGeofence = (e) => {
    e?.preventDefault?.();
    if (!isViewer && (canCreateMissions || canEditMissions) && isValid) {
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
    }

    navigate("/missions/geofence");
  };

  // Save details and proceed to Waypoint Planning (strictly blocked without geofence)
  const handleEnterMission = (e) => {
    e.preventDefault();
    if (!hasConfiguredGeofence) {
      handleProceedToGeofence(e);
      return;
    }

    if (!isViewer && (canCreateMissions || canEditMissions) && isValid) {
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
    }

    navigate("/missions/waypoints");
  };

  // Open an existing project from catalog
  const handleOpenProject = (projId) => {
    try {
      setIsCreatingNew(false);
      selectProject(projId);
    } catch (err) {
      console.error("[MissionDetails] Failed to open project:", err);
    }
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
    <div className="h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-[#F0F4F9] font-sans">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E36]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#D5E1ED] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#DC2626] mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0D233A]">Confirm Project Deletion</h3>
                <p className="text-xs text-[#64748B]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed mb-6">
              Are you sure you want to delete project{" "}
              <strong className="text-[#0D233A] font-semibold">
                “{projects.find((p) => p.id === deleteConfirmId)?.name || deleteConfirmId}”
              </strong>
              ? Its associated waypoints, mission route, and geofence parameters will also be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0D233A] hover:bg-[#F1F5F9] border border-[#D5E1ED] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Container */}
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-6 p-4 sm:p-5 xl:p-6 2xl:p-7">
        {/* ================================================== */}
        {/* PAGE HEADER                                        */}
        {/* ================================================== */}
        <header className="flex flex-col gap-4 pb-4 border-b border-[#D5E1ED] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0D233A] tracking-tight leading-tight flex items-center gap-2.5">
                <Briefcase className="w-6 h-6 text-[#1E64D4]" />
                <span>Mission Details & Project Management</span>
              </h1>
              {/* Mission ID Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] shadow-2xs">
                <Compass className="w-3.5 h-3.5 text-[#1E64D4]" />
                <span>{activeId}</span>
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#4F657F] font-medium">
              Configure project metadata, assign geofence parameters, and access previous mission sites.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/missions")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] shadow-2xs transition cursor-pointer"
            >
              <Target className="w-4 h-4 text-[#2563EB]" />
              <span>Missions List</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/mission-planning")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#1D4ED8]" />
              <span>Mission Planning</span>
            </button>
            <button
              type="button"
              disabled={isViewer || !canCreateMissions}
              onClick={handleStartNewProject}
              title={
                isViewer
                  ? "Viewer mode is read-only"
                  : !canCreateMissions
                  ? "Create permission required"
                  : "Start a new project draft"
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer ${
                isViewer || !canCreateMissions
                  ? "opacity-50 cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8] border border-[#CBD5E1]"
                  : isCreatingNew
                  ? "bg-[#0D233A] text-white border border-[#0D233A] ring-2 ring-[#1E64D4]/30"
                  : "bg-[#1E64D4] hover:bg-[#1553B8] text-white border border-[#1E64D4]"
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ New Project</span>
            </button>
          </div>
        </header>

        {/* ================================================== */}
        {/* MAIN TWO-COLUMN LAYOUT                             */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================================================== */}
          {/* LEFT COLUMN: MISSION SPECIFICATIONS                */}
          {/* ================================================== */}
          <section className="lg:col-span-7 bg-white border border-[#D5E1ED] rounded-2xl p-5 sm:p-6 lg:p-7 shadow-xs flex flex-col">
            {/* Viewer / Auditor Notice */}
            {isViewer && (
              <div className="mb-5 p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs sm:text-sm font-medium flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
                <span>Auditor Mode: Project details and mission parameters are read-only for your role.</span>
              </div>
            )}

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#E2E8F0] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1E64D4]" />
                <h2 className="text-base sm:text-lg font-bold text-[#0D233A] tracking-tight">
                  {isCreatingNew ? "Create New Mission Project" : "Mission Specifications"}
                </h2>
              </div>
              {!isCreatingNew && currentProject && (
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                    Created: {createdDate}
                  </span>
                  <span>•</span>
                  <span>Updated: {modifiedDate}</span>
                </div>
              )}
            </div>

            {/* Workflow Step Indicator */}
            <div className="mb-6 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#475569] overflow-x-auto">
              <div className="flex items-center gap-2 text-[#1E64D4] font-bold shrink-0">
                <span className="w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Project Details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0 mx-2" />
              <div
                className={`flex items-center gap-2 shrink-0 ${
                  hasConfiguredGeofence ? "text-[#16A34A] font-bold" : "text-[#D97706]"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    hasConfiguredGeofence
                      ? "bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D]"
                      : "bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309]"
                  }`}
                >
                  2
                </span>
                <span>Geofence Boundary</span>
                {hasConfiguredGeofence && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0 mx-2" />
              <div className="flex items-center gap-2 text-[#64748B] shrink-0">
                <span className="w-5 h-5 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center text-[11px] text-[#64748B]">
                  3
                </span>
                <span>Waypoint Planning</span>
              </div>
            </div>

            <form onSubmit={handleEnterMission} className="space-y-4">
              {/* Row 1: Project Name & Operator Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                      Project Name
                    </label>
                    <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Survey Site Alpha"
                      className={`w-full h-11 sm:h-12 px-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition ${
                        errors.name
                          ? "border-[#DC2626] ring-1 ring-[#DC2626]/30"
                          : "border-[#CAD8E6] focus:border-[#1E64D4]"
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <span className="text-xs text-[#DC2626] font-medium mt-1.5 block">
                      {errors.name}
                    </span>
                  )}
                </div>

                {/* Operator Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                      User / Operator Name
                    </label>
                    <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      placeholder="e.g. Lead Operator Alpha"
                      className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition ${
                        errors.userName
                          ? "border-[#DC2626] ring-1 ring-[#DC2626]/30"
                          : "border-[#CAD8E6] focus:border-[#1E64D4]"
                      }`}
                    />
                    <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.userName && (
                    <span className="text-xs text-[#DC2626] font-medium mt-1.5 block">
                      {errors.userName}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Location & Use Case */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                      Location
                    </label>
                    <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Hyderabad, Telangana"
                      className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition ${
                        errors.location
                          ? "border-[#DC2626] ring-1 ring-[#DC2626]/30"
                          : "border-[#CAD8E6] focus:border-[#1E64D4]"
                      }`}
                    />
                    <MapPin className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.location && (
                    <span className="text-xs text-[#DC2626] font-medium mt-1.5 block">
                      {errors.location}
                    </span>
                  )}
                </div>

                {/* Use Case */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                      Use Case
                    </label>
                    <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="useCase"
                      value={formData.useCase}
                      onChange={handleChange}
                      placeholder="e.g. Infrastructure Inspection"
                      className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition ${
                        errors.useCase
                          ? "border-[#DC2626] ring-1 ring-[#DC2626]/30"
                          : "border-[#CAD8E6] focus:border-[#1E64D4]"
                      }`}
                    />
                    <Briefcase className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {errors.useCase && (
                    <span className="text-xs text-[#DC2626] font-medium mt-1.5 block">
                      {errors.useCase}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: Contact Information */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                    Contact Information
                  </label>
                  <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                    Optional
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleChange}
                    placeholder="e.g. ops@aeronexus.com or +91-9876543210"
                    className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
                  />
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#18314C]">
                    Project / Mission Description
                  </label>
                  <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                    Optional
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide mission scope, flight objectives, payload sensors, or regulatory safety guidelines..."
                    className="w-full p-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* ================================================== */}
              {/* GEOFENCE STATUS WIDGET                             */}
              {/* ================================================== */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  hasConfiguredGeofence
                    ? "bg-[#F0FDF4] border-[#BBF7D0]"
                    : "bg-[#FFFBEB] border-[#FDE68A]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    {hasConfiguredGeofence ? (
                      <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#16A34A] flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-sm sm:text-base font-bold ${
                            hasConfiguredGeofence ? "text-[#15803D]" : "text-[#B45309]"
                          }`}
                        >
                          {hasConfiguredGeofence ? "Geofence Configured" : "Geofence Required"}
                        </h4>
                        {hasConfiguredGeofence && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                            {(currentProject?.geofence?.coordinates?.length ||
                              currentProject?.geofence?.polygon?.length ||
                              0)}{" "}
                            Vertices Active
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs sm:text-sm mt-0.5 font-medium ${
                          hasConfiguredGeofence ? "text-[#166534]" : "text-[#92400E]"
                        }`}
                      >
                        {hasConfiguredGeofence
                          ? `Geofence is ready for waypoint planning • Area: ${formatArea(
                              currentProject?.geofence?.areaM2 || 0
                            )} • Perimeter: ${currentProject?.geofence?.perimeterM || 0}m`
                          : "A geofence boundary must be configured before waypoint planning."}
                      </p>
                    </div>
                  </div>

                  {/* Geofence Action Button */}
                  <button
                    type="button"
                    onClick={handleProceedToGeofence}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition shrink-0 cursor-pointer ${
                      hasConfiguredGeofence
                        ? "bg-white hover:bg-[#F8FAFC] border border-[#86EFAC] text-[#15803D]"
                        : "bg-[#D97706] hover:bg-[#B45309] text-white border border-[#D97706]"
                    }`}
                  >
                    {hasConfiguredGeofence ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Edit Geofence</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Set Up Geofence</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Validation Warning Notice if incomplete */}
              {!isValid && (
                <div className="flex items-center gap-2 text-xs text-[#B45309] font-medium bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-xl">
                  <Info className="w-4 h-4 shrink-0 text-[#D97706]" />
                  <span>
                    Please complete all required fields: Project Name, Operator Name, Location, and Use Case.
                  </span>
                </div>
              )}

              {/* ================================================== */}
              {/* BOTTOM ACTIONS                                     */}
              {/* ================================================== */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {/* Primary Action: Save Mission Details */}
                <button
                  type="button"
                  onClick={handleSaveProjectOnly}
                  disabled={!isValid || isViewer || (!canCreateMissions && !canEditMissions)}
                  title={
                    isViewer
                      ? "Viewer mode is read-only"
                      : !canCreateMissions && !canEditMissions
                      ? "Permission denied to save missions"
                      : "Save project to Past Projects catalog"
                  }
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 border shadow-xs ${
                    !isViewer && isValid && (canCreateMissions || canEditMissions)
                      ? "bg-white border-[#CAD8E6] text-[#0E2646] hover:bg-[#F8FAFC] hover:border-[#1E64D4] cursor-pointer"
                      : "bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed opacity-60"
                  }`}
                >
                  <Save className="w-4 h-4 text-[#1E64D4]" />
                  <span>{isCreatingNew ? "Save Project Details" : "Save Mission Details"}</span>
                </button>

                {/* Secondary Progression Action */}
                {hasConfiguredGeofence ? (
                  <button
                    type="submit"
                    disabled={!isValid}
                    className={`flex-1 w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                      isValid
                        ? "bg-[#1E64D4] hover:bg-[#1553B8] text-white cursor-pointer"
                        : "bg-[#E2E8F0] text-[#94A3B8] border border-[#CBD5E1] cursor-not-allowed"
                    }`}
                  >
                    <span>Proceed to Waypoint Planning</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToGeofence}
                    disabled={!isValid}
                    className={`flex-1 w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                      isValid
                        ? "bg-[#D97706] hover:bg-[#B45309] text-white cursor-pointer"
                        : "bg-[#E2E8F0] text-[#94A3B8] border border-[#CBD5E1] cursor-not-allowed"
                    }`}
                  >
                    <span>Save & Continue to Geofence</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* ================================================== */}
          {/* RIGHT COLUMN: PAST PROJECTS CATALOG                */}
          {/* ================================================== */}
          <section className="lg:col-span-5 bg-white border border-[#D5E1ED] rounded-2xl p-5 sm:p-6 lg:p-7 shadow-xs flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <Folder className="w-5 h-5 text-[#1E64D4]" />
                <h2 className="text-base sm:text-lg font-bold text-[#0D233A] tracking-tight">
                  Past Projects
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE]">
                  {projects.length}
                </span>
              </div>
            </div>

            {/* Search / Filter Input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search projects by name, location or use case…"
                className="w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Projects Scrollable List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[620px] pr-1">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 px-4 text-[#64748B] text-sm border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  <Folder className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                  <p className="font-semibold text-[#0D233A]">No matching projects found</p>
                  <p className="text-xs text-[#64748B] mt-1">Try refining your search keyword</p>
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
                        year: "numeric",
                      })
                    : "Recent";

                  return (
                    <div
                      key={proj.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                        isCurrent
                          ? "bg-[#EFF6FF]/40 border-2 border-[#1E64D4] shadow-xs"
                          : "bg-white border-[#E2E8F0] hover:border-[#CAD8E6] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {/* Top Row: Title, ID & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-[#0D233A] truncate">
                              {proj.projectName || proj.name}
                            </h3>
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              {proj.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#64748B] font-medium mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                              {proj.location || "Unspecified"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                              {projUpdated}
                            </span>
                          </div>
                        </div>

                        {/* Open / Active / Delete Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenProject(proj.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isCurrent
                                ? "bg-[#1E64D4] text-white shadow-2xs"
                                : "bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E64D4] border border-[#BFDBFE]"
                            }`}
                          >
                            {isCurrent ? "Active" : "Open"}
                          </button>

                          {canDeleteMissions && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(proj.id)}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] transition cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Metadata & Status Badges */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#F1F5F9] flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Use Case Badge */}
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                            {proj.useCase || "Standard Survey"}
                          </span>

                          {/* Waypoints Count */}
                          <span className="flex items-center gap-1 text-xs font-medium text-[#475569]">
                            <Layers className="w-3.5 h-3.5 text-[#1E64D4]" />
                            {waypointsCount} waypoints
                          </span>
                        </div>

                        {/* Geofence Status Badge */}
                        <div>
                          {hasGeofence ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                              <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                              Geofence Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                              <ShieldAlert className="w-3 h-3 text-[#D97706]" />
                              No Geofence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MissionDetailsPage;
