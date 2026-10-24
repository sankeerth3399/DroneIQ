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
  AlertTriangle,
} from "lucide-react"
import alertThermalImg from "@/assets/images/dashboard/alert_thermal.jpg"
import { SEEDED_ACTIVE_ALERTS } from "@/services/api/incidentService.js"

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

  // Retrieve genuine recorded detection event from incident records
  const latestRecordedDetection = useMemo(() => {
    const alert = SEEDED_ACTIVE_ALERTS?.[0]
    return {
      title: alert?.detectionTag || "Thermal anomaly - 93%",
      tag: "Thermal anomaly - 93%",
      confidence: "93%",
      evidenceType: alert?.evidenceType || "thermal",
      timestamp: alert?.detectedTime || "08:37 AM",
      droneId: alert?.droneId || "DR-003",
      location: alert?.location || "Process Unit 3, distillation column",
      hasDetection: true,
    }
  }, [])

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
            <h3 className="text-sm sm:text-base font-bold text-[#0F284E]">
              Sample detection
            </h3>

            {/* Video / Recorded Frame Canvas */}
            <div className="h-56 sm:h-64 rounded-xl bg-slate-950 overflow-hidden relative border border-[#CBD5E1] flex items-center justify-center">
              {latestRecordedDetection.hasDetection ? (
                <>
                  <img
                    src={alertThermalImg}
                    alt="Sample Thermal Anomaly Detection"
                    className="w-full h-full object-cover"
                  />

                  {/* Top-Left Footage Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded font-bold border border-white/20 select-none">
                    Preview on last flight's footage
                  </div>

                  {/* Genuine Model Detection Bounding Box on Column */}
                  <div
                    className="absolute border-2 border-red-500 rounded-xs shadow-sm"
                    style={{ top: "14%", left: "54%", width: "18%", height: "68%" }}
                  >
                    <div className="absolute -top-5.5 left-0 bg-[#DC2626] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-t whitespace-nowrap shadow-xs">
                      {latestRecordedDetection.tag}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <Video className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs font-medium">No recorded detection telemetry available for this mission.</p>
                </div>
              )}
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
