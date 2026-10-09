import { Route, Plane, ShieldCheck, Sparkles, BarChart3, Database } from "lucide-react"

const ICON_MAP = {
  Route,
  Plane,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Database,
}

const TONE_BADGES = {
  sky: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
  blue: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  green: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  amber: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
}

export const ReportCard = ({
  reportType,
  onGenerate,
  disabled = false,
  disabledReason = "",
}) => {
  const IconComponent = ICON_MAP[reportType.iconName] || Route
  const toneClasses = TONE_BADGES[reportType.frequencyTone] || TONE_BADGES.blue

  return (
    <div className="bg-white rounded-xl border border-[#D5E1ED] shadow-xs p-4 flex flex-col justify-between hover:shadow-md hover:border-[#B5CEE7] transition-all duration-200 group min-h-[178px]">
      <div>
        {/* Header: Icon & Title */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0F6FC] text-[#1E64D4] group-hover:bg-[#1E64D4] group-hover:text-white transition-colors">
            <IconComponent className="h-4.5 w-4.5" />
          </span>
          <h3 className="text-sm font-bold text-[#0E2646] tracking-tight line-clamp-1">
            {reportType.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-[#50667E] leading-relaxed line-clamp-3">
          {reportType.description}
        </p>
      </div>

      {/* Footer: Frequency Badge & Generate Button */}
      <div className="flex items-center justify-between gap-2 pt-3.5 border-t border-[#EEF3F8] mt-3">
        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${toneClasses}`}>
          {reportType.frequency}
        </span>

        <button
          type="button"
          onClick={() => !disabled && onGenerate(reportType.id)}
          disabled={disabled}
          title={disabled ? disabledReason : `Generate ${reportType.title}`}
          className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            disabled
              ? "border-[#CBD5E1] bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed"
              : "border-[#1E64D4] text-[#1E64D4] hover:bg-[#1E64D4] hover:text-white shadow-2xs active:scale-[0.98]"
          }`}
        >
          Generate
        </button>
      </div>
    </div>
  )
}

export default ReportCard
