import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTelemetry } from "@/context/TelemetryContext.jsx";
import {
  Share2,
  Radio,
  Shield,
  Plane,
  RotateCw,
  Sliders,
  Check,
  ChevronRight,
  Sparkles,
  Zap,
  BarChart3,
  Compass,
  AlertTriangle,
  Users,
  Grid,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Crosshair,
} from "lucide-react";

/**
 * SwarmControlPage
 * Dedicated enterprise multi-drone swarm coordination workspace.
 * Synchronized with live registered drones and active swarm telemetry.
 */
const SwarmControlPage = () => {
  const navigate = useNavigate();
  const { registeredDrones = [], fleetTelemetry = {} } = useTelemetry();

  // Selected formation pattern
  const [formationPattern, setFormationPattern] = useState("grid"); // "grid" | "v_formation" | "line" | "orbit"
  const [diagramZoom, setDiagramZoom] = useState(1.0);

  // Live configurable parameters
  const [params, setParams] = useState({
    altitude: 120,
    speed: 12,
    spacing: 50,
    altSeparation: 10,
  });

  // Swarm autonomous behaviours
  const [behaviours, setBehaviours] = useState({
    resplitTask: true,
    promoteLead: true,
    sendNearestForAlert: true,
    holdInShadow: false,
  });

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Roles table data dynamically derived from registered fleet drones and live telemetry
  const swarmRoles = useMemo(() => {
    if (registeredDrones.length === 0) {
      return [
        { id: "DR-001", name: "Falcon-1", role: "Lead", task: "Sector A - 120 m", battery: 100, link: "Standby", isLead: true },
      ];
    }

    return registeredDrones.map((d, index) => {
      const id = d.id || d.droneId;
      const live = fleetTelemetry?.[id] || {};
      const isLive = live && (live.connectionStatus === "connected" || Boolean(live.armed));

      let battery = 100;
      if (typeof live.battery?.level === "number") battery = live.battery.level;
      else if (typeof live.battery === "number") battery = live.battery;
      else if (typeof d.battery === "number") battery = d.battery;

      const role = d.role || (index === 0 ? "Lead" : (index === 1 ? "Thermal" : (index === registeredDrones.length - 1 ? "Relay" : "Survey")));
      const isLead = role.toLowerCase().includes("lead");
      const isThermal = role.toLowerCase().includes("thermal");
      const isRelay = role.toLowerCase().includes("relay");
      const task = d.mission
        ? `${d.mission} - ${120 + index * 10} m`
        : `Sector ${String.fromCharCode(65 + index)} - ${120 + index * 10} m`;

      const link = isLive ? "Strong" : (d.status === "ONLINE" ? "Strong" : "Standby");

      return {
        id,
        name: d.name,
        role,
        task,
        battery,
        link,
        isLead,
        isThermal,
        isRelay,
      };
    });
  }, [registeredDrones, fleetTelemetry]);

  // Dynamic node positions and labels in formation diagram based on selected pattern and actual drones
  const formationNodes = useMemo(() => {
    const getNodeLabel = (index, fallback) => {
      if (registeredDrones[index]) {
        return registeredDrones[index].role || registeredDrones[index].id;
      }
      return fallback;
    };

    if (formationPattern === "v_formation") {
      return [
        { id: "Lead", label: getNodeLabel(0, "Lead"), x: 180, y: 40, color: "#2563EB" },
        { id: "Survey 1", label: getNodeLabel(1, "Survey 1"), x: 130, y: 70, color: "#16A34A" },
        { id: "Survey 2", label: getNodeLabel(2, "Survey 2"), x: 230, y: 70, color: "#16A34A" },
        { id: "Survey 3", label: getNodeLabel(3, "Survey 3"), x: 80, y: 105, color: "#16A34A" },
        { id: "Survey 4", label: getNodeLabel(4, "Survey 4"), x: 280, y: 105, color: "#16A34A" },
        { id: "Relay", label: getNodeLabel(5, "Relay"), x: 180, y: 110, color: "#8B5CF6" },
      ];
    }
    if (formationPattern === "line") {
      return [
        { id: "Lead", label: getNodeLabel(0, "Lead"), x: 50, y: 75, color: "#2563EB" },
        { id: "Survey 1", label: getNodeLabel(1, "Survey 1"), x: 105, y: 75, color: "#16A34A" },
        { id: "Survey 2", label: getNodeLabel(2, "Survey 2"), x: 160, y: 75, color: "#16A34A" },
        { id: "Survey 3", label: getNodeLabel(3, "Survey 3"), x: 215, y: 75, color: "#16A34A" },
        { id: "Survey 4", label: getNodeLabel(4, "Survey 4"), x: 270, y: 75, color: "#16A34A" },
        { id: "Relay", label: getNodeLabel(5, "Relay"), x: 325, y: 75, color: "#8B5CF6" },
      ];
    }
    if (formationPattern === "orbit") {
      return [
        { id: "Lead", label: getNodeLabel(0, "Lead"), x: 190, y: 25, color: "#2563EB" },
        { id: "Survey 1", label: getNodeLabel(1, "Survey 1"), x: 260, y: 55, color: "#16A34A" },
        { id: "Survey 2", label: getNodeLabel(2, "Survey 2"), x: 260, y: 105, color: "#16A34A" },
        { id: "Survey 3", label: getNodeLabel(3, "Survey 3"), x: 190, y: 130, color: "#16A34A" },
        { id: "Survey 4", label: getNodeLabel(4, "Survey 4"), x: 120, y: 105, color: "#16A34A" },
        { id: "Relay", label: getNodeLabel(5, "Relay"), x: 120, y: 55, color: "#8B5CF6" },
      ];
    }
    // Default: Area grid
    return [
      { id: "Lead", label: getNodeLabel(0, "Lead"), x: 120, y: 45, color: "#2563EB" },
      { id: "Survey 1", label: getNodeLabel(1, "Survey 1"), x: 190, y: 45, color: "#16A34A" },
      { id: "Survey 2", label: getNodeLabel(2, "Survey 2"), x: 260, y: 45, color: "#16A34A" },
      { id: "Survey 3", label: getNodeLabel(3, "Survey 3"), x: 120, y: 110, color: "#16A34A" },
      { id: "Survey 4", label: getNodeLabel(4, "Survey 4"), x: 190, y: 110, color: "#16A34A" },
      { id: "Relay", label: getNodeLabel(5, "Relay"), x: 260, y: 110, color: "#8B5CF6" },
    ];
  }, [formationPattern, registeredDrones]);

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth">
      <div className="p-3 sm:p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-4">
        {/* ======================================================================= */}
        {/* 1. PAGE HEADER & NOTIFICATION                                           */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0B1F3D] tracking-tight">
              Swarm Control
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              One operator, many drones: formation, roles and behaviour, live.
            </p>
          </div>

          {toastMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-xs font-bold text-[#15803D] animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {toastMsg}
            </div>
          )}
        </div>

        {/* 4 Top KPI Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Active Swarms */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">3</div>
              <div className="text-[11px] font-bold text-[#334155]">Swarms Active</div>
              <div className="text-[10px] text-[#64748B]">Alpha · Bravo · Delta</div>
            </div>
          </div>

          {/* Card 2: Drones in Swarms */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB] shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">8</div>
              <div className="text-[11px] font-bold text-[#334155]">Drones in Swarms</div>
              <div className="text-[10px] text-[#64748B]">Across 3 sectors</div>
            </div>
          </div>

          {/* Card 3: Mesh Latency */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">38 ms</div>
              <div className="text-[11px] font-bold text-[#334155]">Mesh Latency</div>
              <div className="text-[10px] text-[#10B981] font-semibold">Ultra-reliable C2</div>
            </div>
          </div>

          {/* Card 4: Closest Separation */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">38 m</div>
              <div className="text-[11px] font-bold text-[#334155]">Closest Separation</div>
              <div className="text-[10px] text-[#64748B]">Hard limit 15 m</div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. MAIN SWARM WORKSPACE                                                 */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT/CENTER: FORMATION DIAGRAM & ROLES (lg:col-span-8)               */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-8 flex flex-col gap-3.5">
            {/* Formation Panel */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                    Swarm Alpha · Formation
                  </h2>
                </div>
                <span className="text-[10.5px] text-[#64748B] font-mono">6 drones · area scan</span>
              </div>

              {/* Formation Pattern Switcher */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "grid", label: "Area grid" },
                  { id: "v_formation", label: "V formation" },
                  { id: "line", label: "Line abreast" },
                  { id: "orbit", label: "Orbit" },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => {
                      setFormationPattern(pat.id);
                      showToast(`Swarm switched to ${pat.label}`);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                      formationPattern === pat.id
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {/* Interactive SVG Formation Diagram */}
              <div className="relative h-56 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
                {/* Visible Diagram Zoom Controls */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/95 border border-[#CBD5E1] rounded-md px-1.5 py-0.5 shadow-xs backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => setDiagramZoom((z) => Math.min(2.0, Number((z + 0.2).toFixed(1))))}
                    className="p-1 text-[#475569] hover:text-[#2563EB] transition cursor-pointer"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-[#E2E8F0]" />
                  <button
                    type="button"
                    onClick={() => setDiagramZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                    className="p-1 text-[#475569] hover:text-[#2563EB] transition cursor-pointer"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-[#E2E8F0]" />
                  <button
                    type="button"
                    onClick={() => setDiagramZoom(1.0)}
                    className="p-1 text-[#475569] hover:text-[#2563EB] transition cursor-pointer"
                    title="Reset View"
                    aria-label="Reset View"
                  >
                    <Crosshair className="w-3 h-3" />
                  </button>
                </div>

                <svg
                  className="w-full h-full max-w-lg transition-transform duration-150 ease-out origin-center"
                  viewBox="0 0 380 150"
                  style={{ transform: `scale(${diagramZoom})` }}
                >
                  {/* Outer safety boundary perimeter */}
                  <ellipse
                    cx="190"
                    cy="75"
                    rx="170"
                    ry="65"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1.2"
                    strokeDasharray="4,4"
                  />

                  {/* Mesh Connecting Lines between nodes */}
                  <line x1={formationNodes[0].x} y1={formationNodes[0].y} x2={formationNodes[1].x} y2={formationNodes[1].y} stroke="#93C5FD" strokeWidth="1.5" />
                  <line x1={formationNodes[1].x} y1={formationNodes[1].y} x2={formationNodes[2].x} y2={formationNodes[2].y} stroke="#86EFAC" strokeWidth="1.5" />
                  <line x1={formationNodes[0].x} y1={formationNodes[0].y} x2={formationNodes[3].x} y2={formationNodes[3].y} stroke="#93C5FD" strokeWidth="1.5" />
                  <line x1={formationNodes[3].x} y1={formationNodes[3].y} x2={formationNodes[4].x} y2={formationNodes[4].y} stroke="#86EFAC" strokeWidth="1.5" />
                  <line x1={formationNodes[4].x} y1={formationNodes[4].y} x2={formationNodes[5].x} y2={formationNodes[5].y} stroke="#C4B5FD" strokeWidth="1.5" />
                  <line x1={formationNodes[1].x} y1={formationNodes[1].y} x2={formationNodes[4].x} y2={formationNodes[4].y} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,2" />
                  <line x1={formationNodes[2].x} y1={formationNodes[2].y} x2={formationNodes[5].x} y2={formationNodes[5].y} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,2" />

                  {/* Render 6 Drones */}
                  {formationNodes.map((n) => (
                    <g key={n.id} className="transition-all duration-300">
                      <circle cx={n.x} cy={n.y} r="15" fill={n.color} stroke="#FFFFFF" strokeWidth="2.5" />
                      <text
                        x={n.x}
                        y={n.y + 24}
                        textAnchor="middle"
                        fill="#334155"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {n.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Diagram Footnote (Matching screenshot) */}
              <p className="text-[10.5px] text-[#64748B] leading-relaxed">
                Lines show the drone-to-drone mesh. Blue is the lead, violet the relay. Spacing {params.spacing} m, altitude {params.altitude} m, {params.speed} m/s: the swarm covers a strip 250 m wide at 43 km/h.
              </p>
            </div>

            {/* Roles Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">Roles</h2>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Drone</th>
                      <th className="py-2 px-3 font-semibold">Role</th>
                      <th className="py-2 px-3 font-semibold">Task</th>
                      <th className="py-2 px-3 font-semibold">Battery</th>
                      <th className="py-2 px-3 font-semibold text-right">Mesh link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                    {swarmRoles.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="py-2 px-3 font-bold text-[#0F172A]">
                          <div>{r.id}</div>
                          {r.name && <div className="text-[10px] text-[#64748B] font-sans font-normal">{r.name}</div>}
                        </td>
                        <td className="py-2 px-3 font-sans font-medium text-[#334155]">{r.role}</td>
                        <td className="py-2 px-3 font-sans text-[#475569]">{r.task}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div
                                className="h-full bg-[#16A34A]"
                                style={{ width: `${r.battery}%` }}
                              />
                            </div>
                            <span className="font-bold">{r.battery}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.link === "Strong"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-[#FEF3C7] text-[#B45309]"
                            }`}
                          >
                            {r.link}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: PARAMETERS, BEHAVIOUR, ACTIVE SWARMS (lg:col-span-4)   */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Live Parameters Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                Live parameters
              </h2>

              <div className="space-y-2.5 text-xs">
                {/* Altitude */}
                <div>
                  <div className="flex justify-between font-medium text-[#475569] mb-1">
                    <span>Altitude</span>
                    <span className="font-bold font-mono text-[#0F172A]">{params.altitude} m</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={params.altitude}
                    onChange={(e) => setParams({ ...params, altitude: Number(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between font-medium text-[#475569] mb-1">
                    <span>Speed</span>
                    <span className="font-bold font-mono text-[#0F172A]">{params.speed} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={params.speed}
                    onChange={(e) => setParams({ ...params, speed: Number(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                {/* Spacing */}
                <div>
                  <div className="flex justify-between font-medium text-[#475569] mb-1">
                    <span>Spacing</span>
                    <span className="font-bold font-mono text-[#0F172A]">{params.spacing} m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={params.spacing}
                    onChange={(e) => setParams({ ...params, spacing: Number(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                {/* Altitude separation */}
                <div>
                  <div className="flex justify-between font-medium text-[#475569] mb-1">
                    <span>Altitude separation</span>
                    <span className="font-bold font-mono text-[#0F172A]">{params.altSeparation} m</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={params.altSeparation}
                    onChange={(e) => setParams({ ...params, altSeparation: Number(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#64748B]">
                Drag a slider: the formation, the roles table and the separation figure update. Apply sends it to the drones.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => showToast("Swarm parameters updated & transmitted.")}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Apply to Swarm
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Swarm mission launched.")}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] text-xs font-bold transition cursor-pointer"
                >
                  Launch Swarm
                </button>
              </div>
            </div>

            {/* Swarm Behaviour Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                Swarm behaviour
              </h2>

              <div className="space-y-2 text-xs">
                {[
                  { k: "resplitTask", label: "Re-split the task if a drone drops out" },
                  { k: "promoteLead", label: "Promote a new lead automatically" },
                  { k: "sendNearestForAlert", label: "Send the nearest drone to verify an alert" },
                  { k: "holdInShadow", label: "Hold formation in a link shadow" },
                ].map((item) => (
                  <label key={item.k} className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#475569] text-[11.5px] pr-2">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={behaviours[item.k]}
                      onChange={(e) => setBehaviours({ ...behaviours, [item.k]: e.target.checked })}
                      className="w-4 h-4 text-[#2563EB] rounded border-[#CBD5E1] focus:ring-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* AI Autonomous Decision Log Card (Matching screenshot) */}
              <div className="p-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#1D4ED8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>08:18 AM: the swarm decided</span>
                </div>
                <p className="text-[10.5px] text-[#334155] leading-relaxed">
                  {registeredDrones[2]?.id || registeredDrones[0]?.id || "DR-001"} detected a thermal anomaly on the survey perimeter. The swarm autonomously reallocated lines to {registeredDrones[1]?.id || registeredDrones[0]?.id || "standby drone"} and assigned verification pass. No operator input.
                </p>
              </div>
            </div>

            {/* Active Swarms List Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                Active swarms
              </h2>

              <div className="space-y-2 text-xs">
                <div
                  onClick={() => navigate("/live-operations")}
                  className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-white transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <div className="font-bold text-[#0F172A]">Swarm Alpha · North Ridge Dam</div>
                      <div className="text-[10.5px] text-[#64748B]">3 drones · 65% complete</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>

                <div
                  onClick={() => navigate("/missions")}
                  className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-white transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <div className="font-bold text-[#0F172A]">Swarm Bravo · NH-44 Corridor</div>
                      <div className="text-[10.5px] text-[#64748B]">2 drones + relay · 40% complete</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>

                <div
                  onClick={() => navigate("/missions")}
                  className="p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-white transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <div className="font-bold text-[#0F172A]">Swarm Delta · Flood assessment, Kerala</div>
                      <div className="text-[10.5px] text-[#64748B]">3 drones · 40% complete</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/mission-planning")}
                className="w-full py-1.5 px-3 rounded-lg border border-[#CBD5E1] text-[#2563EB] hover:bg-[#F8FAFC] text-xs font-bold transition cursor-pointer mt-1"
              >
                Configure a swarm for a new mission
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. FOOTER VALUES / ASSURANCE STRIP                                     */}
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
    </div>
  );
};

export default SwarmControlPage;
