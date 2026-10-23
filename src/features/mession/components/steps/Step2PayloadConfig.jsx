import React, { useState, useMemo } from "react"
import {
  Camera,
  Layers,
  HardDrive,
  Clock,
  CheckCircle2,
  Sliders,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Video,
  Eye,
  Radio,
  FileCheck,
} from "lucide-react"
import droneMountainImg from "@/assets/images/drone_mountain_survey.jpg"
import { getPayloadImage } from "@/assets/payloads/index.js"
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx"

/**
 * Dynamic caption helper for Sample Output
 */
function getSampleOutputCaption(payloadId, payloadTitle) {
  switch (payloadId) {
    case "rgb":
      return "Live optical video stream · 4K UHD · Geotagged inspection capture"
    case "thermal":
      return "Live radiometric thermal imagery · 640×512 · Temperature delta map"
    case "zoom":
      return "Live telephoto zoom stream · 30x optical zoom · Gimbal stabilized"
    case "multispectral":
      return "Live multispectral stream · 5-band NDVI & crop reflectance"
    case "lidar":
      return "Live 3D point cloud telemetry · 240,000 pts/sec · Elevation model"
    case "gas":
      return "Live multi-gas sniffer telemetry · CH₄, CO₂, H₂S & VOC ppm readings"
    case "speaker":
      return "Acoustic broadcast status · 120 dB megaphone & 2-way intercom"
    case "drop":
      return "Servo latch telemetry · Dual safety interlock & payload load cell"
    default:
      return `${payloadTitle} real-time capture & telemetry output`
  }
}

/**
 * Genuine Sensor Readings View for non-video payloads (LiDAR, Gas Sensor, Speaker, Drop Mechanism)
 */
