import React, { useState } from "react"
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  BatteryCharging,
  Zap,
  Info,
} from "lucide-react"

export const Step6Scheduling = ({
  formData,
  setFormData,
  registeredDrones = [],
  triggerToast,
}) => {
  const [missionDate, setMissionDate] = useState(formData.departureDate || "2026-09-16")
  const [launchTime, setLaunchTime] = useState(formData.departureTime || "09:15 AM")
  const [duration, setDuration] = useState("5 min")
  const [preferredWindow, setPreferredWindow] = useState("09:00 – 11:00 AM")
  const [recurrence, setRecurrence] = useState("Monthly, first Tuesday")
  const [timeZone, setTimeZone] = useState("IST (UTC +5:30)")
  const [autoSkipWeather, setAutoSkipWeather] = useState(true)
  const [notifyOperator, setNotifyOperator] = useState(true)

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Top 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card (5 cols): When Form */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2.5">
            <Calendar className="w-5 h-5 text-[#1B68D2]" />
            <h3 className="text-base font-bold text-[#0F284E]">Mission Launch & Recurrence</h3>
          </div>

          <div className="space-y-3 text-xs sm:text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Mission Date</label>
                <input
                  type="date"
                  value={missionDate}
                  onChange={(e) => setMissionDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 font-medium text-xs sm:text-[13px] text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Launch Time</label>
                <select
                  value={launchTime}
                  onChange={(e) => setLaunchTime(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>09:15 AM</option>
                  <option>09:30 AM</option>
                  <option>10:00 AM</option>
                  <option>11:15 AM</option>
                  <option>02:30 PM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Estimated Duration</label>
                <input
                  type="text"
                  readOnly
                  value={duration}
                  className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#334155]"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Preferred Window</label>
                <select
                  value={preferredWindow}
                  onChange={(e) => setPreferredWindow(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>09:00 – 11:00 AM</option>
                  <option>06:00 – 09:00 AM (Calm Wind)</option>
                  <option>14:00 – 16:00 PM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Recurrence</label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>Monthly, first Tuesday</option>
                  <option>One-time Sortie</option>
                  <option>Weekly (Mon / Thu)</option>
                  <option>Daily Dawn Patrol</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-bold text-[#0F284E] block mb-1">Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 font-bold text-xs sm:text-[13px] text-[#0F284E] focus:bg-white focus:border-[#1B68D2] outline-none shadow-2xs cursor-pointer"
                >
                  <option>IST (UTC +5:30)</option>
                  <option>UTC (GMT 0)</option>
                  <option>EST (UTC -5:00)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 space-y-2.5 border-t border-[#E2E8F0]">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs sm:text-[13px] font-bold text-[#1E293B] group-hover:text-[#0F284E] transition-colors">
                  Skip automatically if the weather window closes
                </span>
                <input
                  type="checkbox"
                  checked={autoSkipWeather}
                  onChange={(e) => setAutoSkipWeather(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1B68D2] border-[#CBD5E1] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs sm:text-[13px] font-bold text-[#1E293B] group-hover:text-[#0F284E] transition-colors">
                  Notify operator 15 minutes before launch
                </span>
                <input
                  type="checkbox"
                  checked={notifyOperator}
                  onChange={(e) => setNotifyOperator(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1B68D2] border-[#CBD5E1] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Card (7 cols): Timeline 06:00 to 18:00 Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#CBD5E1] p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h3 className="text-base font-bold text-[#0F284E]">Today, 06:00 to 18:00 Timeline</h3>
              <span className="text-xs sm:text-[13px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Window Validated
              </span>
            </div>

            {/* Visual Timeline Gantt */}
            <div className="pt-3 space-y-3 text-xs sm:text-[13px]">
              {/* Hours Header Axis */}
              <div className="grid grid-cols-12 text-xs font-mono font-bold text-[#475569] border-b border-[#CBD5E1] pb-1.5 text-center">
                <span>06:00</span>
                <span>07:00</span>
                <span>08:00</span>
                <span>09:00</span>
                <span>10:00</span>
                <span>11:00</span>
                <span>12:00</span>
                <span>13:00</span>
                <span>14:00</span>
                <span>15:00</span>
                <span>16:00</span>
                <span>17:00</span>
              </div>

              {/* Row 1: This Mission */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-[#0F284E] font-bold truncate">This Mission</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-[#1B68D2] rounded-xs shadow-2xs"
                    style={{ left: "27%" }}
                    title="Departure: 09:15 AM (5 min)"
                  />
                </div>
              </div>

              {/* Row 2: Weather Window */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-[#0F284E] font-bold truncate">Weather Window</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0.5 bottom-0.5 bg-emerald-600 rounded"
                    style={{ left: "20%", width: "35%" }}
                    title="Calm wind < 8 m/s, Visibility > 10 km"
                  />
                </div>
              </div>

              {/* Row 3: DR-001 Availability */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-[#0F284E] font-bold truncate">DR-001 Available</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0.5 bottom-0.5 bg-emerald-600 rounded"
                    style={{ left: "16%", width: "58%" }}
                  />
                </div>
              </div>

              {/* Row 4: DR-003 Availability */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-[#0F284E] font-bold truncate">DR-003 Available</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0.5 bottom-0.5 bg-emerald-600 rounded"
                    style={{ left: "25%", width: "50%" }}
                  />
                </div>
              </div>

              {/* Row 5: Charging (after) */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-[#0F284E] font-bold truncate">Post-Flight Charge</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0.5 bottom-0.5 bg-amber-500 rounded"
                    style={{ left: "30%", width: "12%" }}
                  />
                </div>
              </div>

              {/* Row 6: Conflict M-2026-005 */}
              <div className="flex items-center gap-2">
                <span className="w-32 text-xs sm:text-[13px] text-red-700 font-bold truncate">Overlap: M-2026-005</span>
                <div className="flex-1 h-4 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  <div
                    className="absolute top-0.5 bottom-0.5 bg-red-600 rounded"
                    style={{ left: "42%", width: "12%" }}
                    title="M-2026-005 shares DR-003 at 10:30 AM"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-[13px] font-medium text-[#475569] pt-2 border-t border-[#E2E8F0]">
            The scheduled sortie fits safely inside the confirmed weather window and both assigned drones&apos; operational envelopes.
          </p>
        </div>
      </div>

      {/* Bottom 3 Cards Row (Conflicts, Battery, Crew) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Conflicts */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            <h4 className="text-sm font-bold text-[#0F284E]">Airspace & Drone Conflicts</h4>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs sm:text-[13px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>DR-003 Booked on M-2026-005 at 10:30 AM</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              18 minutes margin between landing and next launch; battery turnaround requires 12 minutes. Tight buffer confirmed workable.
            </p>
          </div>

          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2.5 text-xs sm:text-[13px] text-emerald-900">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Zero Airspace Overlaps</span>
              <p className="text-xs text-emerald-800 font-medium">Nearest registered drone mission is 6.4 km away.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Battery and Charging */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
              <BatteryCharging className="w-4.5 h-4.5 text-[#1B68D2]" />
              <h4 className="text-sm font-bold text-[#0F284E]">Battery & Energy Projection</h4>
            </div>

            <table className="w-full text-left text-xs sm:text-[13px] mt-2">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-bold text-[#0F284E]">
                  <th className="pb-1.5">Drone</th>
                  <th className="pb-1.5">Current</th>
                  <th className="pb-1.5">Sortie Use</th>
                  <th className="pb-1.5 text-right">Lands With</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium text-[#334155]">
                <tr>
                  <td className="py-2 font-bold text-[#0F284E]">Drone 1</td>
                  <td className="py-2 font-mono text-emerald-700 font-bold">98%</td>
                  <td className="py-2 font-mono text-[#475569]">52%</td>
                  <td className="py-2 font-mono text-right font-bold text-[#0F284E]">44%</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-[#0F284E]">Drone 2</td>
                  <td className="py-2 font-mono text-emerald-700 font-bold">91%</td>
                  <td className="py-2 font-mono text-[#475569]">58%</td>
                  <td className="py-2 font-mono text-right font-bold text-[#0F284E]">35%</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-[#0F284E]">Drone 3</td>
                  <td className="py-2 font-mono text-emerald-700 font-bold">88%</td>
                  <td className="py-2 font-mono text-[#475569]">60%</td>
                  <td className="py-2 font-mono text-right font-bold text-[#0F284E]">28%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#475569] pt-2 border-t border-[#E2E8F0] font-medium">
            Reserve protocol: maintain ≥ 25% battery upon landing. All units compliant.
          </p>
        </div>

        {/* Card 3: Crew and Approvals */}
        <div className="bg-white rounded-xl border border-[#CBD5E1] p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
            <UserCheck className="w-4.5 h-4.5 text-[#1B68D2]" />
            <h4 className="text-sm font-bold text-[#0F284E]">Crew Roster & Approvals</h4>
          </div>

          <div className="space-y-2 text-xs sm:text-[13px]">
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#0F284E]">Pilot in Command</div>
                <div className="text-xs text-[#475569] font-medium">Shift A remote pilot · On duty until 02:00 PM</div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                Available
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#0F284E]">Visual Observer</div>
                <div className="text-xs text-[#475569] font-medium">On-site personnel · From 09:00 AM</div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                Confirmed
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#0F284E]">Operator Clearance</div>
                <div className="text-xs text-[#475569] font-medium">Pre-flight electronic signoff</div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                Pending Signoff
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step6Scheduling
