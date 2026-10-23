import React, { useState } from "react"
import {
  Rocket,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Plane,
  Camera,
  Calendar,
  Layers,
  RotateCcw,
  AlertTriangle,
  Radio,
} from "lucide-react"

export const Step13SummaryLaunch = ({
  formData,
  currentProject,
  missionCode,
  registeredDrones = [],
  localWaypoints = [],
  onSaveMission,
  onStepChange,
  triggerToast,
}) => {
  const [affirmationChecked, setAffirmationChecked] = useState(false)
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  const droneCount = registeredDrones.length > 0 ? registeredDrones.length : formData.droneCount || 3

  const handleExecuteLaunch = () => {
    setIsLaunching(true)
    setTimeout(() => {
      setIsLaunching(false)
      setShowLaunchModal(false)
      triggerToast?.("Mission plan successfully authorized and uploaded to aircraft fleet autopilot!")
      onSaveMission?.()
    }, 1200)
  }

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F284E] flex flex-wrap items-center gap-2">
              Mission Planning Summary & Fleet Authorization
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                READY FOR FLIGHT
              </span>
            </h3>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5 font-medium">
              Review mission dossier parameters before committing flight plans to fleet flight controllers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs sm:text-[13px]">
          <span className="text-[#1B68D2] font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
            {missionCode} · {formData.siteName}
          </span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Executive Dossier Card */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h4 className="text-sm font-bold text-[#0F284E]">
              Executive Mission Dossier
            </h4>
            <span className="text-xs sm:text-[13px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 13 Steps Completed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-[13px]">
            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Mission Code</span>
              <span className="font-mono font-bold text-[#0F284E] text-sm">{missionCode}</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Site & Location</span>
              <span className="font-bold text-[#0F284E] text-xs sm:text-[13px] truncate block">{formData.location || "North Ridge Dam"}</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Swarm Fleet</span>
              <span className="font-bold text-[#1B68D2] text-xs sm:text-[13px]">{droneCount} Aircraft Assigned</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Flight Cruising Alt</span>
              <span className="font-mono font-bold text-[#0F284E] text-sm">{formData.flightAltitude || 120} m AGL</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Estimated Duration</span>
              <span className="font-mono font-bold text-[#0F284E] text-sm">5 min</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]">
              <span className="text-[#475569] block text-xs font-medium mb-1">Waypoints Programmed</span>
              <span className="font-mono font-bold text-[#0F284E] text-sm">{Math.max(5, localWaypoints.length)} points</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-[#CBD5E1] text-xs sm:text-[13px] space-y-1">
            <span className="font-bold text-[#0F284E]">Mission Objective:</span>
            <p className="text-[#334155] leading-relaxed font-medium">
              {formData.objective || "Map the dam face, crest and spillway, and find seepage, cracks and vegetation on the downstream slope."}
            </p>
          </div>
        </div>

        {/* Right Column (4 cols): Pre-Flight Affirmation & Launch Action */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Pilot Affirmation & Authorization
            </h4>

            {/* Affirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3.5 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer group">
              <input
                type="checkbox"
                checked={affirmationChecked}
                onChange={(e) => setAffirmationChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-blue-300 text-[#1B68D2] cursor-pointer"
              />
              <span className="text-xs sm:text-[13px] text-blue-950 font-medium leading-relaxed select-none">
                I confirm airspace clearance, visual line of sight verification, battery health checks, and emergency return-to-home parameters.
              </span>
            </label>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={!affirmationChecked}
                onClick={() => setShowLaunchModal(true)}
                className={`w-full py-2.5 rounded-lg text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] ${
                  affirmationChecked
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>Authorize & Upload to Fleet</span>
              </button>

              <button
                type="button"
                onClick={() => onStepChange?.(11)}
                className="w-full py-2.5 rounded-lg border border-[#CBD5E1] text-[#0F284E] hover:bg-[#F8FAFC] text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-4 h-4 text-[#1B68D2]" />
                <span>Simulate Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Confirmation Modal */}
      {showLaunchModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowLaunchModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#CBD5E1] space-y-4 animate-in zoom-in-95 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 mx-auto flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[#0F284E]">Authorize Mission Upload?</h3>
              <p className="text-xs sm:text-[13px] text-[#475569] max-w-sm mx-auto font-medium">
                This will compile and upload {Math.max(5, localWaypoints.length)} georeferenced waypoints to {droneCount} aircraft in swarm formation.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-[#CBD5E1] text-xs sm:text-[13px] font-mono text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#475569]">Target Sortie:</span>
                <span className="font-bold text-[#0F284E]">{missionCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Airframes:</span>
                <span className="font-bold text-[#1B68D2]">{droneCount} Drones</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Failsafe RTH:</span>
                <span className="font-bold text-emerald-700">{formData.rthAltitude || 150}m AGL</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLaunchModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#CBD5E1] text-[#334155] text-xs sm:text-[13px] font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLaunching}
                onClick={handleExecuteLaunch}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isLaunching ? (
                  <span>Uploading MAVLink...</span>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Confirm & Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step13SummaryLaunch
