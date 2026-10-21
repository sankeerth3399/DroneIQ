import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg";
import { useTelemetry } from "@/context/TelemetryContext.jsx";
import {
  Plane,
  Plus,
  RefreshCw,
  Wrench,
  Battery,
  Calendar,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Radio,
  HardDrive,
  MapPin,
  Cpu,
  BarChart3,
  FileText,
  Compass,
  Zap,
  Sliders,
  ExternalLink,
  X,
} from "lucide-react";

/**
 * DroneFleetPage
 * Dedicated enterprise fleet asset management page.
 * Fully synchronized with dynamic registered drones and live telemetry.
 */
const DroneFleetPage = () => {
  const navigate = useNavigate();
  const {
    registeredDrones = [],
    registerDrone,
    deleteDrone,
    fleetTelemetry = {},
    selectedDroneId: activeDroneIdFromContext,
    selectDrone,
  } = useTelemetry();

  // Filter tab: "all" | "in_mission" | "standby" | "charging" | "maintenance"
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDroneId, setSelectedDroneId] = useState(
    () => activeDroneIdFromContext || registeredDrones?.[0]?.id || "DR-001"
  );
  const [activeDetailTab, setActiveDetailTab] = useState("overview");
  const [showAddDroneModal, setShowAddDroneModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // New Drone form state
  const [newDroneForm, setNewDroneForm] = useState({
    id: "",
    name: "",
    model: "DJI Matrice 350 RTK",
    type: "Multirotor",
    location: "Base - HQ",
    role: "Survey",
    mission: "Area Survey",
  });

  const showToast = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Keep selected drone aligned with context or available drones
  useEffect(() => {
    if (activeDroneIdFromContext && registeredDrones.some((d) => d.id === activeDroneIdFromContext)) {
      setSelectedDroneId(activeDroneIdFromContext);
    } else if (!registeredDrones.some((d) => d.id === selectedDroneId) && registeredDrones.length > 0) {
      setSelectedDroneId(registeredDrones[0].id);
    }
  }, [activeDroneIdFromContext, registeredDrones, selectedDroneId]);

  // Dynamic Fleet Data merging registered inventory with live telemetry
  const fleetData = useMemo(() => {
    return registeredDrones.map((d) => {
      const id = d.id || d.droneId;
      const live = fleetTelemetry?.[id] || {};
      const isLive = live && (live.connectionStatus === "connected" || Boolean(live.armed));

      let battery = 100;
      if (typeof live.battery?.level === "number") battery = live.battery.level;
      else if (typeof live.battery === "number") battery = live.battery;
      else if (typeof d.battery === "number") battery = d.battery;

      let status = d.status || "Standby";
      if (live.armed) {
        status = "In Mission";
      } else if (isLive) {
        status = "Standby";
      } else if (d.status === "ONLINE") {
        status = "In Mission";
      }

      const gpsStatus = isLive
        ? `${live.gps?.satellitesVisible || 14} satellites · ${live.gps?.fixType || "RTK fix"}`
        : (d.gpsStatus || (status === "Charging" ? "Ground charging" : "Standby standby"));

      const signal = isLive
        ? `${live.linkQuality || -84} dBm · strong`
        : (d.signal || "Offline");

      const storage = d.storage || "48% used · 180 GB free";

      return {
        ...d,
        id,
        name: d.name || `Drone ${id}`,
        model: d.model || "QuadX Pro",
        type: d.type || "Multirotor",
        status,
        battery,
        location: d.location || "Base - HQ",
        lastFlight: d.lastFlight || "Today, 08:00",
        hours: typeof d.hours === "number" ? d.hours : 120,
        serial: d.serial || `SN-${id}`,
        firmware: d.firmware || "v2.10",
        purchaseDate: d.purchaseDate || "15 Jan 2025",
        team: d.team || "Team Alpha",
        gpsStatus,
        signal,
        storage,
        role: d.role || null,
        mission: d.mission || null,
      };
    });
  }, [registeredDrones, fleetTelemetry]);

  // Filtered drones
  const filteredDrones = useMemo(() => {
    return fleetData.filter((d) => {
      if (statusFilter === "in_mission" && d.status !== "In Mission") return false;
      if (statusFilter === "standby" && d.status !== "Standby") return false;
      if (statusFilter === "charging" && d.status !== "Charging") return false;
      if (statusFilter === "maintenance" && d.status !== "In Maintenance") return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          d.id.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.model.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          (d.role && d.role.toLowerCase().includes(q)) ||
          (d.mission && d.mission.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [fleetData, statusFilter, searchTerm]);

  // Selected drone object
  const activeDrone = useMemo(() => {
    return fleetData.find((d) => d.id === selectedDroneId) || fleetData[0] || {
      id: "DR-001",
      name: "Drone 1",
      model: "QuadX Pro",
      type: "Multirotor",
      status: "Standby",
      battery: 100,
      location: "Base - HQ",
      hours: 0,
      serial: "SN-DR-001",
      firmware: "v1.00",
      purchaseDate: "2025",
      team: "Team Alpha",
      gpsStatus: "Standby",
      signal: "Offline",
      storage: "100 GB free",
    };
  }, [fleetData, selectedDroneId]);

  // Dynamic Fleet KPIs
  const totalCount = fleetData.length;
  const inMissionCount = fleetData.filter((d) => d.status === "In Mission").length;
  const standbyCount = fleetData.filter((d) => d.status === "Standby").length;
  const chargingCount = fleetData.filter((d) => d.status === "Charging").length;
  const maintCount = fleetData.filter((d) => d.status === "In Maintenance").length;
  const availPct = totalCount > 0 ? Math.round(((totalCount - maintCount) / totalCount) * 100) : 100;
  const avgBattery = totalCount > 0 ? Math.round(fleetData.reduce((acc, d) => acc + (d.battery || 0), 0) / totalCount) : 0;
  const totalHours = fleetData.reduce((acc, d) => acc + (d.hours || 0), 0);

  // Dynamic composition breakdown
  const multiCount = fleetData.filter((d) => (d.type || "").toLowerCase().includes("multi")).length;
  const fixedCount = fleetData.filter((d) => (d.type || "").toLowerCase().includes("fixed")).length;
  const vtolCount = fleetData.filter((d) => (d.type || "").toLowerCase().includes("vtol")).length;
  const hybridCount = Math.max(0, totalCount - multiCount - fixedCount - vtolCount);

  const multiPct = totalCount > 0 ? Math.round((multiCount / totalCount) * 100) : 0;
  const fixedPct = totalCount > 0 ? Math.round((fixedCount / totalCount) * 100) : 0;
  const vtolPct = totalCount > 0 ? Math.round((vtolCount / totalCount) * 100) : 0;
  const hybridPct = Math.max(0, 100 - multiPct - fixedPct - vtolPct);

  // Dynamic location distribution
  const locationCounts = useMemo(() => {
    const map = {};
    fleetData.forEach((d) => {
      const loc = d.location || "Base - HQ";
      map[loc] = (map[loc] || 0) + 1;
    });
    const items = Object.entries(map).map(([loc, count]) => ({ loc, count }));
    items.sort((a, b) => b.count - a.count);
    return items;
  }, [fleetData]);

  // Handle Save New Drone
  const handleSaveNewDrone = async (e) => {
    e?.preventDefault();
    const nextNum = registeredDrones.length + 1;
    const droneId = (newDroneForm.id || `DR-${String(nextNum).padStart(3, "0")}`).trim().toUpperCase();
    const droneName = (newDroneForm.name || `Falcon-${nextNum}`).trim();

    await registerDrone({
      id: droneId,
      droneId: droneId,
      name: droneName,
      model: newDroneForm.model || "DJI Matrice 350 RTK",
      type: newDroneForm.type || "Multirotor",
      location: newDroneForm.location || "Base - HQ",
      role: newDroneForm.role || null,
      mission: newDroneForm.mission || null,
      status: "Standby",
      battery: 100,
      hours: 0,
      lastFlight: "Never",
      serial: `SN-${droneId}`,
      firmware: "v2.10",
      purchaseDate: "Oct 2026",
      team: "Team Alpha",
    });

    showToast(`Drone ${droneId} (${droneName}) enrolled successfully.`);
    setSelectedDroneId(droneId);
    selectDrone?.(droneId);
    setShowAddDroneModal(false);
  };

  // Handle Retire Drone
  const handleRetireDrone = async () => {
    if (!activeDrone?.id) return;
    const ok = window.confirm(`Retire ${activeDrone.id} (${activeDrone.name}) from the fleet inventory?`);
    if (!ok) return;

    await deleteDrone(activeDrone.id);
    showToast(`Drone ${activeDrone.id} retired from fleet.`);
    const remaining = registeredDrones.filter((d) => d.id !== activeDrone.id);
    if (remaining.length > 0) {
      setSelectedDroneId(remaining[0].id);
      selectDrone?.(remaining[0].id);
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth">
      <div className="p-3 sm:p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-4">
        {/* ======================================================================= */}
        {/* 1. HEADER ROW WITH + ADD DRONE                                          */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0B1F3D] tracking-tight">
              Drone Fleet
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              One fleet. Any mission. Always ready.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {actionFeedback && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] animate-in fade-in">
                {actionFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAddDroneModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Drone</span>
            </button>
          </div>
        </div>

        {/* 6 Top KPI Cards (Dynamic fleet status) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1: Total Drones */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] shrink-0">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">{totalCount}</div>
              <div className="text-[10px] font-bold text-[#334155]">Total Drones</div>
              <div className="text-[9px] text-[#64748B]">{inMissionCount} active · {standbyCount + chargingCount} standby</div>
            </div>
          </div>

          {/* 2: Fleet Availability */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/25 flex items-center justify-center text-[#16A34A] shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">{availPct}%</div>
              <div className="text-[10px] font-bold text-[#334155]">Fleet Availability</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">{totalCount - maintCount} operational</div>
            </div>
          </div>

          {/* 3: In Maintenance */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#D97706] shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">{maintCount}</div>
              <div className="text-[10px] font-bold text-[#334155]">In Maintenance</div>
              <div className="text-[9px] text-[#64748B]">{maintCount > 0 ? `${maintCount} in servicing` : "All ready"}</div>
            </div>
          </div>

          {/* 4: Avg. Battery Health */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] shrink-0">
              <Battery className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">{avgBattery}%</div>
              <div className="text-[10px] font-bold text-[#334155]">Avg. Battery Level</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">Active telemetry</div>
            </div>
          </div>

          {/* 5: Flight Hours */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 flex items-center justify-center text-[#8B5CF6] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">{totalHours}</div>
              <div className="text-[10px] font-bold text-[#334155]">Total Flight Hours</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">Cumulative logging</div>
            </div>
          </div>

          {/* 6: Compliance Status */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/25 flex items-center justify-center text-[#16A34A] shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">100%</div>
              <div className="text-[10px] font-bold text-[#334155]">Compliance Status</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">● Authoritative sync</div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. FLEET INVENTORY TABLE + COMPOSITION & HEALTH CHARTS                   */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT: FLEET INVENTORY TABLE (lg:col-span-8)                           */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                {[
                  { id: "all", label: `All Drones (${totalCount})` },
                  { id: "in_mission", label: `In Mission (${inMissionCount})` },
                  { id: "standby", label: `Standby (${standbyCount})` },
                  { id: "charging", label: `Charging (${chargingCount})` },
                  { id: "maintenance", label: `Maintenance (${maintCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      statusFilter === f.id
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search fleet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs outline-none focus:border-[#2563EB] w-44"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">ID / Name</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Battery</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Last Flight</th>
                    <th className="py-2.5 px-3 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[11px]">
                  {filteredDrones.map((d) => {
                    const isSelected = selectedDroneId === d.id;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => {
                          setSelectedDroneId(d.id);
                          selectDrone?.(d.id);
                        }}
                        className={`transition cursor-pointer ${
                          isSelected ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#2563EB] font-mono">{d.id}</div>
                          <div className="text-[10px] text-[#0F172A] font-semibold truncate">{d.name}</div>
                          {d.role && <div className="text-[9px] text-[#0284C7] font-semibold">{d.role}</div>}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#0F172A]">{d.model}</td>
                        <td className="py-2 px-3 text-[#475569]">{d.type}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === "In Mission"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : d.status === "Charging"
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : d.status === "Standby"
                                ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                : "bg-[#FEE2E2] text-[#B91C1C]"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {d.battery > 0 ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <div className="w-12 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                                <div
                                  className="h-full bg-[#16A34A]"
                                  style={{ width: `${d.battery}%` }}
                                />
                              </div>
                              <span>{d.battery}%</span>
                            </div>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[#475569]">{d.location}</td>
                        <td className="py-2 px-3 text-[#64748B]">{d.lastFlight}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                          {d.hours} h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-[10.5px] text-[#64748B]">
              Showing {filteredDrones.length} of {totalCount} drones. Select a row for its detail below.
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT: COMPOSITION DONUT & FLEET HEALTH (lg:col-span-4)              */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Fleet Composition Donut Chart Box */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
                Fleet Composition
              </h3>

              <div className="flex items-center gap-4">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="#E2E8F0" strokeWidth="14" fill="none" />
                    {/* Multirotor */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#2563EB"
                      strokeWidth="14"
                      strokeDasharray={`${Math.round((multiPct / 100) * 238)} 238`}
                      strokeDashoffset="0"
                      fill="none"
                    />
                    {/* Fixed wing */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#F97316"
                      strokeWidth="14"
                      strokeDasharray={`${Math.round((fixedPct / 100) * 238)} 238`}
                      strokeDashoffset={`-${Math.round((multiPct / 100) * 238)}`}
                      fill="none"
                    />
                    {/* VTOL */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10B981"
                      strokeWidth="14"
                      strokeDasharray={`${Math.round((vtolPct / 100) * 238)} 238`}
                      strokeDashoffset={`-${Math.round(((multiPct + fixedPct) / 100) * 238)}`}
                      fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-[#0F172A]">{totalCount}</span>
                    <span className="text-[8.5px] text-[#64748B] uppercase font-bold">Drones</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1 text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Multirotor
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{multiCount} ({multiPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" /> Fixed Wing
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{fixedCount} ({fixedPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" /> VTOL
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{vtolCount} ({vtolPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#EAB308]" /> Hybrid
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{hybridCount} ({hybridPct}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Health Progress Bars */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
                Fleet Health
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { label: "Airframe Health", pct: 92 },
                  { label: "Battery Health", pct: 87 },
                  { label: "Sensor Health", pct: 90 },
                  { label: "Communication", pct: 96 },
                  { label: "Firmware Compliance", pct: 100 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-[#475569]">{item.label}</span>
                      <span className="font-mono font-bold text-[#0F172A]">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full bg-[#16A34A]"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. SELECTED DRONE DETAILS PANEL (DR-001 Falcon-1)                       */}
        {/* ======================================================================= */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-4 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-[#0B1F3D]">
                {activeDrone.id} {activeDrone.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                {activeDrone.status}
              </span>
            </div>

            <button
              type="button"
              onClick={() => showToast(`Full profile opened for ${activeDrone.id}`)}
              className="px-3 py-1 rounded-md border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] self-start"
            >
              Full profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Drone Photo (md:col-span-3) */}
            <div className="md:col-span-3 flex flex-col items-center text-center p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <div className="w-full h-36 rounded overflow-hidden flex items-center justify-center bg-white p-2">
                <img
                  src={droneLandscapeImg}
                  alt={activeDrone.model}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <span className="text-[10px] text-[#64748B] mt-2 font-medium">
                {activeDrone.type} · Inspection | Mapping | Surveillance
              </span>
            </div>

            {/* Center Specs List (md:col-span-4) */}
            <div className="md:col-span-4 space-y-1.5 text-xs">
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Model</span>
                <span className="font-semibold text-[#0F172A]">{activeDrone.model}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Serial Number</span>
                <span className="font-mono text-[#0F172A]">{activeDrone.serial}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Firmware</span>
                <span className="font-mono text-[#0F172A]">{activeDrone.firmware}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Purchase Date</span>
                <span className="text-[#0F172A]">{activeDrone.purchaseDate}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Total Flight Hours</span>
                <span className="font-bold text-[#0F172A]">{activeDrone.hours} h</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Last Flight</span>
                <span className="text-[#0F172A]">{activeDrone.lastFlight}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Current Location</span>
                <span className="text-[#0F172A] font-semibold">{activeDrone.location}</span>
              </div>
              <div className="grid grid-cols-2 py-0.5">
                <span className="text-[#64748B]">Assigned To</span>
                <span className="text-[#0F172A]">{activeDrone.team}</span>
              </div>
            </div>

            {/* Right Sub-Panel Tabs & CTA (md:col-span-5) */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1 border-b border-[#E2E8F0] pb-2 text-xs">
                {["Overview", "Sensors", "Maintenance", "Flight History", "Compliance", "Documents"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveDetailTab(t.toLowerCase())}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                      activeDetailTab === t.toLowerCase()
                        ? "bg-[#2563EB] text-white"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Status Readouts */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-[#16A34A]" />
                  <div>
                    <span className="font-bold text-[#0F172A]">Battery</span>
                    <span className="text-[#64748B] block text-[11px]">{activeDrone.battery}% - est. 28 min remaining</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#2563EB]" />
                  <div>
                    <span className="font-bold text-[#0F172A]">GPS / GNSS</span>
                    <span className="text-[#64748B] block text-[11px]">{activeDrone.gpsStatus}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  <div>
                    <span className="font-bold text-[#0F172A]">Signal Strength</span>
                    <span className="text-[#64748B] block text-[11px]">{activeDrone.signal}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#8B5CF6]" />
                  <div>
                    <span className="font-bold text-[#0F172A]">Storage</span>
                    <span className="text-[#64748B] block text-[11px]">{activeDrone.storage}</span>
                  </div>
                </div>
              </div>

              {/* Big CTA */}
              <button
                type="button"
                onClick={() => navigate("/live-operations")}
                className="w-full py-2 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>View in Live Operations</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 4. LOCATION DISTRIBUTION & QUICK ACTIONS                                */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Location Distribution (md:col-span-6) */}
          <div className="md:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
              Location Distribution
            </h3>

            <div className="space-y-1.5 text-xs">
              {locationCounts.map((item) => {
                const max = Math.max(...locationCounts.map((l) => l.count), 1);
                return (
                  <div key={item.loc} className="flex items-center gap-3">
                    <span className="w-28 text-[#475569] text-[11px] truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#94A3B8]" />
                      {item.loc}
                    </span>
                    <div className="flex-1 h-3 rounded bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 font-mono font-bold text-right text-[11px] text-[#0F172A]">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-[#8E9EAA] pt-1 border-t border-[#F1F5F9]">
              Adds up to {totalCount} drones across active fleet.
            </div>
          </div>

          {/* Quick Actions (md:col-span-6) */}
          <div className="md:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
              Quick Actions
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => showToast(`Diagnostics passed for ${activeDrone.id}`)}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <Cpu className="w-4 h-4 text-[#2563EB] mb-1" />
                <span className="font-semibold text-[#0F172A]">Run Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/mission-planning")}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <Plane className="w-4 h-4 text-[#2563EB] mb-1" />
                <span className="font-semibold text-[#0F172A]">Assign to Mission</span>
              </button>

              <button
                type="button"
                onClick={() => showToast(`Calibration sequence initiated for ${activeDrone.id}`)}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <Sliders className="w-4 h-4 text-[#2563EB] mb-1" />
                <span className="font-semibold text-[#0F172A]">Calibrate Sensors</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/logs")}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <FileText className="w-4 h-4 text-[#2563EB] mb-1" />
                <span className="font-semibold text-[#0F172A]">View Flight Logs</span>
              </button>

              <button
                type="button"
                onClick={() => showToast(`Firmware up to date: ${activeDrone.firmware}`)}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 text-[#2563EB] mb-1" />
                <span className="font-semibold text-[#0F172A]">Update Firmware</span>
              </button>

              <button
                type="button"
                onClick={handleRetireDrone}
                className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#EF4444] hover:bg-[#FEF2F2] transition cursor-pointer flex flex-col items-center justify-center"
              >
                <X className="w-4 h-4 text-[#EF4444] mb-1" />
                <span className="font-semibold text-[#B91C1C]">Retire Drone</span>
              </button>
            </div>
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
      </div>

      {/* Add Drone Modal */}
      {showAddDroneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveNewDrone}
            className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-[#CBD5E1] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Register New Drone to Fleet</h3>
              <button
                type="button"
                onClick={() => setShowAddDroneModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#64748B] block mb-1">Drone ID</label>
                  <input
                    type="text"
                    placeholder={`DR-${String(registeredDrones.length + 1).padStart(3, "0")}`}
                    value={newDroneForm.id}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, id: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] block mb-1">Callsign / Name</label>
                  <input
                    type="text"
                    placeholder={`Falcon-${registeredDrones.length + 1}`}
                    value={newDroneForm.name}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#64748B] block mb-1">Aircraft Model</label>
                <input
                  type="text"
                  value={newDroneForm.model}
                  onChange={(e) => setNewDroneForm({ ...newDroneForm, model: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#64748B] block mb-1">Airframe Type</label>
                  <select
                    value={newDroneForm.type}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, type: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5 font-medium"
                  >
                    <option>Multirotor</option>
                    <option>Fixed Wing</option>
                    <option>VTOL</option>
                    <option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#64748B] block mb-1">Station / Location</label>
                  <input
                    type="text"
                    value={newDroneForm.location}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, location: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#64748B] block mb-1">Role (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead, Thermal, Survey"
                    value={newDroneForm.role}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, role: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-[#64748B] block mb-1">Mission (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Perimeter Patrol"
                    value={newDroneForm.mission}
                    onChange={(e) => setNewDroneForm({ ...newDroneForm, mission: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDroneModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
              >
                Save Drone
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DroneFleetPage;
