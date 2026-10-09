import { Crosshair, Network, BarChart3, ShieldCheck } from "lucide-react"

export const BottomInfoStrip = () => {
  return (
    <div className="mt-8 pt-6 border-t border-[#D5E1ED] bg-transparent">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-center">
        {/* Item 1 */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#DBEAFE]">
            <Crosshair className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0E2646] tracking-tight">
              Plan with Confidence
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Accurate, efficient and safe missions.
            </p>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#DBEAFE]">
            <Network className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0E2646] tracking-tight">
              Multi-Drone, Multi-Use
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Any industry. Any environment.
            </p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#DBEAFE]">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0E2646] tracking-tight">
              From Data to Decisions
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Turn aerial data into real value.
            </p>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E64D4] border border-[#DBEAFE]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0E2646] tracking-tight">
              Safer Operations
            </h4>
            <p className="text-[11px] text-[#64748B]">
              People. Assets. Communities.
            </p>
          </div>
        </div>

        {/* Slogan on Right */}
        <div className="hidden xl:flex flex-col items-end justify-center text-right border-l border-[#D5E1ED] pl-6">
          <span className="text-[11px] font-extrabold tracking-widest text-[#0E2646] uppercase font-mono">
            ONE FLEET. ANY MISSION.
          </span>
          <span className="text-[12px] font-extrabold tracking-widest text-[#1E64D4] uppercase font-mono mt-0.5">
            ALWAYS READY.
          </span>
        </div>
      </div>
    </div>
  )
}

export default BottomInfoStrip
