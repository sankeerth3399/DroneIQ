import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Sparkles,
  User,
  Car,
  Flame,
  Thermometer,
  Leaf,
  Activity,
  Droplet,
  Box,
  Wrench,
  Bell,
  Users,
  FileText,
  ShieldCheck,
  Zap,
  Clock,
  Video,
  VideoOff,
  RotateCw,
  Wifi,
  AlertTriangle,
} from "lucide-react"
import LiveDroneFeed from "@/components/video/LiveDroneFeed.jsx"
import { droneService } from "@/services/api/droneService.js"
import { incidentService } from "@/services/api/incidentService.js"

/**
 * 9 Standard AI Detectors Supported in AeroNexus DroneIQ
 */
const ALL_DETECTORS = [
  {
    id: "people",
    name: "People",
    icon: User,
    condition: "Anyone inside the unit cordon",
    action: "Alert + hold position",
    actionType: "danger",
    defaultConfidence: 85,
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: Car,
    condition: "Unauthorized vehicle in perimeter corridor",
    action: "Alert + hold position",
    actionType: "danger",
    defaultConfidence: 80,
  },
  {
    id: "smoke_fire",
    name: "Smoke / Fire",
    icon: Flame,
    condition: "Any smoke or flame, 3 frames in a row",
    action: "Alert + hold position",
    actionType: "danger",
    defaultConfidence: 75,
  },
  {
    id: "thermal",
    name: "Thermal anomalies",
    icon: Thermometer,
    condition: "Surface 25°C above its baseline",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 80,
  },
  {
    id: "vegetation",
    name: "Vegetation",
    icon: Leaf,
    condition: "Vegetation encroachment within 3m buffer",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 70,
  },
  {
    id: "cracks",
    name: "Cracks",
    icon: Activity,
    condition: "Surface fissure > 2mm width along structure",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 85,
  },
  {
    id: "water_seepage",
    name: "Water / Seepage",
    icon: Droplet,
    condition: "Moisture accumulation or pipe leakage detected",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 75,
  },
  {
    id: "objects_debris",
    name: "Objects / Debris",
    icon: Box,
    condition: "Foreign object on the asset",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 75,
  },
  {
    id: "asset_defects",
    name: "Asset defects",
    icon: Wrench,
    condition: "Corrosion, missing insulation, loose cladding",
    action: "Alert + tag frame",
    actionType: "primary",
    defaultConfidence: 85,
  },
]

/**
 * Step9AiDetection Component
 * Mission Planning -> Payload -> AI Detection (Step 9 of 13)
 * Exactly reproduces the reference design layout:
 * - Left column: What Should This Mission Look For? + Thresholds and Alert Rules
 * - Right column: Sample Detection + Where Alerts Go + Model Information
 */
