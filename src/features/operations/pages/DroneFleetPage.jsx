import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg";
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
 * Features fleet composition donut chart, airframe health bars, searchable fleet inventory,
 * deep-dive drone inspector with telemetry and quick actions.
 * Faithfully matches media_1791545054650.png reference.
 */
const DroneFleetPage = () => {
  const navigate = useNavigate();

  // Filter tab: "all" | "in_mission" | "standby" | "charging" | "maintenance"
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDroneId, setSelectedDroneId] = useState("DR-001");
  const [activeDetailTab, setActiveDetailTab] = useState("overview"); // "overview" | "sensors" | "maintenance" | "history" | "compliance" | "docs"
  const [showAddDroneModal, setShowAddDroneModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const showToast = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Fleet database matching screenshot
  const fleetData = useMemo(
    () => [
      {
        id: "DR-001",
        name: "Falcon-1",
        model: "DJI Matrice 350",
        type: "Multirotor",
        status: "In Mission",
        battery: 78,
        location: "North Ridge",
        lastFlight: "Today, 07:12",
        hours: 412,
        serial: "1581F8Q00014",
        firmware: "v7.02",
        purchaseDate: "12 Jan 2025",
        team: "Team Alpha",
        gpsStatus: "12 satellites · RTK fix",
        signal: "-88 dBm · strong",
        storage: "62% used · 124 GB free",
      },
      {
        id: "DR-002",
        name: "Spectre-2",
        model: "Autel EVO Max",
        type: "Multirotor",
        status: "In Mission",
        battery: 69,
        location: "NH-44 Km 81",
        lastFlight: "Today, 07:45",
        hours: 258,
        serial: "8824EVOMAX01",
        firmware: "v4.18",
        purchaseDate: "04 Mar 2025",
        team: "Highway Ops",
        gpsStatus: "14 satellites · RTK fix",
        signal: "-91 dBm · strong",
        storage: "48% used · 180 GB free",
      },
      {
        id: "DR-003",
        name: "Therma-3",
        model: "Autel EVO Max",
        type: "Multirotor",
        status: "In Mission",
        battery: 64,
        location: "North Ridge",
        lastFlight: "Today, 08:15",
        hours: 198,
        serial: "8824EVOMAX02",
        firmware: "v4.18",
        purchaseDate: "18 Mar 2025",
        team: "Team Alpha",
        gpsStatus: "11 satellites · 3D fix",
        signal: "-86 dBm · strong",
        storage: "72% used · 95 GB free",
      },
      {
        id: "DR-004",
        name: "AeroWing-4",
        model: "WingtraOne",
        type: "Fixed Wing",
        status: "Charging",
        battery: 45,
        location: "Base - HQ",
        lastFlight: "Today, 05:30",
        hours: 620,
        serial: "WGTR992014",
        firmware: "v3.85",
        purchaseDate: "20 Nov 2024",
        team: "Survey Group",
        gpsStatus: "Ground charging",
        signal: "Docked LAN",
        storage: "15% used · 420 GB free",
      },
      {
        id: "DR-005",
        name: "GeoBee-5",
        model: "eBee X",
        type: "Fixed Wing",
        status: "Standby",
        battery: 96,
        location: "Base - HQ",
        lastFlight: "Yesterday, 16:22",
        hours: 510,
        serial: "EBX8847190",
        firmware: "v5.12",
        purchaseDate: "02 Feb 2025",
        team: "Survey Group",
        gpsStatus: "Standby standby",
        signal: "-82 dBm · strong",
        storage: "30% used · 350 GB free",
      },
      {
        id: "DR-006",
        name: "Scout-6",
        model: "DJI Mavic 3T",
        type: "Multirotor",
        status: "In Mission",
        battery: 82,
        location: "Refinery PU3",
        lastFlight: "Today, 08:30",
        hours: 302,
        serial: "MVC3T90124",
        firmware: "v2.09",
        purchaseDate: "15 Apr 2025",
        team: "Industrial Safety",
        gpsStatus: "16 satellites · RTK fix",
        signal: "-84 dBm · strong",
        storage: "54% used · 140 GB free",
      },
      {
        id: "DR-007",
        name: "Patrol-7",
        model: "DJI Mavic 3T",
        type: "Multirotor",
        status: "In Mission",
        battery: 71,
        location: "North Ridge",
        lastFlight: "Today, 07:55",
        hours: 188,
        serial: "MVC3T90125",
        firmware: "v2.09",
        purchaseDate: "20 Apr 2025",
        team: "Team Alpha",
        gpsStatus: "13 satellites · RTK fix",
        signal: "-87 dBm · strong",
        storage: "65% used · 110 GB free",
      },
      {
        id: "DR-008",
        name: "CargoVTOL-8",
        model: "Volansi VOLY",
        type: "VTOL",
        status: "In Maintenance",
        battery: 0,
        location: "Service Center",
        lastFlight: "—",
        hours: 376,
        serial: "VLNSY77401",
        firmware: "v1.94",
        purchaseDate: "10 Oct 2024",
        team: "Logistics Flight",
        gpsStatus: "In hanger",
        signal: "Offline",
        storage: "Maintenance mode",
      },
    ],
    []
  );

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
          d.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [fleetData, statusFilter, searchTerm]);

  // Selected drone object
  const activeDrone = useMemo(() => {
    return fleetData.find((d) => d.id === selectedDroneId) || fleetData[0];
  }, [fleetData, selectedDroneId]);

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

        {/* 6 Top KPI Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1: Total Drones */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] shrink-0">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">42</div>
              <div className="text-[10px] font-bold text-[#334155]">Total Drones</div>
              <div className="text-[9px] text-[#64748B]">35 active · 5 inactive · 2 maint</div>
            </div>
          </div>

          {/* 2: Fleet Availability */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/25 flex items-center justify-center text-[#16A34A] shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">83%</div>
              <div className="text-[10px] font-bold text-[#334155]">Fleet Availability</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">↑ +6% vs. last month</div>
            </div>
          </div>

          {/* 3: In Maintenance */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#D97706] shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">5</div>
              <div className="text-[10px] font-bold text-[#334155]">In Maintenance</div>
              <div className="text-[9px] text-[#64748B]">2 under 24 hrs · 3 over 24</div>
            </div>
          </div>

          {/* 4: Avg. Battery Health */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] shrink-0">
              <Battery className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">87%</div>
              <div className="text-[10px] font-bold text-[#334155]">Avg. Battery Health</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">↑ +4% vs. last month</div>
            </div>
          </div>

          {/* 5: Flight Hours */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 flex items-center justify-center text-[#8B5CF6] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-[#0F172A]">128</div>
              <div className="text-[10px] font-bold text-[#334155]">Flight Hours (week)</div>
              <div className="text-[9px] text-[#16A34A] font-semibold">↑ +18% vs. last week</div>
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
              <div className="text-[9px] text-[#16A34A] font-semibold">● All certificates valid</div>
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
                  { id: "all", label: "All Drones (42)" },
                  { id: "in_mission", label: "In Mission" },
                  { id: "standby", label: "Standby" },
                  { id: "charging", label: "Charging" },
                  { id: "maintenance", label: "Maintenance" },
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
                        onClick={() => setSelectedDroneId(d.id)}
                        className={`transition cursor-pointer ${
                          isSelected ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#2563EB] font-mono">{d.id}</div>
                          <div className="text-[10px] text-[#64748B]">Deep dive &gt;</div>
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
              Showing {filteredDrones.length} of 42 drones. Select a row for its detail below.
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
                    {/* Multirotor 67% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#2563EB"
                      strokeWidth="14"
                      strokeDasharray="160 238"
                      strokeDashoffset="0"
                      fill="none"
                    />
                    {/* Fixed wing 19% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#F97316"
                      strokeWidth="14"
                      strokeDasharray="45 238"
                      strokeDashoffset="-160"
                      fill="none"
                    />
                    {/* VTOL 10% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10B981"
                      strokeWidth="14"
                      strokeDasharray="24 238"
                      strokeDashoffset="-205"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-[#0F172A]">42</span>
                    <span className="text-[8.5px] text-[#64748B] uppercase font-bold">Drones</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1 text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Multirotor
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">28 (67%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" /> Fixed Wing
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">8 (19%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" /> VTOL
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">4 (10%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#334155]">
                      <span className="w-2 h-2 rounded-full bg-[#EAB308]" /> Hybrid
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">2 (5%)</span>
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
              {[
                { loc: "Base - HQ", count: 12, max: 12 },
                { loc: "North Ridge", count: 8, max: 12 },
                { loc: "East Perimeter", count: 6, max: 12 },
                { loc: "South Zone", count: 6, max: 12 },
                { loc: "Service Center", count: 5, max: 12 },
                { loc: "Other", count: 5, max: 12 },
              ].map((item) => (
                <div key={item.loc} className="flex items-center gap-3">
                  <span className="w-28 text-[#475569] text-[11px] truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#94A3B8]" />
                    {item.loc}
                  </span>
                  <div className="flex-1 h-3 rounded bg-[#F1F5F9] overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB]"
                      style={{ width: `${(item.count / item.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 font-mono font-bold text-right text-[11px] text-[#0F172A]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#8E9EAA] pt-1 border-t border-[#F1F5F9]">
              Adds up to 42 drones.
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
                onClick={() => showToast(`Retirement request filed for ${activeDrone.id}`)}
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
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-[#CBD5E1] space-y-4">
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
              <div>
                <label className="text-[#64748B] block mb-1">Drone ID</label>
                <input type="text" defaultValue="DR-009" className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5 font-mono" />
              </div>
              <div>
                <label className="text-[#64748B] block mb-1">Aircraft Model</label>
                <input type="text" defaultValue="DJI Matrice 350 RTK" className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5" />
              </div>
              <div>
                <label className="text-[#64748B] block mb-1">Airframe Type</label>
                <select className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5 font-medium">
                  <option>Multirotor</option>
                  <option>Fixed Wing</option>
                  <option>VTOL</option>
                  <option>Hybrid</option>
                </select>
              </div>
              <div>
                <label className="text-[#64748B] block mb-1">Assigned Station / Location</label>
                <input type="text" defaultValue="Base - HQ" className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1.5" />
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDroneModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddDroneModal(false);
                  showToast("Drone DR-009 enrolled successfully.");
                }}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold"
              >
                Save Drone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneFleetPage;
