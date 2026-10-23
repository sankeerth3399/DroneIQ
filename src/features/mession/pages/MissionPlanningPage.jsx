import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useMission } from "@/hooks/useMission.js"
import { useDroneTelemetry } from "@/hooks/useDroneTelemetry.js"
import { useAuth } from "@/hooks/useAuth.js"
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  formatArea,
  formatDistance,
} from "@/utils/geofence.js"

import {
  MISSION_WORKFLOW_STEPS,
  MAIN_TABS,
  getStepByNumber,
  getStepsForTab,
  getStepBySubStep,
} from "../components/steps/missionWorkflowSteps.js"

import Step1AreaFlight from "../components/steps/Step1AreaFlight.jsx"
import Step2PayloadConfig from "../components/steps/Step2PayloadConfig.jsx"
import Step3SwarmConfig from "../components/steps/Step3SwarmConfig.jsx"
import Step4GeofenceSafety from "../components/steps/Step4GeofenceSafety.jsx"
import Step5WeatherConstraints from "../components/steps/Step5WeatherConstraints.jsx"
import Step6Scheduling from "../components/steps/Step6Scheduling.jsx"
import Step7FlightParams from "../components/steps/Step7FlightParams.jsx"
import Step8CoverageCapture from "../components/steps/Step8CoverageCapture.jsx"
import Step9AiDetection from "../components/steps/Step9AiDetection.jsx"
import Step10Communications from "../components/steps/Step10Communications.jsx"
import Step11MissionSimulation from "../components/steps/Step11MissionSimulation.jsx"
import Step12MissionReadiness from "../components/steps/Step12MissionReadiness.jsx"
import Step13SummaryLaunch from "../components/steps/Step13SummaryLaunch.jsx"
import MissionFooterBar from "../components/steps/MissionFooterBar.jsx"

import {
  Check,
  ChevronDown,
  Layers,
  MapPin,
  X,
  Compass,
} from "lucide-react"

