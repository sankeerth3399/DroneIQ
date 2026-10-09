import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMission } from "@/hooks/useMission.js";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useAuth } from "@/hooks/useAuth.js";
import { Permissions } from "@/auth/permissions.js";
import { Roles } from "@/auth/roleConfig.js";
import { formatArea } from "@/utils/geofence.js";
import {
  Target,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  FileText,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  Layers,
  Activity,
  Compass,
  ArrowRight,
  MoreVertical,
  Check,
  Plane,
  X,
  LayoutGrid,
  List,
} from "lucide-react";

/**
 * MissionsPage
 * Dedicated enterprise dashboard for managing, inspecting, and orchestrating all saved drone missions.
 */
const MissionsPage = () => {
  const navigate = useNavigate();
  const { telemetry } = useDroneTelemetry();
  const { hasPermission, role } = useAuth();
  const canCreate = hasPermission(Permissions.CREATE_MISSIONS);
  const canEdit = hasPermission(Permissions.EDIT_MISSIONS);
  const canDelete = hasPermission(Permissions.DELETE_MISSIONS);
  const isViewer = role === Roles.VIEWER;

  const {
    projects,
    currentProjectId,
    selectProject,
    deleteProject,
  } = useMission();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [useCaseFilter, setUseCaseFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Filtered mission items
  const filteredMissions = useMemo(() => {
    return projects.filter((p) => {
      // Search query filter
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.projectName || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q) ||
        (p.userName || "").toLowerCase().includes(q) ||
        (p.useCase || "").toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Status derivation
      const wpCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0;
      const hasGeo = Boolean(
        p.geofence?.polygon?.length >= 3 ||
        p.geofence?.coordinates?.length >= 3 ||
        p.geofence?.vertices?.length >= 3
      );

      let derivedStatus = "draft";
      if (p.status) {
        derivedStatus = p.status.toLowerCase();
      } else if (p.id === currentProjectId && telemetry.isLive) {
        derivedStatus = "active";
      } else if (wpCount > 0 && hasGeo) {
        derivedStatus = "ready";
      } else if (wpCount > 0 || hasGeo) {
        derivedStatus = "planned";
      }

      if (statusFilter !== "all" && derivedStatus !== statusFilter.toLowerCase()) {
        return false;
      }

      if (useCaseFilter !== "all" && (p.useCase || "").toLowerCase() !== useCaseFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [projects, searchTerm, statusFilter, useCaseFilter, currentProjectId, telemetry.isLive]);

  // Summary counts
  const counts = useMemo(() => {
    let ready = 0;
    let draft = 0;
    let planned = 0;
    let active = telemetry.isLive ? 1 : 0;

    projects.forEach((p) => {
      const wpCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0;
      const hasGeo = Boolean(
        p.geofence?.polygon?.length >= 3 ||
        p.geofence?.coordinates?.length >= 3 ||
        p.geofence?.vertices?.length >= 3
      );
      if (wpCount > 0 && hasGeo) ready++;
      else if (wpCount > 0 || hasGeo) planned++;
      else draft++;
    });

    return { total: projects.length, ready, draft, planned, active };
  }, [projects, telemetry.isLive]);

  // Action dispatcher with canonical project selection
  const handleAction = (action, project) => {
    selectProject(project.id);
    setActiveActionMenuId(null);

    switch (action) {
      case "plan":
        navigate("/mission-planning");
        break;
      case "details":
        navigate("/missions/details");
        break;
      case "waypoints":
        navigate("/missions/waypoints");
        break;
      case "geofence":
        navigate("/geofence");
        break;
      case "fly":
        navigate("/fly");
        break;
      case "logs":
        navigate("/logs");
        break;
      case "delete":
        if (canDelete) setDeleteConfirmId(project.id);
        break;
      default:
        break;
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteProject(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth" onClick={() => setActiveActionMenuId(null)}>
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] px-4 lg:px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB]">
                <Target className="w-4 h-4" />
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#0B1F3D] tracking-tight">
                Missions
              </h1>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Overview, orchestrate, and manage all automated drone flight missions and operational assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/mission-planning")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Plan New Mission</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KPI METRIC CARDS                                                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#F1F5F9]">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-medium text-[#64748B] block">Total Missions</span>
              <span className="text-lg font-bold text-[#0F172A] font-mono">{counts.total}</span>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-medium text-[#64748B] block">Active In-Flight</span>
              <span className="text-lg font-bold text-[#0F172A] font-mono">{counts.active}</span>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4]">
              <Plane className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-medium text-[#64748B] block">Ready to Fly</span>
              <span className="text-lg font-bold text-[#16A34A] font-mono">{counts.ready}</span>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#16A34A]/10 flex items-center justify-center text-[#16A34A]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-medium text-[#64748B] block">Drafts / In Planning</span>
              <span className="text-lg font-bold text-[#D97706] font-mono">{counts.draft + counts.planned}</span>
            </div>
            <div className="w-7 h-7 rounded-md bg-[#D97706]/10 flex items-center justify-center text-[#D97706]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SEARCH, FILTER, AND VIEW CONTROLS                                      */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by mission, site, location, operator, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Status Filter Tabs & Use Case */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold">
              {[
                { id: "all", label: "All" },
                { id: "draft", label: "Draft" },
                { id: "planned", label: "Planned" },
                { id: "ready", label: "Ready" },
                { id: "active", label: "Active" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-md transition ${
                    statusFilter === st.id
                      ? "bg-white text-[#2563EB] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <select
              value={useCaseFilter}
              onChange={(e) => setUseCaseFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] outline-none font-medium cursor-pointer"
            >
              <option value="all">All Use Cases</option>
              <option value="Aerial Survey">Aerial Survey</option>
              <option value="Infrastructure Inspection">Infrastructure</option>
              <option value="Security Patrol">Security</option>
              <option value="Agriculture">Agriculture</option>
            </select>

            {/* View Mode Toggle */}
            <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition ${viewMode === "table" ? "bg-white text-[#2563EB] shadow-xs" : "text-[#64748B]"}`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition ${viewMode === "cards" ? "bg-white text-[#2563EB] shadow-xs" : "text-[#64748B]"}`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MISSIONS CONTENT (TABLE OR CARDS)                                     */}
        {/* ========================================================================= */}
        {filteredMissions.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-sm">
            <Target className="w-10 h-10 text-[#94A3B8] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#0F172A]">No missions found</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              No existing missions match the selected search or filters. Create a new mission or clear your search query.
            </p>
            <button
              type="button"
              onClick={() => navigate("/mission-planning")}
              className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition cursor-pointer"
            >
              Create New Mission
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mission ID</th>
                    <th className="py-3 px-4">Site / Mission Name</th>
                    <th className="py-3 px-4">Associated Project</th>
                    <th className="py-3 px-4">Drone Assignment</th>
                    <th className="py-3 px-4">Mission Type</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Route & Geofence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredMissions.map((p) => {
                    const wpCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0;
                    const hasGeo = Boolean(
                      p.geofence?.polygon?.length >= 3 ||
                      p.geofence?.coordinates?.length >= 3 ||
                      p.geofence?.vertices?.length >= 3
                    );
                    const isSelected = p.id === currentProjectId;
                    const isLiveMission = isSelected && telemetry.isLive;

                    const status = isLiveMission
                      ? "Active"
                      : wpCount > 0 && hasGeo
                      ? "Ready"
                      : wpCount > 0 || hasGeo
                      ? "Planned"
                      : "Draft";

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-[#F8FAFC] transition cursor-pointer ${
                          isSelected ? "bg-[#EFF6FF]/60" : ""
                        }`}
                        onClick={() => selectProject(p.id)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">
                          {p.id.replace("AERO-MSN-", "M-2026-")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172A]">{p.projectName || p.name}</div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {p.location || "Hyderabad"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#475569] font-medium">
                          {p.name || "Default Project"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                            DR-001 (Quad-H)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#475569]">
                            {p.useCase || "Aerial Survey"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#475569]">
                          {p.userName || "Operator"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                              {wpCount} WPs
                            </span>
                            {hasGeo ? (
                              <span className="text-[11px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86EFAC] flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" /> Geofenced
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FDE68A] flex items-center gap-0.5">
                                <ShieldAlert className="w-3 h-3" /> No Fence
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {status === "Active" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#CFFAFE] text-[#0891B2] border border-[#67E8F9] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" /> Active
                            </span>
                          ) : status === "Ready" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                              Ready
                            </span>
                          ) : status === "Planned" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                              Planned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleAction("plan", p)}
                                className="px-2.5 py-1 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#BFDBFE] transition cursor-pointer"
                                title="Open in Mission Planning"
                              >
                                Plan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction("fly", p)}
                                className="px-2.5 py-1 text-xs font-bold text-[#16A34A] bg-[#DCFCE7] hover:bg-[#BBF7D0] rounded border border-[#86EFAC] transition cursor-pointer"
                                title="Deploy in Cockpit"
                              >
                                Fly
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id);
                                }}
                                className="p-1 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Dropdown Menu */}
                            {activeActionMenuId === p.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-[#E2E8F0] py-1 z-50 text-left animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => handleAction("plan", p)}
                                  className="w-full px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-2 cursor-pointer"
                                >
                                  <Compass className="w-3.5 h-3.5 text-[#2563EB]" /> Continue Planning
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAction("details", p)}
                                  className="w-full px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#64748B]" /> Mission Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAction("waypoints", p)}
                                  className="w-full px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-2 cursor-pointer"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" /> Waypoint Planning
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAction("geofence", p)}
                                  className="w-full px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-2 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> Geofence Configuration
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAction("logs", p)}
                                  className="w-full px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-2 cursor-pointer"
                                >
                                  <Activity className="w-3.5 h-3.5 text-[#A855F7]" /> Mission Logs
                                </button>
                                {canDelete && (
                                  <>
                                    <div className="border-t border-[#F1F5F9] my-1" />
                                    <button
                                      type="button"
                                      onClick={() => handleAction("delete", p)}
                                      className="w-full px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete Mission
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMissions.map((p) => {
              const wpCount = p.mission?.waypoints?.length || p.mission?.items?.length || 0;
              const hasGeo = Boolean(
                p.geofence?.polygon?.length >= 3 ||
                p.geofence?.coordinates?.length >= 3 ||
                p.geofence?.vertices?.length >= 3
              );
              const isSelected = p.id === currentProjectId;

              return (
                <div
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
                    isSelected ? "border-[#2563EB] ring-1 ring-[#2563EB]" : "border-[#E2E8F0]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {p.id.replace("AERO-MSN-", "M-2026-")}
                      </span>
                      <span className="text-[10.5px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded-full">
                        {wpCount > 0 && hasGeo ? "Ready" : "Draft"}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#0F172A]">{p.projectName || p.name}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">
                      {p.description || "Aerial inspection and automated perimeter mapping."}
                    </p>

                    <div className="mt-3 pt-3 border-t border-[#F1F5F9] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Location:</span>
                        <span className="font-semibold text-[#0F172A]">{p.location || "Hyderabad"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Operator:</span>
                        <span className="font-semibold text-[#0F172A]">{p.userName || "Operator"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Waypoints:</span>
                        <span className="font-mono font-bold text-[#2563EB]">{wpCount} WPs</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Geofence:</span>
                        <span className={hasGeo ? "text-[#16A34A] font-bold" : "text-[#D97706] font-medium"}>
                          {hasGeo ? "Configured" : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction("plan", p);
                      }}
                      className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                    >
                      Continue Planning &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction("fly", p);
                      }}
                      className="px-3 py-1 bg-[#2563EB] text-white rounded text-xs font-bold hover:bg-[#1D4ED8]"
                    >
                      Fly
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#DC2626] mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-[#0F172A]">Delete Mission?</h3>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              Are you sure you want to permanently delete this mission and all of its associated waypoints and configurations?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C]"
              >
                Delete Mission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
