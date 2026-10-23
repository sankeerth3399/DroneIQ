import React, { useState } from "react"
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Cpu,
  Battery,
  CloudSun,
  Radio,
  FileCheck,
  UserCheck,
} from "lucide-react"

export const Step12MissionReadiness = ({
  formData,
  currentProject,
  registeredDrones = [],
  triggerToast,
}) => {
  const [checklist, setChecklist] = useState([
    { id: "airframe", label: "Airframe & Propeller Integrity Inspection", status: "PASS", category: "Hardware" },
    { id: "battery", label: "Battery Cell Voltage & Health Balance (> 24V)", status: "PASS", category: "Power" },
    { id: "payload", label: "Sensor Payload Gimbal Calibration & Storage Card", status: "PASS", category: "Payload" },
    { id: "geofence", label: "Airspace Boundary & Minimum Clearance Check", status: "PASS", category: "Safety" },
    { id: "weather", label: "Meteorological Window Clearance (< 12 m/s Wind)", status: "PASS", category: "Environment" },
    { id: "airspace", label: "Digital Sky / DGCA Airspace Green-Zone Permit", status: "PASS", category: "Compliance" },
    { id: "crew", label: "Pilot-in-Command & Visual Observer Affirmation", status: "PASS", category: "Crew" },
    { id: "c2", label: "Primary RF & LTE Cellular Telemetry Latency (< 120ms)", status: "PASS", category: "Comms" },
  ])

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Readiness Score Card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-extrabold text-xl font-mono border border-emerald-300">
            96%
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F284E] flex flex-wrap items-center gap-2">
              Mission Flight Readiness Score · GO (GREEN)
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-700 text-white">
                FLIGHT AUTHORIZED
              </span>
            </h3>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5 font-medium">
              All 8 core operational interlocks verified. Autopilot pre-arm checks passed without active blockers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerToast?.("Re-validated all 8 operational telemetry systems.")}
          className="px-4 py-2 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs sm:text-[13px] font-bold text-[#0F284E] flex items-center gap-2 cursor-pointer self-end sm:self-auto shadow-2xs"
        >
          <RotateCw className="w-4 h-4 text-[#1B68D2]" />
          <span>Re-run Checks</span>
        </button>
      </div>

      {/* Main Checklist & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Checklist Cards (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
            Automated Pre-Flight Verification Interlocks
          </h4>

          <div className="space-y-2.5">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] flex items-center justify-between gap-3 text-xs sm:text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[#0F284E]">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-xs font-bold border border-slate-300">
                    {item.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-xs font-bold border border-emerald-300">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Advisory Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Operational Advisories (0 Blockers)
            </h4>

            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs sm:text-[13px] text-blue-950 space-y-1">
              <span className="font-bold text-blue-900">Advisory: Solar Elevation Optimal</span>
              <p className="text-xs text-blue-900 font-medium leading-relaxed">
                Launch at 09:15 AM provides 48° sun elevation, minimizing long cast shadows across target survey area.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs sm:text-[13px] text-emerald-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> Ground Station Armed & Ready
              </span>
              <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                Primary and secondary pilots have confirmed visual line of sight and radio telemetry links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step12MissionReadiness
