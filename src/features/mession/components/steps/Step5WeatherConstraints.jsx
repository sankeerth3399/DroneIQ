import React, { useState } from "react"
import {
  CloudSun,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  CloudRain,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  Radio,
  Clock,
  Activity,
} from "lucide-react"

export const Step5WeatherConstraints = ({
  formData,
  setFormData,
  triggerToast,
}) => {
  const [maxWindLimit, setMaxWindLimit] = useState(12)
  const [maxGustLimit, setMaxGustLimit] = useState(16)
  const [minVisibility, setMinVisibility] = useState(5)
  const [maxPrecipProbability, setMaxPrecipProbability] = useState(20)
  const [minTemp, setMinTemp] = useState(5)
  const [maxTemp, setMaxTemp] = useState(45)
  const [windContingency, setWindContingency] = useState("Return to Home immediately")

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] w-full mx-auto space-y-4 sm:space-y-5">
      {/* ========================================================================= */}
      {/* 1. TOP WINDOW STATUS BANNER                                               */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0B1F3D] tracking-tight">
                Mission Weather Window · CLEAR (GO)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Optimal Window: 08:30 – 11:30 AM
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#475569] mt-1 font-medium">
              Live meteorological sensors confirm calm environmental conditions within authorized flight envelopes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#334155] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Updated: Today, 08:42 AM</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SIX KEY WEATHER PARAMETER CARDS                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* 1. Wind Speed */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Wind Speed</span>
            <Wind className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">4.8 m/s</div>
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Limit: ≤ {maxWindLimit} m/s</span>
          </div>
        </div>

        {/* 2. Gusts */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Wind Gusts</span>
            <Wind className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">6.2 m/s</div>
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Limit: ≤ {maxGustLimit} m/s</span>
          </div>
        </div>

        {/* 3. Precipitation */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Precipitation</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">0% (None)</div>
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Zero Rain Detected</span>
          </div>
        </div>

        {/* 4. Visibility */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Visibility</span>
            <Eye className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">&gt; 10 km</div>
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>VFR Clear</span>
          </div>
        </div>

        {/* 5. Temperature */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Temperature</span>
            <Thermometer className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">26°C</div>
          <div className="text-xs font-medium text-[#475569]">Safe range: 5° – 45°C</div>
        </div>

        {/* 6. Cloud Ceiling */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-[#334155] text-xs sm:text-[13px] font-bold">
            <span>Cloud Ceiling</span>
            <CloudSun className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-[#0B1F3D] tracking-tight">1,200 m</div>
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Well Above Route</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN 2-COLUMN GRID (FORECAST TABLE & THRESHOLDS)                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column (7 cols): Hour-by-Hour Forecast Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D]">
                Hour-by-Hour Sortie Forecast
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Validated atmospheric window across the designated survey duration
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" /> High Confidence
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-xs font-bold uppercase tracking-wider text-[#334155]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Conditions</th>
                  <th className="py-2.5 px-3">Wind</th>
                  <th className="py-2.5 px-3">Gusts</th>
                  <th className="py-2.5 px-3">Precipitation</th>
                  <th className="py-2.5 px-3 text-right">Flight Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {[
                  { time: "08:00 AM", sky: "Clear", wind: "3.2 m/s", gust: "4.5 m/s", rain: "0%", status: "GO" },
                  { time: "09:00 AM", sky: "Clear (Target)", wind: "4.8 m/s", gust: "6.2 m/s", rain: "0%", status: "OPTIMAL" },
                  { time: "10:00 AM", sky: "Scattered Clouds", wind: "5.5 m/s", gust: "7.8 m/s", rain: "5%", status: "GO" },
                  { time: "11:00 AM", sky: "Scattered Clouds", wind: "7.1 m/s", gust: "9.4 m/s", rain: "10%", status: "GO" },
                  { time: "12:00 PM", sky: "Overcast", wind: "9.2 m/s", gust: "12.0 m/s", rain: "25%", status: "MARGINAL" },
                  { time: "01:00 PM", sky: "Thunderstorm", wind: "14.5 m/s", gust: "18.2 m/s", rain: "65%", status: "NO GO" },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 transition-colors ${
                      row.status === "OPTIMAL" ? "bg-blue-50/50 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#0F172A] font-mono">{row.time}</td>
                    <td className="py-2.5 px-3 text-[#334155]">{row.sky}</td>
                    <td className="py-2.5 px-3 font-mono text-[#0F172A]">{row.wind}</td>
                    <td className="py-2.5 px-3 font-mono text-[#0F172A]">{row.gust}</td>
                    <td className="py-2.5 px-3 font-mono text-[#0F172A]">{row.rain}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold tracking-wide uppercase ${
                          row.status === "OPTIMAL"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : row.status === "GO"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : row.status === "MARGINAL"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Differentiate available telemetry vs unavailable radar honestly */}
          <div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-[#0F172A]">Ground Weather Station:</span>
              <span className="text-[#475569]">Online & Reporting</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="font-semibold text-[#0F172A]">High-Alt Wind Profiler:</span>
              <span className="text-[#64748B]">Unavailable for coordinates</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Weather Thresholds & Contingencies */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm sm:text-base font-bold text-[#0B1F3D]">
              Weather Thresholds & Contingencies
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automated autopilot responses when boundary limits are crossed
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-[13px]">
            {/* Wind Speed Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[#1E293B] font-bold">Max Wind Speed Threshold</span>
                <span className="font-mono font-bold text-sm text-[#0B1F3D] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {maxWindLimit} m/s
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="18"
                value={maxWindLimit}
                onChange={(e) => setMaxWindLimit(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-medium text-[#64748B] mt-1">
                <span>Min: 6 m/s</span>
                <span>Max: 18 m/s</span>
              </div>
            </div>

            {/* Gust Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[#1E293B] font-bold">Max Gust Threshold</span>
                <span className="font-mono font-bold text-sm text-[#0B1F3D] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {maxGustLimit} m/s
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="22"
                value={maxGustLimit}
                onChange={(e) => setMaxGustLimit(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-medium text-[#64748B] mt-1">
                <span>Min: 8 m/s</span>
                <span>Max: 22 m/s</span>
              </div>
            </div>

            {/* Mid-Flight Action Select */}
            <div>
              <label className="text-xs sm:text-[13px] text-[#1E293B] font-bold block mb-1.5">
                Action If Conditions Deteriorate Mid-Flight
              </label>
              <select
                value={windContingency}
                onChange={(e) => setWindContingency(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs sm:text-[13px] font-bold text-[#0F172A] shadow-2xs focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none cursor-pointer"
              >
                <option>Return to Home immediately</option>
                <option>Hover and re-evaluate for 60 seconds</option>
                <option>Descend to minimum terrain clearance</option>
                <option>Emergency land at designated rally point</option>
              </select>
            </div>

            {/* Active Safeguard Callout */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs sm:text-[13px] text-emerald-950 space-y-1.5 shadow-2xs">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auto-Abort Safeguard Active</span>
              </span>
              <p className="text-xs sm:text-[12.5px] text-emerald-800 leading-relaxed">
                If onboard telemetry detects sustained winds &gt; {maxWindLimit} m/s or gusts &gt; {maxGustLimit} m/s for 5 consecutive seconds, the autopilot automatically triggers <strong className="font-bold text-emerald-950">{windContingency}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step5WeatherConstraints

