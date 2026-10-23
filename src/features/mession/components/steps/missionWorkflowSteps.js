/**
 * Canonical 13-Step Mission Planning Workflow Sequence
 * Strictly maps Step 1 through Step 13 to its corresponding Main Tab and Subsection.
 */
export const MISSION_WORKFLOW_STEPS = [
  {
    step: 1,
    tab: "plan",
    subStep: "area_flight",
    label: "Area & Flight",
    num: "1",
    subtitle: "Plan a single drone or a swarm mission. Define area, capture plan and automated flight parameters.",
  },
  {
    step: 2,
    tab: "payload",
    subStep: "payload_config",
    label: "Payload Configuration",
    num: "2",
    subtitle: "Configure payloads and sensors for your mission. Match the right data to the right outcome.",
  },
  {
    step: 3,
    tab: "plan",
    subStep: "swarm",
    label: "Swarm Configuration",
    num: "3",
    subtitle: "Assign drones and roles, choose a formation, and decide what happens if a drone drops out.",
  },
  {
    step: 4,
    tab: "safety",
    subStep: "geofence",
    label: "Geofencing & Safety",
    num: "4",
    subtitle: "Safety boundaries, keep-in zones, terrain clearance and emergency return paths.",
  },
  {
    step: 5,
    tab: "safety",
    subStep: "weather",
    label: "Weather Constraints",
    num: "5",
    subtitle: "Forecast windows, wind limits and automatic mission contingencies.",
  },
  {
    step: 6,
    tab: "plan",
    subStep: "scheduling",
    label: "Scheduling",
    num: "6",
    subtitle: "When it flies, how often, and what it collides with.",
  },
  {
    step: 7,
    tab: "advanced",
    subStep: "flight_params",
    label: "Flight Parameters",
    num: "7",
    subtitle: "Turn behavior, climb profiles, link-loss failsafes and speed corridors.",
  },
  {
    step: 8,
    tab: "plan",
    subStep: "coverage",
    label: "Coverage & Capture",
    num: "8",
    subtitle: "What the mission will actually capture, and how sure we are.",
  },
  {
    step: 9,
    tab: "payload",
    subStep: "ai_detection",
    label: "AI Detection",
    num: "9",
    subtitle: "Edge AI detection models, confidence thresholds, and real-time alert routing.",
  },
  {
    step: 10,
    tab: "safety",
    subStep: "comms",
    label: "Communications",
    num: "10",
    subtitle: "C2 datalink health, RF frequencies, signal terrain occlusion and relay drones.",
  },
  {
    step: 11,
    tab: "advanced",
    subStep: "simulation",
    label: "Mission Simulation",
    num: "11",
    subtitle: "Digital twin simulation, battery drawdown verification and waypoint timeline.",
  },
  {
    step: 12,
    tab: "advanced",
    subStep: "readiness",
    label: "Mission Readiness",
    num: "12",
    subtitle: "Pre-flight checklists, airspace permits, hardware calibration and GO/NO-GO clearance.",
  },
  {
    step: 13,
    tab: "advanced",
    subStep: "summary_launch",
    label: "Summary & Launch",
    num: "13",
    subtitle: "Mission dossier, pilot affirmation, and automated upload to ground station.",
  },
]

export const MAIN_TABS = [
  { id: "plan", label: "Plan" },
  { id: "payload", label: "Payload" },
  { id: "safety", label: "Safety" },
  { id: "advanced", label: "Advanced" },
]

export const getStepsForTab = (tabId) => {
  return MISSION_WORKFLOW_STEPS.filter((s) => s.tab === tabId)
}

export const getStepByNumber = (stepNum) => {
  return MISSION_WORKFLOW_STEPS.find((s) => s.step === stepNum) || MISSION_WORKFLOW_STEPS[0]
}

export const getStepBySubStep = (subStepId) => {
  if (
    subStepId === "safety" ||
    subStepId === "geofence" ||
    subStepId === "waypoints" ||
    subStepId === "waypoint" ||
    subStepId === "constraints"
  ) {
    return MISSION_WORKFLOW_STEPS.find((s) => s.step === 4)
  }
  return MISSION_WORKFLOW_STEPS.find((s) => s.subStep === subStepId) || MISSION_WORKFLOW_STEPS[0]
}
