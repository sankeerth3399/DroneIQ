import React, { useState } from "react"
import {
  Sparkles,
  Cpu,
  Sliders,
  ShieldAlert,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react"
import sampleImg from "@/assets/images/sampleImg.png"

export const Step9AiDetection = ({
  formData,
  setFormData,
  triggerToast,
}) => {
  const [crackThreshold, setCrackThreshold] = useState(85)
  const [thermalThreshold, setThermalThreshold] = useState(80)
  const [vehicleThreshold, setVehicleThreshold] = useState(90)
  const [humanReviewRequired, setHumanReviewRequired] = useState(true)
  const [instantSmsAlert, setInstantSmsAlert] = useState(true)

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F284E] flex flex-wrap items-center gap-2">
              Onboard Edge AI Vision & Automated Defect Detection
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                Model: AeroYOLO-v8 Edge
              </span>
            </h3>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5 font-medium">
              Real-time inference runs on vehicle neural accelerators during flight without cloud latency.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs sm:text-[13px] font-mono">
          <span className="text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-300">
            Inference: 18 ms / frame (55 FPS)
          </span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (6 cols): AI Detection Categories & Thresholds */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3.5">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Detection Classes & Sensitivity Thresholds
            </h4>

            <div className="space-y-3 text-xs sm:text-[13px]">
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F284E]">Structural Cracks & Seepage</span>
                  <span className="font-mono text-purple-700 font-bold text-sm">{crackThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={crackThreshold}
                  onChange={(e) => setCrackThreshold(parseInt(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Detects concrete micro-fissures &gt; 2mm width along target structure.</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F284E]">Thermal Hotspot & Plume Anomaly</span>
                  <span className="font-mono text-purple-700 font-bold text-sm">{thermalThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={thermalThreshold}
                  onChange={(e) => setThermalThreshold(parseInt(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Detects temperature differential &gt; 15°C above baseline.</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F284E]">Intrusion & Keep-out Zone Breach</span>
                  <span className="font-mono text-purple-700 font-bold text-sm">{vehicleThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={vehicleThreshold}
                  onChange={(e) => setVehicleThreshold(parseInt(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <span className="text-xs text-[#475569] font-medium block">Triggers immediate warning if unauthorized asset is detected in sector.</span>
              </div>
            </div>
          </div>

          {/* Triage & Alert Rules */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">
              Alert Routing & Human Verification
            </h4>

            <div className="space-y-2.5 text-xs sm:text-[13px]">
              <label className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] cursor-pointer group">
                <span className="font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors">
                  Human-in-the-loop review before incident escalation
                </span>
                <input
                  type="checkbox"
                  checked={humanReviewRequired}
                  onChange={(e) => setHumanReviewRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1B68D2] border-[#CBD5E1] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] cursor-pointer group">
                <span className="font-bold text-[#0F284E] group-hover:text-[#1B68D2] transition-colors">
                  Send instant high-priority alert to Operations Desk
                </span>
                <input
                  type="checkbox"
                  checked={instantSmsAlert}
                  onChange={(e) => setInstantSmsAlert(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1B68D2] border-[#CBD5E1] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Real-Time Edge AI Detection Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h4 className="text-sm font-bold text-[#0F284E]">
                Edge Inference Preview & Model Test
              </h4>
              <span className="text-xs font-mono font-bold text-[#1B68D2] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ARCHITECTURE PREVIEW
              </span>
            </div>

            <div className="h-64 rounded-xl bg-slate-900 overflow-hidden relative flex items-center justify-center border border-[#CBD5E1]">
              <img src={sampleImg} alt="AI Detection Preview" className="w-full h-full object-cover opacity-80" />

              {/* Bounding Box 1: Seepage Crack */}
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-xs"
                style={{ top: "35%", left: "40%", width: "120px", height: "70px" }}
              >
                <div className="absolute -top-5 left-0 bg-emerald-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-t">
                  Seepage Crack · 94%
                </div>
              </div>

              {/* Bounding Box 2: Thermal Variation */}
              <div
                className="absolute border-2 border-purple-400 bg-purple-500/20 rounded shadow-xs"
                style={{ top: "60%", left: "65%", width: "80px", height: "55px" }}
              >
                <div className="absolute -top-5 left-0 bg-purple-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-t">
                  Efflorescence · 88%
                </div>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-300 text-xs sm:text-[13px] text-purple-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-700" /> Edge Metadata Tags Attached
              </span>
              <p className="text-xs text-purple-900 font-medium">
                Each captured frame embeds microsecond GPS coordinates, camera FOV pitch, and bounding box detections directly into EXIF metadata.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step9AiDetection
