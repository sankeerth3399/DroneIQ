import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useMission } from "@/hooks/useMission.js";
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js";
import { useAuth } from "@/hooks/useAuth.js";
import sampleImg from "@/assets/images/sampleImg.png";
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg";
import {
  Activity,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Maximize2,
  Video,
  Volume2,
  VolumeX,
  Shield,
  Layers,
  Compass,
  Zap,
  BarChart3,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ArrowRight,
  Plane,
  Share2,
  Sliders,
  Crosshair,
  Bell,
  RefreshCw,
  Eye,
} from "lucide-react";

/**
 * LiveOperationsPage
 * Dedicated Live Operations monitoring cockpit for real-time mission tracking,
 * multi-drone telemetry, camera feeds, and operator intervention deck.
 * Faithfully matches media_1791545022510.png reference.
 */
const LiveOperationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { telemetry } = useDroneTelemetry();
  const { projects, currentProject, currentProjectId } = useMission();

  // Active inspected drone
  const [selectedDroneId, setSelectedDroneId] = useState("DR-001");
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(true);
  const [actionToast, setActionToast] = useState(null);

  // Map layer controls (Matching Map Layers HUD box in screenshot)
  const [mapLayers, setMapLayers] = useState({
    drones: true,
    swarmSectors: true,
    flightPath: true,
    geofence: true,
    linkCoverage: false,
    landingZones: false,
  });

  const showToast = (msg, type = "info") => {
    setActionToast({ msg, type });
    setTimeout(() => setActionToast(null), 3500);
  };

  // Canonical mission coordinates
  const waypoints = useMemo(() => {
    const wps = currentProject?.mission?.waypoints || currentProject?.mission?.items || [];
    if (wps.length > 0) return wps;
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

  // Telemetry fleet list
  const fleetTelemetry = useMemo(
    () => [
      {
        id: "DR-001",
        label: "Drone 1",
        role: "Lead - Mapping",
        alt: 120,
        speed: 8.0,
        battery: 66,
        link: "link strong",
        coords: "12.9712 N, 77.5931 E",
        sector: "Sector A - north face",
        cameraName: "DR-001 - RGB Camera",
      },
      {
        id: "DR-003",
        label: "Drone 2",
        role: "Thermal",
        alt: 120,
        speed: 7.5,
        battery: 61,
        link: "link strong",
        coords: "12.9708 N, 77.5942 E",
        sector: "Sector B - spillway",
        cameraName: "DR-003 - Radiometric IR",
      },
      {
        id: "DR-007",
        label: "Drone 3",
        role: "Survey",
        alt: 120,
        speed: 8.2,
        battery: 58,
        link: "link strong",
        coords: "12.9695 N, 77.5925 E",
        sector: "Sector C - downstream slope",
        cameraName: "DR-007 - Photogrammetry 42MP",
      },
    ],
    []
  );

  const activeDrone = useMemo(
    () => fleetTelemetry.find((d) => d.id === selectedDroneId) || fleetTelemetry[0],
    [selectedDroneId, fleetTelemetry]
  );

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#060D17] text-[#EEF2F6] font-sans scroll-smooth">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & KPI WIDGETS                                               */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 lg:p-5 max-w-[1720px] w-full mx-auto space-y-4">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
              Live Operations
            </h1>
            <p className="text-xs text-[#8E9EAA] mt-0.5">
              Missions in the air: position, video, telemetry and events.
            </p>
          </div>

          {actionToast && (
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#102A50] border border-[#2563EB] text-[#38BDF8] animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              {actionToast.msg}
            </div>
          )}
        </div>

        {/* 4 Top KPI Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Drones in the Air */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">16</div>
              <div className="text-[11px] font-bold text-[#E2E8F0]">Drones in the Air</div>
              <div className="text-[10px] text-[#8E9EAA]">2 on the ground, ready</div>
            </div>
          </div>

          {/* Card 2: Missions in Progress */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">6</div>
              <div className="text-[11px] font-bold text-[#E2E8F0]">Missions in Progress</div>
              <div className="text-[10px] text-[#8E9EAA]">4 autonomous · 2 supervised</div>
            </div>
          </div>

          {/* Card 3: Active Alerts */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-[#F87171] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">3</div>
              <div className="text-[11px] font-bold text-[#E2E8F0]">Active Alerts</div>
              <div className="text-[10px] text-[#F87171]">1 thermal anomaly flagged</div>
            </div>
          </div>

          {/* Card 4: Link Health */}
          <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#34D399] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">100%</div>
              <div className="text-[11px] font-bold text-[#E2E8F0]">Links Healthy</div>
              <div className="text-[10px] text-[#8E9EAA]">No drone on failover</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN COCKPIT SECTION: MAP & LIVE DRONE FEED                           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT/CENTER: LIVE OPERATIONS MAP (lg:col-span-8)                       */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-8 bg-[#0C1624] border border-[#1C2C42] rounded-xl overflow-hidden flex flex-col shadow-sm">
            {/* Mission banner header */}
            <div className="px-4 py-2.5 border-b border-[#1C2C42] bg-[#0A121E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  {currentProject?.projectName || currentProject?.name || "North Ridge Dam Inspection"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#38BDF8] bg-[#0284C7]/20 border border-[#0284C7]/40 px-2 py-0.5 rounded">
                  North Ridge Dam
                </span>
                <span className="text-[11px] font-bold text-[#10B981] bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 rounded">
                  65% complete
                </span>
              </div>
            </div>

            {/* Interactive Map Area */}
            <div className="relative min-h-[480px] lg:h-[520px] w-full bg-[#050B12]">
              <MapLoad
                mapStyle="satellite"
                telemetry={telemetry}
                pageType="live"
                waypoints={mapLayers.flightPath ? waypoints : []}
                showMissionRoute={mapLayers.flightPath}
                geofence={mapLayers.geofence ? currentProject?.geofence : null}
              />

              {/* Floating Map Layers HUD (Matching reference) */}
              <div className="absolute top-3 left-3 z-20 bg-[#07101CEE] border border-[#1C2C42] rounded-lg p-2.5 shadow-xl backdrop-blur-md text-[11px] w-[145px]">
                <span className="font-bold text-[10px] text-[#8E9EAA] uppercase tracking-wider block mb-1.5 border-b border-[#1C2C42] pb-1">
                  Map Layers
                </span>
                <div className="space-y-1">
                  {[
                    { key: "drones", label: "Drones" },
                    { key: "swarmSectors", label: "Swarm sectors" },
                    { key: "flightPath", label: "Flight path" },
                    { key: "geofence", label: "Geo-fence" },
                    { key: "linkCoverage", label: "Link coverage" },
                    { key: "landingZones", label: "Landing zones" },
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-1.5 cursor-pointer text-[#C1D0E4] hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={mapLayers[layer.key]}
                        onChange={(e) => setMapLayers({ ...mapLayers, [layer.key]: e.target.checked })}
                        className="rounded border-[#1C2C42] bg-[#0A1422] text-[#2563EB] focus:ring-0 w-3 h-3 cursor-pointer"
                      />
                      <span>{layer.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live Drone HUD Labels Overlaid on Map (Illustrative reference tags) */}
              {mapLayers.drones && (
                <>
                  <div className="absolute top-[26%] right-[32%] z-10 pointer-events-none bg-[#07101CF0] border border-[#38BDF8] rounded px-2.5 py-1 text-[10px] font-mono text-white shadow-lg">
                    <span className="font-bold text-[#38BDF8] block">Drone 1 · DR-001</span>
                    <span className="text-[9px] text-[#94A3B8]">Lead - Mapping</span>
                  </div>
                  <div className="absolute top-[48%] right-[42%] z-10 pointer-events-none bg-[#07101CF0] border border-[#F59E0B] rounded px-2.5 py-1 text-[10px] font-mono text-white shadow-lg">
                    <span className="font-bold text-[#F59E0B] block">Drone 2 · DR-003</span>
                    <span className="text-[9px] text-[#94A3B8]">Thermal</span>
                  </div>
                  <div className="absolute bottom-[28%] right-[22%] z-10 pointer-events-none bg-[#07101CF0] border border-[#A855F7] rounded px-2.5 py-1 text-[10px] font-mono text-white shadow-lg">
                    <span className="font-bold text-[#A855F7] block">Drone 3 · DR-007</span>
                    <span className="text-[9px] text-[#94A3B8]">Survey</span>
                  </div>
                </>
              )}

              {/* Home Base Marker */}
              <div className="absolute bottom-[44%] left-[16%] z-10 pointer-events-none">
                <div className="w-6 h-6 rounded-full bg-[#10B981] border-2 border-white flex items-center justify-center font-bold text-white text-[11px] shadow-lg">
                  H
                </div>
              </div>

              {/* Compass & Schematic label */}
              <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2 pointer-events-none">
                <div className="bg-[#07101CCC] text-[#8E9EAA] text-[9.5px] font-mono px-2 py-1 rounded border border-[#1C2C42]">
                  Schematic - Illustrative
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE DRONE FEED & TELEMETRY (lg:col-span-4)              */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Live Drone Feed Widget */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Live Drone Feed</h3>
                {/* Drone Selector Tabs */}
                <div className="flex items-center gap-1 bg-[#07101C] p-0.5 rounded border border-[#1C2C42]">
                  {fleetTelemetry.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDroneId(d.id)}
                      className={`px-2 py-0.5 text-[10.5px] font-bold rounded transition cursor-pointer ${
                        selectedDroneId === d.id
                          ? "bg-[#2563EB] text-white"
                          : "text-[#8E9EAA] hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* "Take Control of DR-001" CTA Banner (Matching reference) */}
              <button
                type="button"
                onClick={() => navigate("/remote-pilot")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#2563EB]/20 border border-[#2563EB] text-[#38BDF8] hover:bg-[#2563EB]/30 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[#38BDF8] group-hover:rotate-45 transition-transform" />
                  <div>
                    <div className="text-xs font-extrabold text-white">Take Control of {activeDrone.id}</div>
                    <div className="text-[10px] text-[#93C5FD]">Pilot view, flight modes and the emergency deck</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Video Player Box */}
              <div className="relative h-48 rounded-lg overflow-hidden border border-[#1C2C42] bg-[#050B12] group">
                <img
                  src={sampleImg || droneLandscapeImg}
                  alt="Live Drone Feed"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Top Feed Header */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 bg-[#EF4444] text-white px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE
                    </span>
                    <span className="bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded font-mono font-bold text-[9.5px]">
                      {activeDrone.cameraName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className="p-1 rounded bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                    >
                      {isVideoMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/remote-pilot")}
                      className="p-1 rounded bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Overlaid Telemetry HUD on Video Feed */}
                <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-mono leading-tight space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>
                      ALT {activeDrone.alt} m · SPD {activeDrone.speed} m/s · BATT {activeDrone.battery}%
                    </span>
                    <span className="text-[#38BDF8]">08:42:17 AM</span>
                  </div>
                  <div className="text-[9px] text-[#CBD5E1]">
                    {activeDrone.coords} · {activeDrone.sector}
                  </div>
                </div>
              </div>
            </div>

            {/* Telemetry Strip List */}
            <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm flex-1 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase">Telemetry</h3>
              <div className="space-y-2 text-xs">
                {fleetTelemetry.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDroneId(d.id)}
                    className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      selectedDroneId === d.id
                        ? "bg-[#102A50] border-[#2563EB]"
                        : "bg-[#07101C] border-[#1C2C42] hover:bg-[#0A1422]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Plane className={`w-4 h-4 ${selectedDroneId === d.id ? "text-[#38BDF8]" : "text-[#8E9EAA]"}`} />
                      <div>
                        <div className="font-bold text-white text-[11.5px]">
                          {d.label} · {d.id}
                        </div>
                        <div className="text-[10px] text-[#8E9EAA]">
                          {d.role} · {d.alt} m · {d.link}
                        </div>
                      </div>
                    </div>
                    {/* Battery Bar */}
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white">
                      <div className="w-12 h-2 rounded-full bg-[#1C2C42] overflow-hidden">
                        <div
                          className={`h-full ${
                            d.battery > 50 ? "bg-[#10B981]" : d.battery > 25 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                          }`}
                          style={{ width: `${d.battery}%` }}
                        />
                      </div>
                      <span>{d.battery}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1C2C42] text-[10px] text-[#8E9EAA] flex items-center justify-between">
                <span>Mesh Link: 38 ms</span>
                <button
                  type="button"
                  onClick={() => navigate("/swarm-control")}
                  className="text-[#38BDF8] hover:underline font-bold"
                >
                  Swarm Mesh &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM SECTION: EVENTS, OPERATOR CONTROLS & ALERTS                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Left: Events Timeline (md:col-span-4) */}
          <div className="md:col-span-4 bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase">Events</h3>
              <button
                type="button"
                onClick={() => navigate("/logs")}
                className="text-[10px] text-[#38BDF8] hover:underline font-bold"
              >
                All Logs &rarr;
              </button>
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] mt-1 shrink-0" />
                <div>
                  <span className="text-[#EF4444] font-bold">08:37</span> Alert raised and sent to Command Center
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mt-1 shrink-0" />
                <div>
                  <span className="text-[#10B981] font-bold">08:22</span> Waypoint block 4 completed
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] mt-1 shrink-0" />
                <div>
                  <span className="text-[#38BDF8] font-bold">08:18</span> Swarm re-tasked one drone for a second pass
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mt-1 shrink-0" />
                <div>
                  <span className="text-[#10B981] font-bold">08:05</span> All drones entered the mission area
                </div>
              </div>
            </div>
          </div>

          {/* Center: Operator Controls (md:col-span-4) */}
          <div className="md:col-span-4 bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold text-white tracking-tight uppercase">Operator Controls</h3>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => navigate("/remote-pilot")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Crosshair className="w-4 h-4 text-[#38BDF8] mb-1" />
                <span>Take Control</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/remote-pilot")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Radio className="w-4 h-4 text-[#38BDF8] mb-1" />
                <span>Remote Pilot</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("Mission paused. Swarm hovering in position.", "warning")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Pause className="w-4 h-4 text-[#F59E0B] mb-1" />
                <span>Pause Mission</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("Return to Home initiated for all drones.", "info")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#10B981] mb-1" />
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("Position hold engaged.", "info")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Shield className="w-4 h-4 text-[#38BDF8] mb-1" />
                <span>Hold Position</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRecording(!isRecording);
                  showToast(isRecording ? "Recording saved." : "Recording started.");
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Video className={`w-4 h-4 ${isRecording ? "text-[#EF4444]" : "text-[#8E9EAA]"} mb-1`} />
                <span>Record Clip</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("Notification dispatched to site engineering team.")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Bell className="w-4 h-4 text-[#F59E0B] mb-1" />
                <span>Notify Site Team</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/swarm-control")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#07101C] hover:bg-[#102A50] border border-[#1C2C42] hover:border-[#2563EB] text-[#C1D0E4] hover:text-white transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#8B5CF6] mb-1" />
                <span>Swarm Control</span>
              </button>
            </div>
          </div>

          {/* Right: Alerts on this mission (md:col-span-4) */}
          <div className="md:col-span-4 bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3.5 space-y-2.5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-white tracking-tight uppercase">Alerts on this mission</h3>
                <button
                  type="button"
                  onClick={() => navigate("/incidents")}
                  className="text-[10px] text-[#38BDF8] hover:underline font-bold"
                >
                  View Details &rarr;
                </button>
              </div>
              <div
                onClick={() => navigate("/incidents")}
                className="p-2.5 rounded-lg bg-[#140E1B] border border-[#EF4444]/40 hover:border-[#EF4444] transition cursor-pointer flex items-start gap-3"
              >
                <div className="w-12 h-12 rounded bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-[#F87171] shrink-0">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs">
                  <div className="font-extrabold text-[#F87171]">Thermal Anomaly</div>
                  <div className="text-[10px] text-[#C1D0E4]">North Ridge Dam · downstream toe, chainage 140 m</div>
                  <p className="text-[10px] text-[#8E9EAA] mt-1 leading-snug">
                    A cold band 6 m long on the downstream slope: the pattern of seepage. Swarm re-tasked DR-007 for a second pass.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#8E9EAA] flex items-center justify-between pt-1 border-t border-[#1C2C42]">
              <span>Severity: Priority High</span>
              <span className="text-[#10B981] font-semibold">Autonomous Retask Active</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER VALUES / ASSURANCE STRIP                                       */}
        {/* ========================================================================= */}
        <div className="bg-[#0C1624] border border-[#1C2C42] rounded-xl p-3 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-[#1C2C42]">
            <div className="flex items-center gap-2.5 px-2">
              <Compass className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Plan with Confidence</span>
                <span className="text-[10px] text-[#8E9EAA]">Accurate, efficient and safe missions.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Zap className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Multi-Drone, Multi-Use</span>
                <span className="text-[10px] text-[#8E9EAA]">Any industry. Any environment.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <BarChart3 className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">From Data to Decisions</span>
                <span className="text-[10px] text-[#8E9EAA]">Turn aerial data into real value.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Shield className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Safer Operations</span>
                <span className="text-[10px] text-[#8E9EAA]">People. Assets. Communities.</span>
              </div>
            </div>
            <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
              <span className="text-[10px] font-mono tracking-widest font-extrabold text-[#CBD5E1] uppercase">
                One Fleet. Any Mission.
              </span>
              <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                Always Ready.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveOperationsPage;
