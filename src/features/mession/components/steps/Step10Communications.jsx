import React, { useState } from "react"
import {
  Radio,
  Wifi,
  ShieldCheck,
  Signal,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Clock,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react"

export const Step10Communications = ({
  formData,
  setFormData,
  triggerToast,
}) => {
  const [primaryLink, setPrimaryLink] = useState("Dual 4G/5G LTE + 5.8 GHz RF Mesh")
  const [encryption, setEncryption] = useState("AES-256 GCM Hardware Encrypted")
  const [lossTimeout, setLossTimeout] = useState(10)
  const [relayDroneEnabled, setRelayDroneEnabled] = useState(true)

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] w-full mx-auto space-y-4 sm:space-y-5">
      {/* ========================================================================= */}
      {/* 1. TOP BANNER & ARCHITECTURE STATUS                                       */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-200">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0B1F3D] tracking-tight">
                Command & Control (C2) Datalink Architecture
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Signal Margin: +18 dB (EXCELLENT)
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-1 font-medium">
              Multi-frequency redundant radio datalinks, cellular fallback, and airborne relay mesh for guaranteed telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-mono font-bold text-[#1E293B] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Protocol: MAVLink 2.0 / MicroXRCE
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN GRID                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column (7 cols): Link Channels & Relay Architecture */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D]">
                Datalink Channels & Signal Propagation
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Active radio pathways between Ground Control Station (GCS) and airborne drones
              </p>
            </div>

            <div className="space-y-3.5 text-xs sm:text-[13px]">
              {/* Primary C2 Link */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-bold text-[#0B1F3D]">
                  <span className="flex items-center gap-2 text-sm text-[#0B1F3D]">
                    <Signal className="w-4 h-4 text-[#2563EB]" />
                    <span>Primary C2 Link</span>
                  </span>
                  <span className="text-emerald-700 font-mono text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                    Signal: 98% (-62 dBm) · Active
                  </span>
                </div>
                <select
                  value={primaryLink}
                  onChange={(e) => setPrimaryLink(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F172A] shadow-2xs focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none cursor-pointer"
                >
                  <option>Dual 4G/5G LTE + 5.8 GHz RF Mesh</option>
                  <option>Direct RF 2.4 GHz High-Gain Only</option>
                  <option>Point-to-Point 900 MHz Telemetry Link</option>
                </select>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Automatic failover switches to cellular LTE in under 120ms if direct line-of-sight RF is shadowed by terrain or structures.
                </p>
              </div>

              {/* Datalink Security & Encryption */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-bold text-[#0B1F3D]">
                  <span className="flex items-center gap-2 text-sm text-[#0B1F3D]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Datalink Security & Encryption</span>
                  </span>
                  <span className="font-mono text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                    FIPS 140-3 Validated
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={encryption}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-semibold text-[#0F172A] shadow-2xs outline-none"
                />
                <p className="text-xs text-[#475569] leading-relaxed">
                  Mutual TLS authenticated MAVLink channels prevent RF jamming, replay attacks, and unauthorized control takeover.
                </p>
              </div>

              {/* Aerial Relay Drone Mesh */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#0B1F3D]">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span>Aerial Relay Drone Mesh</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={relayDroneEnabled}
                    onClick={() => setRelayDroneEnabled((prev) => !prev)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      relayDroneEnabled ? "bg-[#2563EB]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.75 left-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                        relayDroneEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Drone 1 operates as an airborne packet repeater if Drone 3 descends into spillway or canyon shadow zones where direct ground link drops.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Timeout & Failsafe Rules */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D]">
                Datalink Loss Timeout & Safeguards
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Deterministic autopilot execution during complete link blackout
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-[13px]">
              {/* Link Loss Grace Period */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[#1E293B] font-bold">Link Loss Grace Period</span>
                  <span className="font-mono font-bold text-sm text-[#0B1F3D] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {lossTimeout} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={lossTimeout}
                  onChange={(e) => setLossTimeout(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-medium text-[#64748B] mt-1">
                  <span>Min: 3s (Immediate)</span>
                  <span>Max: 30s (Extended)</span>
                </div>
              </div>

              {/* Failsafe Callout Box */}
              <div className="p-3.5 bg-blue-50/90 rounded-xl border border-blue-200 text-xs sm:text-[13px] text-blue-950 space-y-1.5 shadow-2xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span>Deterministic Autopilot Failsafe</span>
                </span>
                <p className="text-xs sm:text-[12.5px] text-blue-800 leading-relaxed">
                  If communication is lost for &gt; {lossTimeout} seconds, the aircraft pauses for 15s to re-acquire signal, then climbs to <strong className="font-bold text-blue-950">{formData.rthAltitude || 150}m</strong> and returns along the validated safe corridor.
                </p>
              </div>

              {/* Datalink Channels Status Table - Displaying Honest Availability */}
              <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                  Hardware Channel Allocation & Status
                </h4>
                <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase text-[#475569]">
                        <th className="py-2 px-2.5">Channel</th>
                        <th className="py-2 px-2.5">Freq</th>
                        <th className="py-2 px-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      <tr>
                        <td className="py-2 px-2.5 font-bold text-[#0F172A]">RF Mesh Link</td>
                        <td className="py-2 px-2.5 font-mono text-[#475569]">5.8 GHz</td>
                        <td className="py-2 px-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Active
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-bold text-[#0F172A]">Cellular LTE Cat-M</td>
                        <td className="py-2 px-2.5 font-mono text-[#475569]">Band 3/28</td>
                        <td className="py-2 px-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            Standby
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2.5 font-bold text-[#0F172A]">Satellite (Iridium)</td>
                        <td className="py-2 px-2.5 font-mono text-[#64748B]">L-Band</td>
                        <td className="py-2 px-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            Unavailable
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step10Communications

