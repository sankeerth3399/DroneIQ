export const ChartCard = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = "",
}) => {
  return (
    <div
      className={`p-4 sm:p-5 rounded-xl bg-[#0B1017] border border-[#1A2633] shadow-md flex flex-col font-mono select-none ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#14202C] mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded bg-[#142232] border border-[#203C54] text-[#35E0FF]">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#EEF4F8] uppercase tracking-wider">
              {title}
            </h3>
            {subtitle && <p className="text-[10px] text-[#8E9EAA]">{subtitle}</p>}
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Body Content */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

export default ChartCard
