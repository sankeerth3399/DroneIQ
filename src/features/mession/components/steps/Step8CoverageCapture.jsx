import React, { useState } from "react"
import {
  Grid,
  Video,
  Ruler,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Layers,
  MapPin,
  CheckCircle2,
} from "lucide-react"

export const Step8CoverageCapture = ({
  formData,
  setFormData,
  currentProject,
  triggerToast,
}) => {
  const [layers, setLayers] = useState({
    coverageArea: true,
    coverageByDrone: true,
    flightLines: true,
    capturePoints: false,
    obstacles: false,
  })

  const handleAddOblique = () => {
    triggerToast?.("Generated 4 additional oblique passes to capture spillway underside.")
  }

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top 5 Stat KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#CBD5E1] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1B68D2] flex items-center justify-center shrink-0 border border-blue-200">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-tight">98%</div>
            <div className="text-xs font-bold text-[#475569]">Expected Coverage</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-tight">400</div>
            <div className="text-xs font-bold text-[#475569]">Estimated Frames</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-tight">2.5 cm/px</div>
            <div className="text-xs font-bold text-[#475569]">Ground Resolution</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-[#0F284E] leading-tight">~20 GB</div>
            <div className="text-xs font-bold text-[#475569]">Estimated Storage</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-1.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-900 leading-tight">94%</div>
            <div className="text-xs font-bold text-emerald-800">Coverage Confidence</div>
          </div>
        </div>
      </div>

      {/* Middle Row: Coverage Map & Capture Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coverage Map (8 cols) */}
        <div className="lg:col-span-8 bg-[#0D243F] rounded-xl border border-slate-700 overflow-hidden relative min-h-[380px] flex items-center justify-center shadow-inner">
          {/* SVG Schematic Map View */}
          <svg className="w-full h-full min-h-[380px]" viewBox="0 0 600 380">
            {/* Background terrain contours */}
            <path d="M 0 0 Q 300 120 600 80 L 600 380 L 0 380 Z" fill="#0A1C30" opacity="0.6" />
            <path d="M 0 160 Q 280 260 600 210 L 600 380 L 0 380 Z" fill="#0F2B48" opacity="0.5" />

            {/* River / Reservoir body */}
            <path d="M 400 380 C 420 300 480 240 600 220 L 600 380 Z" fill="#08182B" />
            <text x="520" y="340" fill="#38BDF8" opacity="0.5" fontSize="10" fontWeight="bold">RESERVOIR</text>

            {/* Geofence polygon */}
            <polygon
              points="160,80 380,60 480,180 340,320 180,240"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />

            {/* Flight survey lines inside polygon (3 sectors) */}
            <g stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8">
              {/* Drone 1 sector */}
              <line x1="200" y1="100" x2="360" y2="90" />
              <line x1="210" y1="120" x2="390" y2="110" />
              <line x1="220" y1="140" x2="420" y2="130" />
            </g>
            <g stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85">
              {/* Drone 2 sector */}
              <line x1="225" y1="160" x2="440" y2="150" />
              <line x1="230" y1="180" x2="455" y2="170" />
              <line x1="235" y1="200" x2="445" y2="195" />
            </g>
            <g stroke="#A855F7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85">
              {/* Drone 3 sector */}
              <line x1="230" y1="220" x2="415" y2="215" />
              <line x1="240" y1="240" x2="385" y2="235" />
              <line x1="260" y1="260" x2="350" y2="255" />
            </g>

            {/* Polygon vertex dots */}
            {[
              [160, 80],
              [380, 60],
              [480, 180],
              [340, 320],
              [180, 240],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#1B68D2" strokeWidth="2" />
            ))}

            {/* Dam Structure Bar */}
            <line x1="170" y1="200" x2="460" y2="210" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
            <text x="315" y="196" fill="#F1F5F9" fontSize="11" fontWeight="bold" textAnchor="middle">
              SURVEY SITE STRUCTURE
            </text>

            {/* Home Base Launch Point */}
            <circle cx="120" cy="180" r="10" fill="#16A34A" stroke="white" strokeWidth="2" />
            <text x="120" y="184" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">H</text>
          </svg>

          {/* Floating Map Layers HUD (Top Left) */}
          <div className="absolute top-3 left-3 bg-[#080C14CC] backdrop-blur-md border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 space-y-1.5 shadow-lg select-none">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Map Layers</div>
            {Object.entries(layers).map(([key, val]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-800 text-[#1B68D2] text-xs cursor-pointer"
                />
                <span className="font-medium">
                  {key === "coverageArea"
                    ? "Coverage Area"
                    : key === "coverageByDrone"
                    ? "Coverage by Drone"
                    : key === "flightLines"
                    ? "Flight Lines"
                    : key === "capturePoints"
                    ? "Capture Points"
                    : "Obstacles"}
                </span>
              </label>
            ))}
          </div>

          <div className="absolute bottom-2 right-3 text-xs font-mono font-medium text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-slate-700">
            Schematic · Illustrative
          </div>
        </div>

        {/* Right Column (4 cols): Capture Plan & Blind Spots */}
        <div className="lg:col-span-4 space-y-4">
          {/* Capture Plan */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <h3 className="text-base font-bold text-[#0F284E] border-b border-[#E2E8F0] pb-2">Capture Plan Parameters</h3>

            <div className="space-y-2.5 text-xs sm:text-[13px]">
              <div className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#475569] font-medium">Front Overlap</span>
                <span className="font-mono font-bold text-[#0F284E]">{formData.frontOverlap || 75} %</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#475569] font-medium">Side Overlap</span>
                <span className="font-mono font-bold text-[#0F284E]">{formData.sideOverlap || 65} %</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#475569] font-medium">Flight Altitude</span>
                <span className="font-mono font-bold text-[#0F284E]">{formData.flightAltitude || 120} m AGL</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#475569] font-medium">Capture Interval</span>
                <span className="font-mono font-bold text-[#0F284E]">{formData.captureInterval || 2} sec</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#475569] font-medium">Line Spacing</span>
                <span className="font-mono font-bold text-[#0F284E]">50 m</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[#475569] font-medium">Image Footprint</span>
                <span className="font-mono font-bold text-[#0F284E]">144 x 108 m</span>
              </div>
            </div>
          </div>

          {/* Blind Spots Card */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
            <h3 className="text-base font-bold text-[#0F284E]">Blind Spot Mitigation</h3>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs sm:text-[13px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>2 Shadowed Faces Identified</span>
              </div>
              <p className="text-xs text-amber-900 font-medium">
                Spillway underside, east abutment shadow.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddOblique}
              className="w-full py-2.5 bg-[#1B68D2] hover:bg-[#1557B0] text-white rounded-lg text-xs sm:text-[13px] font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Oblique Inspection Passes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Coverage by Drone & What Drives Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coverage by Drone */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
          <h3 className="text-base font-bold text-[#0F284E]">Coverage Allocation by Drone</h3>

          <div className="space-y-3 text-xs sm:text-[13px]">
            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-1 font-bold text-[#0F284E]">
                <span>Drone 1 · Lead - Mapping</span>
                <span className="font-mono font-bold text-[#1B68D2]">35%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-[#1B68D2] rounded-full" style={{ width: "35%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-1 font-bold text-[#0F284E]">
                <span>Drone 2 · Thermal</span>
                <span className="font-mono font-bold text-amber-600">32%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "32%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-1 font-bold text-[#0F284E]">
                <span>Drone 3 · Survey</span>
                <span className="font-mono font-bold text-purple-600">32%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: "32%" }} />
              </div>
            </div>

            <p className="text-xs text-[#475569] pt-2 border-t border-[#E2E8F0] font-medium">
              Individual sector shares add up to 98% validated survey coverage.
            </p>
          </div>
        </div>

        {/* What Drives Confidence */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
          <h3 className="text-base font-bold text-[#0F284E]">Reconstruction Confidence Metrics</h3>

          <div className="space-y-3 text-xs sm:text-[13px]">
            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-0.5">
                <span className="font-bold text-[#0F284E]">Overlap meets reconstruction minimum</span>
                <span className="font-mono font-bold text-[#0F284E]">30%</span>
              </div>
              <p className="text-xs text-[#475569] font-medium mb-1.5">75% front, 65% side</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-[#1B68D2] rounded-full" style={{ width: "30%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-0.5">
                <span className="font-bold text-[#0F284E]">Terrain following maintains stable GSD</span>
                <span className="font-mono font-bold text-[#0F284E]">24%</span>
              </div>
              <p className="text-xs text-[#475569] font-medium mb-1.5">GSD stays within ±0.3 cm of 2.5</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-[#1B68D2] rounded-full" style={{ width: "24%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-[13px] mb-0.5">
                <span className="font-bold text-[#0F284E]">Shadowed or occluded faces</span>
                <span className="font-mono font-bold text-amber-700">58%</span>
              </div>
              <p className="text-xs text-[#475569] font-medium mb-1.5">Spillway underside, east abutment shadow</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "58%" }} />
              </div>
            </div>

            <p className="text-xs text-[#475569] pt-1 font-medium">
              Consistent terrain following and multi-angle oblique mitigation optimize reconstruction confidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step8CoverageCapture
