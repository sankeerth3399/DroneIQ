import { RefreshCw, Radio, Database } from "lucide-react"

export const DataContextBar = ({
  title = "DRONE FLEET / CURRENT DATASET",
  isLive = false,
  dronesCount = 0,
  flightsCount = 0,
  missionsCount = 0,
  onRefresh,
  isRefreshing = false,
  className = "",
}) => {
  const hasData = dronesCount > 0 || flightsCount > 0 || missionsCount > 0

  return (
    <div
      className={`w-full rounded-xl bg-[#090D14] border border-[#1A2633] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono select-none text-xs ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#142232] border border-[#203C54] text-[#35E0FF] shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9EAA] truncate">
            {title}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#EEF4F8] flex-wrap mt-0.5">
            {hasData ? (
              <>
                <span className="flex items-center gap-1">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-[#2FE089] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089] animate-pulse" />
                      Live telemetry
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#8E9EAA]">
                      <Radio className="w-3 h-3 text-[#64748B]" />
                      Historical log
                    </span>
                  )}
                </span>
                <span className="text-[#3A4B5C]">•</span>
                <span className="text-white font-semibold">
                  <strong className="text-[#35E0FF] font-bold">{dronesCount}</strong> drones
                </span>
                <span className="text-[#3A4B5C]">•</span>
                <span className="text-white font-semibold">
                  <strong className="text-[#35E0FF] font-bold">{flightsCount}</strong> flights
                </span>
                <span className="text-[#3A4B5C]">•</span>
                <span className="text-white font-semibold">
                  <strong className="text-[#35E0FF] font-bold">{missionsCount}</strong> missions
                </span>
              </>
            ) : (
              <span className="text-[#8E9EAA] italic">No analytics data available</span>
            )}
          </div>
        </div>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1520] hover:bg-[#162232] border border-[#1A2633] text-[#8E9EAA] hover:text-white text-[11px] transition cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#35E0FF]" : ""}`} />
          <span>Refresh</span>
        </button>
      )}
    </div>
  )
}

export default DataContextBar