function SensorReadingsOutput({ payloadId, droneId = "DR-001", isExpanded = false }) {
  if (payloadId === "lidar") {
    return (
      <div className={`h-full w-full bg-[#05080C] ${isExpanded ? "p-6" : "p-3"} flex flex-col justify-between font-mono text-slate-300 relative overflow-hidden select-none`}>
        {/* Aerospace Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
          <div className={`${isExpanded ? "w-64 h-64" : "w-28 h-28"} rounded-full border border-dashed border-[#38BDF8]`} />
          <div className={`${isExpanded ? "w-40 h-40" : "w-16 h-16"} rounded-full border border-[#38BDF8]`} />
          <div className="absolute w-full h-[1px] bg-[#38BDF8]/40" />
          <div className="absolute h-full w-[1px] bg-[#38BDF8]/40" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
            <span className="font-bold text-emerald-400 text-[9px] sm:text-[10px] tracking-wider uppercase">
              LIDAR TELEMETRY
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[9px] uppercase font-semibold">{droneId}</span>
          </div>
          <span className="text-[#38BDF8] text-[9px] sm:text-[10px] font-bold">240,000 PTS/SEC</span>
        </div>

        {/* Telemetry Grid */}
        <div className={`relative z-10 grid grid-cols-2 ${isExpanded ? "gap-4 my-4" : "gap-1.5 my-1"}`}>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Return Mode</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-cyan-300 truncate">Dual (Str + Last)</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Point Density</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-cyan-300 truncate">~120 pts/m² · 3cm</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">FOV Scan Angle</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-cyan-300 truncate">70.4° H · 40.0° V</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Range Distance</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-emerald-400 truncate">42.8 m Nadir</div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="relative z-10 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
          <span className="truncate">LASER CH 32 · 905nm CLASS 1</span>
          <span className="text-emerald-400 font-bold shrink-0 ml-1">CALIBRATED</span>
        </div>
      </div>
    )
  }

  if (payloadId === "gas") {
    return (
      <div className={`h-full w-full bg-[#05080C] ${isExpanded ? "p-6" : "p-3"} flex flex-col justify-between font-mono text-slate-300 relative overflow-hidden select-none`}>
        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
            <span className="font-bold text-emerald-400 text-[9px] sm:text-[10px] tracking-wider uppercase">
              SNIFFER ARRAY
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[9px] uppercase font-semibold">{droneId}</span>
          </div>
          <span className="text-amber-400 text-[9px] sm:text-[10px] font-bold">AIR QUALITY: NOMINAL</span>
        </div>

        {/* Real-time Gas Readings */}
        <div className={`relative z-10 grid grid-cols-2 ${isExpanded ? "gap-4 my-4" : "gap-1.5 my-1"}`}>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
              <span className="text-slate-400">CH₄ Methane</span>
              <span className="text-emerald-400 font-bold">0.4 ppm</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[15%]" />
            </div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
              <span className="text-slate-400">CO₂ Carbon</span>
              <span className="text-emerald-400 font-bold">416 ppm</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[35%]" />
            </div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
              <span className="text-slate-400">H₂S Sulfide</span>
              <span className="text-emerald-400 font-bold">&lt; 0.01 ppm</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[5%]" />
            </div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
              <span className="text-slate-400">VOCs Total</span>
              <span className="text-emerald-400 font-bold">14 ppb</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[12%]" />
            </div>
          </div>
        </div>

        {/* Atmospheric Sensor Telemetry */}
        <div className="relative z-10 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
          <span>TEMP: 24.6°C · RH: 52%</span>
          <span className="text-slate-300 font-bold">BARO: 1013.2 hPa</span>
        </div>
      </div>
    )
  }

  if (payloadId === "speaker") {
    return (
      <div className={`h-full w-full bg-[#05080C] ${isExpanded ? "p-6" : "p-3"} flex flex-col justify-between font-mono text-slate-300 relative overflow-hidden select-none`}>
        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
            <span className="font-bold text-emerald-400 text-[9px] sm:text-[10px] tracking-wider uppercase">
              ACOUSTIC SYSTEM
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[9px] uppercase font-semibold">{droneId}</span>
          </div>
          <span className="text-pink-400 text-[9px] sm:text-[10px] font-bold">120 dB @ 1M</span>
        </div>

        {/* Acoustic Status Grid */}
        <div className={`relative z-10 grid grid-cols-2 ${isExpanded ? "gap-4 my-4" : "gap-1.5 my-1"}`}>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Audio Link</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-pink-300 truncate">2-Way PTT Ch 4</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Siren Preset</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-pink-300 truncate">Evacuation Alert 1</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Sound Projection</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate">500 m Range</div>
          </div>
          <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
            <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Amplifier Temp</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-emerald-400 truncate">34.2°C (Optimal)</div>
          </div>
        </div>

        {/* Codec & Latency */}
        <div className="relative z-10 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
          <span>OPUS 48 kHz / 16-BIT</span>
          <span className="text-emerald-400 font-bold">STANDBY · LATENCY &lt; 85ms</span>
        </div>
      </div>
    )
  }

  // Drop Mechanism
  return (
    <div className={`h-full w-full bg-[#05080C] ${isExpanded ? "p-6" : "p-3"} flex flex-col justify-between font-mono text-slate-300 relative overflow-hidden select-none`}>
      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
          <span className="font-bold text-emerald-400 text-[9px] sm:text-[10px] tracking-wider uppercase">
            SERVO MECHANISM
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[9px] uppercase font-semibold">{droneId}</span>
        </div>
        <span className="text-amber-400 text-[9px] sm:text-[10px] font-bold">CAPACITY: 5.0 KG</span>
      </div>

      {/* Drop Mechanism Telemetry */}
      <div className={`relative z-10 grid grid-cols-2 ${isExpanded ? "gap-4 my-4" : "gap-1.5 my-1"}`}>
        <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
          <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Servo Latch</div>
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-400 truncate">Engaged · Locked</div>
        </div>
        <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
          <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Safety Interlock</div>
          <div className="text-[10px] sm:text-[11px] font-bold text-amber-300 truncate">Armed (Waypoint)</div>
        </div>
        <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
          <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Payload Load Cell</div>
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate">0.00 kg (Tare)</div>
        </div>
        <div className="bg-[#0B1522]/90 border border-[#1E324A] rounded p-1.5">
          <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-tight">Release Command</div>
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate">Auto at WP #4</div>
        </div>
      </div>

      {/* Actuator Status */}
      <div className="relative z-10 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
        <span>60G METAL SERVO · PIN 1</span>
        <span className="text-emerald-400 font-bold">ARMED &amp; SECURED</span>
      </div>
    </div>
  )
}