export const Step9AiDetection = ({
  formData = {},
  setFormData,
  currentProject = null,
  registeredDrones = [],
  triggerToast,
}) => {
  // 1. Selected Detectors State (persisted to formData)
  const [selectedDetectors, setSelectedDetectors] = useState(() => {
    if (Array.isArray(formData?.aiDetection?.selectedDetectors)) {
      return formData.aiDetection.selectedDetectors
    }
    // Default matching reference screenshot: 5 active detectors
    return ["people", "smoke_fire", "thermal", "objects_debris", "asset_defects"]
  })

  // 2. Thresholds State (persisted to formData)
  const [thresholds, setThresholds] = useState(() => {
    const initial = {}
    ALL_DETECTORS.forEach((d) => {
      initial[d.id] = formData?.aiDetection?.thresholds?.[d.id] ?? d.defaultConfidence
    })
    return initial
  })

  // 3. Human Review Toggle State (persisted to formData)
  const [humanReviewRequired, setHumanReviewRequired] = useState(() => {
    if (typeof formData?.aiDetection?.humanReviewRequired === "boolean") {
      return formData.aiDetection.humanReviewRequired
    }
    return true
  })

  // Synchronize state changes back to parent formData
  const syncToFormData = useCallback(
    (newSelected, newThresholds, newHumanReview) => {
      if (typeof setFormData === "function") {
        setFormData((prev) => ({
          ...prev,
          aiDetection: {
            ...prev?.aiDetection,
            selectedDetectors: newSelected,
            thresholds: newThresholds,
            humanReviewRequired: newHumanReview,
            configuredAt: new Date().toISOString(),
          },
        }))
      }
    },
    [setFormData]
  )

  // Toggle Detector selection
  const handleToggleDetector = (detectorId) => {
    setSelectedDetectors((prev) => {
      const exists = prev.includes(detectorId)
      const updated = exists ? prev.filter((id) => id !== detectorId) : [...prev, detectorId]
      syncToFormData(updated, thresholds, humanReviewRequired)
      return updated
    })
  }

  // Update confidence threshold slider for a detector
  const handleThresholdChange = (detectorId, newConfidence) => {
    setThresholds((prev) => {
      const updated = {
        ...prev,
        [detectorId]: newConfidence,
      }
      syncToFormData(selectedDetectors, updated, humanReviewRequired)
      return updated
    })
  }

  // Toggle human review required switch
  const handleToggleHumanReview = () => {
    setHumanReviewRequired((prev) => {
      const updated = !prev
      syncToFormData(selectedDetectors, thresholds, updated)
      return updated
    })
  }

  // Active detectors list for the Thresholds table (ordered consistently)
  const activeDetectorsList = useMemo(() => {
    return ALL_DETECTORS.filter((d) => selectedDetectors.includes(d.id))
  }, [selectedDetectors])

  // Dynamic Site/Operations Contact Name derived from project location or use case
  const siteTeamContactTitle = useMemo(() => {
    const loc = currentProject?.location || formData?.location || ""
    const name = currentProject?.projectName || currentProject?.name || ""
    if (loc.toLowerCase().includes("refinery") || name.toLowerCase().includes("refinery")) {
      return "Refinery shift in charge"
    }
    if (loc.toLowerCase().includes("dam") || name.toLowerCase().includes("dam")) {
      return "Dam safety shift in charge"
    }
    return "Operations shift in charge"
  }, [currentProject, formData])

  // 1. Available fleet drones
  const availableDrones = useMemo(() => {
    if (Array.isArray(registeredDrones) && registeredDrones.length > 0) {
      return registeredDrones
    }
    return droneService.getStoredDrones()
  }, [registeredDrones])

  // 2. Resolve initial assigned drone from mission / formData
  const initialDroneId = useMemo(() => {
    if (formData?.assignedDroneId) return formData.assignedDroneId
    if (formData?.droneId) return formData.droneId
    if (formData?.selectedDroneAssign) {
      const lower = String(formData.selectedDroneAssign).toLowerCase()
      if (lower.includes("drone 1") || lower.includes("dr-001")) return "DR-001"
      if (lower.includes("drone 2") || lower.includes("dr-002")) return "DR-002"
      if (lower.includes("drone 3") || lower.includes("dr-003")) return "DR-003"
      if (lower.includes("drone 4") || lower.includes("dr-004")) return "DR-004"
    }
    if (currentProject?.mission?.assignedDroneId) return currentProject.mission.assignedDroneId
    if (currentProject?.assignedDroneId) return currentProject.assignedDroneId
    return availableDrones[0]?.id || "DR-001"
  }, [formData?.assignedDroneId, formData?.droneId, formData?.selectedDroneAssign, currentProject, availableDrones])

  // Active selected drone state
  const [selectedDroneId, setSelectedDroneId] = useState(initialDroneId)

  // Synchronize when assigned drone changes externally
  useEffect(() => {
    if (initialDroneId && initialDroneId !== selectedDroneId) {
      setSelectedDroneId(initialDroneId)
    }
  }, [initialDroneId])

  // 3. Resolve configured payload & camera type
  const configuredPayload = useMemo(() => {
    return String(
      formData?.selectedPayload ||
      formData?.payload ||
      currentProject?.mission?.payload ||
      ""
    ).toLowerCase()
  }, [formData?.selectedPayload, formData?.payload, currentProject])

  const defaultCameraType = useMemo(() => {
    if (configuredPayload.includes("thermal")) return "thermal"
    if (configuredPayload.includes("zoom")) return "zoom"
    if (configuredPayload.includes("multispectral")) return "multispectral"
    if (configuredPayload.includes("fpv")) return "fpv"
    return "main"
  }, [configuredPayload])

  const [cameraType, setCameraType] = useState(defaultCameraType)

  useEffect(() => {
    setCameraType(defaultCameraType)
  }, [defaultCameraType])

  // 4. Live Stream Player Status State
  const [feedStatus, setFeedStatus] = useState({
    isPlaying: false,
    isLoading: true,
    error: null,
    connectionState: "idle",
    statusLabel: "CONNECTING...",
    statusKey: "connecting",
    retry: null,
  })

  // 5. Query active incidents to check for genuine model detections
  const [activeAlerts, setActiveAlerts] = useState([])

  useEffect(() => {
    let isMounted = true
    incidentService
      .getActiveAlerts()
      .then((alerts) => {
        if (isMounted && Array.isArray(alerts)) {
          setActiveAlerts(alerts)
        }
      })
      .catch(() => {
        if (isMounted) setActiveAlerts([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Find genuine active alert for selected drone
  const activeDroneAlert = useMemo(() => {
    return (
      activeAlerts.find(
        (a) => a.droneId === selectedDroneId || a.droneId?.replace(/^DR-/, "DRONE-") === selectedDroneId
      ) || null
    )
  }, [activeAlerts, selectedDroneId])

  // Only render genuine detections if model output includes explicit bounding box coordinates
  const hasGenuineDetections = useMemo(() => {
    return Boolean(
      activeDroneAlert &&
      activeDroneAlert.boundingBox &&
      (activeDroneAlert.boundingBox.width || activeDroneAlert.boundingBox.w)
    )
  }, [activeDroneAlert])

  // Active drone profile record
  const currentDroneRecord = useMemo(() => {
    return (
      availableDrones.find(
        (d) => d.id === selectedDroneId || d.droneId === selectedDroneId
      ) || availableDrones[0]
    )
  }, [availableDrones, selectedDroneId])

  // Handler for drone selection change
  const handleDroneChange = (newDroneId) => {
    setSelectedDroneId(newDroneId)
    if (typeof setFormData === "function") {
      setFormData((prev) => ({
        ...prev,
        assignedDroneId: newDroneId,
      }))
    }
  }

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4 font-sans">
      {/* ========================================================================= */}
      {/* 2-COLUMN GRID (Wider Left Column + Narrower Right Column)                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ======================================================================= */}
        {/* LEFT COLUMN (8 cols): What Should It Look For? + Thresholds Table       */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: What Should This Mission Look For? */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B68D2]" />
              <h3 className="text-sm sm:text-base font-bold text-[#0F284E]">
                What should this mission look for?
              </h3>
            </div>

            {/* 9 Selectable Detector Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {ALL_DETECTORS.map((detector) => {
                const isSelected = selectedDetectors.includes(detector.id)
                const IconComponent = detector.icon

                return (
                  <button
                    key={detector.id}
                    type="button"
                    onClick={() => handleToggleDetector(detector.id)}
                    aria-pressed={isSelected}
                    className={`py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? "bg-[#1B68D2] text-white border border-[#1B68D2] shadow-xs"
                        : "bg-white text-[#1B68D2] border border-[#CBD5E1] hover:border-[#1B68D2] hover:bg-slate-50 shadow-2xs"
                    }`}
                  >
                    <IconComponent
                      className={`w-4.5 h-4.5 shrink-0 ${isSelected ? "text-white" : "text-[#1B68D2]"}`}
                    />
                    <span
                      className={`text-[11.5px] sm:text-xs tracking-tight line-clamp-1 leading-tight ${
                        isSelected ? "text-white font-bold" : "text-[#1B68D2] font-semibold"
                      }`}
                    >
                      {detector.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Dynamic Status Caption */}
            <p className="text-xs text-[#64748B] font-medium pt-0.5">
              {selectedDetectors.length} {selectedDetectors.length === 1 ? "detector" : "detectors"} on for this use case. Each runs on the drone; only alerts and clips are streamed.
            </p>
          </div>

          {/* Card 2: Thresholds and Alert Rules */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3.5">
            <h3 className="text-sm sm:text-base font-bold text-[#0F284E]">
              Thresholds and alert rules
            </h3>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0] text-[#0F284E] font-bold">
                    <th className="py-2.5 px-3 font-bold w-[22%]">Detector</th>
                    <th className="py-2.5 px-3 font-bold w-[33%]">Alert when confidence is at least</th>
                    <th className="py-2.5 px-3 font-bold w-[27%]">What counts as an alert</th>
                    <th className="py-2.5 px-3 font-bold w-[18%]">Then</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {activeDetectorsList.length > 0 ? (
                    activeDetectorsList.map((det) => {
                      const confidenceVal = thresholds[det.id] ?? det.defaultConfidence

                      return (
                        <tr key={det.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Col 1: Detector Name */}
                          <td className="py-3.5 px-3 font-bold text-[#0F284E] whitespace-nowrap">
                            {det.name}
                          </td>

                          {/* Col 2: Confidence Slider + % Indicator */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3 max-w-[240px]">
                              <input
                                type="range"
                                min="50"
                                max="99"
                                step="1"
                                value={confidenceVal}
                                onChange={(e) =>
                                  handleThresholdChange(det.id, parseInt(e.target.value, 10))
                                }
                                className="w-full accent-[#1B68D2] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                                aria-label={`${det.name} confidence threshold`}
                              />
                              <span className="font-mono font-bold text-xs sm:text-[13px] text-[#0F284E] min-w-[34px] text-right">
                                {confidenceVal}%
                              </span>
                            </div>
                          </td>

                          {/* Col 3: Condition Text */}
                          <td className="py-3.5 px-3 text-[#334155] font-medium leading-relaxed">
                            {det.condition}
                          </td>

                          {/* Col 4: Action Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {det.actionType === "danger" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">
                                {det.action}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                {det.action}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                        No detectors currently active. Click any detector card above to enable its alert rule.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN (4 cols): Sample Detection + Where Alerts Go + Model Card   */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Sample Detection */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0F284E] leading-tight">
                  Sample detection
                </h3>
                <div className="text-[11px] text-[#64748B] font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-[#0F284E]">{currentDroneRecord?.name || selectedDroneId}</span>
                  <span>·</span>
                  <span className="capitalize">{cameraType === "main" ? "Primary Optical" : `${cameraType} Camera`}</span>
                </div>
              </div>

              {/* Drone & Camera Switcher Controls */}
              <div className="flex items-center gap-1.5">
                {/* Drone Selector */}
                <select
                  value={selectedDroneId}
                  onChange={(e) => handleDroneChange(e.target.value)}
                  aria-label="Select active drone"
                  className="text-[11px] font-mono font-bold bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0F284E] focus:border-[#1B68D2] outline-none cursor-pointer shadow-2xs hover:bg-slate-50 transition"
                >
                  {availableDrones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} · {d.name} {d.role ? `(${d.role})` : ""}
                    </option>
                  ))}
                </select>

                {/* Camera Mode Selector */}
                <select
                  value={cameraType}
                  onChange={(e) => setCameraType(e.target.value)}
                  aria-label="Select camera type"
                  className="text-[11px] font-mono font-bold bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0F284E] focus:border-[#1B68D2] outline-none cursor-pointer shadow-2xs hover:bg-slate-50 transition"
                >
                  <option value="main">Main Cam</option>
                  <option value="thermal">Thermal</option>
                  <option value="fpv">FPV Cam</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
            </div>

            {/* Video / Genuine Stream Canvas */}
            <div className="h-56 sm:h-64 rounded-xl bg-[#04070B] overflow-hidden relative border border-[#CBD5E1] shadow-inner flex items-center justify-center">
              <LiveDroneFeed
                key={`${selectedDroneId}-${cameraType}`}
                droneId={selectedDroneId}
                cameraType={cameraType}
                videoFit="contain"
                showHudBar={false}
                onStatusChange={setFeedStatus}
                className="h-full w-full"
              >
                {/* Visual gradient overlay for HUD readability when playing */}
                {feedStatus.isPlaying && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50 pointer-events-none z-10" />
                )}

                {/* TOP HUD OVERLAY: Honest Stream Status & AI Detection Status */}
                <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
                  {/* Left: Stream Status + AI Detection Status */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Camera Stream Status Badge */}
                    {feedStatus.isPlaying && feedStatus.connectionState === "connected" ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#2FE08940] bg-[#08120ECC] backdrop-blur-md text-[#2FE089] text-[9px] font-mono font-bold shadow-[0_0_8px_rgba(46,224,137,0.25)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089] shadow-[0_0_8px_#2FE089] animate-pulse" />
                        <span>LIVE</span>
                      </div>
                    ) : feedStatus.isLoading || feedStatus.connectionState === "connecting" || feedStatus.connectionState === "reconnecting" ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#F59E0B40] bg-[#140F08CC] backdrop-blur-md text-[#F59E0B] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
                        <span>CONNECTING</span>
                      </div>
                    ) : feedStatus.statusKey === "no-camera" || feedStatus.statusKey === "stream-unavailable" ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#334155] bg-[#0F172ACC] backdrop-blur-md text-[#CBD5E1] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                        <span>STREAM UNAVAILABLE</span>
                      </div>
                    ) : feedStatus.statusKey === "failed" ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#5E2222] bg-[#140808CC] backdrop-blur-md text-[#FF8585] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
                        <span>CONNECTION FAILED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#5E2222] bg-[#140808CC] backdrop-blur-md text-[#FF8585] text-[9px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
                        <span>CAMERA OFFLINE</span>
                      </div>
                    )}

                    {/* AI Detection Service Status Badge */}
                    {feedStatus.isPlaying ? (
                      hasGenuineDetections ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-950/80 backdrop-blur-md text-cyan-300 text-[9px] font-mono font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>AI DETECTION ACTIVE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/80 backdrop-blur-md text-slate-300 text-[9px] font-mono font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span>AI DETECTION UNAVAILABLE</span>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Right: Drone & Camera Stream Tag + Retry button */}
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <span className="px-1.5 py-0.5 rounded bg-[#07101CEE] border border-[#1C2C42] text-[8.5px] font-mono text-[#CBD5E1] backdrop-blur-sm">
                      {selectedDroneId} · {cameraType.toUpperCase()}
                    </span>
                    {!feedStatus.isPlaying && feedStatus.retry && (
                      <button
                        type="button"
                        onClick={feedStatus.retry}
                        className="p-1 rounded bg-[#07101CEE] border border-[#1C2C42] text-[#8E9EAA] hover:text-[#38BDF8] hover:bg-[#1C2C42] transition cursor-pointer"
                        title="Retry camera stream"
                        aria-label="Retry video stream"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Genuine Model Detection Bounding Box (Only if genuine model bounding box is provided) */}
                {feedStatus.isPlaying && hasGenuineDetections && activeDroneAlert?.boundingBox && (
                  <div
                    className="absolute border-2 border-red-500 rounded-xs pointer-events-none z-20"
                    style={{
                      top: activeDroneAlert.boundingBox.top || `${activeDroneAlert.boundingBox.y}%`,
                      left: activeDroneAlert.boundingBox.left || `${activeDroneAlert.boundingBox.x}%`,
                      width: activeDroneAlert.boundingBox.width || `${activeDroneAlert.boundingBox.w}%`,
                      height: activeDroneAlert.boundingBox.height || `${activeDroneAlert.boundingBox.h}%`,
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-[#DC2626] text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-t whitespace-nowrap shadow-xs flex items-center gap-1">
                      <span>{activeDroneAlert.title}</span>
                      {activeDroneAlert.confidence && <span>· {activeDroneAlert.confidence}</span>}
                      {activeDroneAlert.thermalValue && <span>· {activeDroneAlert.thermalValue}</span>}
                    </div>
                  </div>
                )}

                {/* Bottom-left Stream Protocol Pill (When playing) */}
                {feedStatus.isPlaying && (
                  <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#06090ECC] border border-[#16222F] backdrop-blur-sm text-[8px] font-mono text-[#8E9EAA]">
                    <div className="flex items-center gap-1 text-[#2FE089]">
                      <Wifi className="w-2.5 h-2.5" />
                      <span className="font-semibold">WHEP</span>
                    </div>
                    <span className="text-[#334155]">•</span>
                    <span className="text-[#38BDF8] font-semibold">{currentDroneRecord?.name || selectedDroneId}</span>
                  </div>
                )}
              </LiveDroneFeed>
            </div>

            {/* Honest Status & Stream Caption */}
            <div className="text-xs text-[#64748B] font-medium flex items-center justify-between pt-0.5">
              <span className="truncate">
                {feedStatus.isPlaying
                  ? (hasGenuineDetections
                      ? `Live feed connected · Showing genuine model detections from ${selectedDroneId}`
                      : "Live feed connected · AI inference pipeline idle on this stream")
                  : (feedStatus.isLoading
                      ? "Establishing camera stream connection..."
                      : (feedStatus.statusKey === "no-camera" || feedStatus.statusKey === "stream-unavailable"
                          ? "Stream unavailable · No stream configured for this payload."
                          : "Camera offline · Real-time feed activates when drone camera powers up."))}
              </span>
              <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-1.5 uppercase">
                {selectedDroneId}
              </span>
            </div>
          </div>

          {/* Card 2: Where Alerts Go */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-[#0F284E]">
              Where alerts go
            </h3>

            <div className="space-y-3">
              {/* Destination 1: Command Center */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0 text-[#1B68D2]">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#0F284E] leading-tight">
                    Command Center
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                    Every alert, with clip and position
                  </p>
                </div>
              </div>

              {/* Destination 2: Site Shift in Charge */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0 text-[#1B68D2]">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#0F284E] leading-tight">
                    {siteTeamContactTitle}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                    High and critical only
                  </p>
                </div>
              </div>

              {/* Destination 3: Mission Report */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0 text-[#1B68D2]">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#0F284E] leading-tight">
                    Mission report
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                    All detections, reviewed or not
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Toggle: Human Review Before Alert */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <span className="text-xs sm:text-[12.5px] font-semibold text-[#334155]">
                Human review before an alert is sent on
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={humanReviewRequired}
                onClick={handleToggleHumanReview}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1B68D2] focus:ring-offset-2 ${
                  humanReviewRequired ? "bg-[#1B68D2]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                    humanReviewRequired ? "translate-x-5.5 ml-0.5" : "translate-x-0.5 ml-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 3: Model */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-xs space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-[#0F284E]">
              Model
            </h3>

            <div className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px]">
              {/* Row 1: Detection Model */}
              <div className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0F284E] font-semibold">
                  <Box className="w-4 h-4 text-[#1B68D2] shrink-0" />
                  <span>Detection model</span>
                </div>
                <span className="text-[#334155] font-medium text-right font-mono">
                  {formData?.aiDetection?.modelName || "VizioniQ Vision 4.2"}
                </span>
              </div>

              {/* Row 2: Validated Precision */}
              <div className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0F284E] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#1B68D2] shrink-0" />
                  <span>Validated precision</span>
                </div>
                <span className="text-[#334155] font-medium text-right">
                  {formData?.aiDetection?.precision || "92% on this use case"}
                </span>
              </div>

              {/* Row 3: Runs On */}
              <div className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0F284E] font-semibold">
                  <Zap className="w-4 h-4 text-[#1B68D2] shrink-0" />
                  <span>Runs on</span>
                </div>
                <span className="text-[#334155] font-medium text-right">
                  Drone edge computer
                </span>
              </div>

              {/* Row 4: Latency */}
              <div className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0F284E] font-semibold">
                  <Clock className="w-4 h-4 text-[#1B68D2] shrink-0" />
                  <span>Latency</span>
                </div>
                <span className="text-[#334155] font-medium text-right font-mono">
                  Under 400 ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step9AiDetection