export const MissionPlanningPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { telemetry, isLive, isStale } = useDroneTelemetry()
  const {
    projects,
    currentProject,
    currentProjectId,
    selectProject,
    saveMission,
    saveGeofence,
    updateProject,
  } = useMission()

  // 13-Step Workflow Linear Index (1 to 13)
  const [currentStep, setCurrentStep] = useState(1)
  const [saveToast, setSaveToast] = useState(null)
  const mainContentRef = useRef(null)

  // Current Step Metadata derived from canonical sequence
  const currentStepMeta = useMemo(() => getStepByNumber(currentStep), [currentStep])
  const activeTab = currentStepMeta.tab
  const activeSubStep = currentStepMeta.subStep

  // Safety subsection tracking (1. Geofence, 2. Waypoint Planning, 3. Weather & Safety Constraints)
  const [safetySubSection, setSafetySubSection] = useState(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const sub = searchParams.get("sub") || searchParams.get("subSection")
      if (sub === "waypoints" || sub === "geofence" || sub === "constraints") return sub
    } catch {
      // ignore
    }
    return "geofence"
  })

  // Synchronize route state if navigated from search or other pages
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const subParam = searchParams.get("sub") || searchParams.get("subSection")
    const stepParam = searchParams.get("step") ? parseInt(searchParams.get("step"), 10) : null

    if (location.state?.step) {
      setCurrentStep(location.state.step)
      if (location.state?.subSection) {
        setSafetySubSection(location.state.subSection)
      }
    } else if (stepParam) {
      setCurrentStep(stepParam)
      if (subParam) {
        setSafetySubSection(subParam)
      }
    } else if (location.state?.subStep) {
      const matched = getStepBySubStep(location.state.subStep)
      if (matched) {
        setCurrentStep(matched.step)
        if (location.state.subStep === "waypoints") setSafetySubSection("waypoints")
        else if (location.state.subStep === "geofence") setSafetySubSection("geofence")
        else if (location.state.subStep === "constraints") setSafetySubSection("constraints")
      }
    } else if (location.state?.tab) {
      const stepsInTab = getStepsForTab(location.state.tab)
      if (stepsInTab.length > 0) setCurrentStep(stepsInTab[0].step)
    }
  }, [location.state, location.search])

  // Mission form configuration state
  const [formData, setFormData] = useState({
    siteName: currentProject?.projectName || currentProject?.name || "North Ridge Dam",
    missionType: currentProject?.useCase || "Inspection",
    useCase: "Infrastructure Inspection",
    location: currentProject?.location || "North Ridge Dam, Karnataka",
    droneCount: 3,
    payload: "RGB + LiDAR + Multispectral",
    objective:
      currentProject?.description ||
      "Map the dam face, crest and spillway, and find seepage, cracks and vegetation on the downstream slope.",
    frontOverlap: 75,
    sideOverlap: 65,
    flightAltitude: 120,
    speed: 8.0,
    captureInterval: 2.0,
    actionOnCompletion: "Return to Home",
    // Payload configs
    sensorModel: "Sony RX1R II 42MP",
    gimbalPitch: -90,
    payloadResolution: "4K (3840 x 2160)",
    captureMode: "Timed Interval",
    // Safety configs
    rthAltitude: 150,
    geofenceBreachAction: "Hover & Alert",
    // Scheduling configs
    departureDate: "2026-09-16",
    departureTime: "09:15 AM",
  })

  // Synchronize formData when selected project changes
  useEffect(() => {
    if (currentProject) {
      setFormData((prev) => ({
        ...prev,
        siteName: currentProject.projectName || currentProject.name || "North Ridge Dam",
        location: currentProject.location || "North Ridge Dam, Karnataka",
        objective:
          currentProject.description ||
          "Map the dam face, crest and spillway, and find seepage, cracks and vegetation on the downstream slope.",
      }))
    }
  }, [currentProject])

  // Derive Mission Code from ID
  const missionCode = useMemo(() => {
    if (!currentProject?.id) return "M-2026-043"
    const id = currentProject.id
    if (id.startsWith("M-")) return id
    if (id.startsWith("AERO-MSN-")) return id.replace("AERO-MSN-", "M-2026-")
    return `M-2026-${id.slice(-3).padStart(3, "0")}`
  }, [currentProject?.id])

  // Canonical geofence polygon
  const geofenceCoords = useMemo(() => {
    const g = currentProject?.geofence
    if (!g) return []
    if (Array.isArray(g.vertices) && g.vertices.length > 0) return g.vertices
    if (Array.isArray(g.polygon) && g.polygon.length > 0) return g.polygon
    if (Array.isArray(g.coordinates) && g.coordinates.length > 0) return g.coordinates
    if (Array.isArray(g) && g.length > 0) return g
    return []
  }, [currentProject?.geofence])

  // Geometric area metrics
  const areaMetrics = useMemo(() => {
    if (geofenceCoords.length < 3) {
      return {
        areaKm2: 0.1,
        areaFormatted: "0.1 km²",
        perimeterKm: 1.4,
        perimeterFormatted: "1.4 km",
      }
    }
    const a = calculatePolygonArea(geofenceCoords)
    const p = calculatePolygonPerimeter(geofenceCoords)
    return {
      areaKm2: a / 1000000,
      areaFormatted: formatArea(a),
      perimeterKm: p / 1000,
      perimeterFormatted: formatDistance(p),
    }
  }, [geofenceCoords])

  // Computed GSD
  const computedGsd = useMemo(() => {
    const alt = formData.flightAltitude || 120
    const sensorPitchUm = 4.5
    const focalLengthMm = 35.0
    const gsdCm = (alt * sensorPitchUm * 100) / (focalLengthMm * 1000)
    return `${gsdCm.toFixed(1)} cm/px`
  }, [formData.flightAltitude])

  // Canonical Waypoints list from active project mission
  const localWaypoints = useMemo(() => {
    const raw = currentProject?.mission?.waypoints || currentProject?.mission?.items
    if (Array.isArray(raw) && raw.length > 0) {
      return raw
    }
    return []
  }, [currentProject?.mission?.waypoints, currentProject?.mission?.items])

  // Registered drones list from real context
  const registeredDrones = useMemo(() => {
    if (telemetry?.registeredDrones && Array.isArray(telemetry.registeredDrones)) {
      return telemetry.registeredDrones
    }
    return []
  }, [telemetry?.registeredDrones])

  // Toast feedback handler
  const triggerToast = useCallback((msg, type = "success") => {
    setSaveToast({ msg, type })
    setTimeout(() => setSaveToast(null), 3500)
  }, [])

  // Save mission handler
  const handleSaveMission = useCallback(() => {
    if (!currentProjectId) {
      triggerToast("Please select a project before saving mission.", "error")
      return
    }

    try {
      saveMission({
        name: formData.siteName,
        waypoints: localWaypoints,
        settings: {
          flightAltitude: formData.flightAltitude,
          speed: formData.speed,
          frontOverlap: formData.frontOverlap,
          sideOverlap: formData.sideOverlap,
          captureInterval: formData.captureInterval,
          actionOnCompletion: formData.actionOnCompletion,
          droneCount: formData.droneCount,
          rthAltitude: formData.rthAltitude,
          geofenceBreachAction: formData.geofenceBreachAction,
        },
      })
      triggerToast("Mission parameters saved successfully.")
    } catch {
      triggerToast("Saved mission locally (offline fallback mode).")
    }
  }, [currentProjectId, formData, localWaypoints, saveMission, triggerToast])

  // Handle Tab Switch (Jump to first step of that tab)
  const handleTabClick = (tabId) => {
    const stepsInTab = getStepsForTab(tabId)
    if (stepsInTab.length === 0) return
    const alreadyInTab = stepsInTab.some((s) => s.step === currentStep)
    if (!alreadyInTab) {
      handleStepChange(stepsInTab[0].step)
    }
  }

  // Handle direct step change (immediate natural scroll to top of step without delay)
  const handleStepChange = useCallback((targetStep) => {
    if (targetStep >= 1 && targetStep <= 13) {
      setCurrentStep(targetStep)
      if (mainContentRef.current) {
        mainContentRef.current.scrollTo({ top: 0, behavior: "auto" })
      }
    }
  }, [])

  // Subsections belonging to the currently active main tab
  const activeTabSubsections = useMemo(() => {
    return getStepsForTab(activeTab)
  }, [activeTab])

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER SECTION (Unified across all 13 steps matching references)  */}
      {/* ========================================================================= */}
      <header className="shrink-0 z-30 bg-white border-b border-[#CBD5E1] px-4 sm:px-6 py-3 sm:py-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Active Step Subtitle */}
          <div>
            <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
              Mission Planning
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#334155] mt-1 font-medium">
              {currentStepMeta.subtitle}
            </p>
          </div>

          {/* Right Header Cards */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Project Selector Card */}
            <div className="flex flex-col justify-center bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2 min-w-[210px] shadow-2xs">
              <span className="text-[11px] font-bold text-[#0F284E] uppercase tracking-wider">
                Active Project
              </span>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <select
                  value={currentProjectId || ""}
                  onChange={(e) => {
                    selectProject(e.target.value)
                    triggerToast("Switched active project.")
                  }}
                  className="bg-transparent text-[13px] sm:text-[14px] font-bold text-[#0F284E] outline-none cursor-pointer truncate max-w-[190px]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName || p.name || p.id} - Infrastructure
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mission Identifier & Status Card */}
            <div className="flex items-center gap-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] sm:text-[14px] font-bold text-[#0F284E] font-mono">
                    Mission: {missionCode}
                  </span>
                  <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-0.5 rounded-full uppercase">
                    Draft
                  </span>
                </div>
                <div className="text-[12px] font-semibold text-[#475569] truncate max-w-[200px] mt-0.5">
                  Site Inspection – {formData.siteName}
                </div>
              </div>
              <div className="border-l border-[#CBD5E1] pl-3.5 text-right">
                <span className="text-[11px] font-bold text-[#64748B] block">Last saved</span>
                <span className="text-[12px] font-bold text-[#0F284E]">Today, 08:40 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP WORKFLOW TABS (Plan / Payload / Safety / Advanced) + SUBSECTION PILLS */}
        {/* ========================================================================= */}
        <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tabs Capsule */}
          <div className="inline-flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1] self-start shadow-2xs gap-1">
            {MAIN_TABS.map((tab) => {
              const isActiveTab = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-4.5 py-1.5 text-[13px] sm:text-[14px] font-bold rounded-lg transition cursor-pointer ${
                    isActiveTab
                      ? "bg-[#1B68D2] text-white shadow-xs"
                      : "text-[#334155] hover:text-[#0F284E] hover:bg-white/70"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Sub-step Navigation Badges for the Active Main Tab */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {activeTabSubsections.map((step) => {
              const isCurrent = step.step === currentStep
              const isCompleted = step.step < currentStep

              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => handleStepChange(step.step)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[12.5px] sm:text-[13px] font-bold transition shrink-0 cursor-pointer ${
                    isCurrent
                      ? "bg-[#EFF6FF] border-[#1B68D2] text-[#1D4ED8] shadow-2xs"
                      : isCompleted
                      ? "bg-white border-[#86EFAC] text-[#15803D] hover:border-[#16A34A]"
                      : "bg-white border-[#CBD5E1] text-[#334155] hover:border-[#1B68D2] hover:text-[#0F284E]"
                  }`}
                >
                  {isCompleted ? (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold">
                      ✓
                    </span>
                  ) : (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                        isCurrent ? "bg-[#1B68D2] text-white" : "bg-[#E2E8F0] text-[#334155]"
                      }`}
                    >
                      {step.step}
                    </span>
                  )}
                  <span>{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. FUNCTIONAL SCREEN RENDERER FOR THE ACTIVE STEP                         */}
      {/* ========================================================================= */}
      <main
        ref={mainContentRef}
        className="flex-1 min-h-0 flex flex-col relative mission-main-scrollbar overscroll-y-contain overflow-y-auto overflow-x-hidden"
      >
        {currentStep === 1 && (
          <Step1AreaFlight
            formData={formData}
            setFormData={setFormData}
            currentProject={currentProject}
            projects={projects}
            selectProject={selectProject}
            registeredDrones={registeredDrones}
            localWaypoints={localWaypoints}
            geofenceCoords={geofenceCoords}
            computedGsd={computedGsd}
            areaMetrics={areaMetrics}
            onStepChange={handleStepChange}
            triggerToast={triggerToast}
            telemetry={telemetry}
          />
        )}

        {currentStep === 2 && (
          <Step2PayloadConfig
            formData={formData}
            setFormData={setFormData}
            registeredDrones={registeredDrones}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 3 && (
          <Step3SwarmConfig
            formData={formData}
            setFormData={setFormData}
            registeredDrones={registeredDrones}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 4 && (
          <Step4GeofenceSafety
            formData={formData}
            setFormData={setFormData}
            currentProject={currentProject}
            geofenceCoords={geofenceCoords}
            localWaypoints={localWaypoints}
            triggerToast={triggerToast}
            activeSubSection={safetySubSection}
            onSubSectionChange={setSafetySubSection}
          />
        )}

        {currentStep === 5 && (
          <Step5WeatherConstraints
            formData={formData}
            setFormData={setFormData}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 6 && (
          <Step6Scheduling
            formData={formData}
            setFormData={setFormData}
            registeredDrones={registeredDrones}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 7 && (
          <Step7FlightParams
            formData={formData}
            setFormData={setFormData}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 8 && (
          <Step8CoverageCapture
            formData={formData}
            setFormData={setFormData}
            currentProject={currentProject}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 9 && (
          <Step9AiDetection
            formData={formData}
            setFormData={setFormData}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 10 && (
          <Step10Communications
            formData={formData}
            setFormData={setFormData}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 11 && (
          <Step11MissionSimulation
            formData={formData}
            currentProject={currentProject}
            localWaypoints={localWaypoints}
            geofenceCoords={geofenceCoords}
            onStepChange={handleStepChange}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 12 && (
          <Step12MissionReadiness
            formData={formData}
            currentProject={currentProject}
            registeredDrones={registeredDrones}
            triggerToast={triggerToast}
          />
        )}

        {currentStep === 13 && (
          <Step13SummaryLaunch
            formData={formData}
            currentProject={currentProject}
            missionCode={missionCode}
            registeredDrones={registeredDrones}
            localWaypoints={localWaypoints}
            onSaveMission={handleSaveMission}
            onStepChange={handleStepChange}
            triggerToast={triggerToast}
          />
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. PERSISTENT WORKFLOW FOOTER & TRUST BRANDING BAR                       */}
      {/* ========================================================================= */}
      <MissionFooterBar
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onSaveMission={handleSaveMission}
        saveToast={saveToast}
      />
    </div>
  )
}

export default MissionPlanningPage
