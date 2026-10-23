import React from "react"
import {
  Crosshair,
  Share2,
  BarChart3,
  Shield,
  Save,
  ArrowLeft,
  ArrowRight,
  Rocket,
  Check,
} from "lucide-react"
import { getStepByNumber } from "./missionWorkflowSteps.js"

export const MissionFooterBar = ({
  currentStep = 1,
  onStepChange,
  onSaveMission,
  saveToast,
}) => {
  const currentStepMeta = getStepByNumber(currentStep)
  const prevStepMeta = currentStep > 1 ? getStepByNumber(currentStep - 1) : null
  const nextStepMeta = currentStep < 13 ? getStepByNumber(currentStep + 1) : null

  return (
    <footer className="mt-auto border-t border-[#CBD5E1] bg-white shrink-0 sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      {/* Step Actions Bar */}
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0]">
        {/* Step Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] sm:text-[14px] font-extrabold text-[#0F284E]">
            Step <span className="text-[#1B68D2]">{currentStep}</span> of 13
          </span>
          <span className="text-[#94A3B8] text-sm">·</span>
          <span className="text-[13px] sm:text-[14px] font-bold text-[#1E293B]">
            {currentStepMeta.label}
          </span>
          {saveToast && (
            <span
              className={`ml-2 text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-2xs ${
                saveToast.type === "error"
                  ? "bg-red-50 text-red-700 border-red-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> {saveToast.msg}
            </span>
          )}
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto">
          {prevStepMeta && (
            <button
              type="button"
              onClick={() => onStepChange?.(prevStepMeta.step)}
              className="h-10 px-4 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[13px] font-bold text-[#1E293B] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#475569]" />
              <span>Back: {prevStepMeta.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveMission}
            className="h-10 px-4.5 rounded-lg border-2 border-[#1B68D2] text-[#1B68D2] hover:bg-[#EFF6FF] text-[13px] font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Check className="w-4 h-4 text-[#1B68D2]" />
            <span>Save Mission</span>
          </button>

          {nextStepMeta ? (
            <button
              type="button"
              onClick={() => onStepChange?.(nextStepMeta.step)}
              className="h-10 px-5 rounded-lg bg-[#1B68D2] hover:bg-[#124E9D] text-white text-[13px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Next: {nextStepMeta.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveMission}
              className="h-10 px-6 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[13px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm animate-pulse"
            >
              <Rocket className="w-4 h-4" />
              <span>Authorize & Launch</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom AeroNexus Branding Trust Strip */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 text-xs text-[#334155]">
        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#1B68D2] shrink-0" />
            <div>
              <span className="font-bold text-[#0F284E] block text-[12px] leading-tight">Plan with Confidence</span>
              <span className="text-[11px] text-[#475569] font-medium">Accurate, efficient and safe missions.</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#1B68D2] shrink-0" />
            <div>
              <span className="font-bold text-[#0F284E] block text-[12px] leading-tight">Multi-Drone, Multi-Use</span>
              <span className="text-[11px] text-[#475569] font-medium">Any industry. Any environment.</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1B68D2] shrink-0" />
            <div>
              <span className="font-bold text-[#0F284E] block text-[12px] leading-tight">From Data to Decisions</span>
              <span className="text-[11px] text-[#475569] font-medium">Turn aerial data into real value.</span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1B68D2] shrink-0" />
            <div>
              <span className="font-bold text-[#0F284E] block text-[12px] leading-tight">Safer Operations</span>
              <span className="text-[11px] text-[#475569] font-medium">People. Assets. Communities.</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-bold tracking-widest text-[#1B68D2] uppercase font-mono">
          ONE FLEET. ANY MISSION. ALWAYS READY.
        </div>
      </div>
    </footer>
  )
}

export default MissionFooterBar