const PAYLOAD_CATALOG = [
  {
    id: "rgb",
    title: "RGB Camera",
    desc: "High resolution visual imaging",
    tags: ["4K", "20 MP"],
    category: "Imaging",
    stock: 24,
    resolution: "4K (3840 x 2160)",
    weight: "480 g",
    image: getPayloadImage("rgb"),
  },
  {
    id: "thermal",
    title: "Thermal Camera",
    desc: "Detect heat signatures day or night",
    tags: ["640 x 512", "≤ 50 mK"],
    category: "Inspection",
    stock: 12,
    resolution: "640 x 512 Radiometric",
    weight: "320 g",
    image: getPayloadImage("thermal"),
  },
  {
    id: "lidar",
    title: "LiDAR",
    desc: "3D mapping and high-precision models",
    tags: ["Up to 300 m", "cm accuracy"],
    category: "Mapping",
    stock: 8,
    resolution: "240,000 pts/sec",
    weight: "850 g",
    image: getPayloadImage("lidar"),
  },
  {
    id: "multispectral",
    title: "Multispectral",
    desc: "Vegetation, crop and environmental analysis",
    tags: ["5 bands", "NDVI"],
    category: "Environmental",
    stock: 6,
    resolution: "5 x 3.2 MP",
    weight: "410 g",
    image: getPayloadImage("multispectral"),
  },
  {
    id: "gas",
    title: "Gas Sensor",
    desc: "Detect methane, CO2, H2S and more",
    tags: ["ppm level", "Real-time"],
    category: "Environmental",
    stock: 5,
    resolution: "1 ppm Sensitivity",
    weight: "260 g",
    image: getPayloadImage("gas"),
  },
  {
    id: "zoom",
    title: "Zoom Camera",
    desc: "Long range inspection and surveillance",
    tags: ["30x optical", "4K"],
    category: "Security",
    stock: 14,
    resolution: "30x Optical / 4K",
    weight: "540 g",
    image: getPayloadImage("zoom"),
  },
  {
    id: "speaker",
    title: "Speaker / Siren",
    desc: "Audio communication and alerts",
    tags: ["120 dB", "Two-way"],
    category: "Security",
    stock: 9,
    resolution: "120 dB at 1m",
    weight: "350 g",
    image: getPayloadImage("speaker"),
  },
  {
    id: "drop",
    title: "Drop Mechanism",
    desc: "Deliver payloads, e.g. sensors, supplies",
    tags: ["5 kg", "Precision drop"],
    category: "Other",
    stock: 4,
    resolution: "Servo release",
    weight: "210 g",
    image: getPayloadImage("drop"),
  },
]

export const Step2PayloadConfig = ({
  formData,
  setFormData,
  registeredDrones = [],
  triggerToast,
}) => {
  const [activeCatalogFilter, setActiveCatalogFilter] = useState("All")
  const [selectedPayloadId, setSelectedPayloadId] = useState("rgb")
  const [selectedDroneAssign, setSelectedDroneAssign] = useState("Drone 1 - RGB Camera")
  const [showSampleModal, setShowSampleModal] = useState(false)

  // Resolve canonical drone ID from drone assignment or registered drones
  const activeDroneId = useMemo(() => {
    if (!selectedDroneAssign) return registeredDrones?.[0]?.id || "DR-001"
    const lower = String(selectedDroneAssign).toLowerCase()
    if (lower.includes("drone 1") || lower.includes("dr-001") || lower.includes("falcon")) {
      return registeredDrones?.[0]?.id || "DR-001"
    }
    if (lower.includes("drone 2") || lower.includes("dr-002") || lower.includes("spectre")) {
      return registeredDrones?.[1]?.id || "DR-002"
    }
    if (lower.includes("drone 3") || lower.includes("dr-003") || lower.includes("therma")) {
      return registeredDrones?.[2]?.id || "DR-003"
    }
    if (lower.includes("drone 4") || lower.includes("dr-004") || lower.includes("hawk")) {
      return registeredDrones?.[3]?.id || "DR-004"
    }
    const found = (registeredDrones || []).find(
      (d) => d.id === selectedDroneAssign || d.name === selectedDroneAssign || d.droneId === selectedDroneAssign
    )
    if (found) return found.id || found.droneId
    return "DR-001"
  }, [selectedDroneAssign, registeredDrones])

  // Resolve camera stream type for imaging payloads
  const cameraType = useMemo(() => {
    if (selectedPayloadId === "thermal") return "thermal"
    if (selectedPayloadId === "zoom") return "zoom"
    if (selectedPayloadId === "multispectral") return "multispectral"
    return "main"
  }, [selectedPayloadId])

  // Imaging sensors vs non-video sensors
  const isVideoPayload = ["rgb", "thermal", "zoom", "multispectral"].includes(selectedPayloadId)

  // Sync dropdown when changing assigned drone
  const handleDroneAssignChange = (e) => {
    const val = e.target.value
    setSelectedDroneAssign(val)
    const lower = val.toLowerCase()
    if (lower.includes("lidar")) setSelectedPayloadId("lidar")
    else if (lower.includes("multispectral")) setSelectedPayloadId("multispectral")
    else if (lower.includes("rgb")) setSelectedPayloadId("rgb")
    else if (lower.includes("thermal")) setSelectedPayloadId("thermal")
    else if (lower.includes("gas")) setSelectedPayloadId("gas")
    else if (lower.includes("zoom")) setSelectedPayloadId("zoom")
    else if (lower.includes("speaker")) setSelectedPayloadId("speaker")
    else if (lower.includes("drop")) setSelectedPayloadId("drop")
  }

  // Drone count - dynamic based on registered drones or fallback
  const droneCount = registeredDrones.length > 0 ? registeredDrones.length : formData.droneCount || 3

  const filteredCatalog = PAYLOAD_CATALOG.filter((item) => {
    if (activeCatalogFilter === "All") return true
    return item.category === activeCatalogFilter
  })

  const currentPayload = PAYLOAD_CATALOG.find((p) => p.id === selectedPayloadId) || PAYLOAD_CATALOG[0]

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Stat KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#CBD5E1] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1B68D2] flex items-center justify-center shrink-0 border border-blue-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#0F284E] leading-tight">
              {droneCount}
            </div>
            <div className="text-xs font-semibold text-[#334155]">Drones Selected</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center shrink-0 border border-indigo-200">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#0F284E] leading-tight">4</div>
            <div className="text-xs font-semibold text-[#334155]">Payload Types</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 border border-amber-200">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#0F284E] leading-tight">~20 GB</div>
            <div className="text-xs font-semibold text-[#334155]">Estimated Data</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-[#0E7490] flex items-center justify-center shrink-0 border border-cyan-200">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#0F284E] leading-tight">5 min</div>
            <div className="text-xs font-semibold text-[#334155]">Est. Flight Time</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Compatible</div>
            <div className="text-[11px] font-semibold text-emerald-800">All payloads supported</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Payload Catalog & Configuration Form */}
        <div className="lg:col-span-7 space-y-4">
          {/* Payload Catalog */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-base font-bold text-[#0F284E]">Payload Catalog</h3>
                <p className="text-xs text-[#334155] font-medium">Select from a wide range of payloads and sensors.</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {["All", "Imaging", "Mapping", "Environmental", "Inspection", "Security", "Other"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveCatalogFilter(f)}
                    className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer whitespace-nowrap text-xs ${
                      activeCatalogFilter === f
                        ? "bg-[#1B68D2] text-white shadow-2xs"
                        : "bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] hover:bg-white hover:text-[#0F284E]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* 8 Payload Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {filteredCatalog.map((item) => {
                const isSelected = item.id === selectedPayloadId
                const imgSource = item.image || getPayloadImage(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPayloadId(item.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? "border-[#1B68D2] bg-[#EFF6FF] shadow-xs ring-2 ring-[#1B68D2]/40"
                        : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="space-y-1.5">
                      {/* Product Image Container */}
                      <div className="w-full h-20 sm:h-24 rounded-lg bg-white flex items-center justify-center mb-1.5 overflow-hidden border border-slate-100 shadow-2xs">
                        {imgSource ? (
                          <img
                            src={imgSource}
                            alt={item.title}
                            className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full items-center justify-center text-slate-400"
                          style={{ display: imgSource ? 'none' : 'flex' }}
                        >
                          <Camera className="w-6 h-6 text-slate-400" />
                        </div>
                      </div>

                      <div className={`text-xs sm:text-[13px] font-bold truncate transition-colors ${
                        isSelected ? "text-[#1B68D2]" : "text-[#0F284E]"
                      }`}>
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#334155] line-clamp-2 leading-snug font-medium">
                        {item.desc}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-2.5">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#0F284E] border border-slate-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payload Configuration Form */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F284E]">Payload Configuration</h3>
              <select
                value={selectedDroneAssign}
                onChange={handleDroneAssignChange}
                className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-bold text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
              >
                <option>Drone 1 - RGB Camera</option>
                <option>Drone 2 - LiDAR</option>
                <option>Drone 3 - Multispectral</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-[13px]">
              {/* Left Column: Capture Settings */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-[#1B68D2] uppercase tracking-wider">
                  Capture Settings
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Resolution</label>
                  <select
                    value={formData.payloadResolution || "4K (3840 x 2160)"}
                    onChange={(e) => setFormData({ ...formData, payloadResolution: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>4K (3840 x 2160)</option>
                    <option>8K (7680 x 4320)</option>
                    <option>1080p FHD (1920 x 1080)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Capture Mode</label>
                  <select
                    value={formData.captureMode || "Timed Interval"}
                    onChange={(e) => setFormData({ ...formData, captureMode: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option>Timed Interval</option>
                    <option>Distance Interval</option>
                    <option>Cross-Track Trigger</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Interval</label>
                  <select
                    value={`${formData.captureInterval || 2} sec`}
                    onChange={(e) => setFormData({ ...formData, captureInterval: parseFloat(e.target.value) || 2 })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option value="1">1 sec</option>
                    <option value="2">2 sec</option>
                    <option value="3">3 sec</option>
                    <option value="5">5 sec</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Gimbal Angle</label>
                  <select
                    value={`${formData.gimbalPitch || -90}°`}
                    onChange={(e) => setFormData({ ...formData, gimbalPitch: parseInt(e.target.value) || -90 })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer"
                  >
                    <option value="-90">Nadir (90°)</option>
                    <option value="-45">Oblique (45°)</option>
                    <option value="0">Horizontal (0°)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Zoom</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>1x</option>
                    <option>2x</option>
                    <option>5x</option>
                    <option>10x Optical</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Image Format</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>JPEG + Geotag</option>
                    <option>RAW (DNG) + JPEG</option>
                    <option>TIFF (16-bit Multispectral)</option>
                  </select>
                </div>

                <div className="pt-1.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Record Video</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Save to Onboard Storage</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                </div>
              </div>

              {/* Right Column: Advanced Settings */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-[#0F284E] uppercase tracking-wider">
                  Advanced Settings
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Exposure</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>Auto</option>
                    <option>Shutter Priority (1/1000s)</option>
                    <option>Manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">White Balance</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>Auto</option>
                    <option>Sunny (5500K)</option>
                    <option>Cloudy (6500K)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">ISO Range</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>100 - 1600</option>
                    <option>100 - 400 (Low Noise)</option>
                    <option>Auto (100 - 6400)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Focus Mode</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>Auto</option>
                    <option>Infinity (Mapping)</option>
                    <option>Manual Focus</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Overlap (Mapping)</label>
                  <input
                    type="text"
                    readOnly
                    value={`Front ${formData.frontOverlap || 75}% | Side ${formData.sideOverlap || 65}%`}
                    className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#334155] shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[12px] sm:text-[13px] text-[#0F284E] block mb-1 font-bold">Storage</label>
                  <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 font-semibold text-xs sm:text-[13px] text-[#0F284E] shadow-2xs focus:border-[#1B68D2] outline-none cursor-pointer">
                    <option>512 GB card</option>
                    <option>256 GB High-Speed V90</option>
                    <option>Internal 1TB SSD</option>
                  </select>
                </div>

                <div className="pt-1.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Geotagging</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Real-time Streaming</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Selected Payloads, Objective Table & Previews */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Payloads by Drone */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F284E]">Selected Payloads (Per Drone)</h3>
                <p className="text-xs text-[#334155] font-medium">Assign payloads to each drone in the mission.</p>
              </div>
              <button
                type="button"
                onClick={() => triggerToast?.("Auto-assigned optimal payloads based on sensor weights.")}
                className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1B68D2] hover:bg-[#DBEAFE] text-xs font-bold cursor-pointer transition shadow-2xs"
              >
                Auto Assign
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { drone: "Drone 1 DR-001", model: "DJI Matrice 350", primary: "RGB Camera", secondary: "Thermal Camera" },
                { drone: "Drone 2 DR-003", model: "Autel EVO Max", primary: "LiDAR", secondary: "RGB Camera" },
                { drone: "Drone 3 DR-007", model: "DJI Mavic 3T", primary: "Multispectral", secondary: "Thermal Camera" },
              ].map((row, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] flex items-center justify-between gap-3 text-xs sm:text-[13px]">
                  <div className="min-w-0">
                    <div className="font-bold text-[#0F284E] truncate text-xs sm:text-[13px]">{row.drone}</div>
                    <div className="text-xs text-[#475569] font-medium">{row.model}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#1B68D2] text-xs font-bold">
                      {row.primary}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[#334155] text-xs font-semibold">
                      {row.secondary}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drone — Payload — Capture Objective Table */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#0F284E] uppercase tracking-wider">
              Drone — Payload — Capture Objective
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] text-[#0F284E] uppercase tracking-wider">
                    <th className="pb-2 font-bold">Drone</th>
                    <th className="pb-2 font-bold">Payload</th>
                    <th className="pb-2 font-bold">Capture Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  <tr
                    onClick={() => {
                      setSelectedDroneAssign("Drone 1 - RGB Camera")
                      setSelectedPayloadId("rgb")
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedDroneAssign.includes("Drone 1") && selectedPayloadId === "rgb"
                        ? "bg-blue-50/70 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 font-bold text-[#0F284E]">Drone 1</td>
                    <td className="py-2.5 text-[#1B68D2] font-bold">RGB Camera</td>
                    <td className="py-2.5 text-[#334155] font-medium">Orthomosaic and visual defect record</td>
                  </tr>
                  <tr
                    onClick={() => {
                      setSelectedDroneAssign("Drone 1 - RGB Camera")
                      setSelectedPayloadId("thermal")
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedDroneAssign.includes("Drone 1") && selectedPayloadId === "thermal"
                        ? "bg-indigo-50/70 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 font-bold text-[#0F284E]">Drone 1</td>
                    <td className="py-2.5 text-indigo-700 font-bold">Thermal Camera</td>
                    <td className="py-2.5 text-[#334155] font-medium">Seepage: cold bands on the downstream slope</td>
                  </tr>
                  <tr
                    onClick={() => {
                      setSelectedDroneAssign("Drone 2 - LiDAR")
                      setSelectedPayloadId("lidar")
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedDroneAssign.includes("Drone 2") && selectedPayloadId === "lidar"
                        ? "bg-emerald-50/70 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 font-bold text-[#0F284E]">Drone 2</td>
                    <td className="py-2.5 text-emerald-700 font-bold">LiDAR</td>
                    <td className="py-2.5 text-[#334155] font-medium">3D model of the dam face to 3 cm</td>
                  </tr>
                  <tr
                    onClick={() => {
                      setSelectedDroneAssign("Drone 3 - Multispectral")
                      setSelectedPayloadId("multispectral")
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedDroneAssign.includes("Drone 3") && selectedPayloadId === "multispectral"
                        ? "bg-purple-50/70 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 font-bold text-[#0F284E]">Drone 3</td>
                    <td className="py-2.5 text-purple-700 font-bold">Multispectral</td>
                    <td className="py-2.5 text-[#334155] font-medium">Vegetation growth on the embankment (NDVI)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Previews Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payload Preview */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-3.5 shadow-xs space-y-2">
              <div className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Payload Preview</div>
              <div className="h-32 sm:h-36 rounded-lg bg-[#F8FAFC] border border-slate-200 overflow-hidden relative flex items-center justify-center p-2">
                <img
                  src={getPayloadImage(currentPayload.id) || droneMountainImg}
                  alt={currentPayload.title}
                  className="max-h-full max-w-full object-contain p-2"
                />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F284E] bg-white/95 px-2 py-0.5 rounded shadow-2xs border border-slate-200">{currentPayload.title}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">{currentPayload.stock} in stock</span>
                </div>
              </div>
              <div className="text-xs text-[#475569] font-medium">{currentPayload.desc} · {currentPayload.weight}</div>
            </div>

            {/* Sample Output */}
            <div className="bg-white rounded-xl border border-[#CBD5E1] p-3.5 shadow-xs space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-[13px] font-bold text-[#0F284E]">Sample Output</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {isVideoPayload ? "LIVE FEED" : "SENSOR OUTPUT"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSampleModal(true)}
                  className="text-slate-500 hover:text-[#1B68D2] cursor-pointer p-0.5 rounded hover:bg-slate-100 transition"
                  title="Expand sample output"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div
                className="h-32 sm:h-36 rounded-lg overflow-hidden border border-slate-200 bg-[#04070B] relative"
              >
                {isVideoPayload ? (
                  <LiveDroneFeed
                    key={`${activeDroneId}-${cameraType}`}
                    droneId={activeDroneId}
                    cameraType={cameraType}
                    videoFit="contain"
                    showHudBar={true}
                    className="h-full w-full"
                  />
                ) : (
                  <SensorReadingsOutput
                    payloadId={selectedPayloadId}
                    droneId={activeDroneId}
                  />
                )}
              </div>

              <div className="text-xs text-[#475569] font-medium truncate flex items-center justify-between">
                <span className="truncate">{getSampleOutputCaption(selectedPayloadId, currentPayload.title)}</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-1.5 uppercase">
                  {activeDroneId}
                </span>
              </div>
            </div>
          </div>

          {/* Estimated Data Volume */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-3.5 shadow-xs flex items-center justify-between text-xs sm:text-[13px]">
            <div>
              <div className="font-bold text-[#0F284E] text-xs sm:text-[13px]">Estimated Data Volume</div>
              <div className="text-xs text-[#475569] font-medium">Images, video and LiDAR point cloud come to ~20 GB.</div>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-[#1B68D2]">
              <span>~8 GB Images</span>
              <span className="text-slate-300">|</span>
              <span>~6 GB Video</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal: Real Live Stream or Sensor Output */}
      {showSampleModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSampleModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full p-4 overflow-hidden shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  {currentPayload.title} Capture · {activeDroneId}
                </h4>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {isVideoPayload ? "Live WebRTC Camera Stream" : "Real-time Telemetry"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-slate-500 hover:text-slate-800 font-bold px-2 py-1 cursor-pointer rounded hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="h-[60vh] max-h-[520px] w-full rounded-xl overflow-hidden bg-[#04070B] border border-slate-800 relative">
              {isVideoPayload ? (
                <LiveDroneFeed
                  key={`modal-${activeDroneId}-${cameraType}`}
                  droneId={activeDroneId}
                  cameraType={cameraType}
                  videoFit="contain"
                  showHudBar={true}
                  className="h-full w-full"
                />
              ) : (
                <SensorReadingsOutput
                  payloadId={selectedPayloadId}
                  droneId={activeDroneId}
                  isExpanded={true}
                />
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span className="truncate">{getSampleOutputCaption(selectedPayloadId, currentPayload.title)}</span>
              <span className="font-mono text-[11px] text-slate-400 shrink-0 ml-2">
                Resolution: {currentPayload.resolution} · Weight: {currentPayload.weight}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step2PayloadConfig
